from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from pydantic import BaseModel, ConfigDict, ValidationError, field_validator


class BootStepError(RuntimeError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class CpuSettings(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    host: str
    port: int
    app: str
    reload: bool
    health_path: str
    start_timeout_s: float
    graph_status_path: str
    graph_status_timeout_s: float

    @field_validator("health_path", "graph_status_path")
    @classmethod
    def _validate_http_path(cls, value: str) -> str:
        if not value.startswith("/"):
            raise ValueError("path_must_start_with_slash")
        return value


class GraphSettings(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    enabled: bool
    compose_path: Path
    cypherl_path: Path
    container: str
    marker_path: Path
    force_import: bool
    ready_timeout_s: float
    ready_interval_s: float
    ready_query: str


class NgrokSettings(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    enabled: bool
    executable: str
    api_base: str
    authtoken: str | None = None
    region: str | None = None
    domain: str | None = None
    start_timeout_s: float
    poll_interval_s: float

    @field_validator("api_base")
    @classmethod
    def _validate_api_base(cls, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise ValueError("invalid_ngrok_api_base")
        return value.rstrip("/")


class FrontendSettings(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    enabled: bool
    cwd: Path
    host: str
    port_start: int
    command: str
    health_path: str
    start_timeout_s: float
    poll_interval_s: float
    env_path: Path
    write_cpu_server_url: bool

    @field_validator("health_path")
    @classmethod
    def _validate_frontend_health_path(cls, value: str) -> str:
        if not value.startswith("/"):
            raise ValueError("invalid_frontend_health_path")
        return value


class LauncherSettings(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    repo_root: Path
    cpu_server_url_key: str
    demo_pass: str
    summary_title: str
    cpu: CpuSettings
    graph: GraphSettings
    ngrok: NgrokSettings
    frontend: FrontendSettings

    @field_validator("demo_pass")
    @classmethod
    def _validate_demo_pass(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("empty_demo_pass")
        return text


class BootSummary(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    cpu_local_url: str
    ngrok_public_url: str
    graph_connected: bool
    frontend_url: str
    demo_pass: str


@dataclass(slots=True)
class ManagedProcess:
    name: str
    proc: subprocess.Popen[Any]


@dataclass(slots=True)
class BootRuntime:
    processes: list[ManagedProcess] = field(default_factory=list)
    cpu_local_url: str = ""
    ngrok_public_url: str = ""
    frontend_url: str = ""
    graph_connected: bool = False

    def add_process(self, name: str, proc: subprocess.Popen[Any]) -> subprocess.Popen[Any]:
        self.processes.append(ManagedProcess(name=name, proc=proc))
        return proc


_MISSING = object()


def _which(cmd: str) -> str | None:
    try:
        return shutil.which(cmd)
    except Exception:
        return None


def _load_dotenv_file(path: Path) -> None:
    if not path.exists():
        return
    try:
        for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
    except Exception:
        return


def _read_yaml(path: Path | None) -> dict[str, Any]:
    if path is None or not path.exists():
        return {}
    try:
        import yaml  # type: ignore
    except Exception as exc:
        raise BootStepError(f"missing_yaml_dependency:{type(exc).__name__}")
    raw = path.read_text(encoding="utf-8")
    data = yaml.safe_load(raw) if raw.strip() else {}
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise BootStepError("invalid_launcher_yaml")
    return dict(data)


def _get_nested_value(data: Mapping[str, Any], dotted_path: str) -> Any:
    current: Any = data
    for part in dotted_path.split("."):
        if not isinstance(current, Mapping):
            return None
        current = current.get(part)
        if current is None:
            return None
    return current


def _setting_raw(env_name: str, yaml_data: Mapping[str, Any], yaml_path: str, default: Any = _MISSING) -> Any:
    env_value = os.environ.get(env_name)
    if env_value is not None and str(env_value).strip() != "":
        return env_value
    yaml_value = _get_nested_value(yaml_data, yaml_path)
    if yaml_value is not None and str(yaml_value).strip() != "":
        return yaml_value
    if default is not _MISSING:
        return default
    raise BootStepError(f"missing_config:{env_name}")


def _setting_bool(env_name: str, yaml_data: Mapping[str, Any], yaml_path: str, default: bool) -> bool:
    raw = _setting_raw(env_name, yaml_data, yaml_path, default)
    if isinstance(raw, bool):
        return raw
    text = str(raw).strip().lower()
    if text in {"1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off"}:
        return False
    raise BootStepError(f"invalid_bool:{env_name}")


def _setting_int(env_name: str, yaml_data: Mapping[str, Any], yaml_path: str, default: int | None = None) -> int:
    raw = _setting_raw(env_name, yaml_data, yaml_path, default if default is not None else _MISSING)
    try:
        return int(raw)
    except Exception as exc:
        raise BootStepError(f"invalid_int:{env_name}:{type(exc).__name__}") from exc


def _setting_float(env_name: str, yaml_data: Mapping[str, Any], yaml_path: str, default: float | None = None) -> float:
    raw = _setting_raw(env_name, yaml_data, yaml_path, default if default is not None else _MISSING)
    try:
        return float(raw)
    except Exception as exc:
        raise BootStepError(f"invalid_float:{env_name}:{type(exc).__name__}") from exc


def _setting_str(env_name: str, yaml_data: Mapping[str, Any], yaml_path: str, default: str | None = None) -> str:
    raw = _setting_raw(env_name, yaml_data, yaml_path, default if default is not None else _MISSING)
    value = str(raw).strip()
    if not value:
        raise BootStepError(f"empty_config:{env_name}")
    return value


def _setting_optional_str(env_name: str, yaml_data: Mapping[str, Any], yaml_path: str) -> str | None:
    raw = os.environ.get(env_name)
    if raw is not None and str(raw).strip() != "":
        return str(raw).strip()
    yaml_value = _get_nested_value(yaml_data, yaml_path)
    if yaml_value is None or str(yaml_value).strip() == "":
        return None
    return str(yaml_value).strip()


def _setting_path(repo_root: Path, env_name: str, yaml_data: Mapping[str, Any], yaml_path: str, default: str | None = None) -> Path:
    value = _setting_str(env_name, yaml_data, yaml_path, default)
    path = Path(value)
    if not path.is_absolute():
        path = (repo_root / path).resolve()
    return path


def _set_env_kv(env_path: Path, key: str, value: str) -> None:
    env_path.parent.mkdir(parents=True, exist_ok=True)
    existing = ""
    if env_path.exists():
        existing = env_path.read_text(encoding="utf-8", errors="ignore")
    lines = [line for line in existing.splitlines() if line.strip()]
    output: list[str] = []
    replaced = False
    for line in lines:
        if line.startswith(f"{key}="):
            output.append(f"{key}={value}")
            replaced = True
            continue
        output.append(line)
    if not replaced:
        output.append(f"{key}={value}")
    env_path.write_text("\n".join(output) + "\n", encoding="utf-8")


def _http_get_json(url: str, timeout: float = 2.0) -> dict[str, Any] | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            data = response.read().decode("utf-8", errors="replace")
        payload = json.loads(data)
        if isinstance(payload, dict):
            return payload
    except Exception:
        return None
    return None


def _http_reachable(url: str, timeout: float = 2.0) -> bool:
    try:
        request = urllib.request.Request(url=url, method="GET")
        with urllib.request.urlopen(request, timeout=timeout):
            return True
    except urllib.error.HTTPError as exc:
        return 200 <= exc.code < 500
    except Exception:
        return False


def _join_url(base: str, path: str) -> str:
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


def _wait_for_json(
    url: str,
    timeout: float,
    interval: float,
    process: ManagedProcess | None,
    error_code: str,
) -> dict[str, Any]:
    deadline = time.monotonic() + max(timeout, interval)
    while time.monotonic() < deadline:
        if process is not None and process.proc.poll() is not None:
            raise BootStepError(f"{process.name}_exited")
        remaining = max(0.5, min(2.0, deadline - time.monotonic()))
        payload = _http_get_json(url, timeout=remaining)
        if payload is not None:
            return payload
        time.sleep(interval)
    raise BootStepError(error_code)


def _pick_ngrok_public_url(api_base: str) -> str | None:
    data = _http_get_json(_join_url(api_base, "/api/tunnels"), timeout=2.0)
    if data is None:
        return None
    tunnels = data.get("tunnels")
    if not isinstance(tunnels, list):
        return None
    for tunnel in tunnels:
        if not isinstance(tunnel, Mapping):
            continue
        public_url = str(tunnel.get("public_url") or "").strip()
        if public_url.startswith("https://"):
            return public_url
    for tunnel in tunnels:
        if not isinstance(tunnel, Mapping):
            continue
        public_url = str(tunnel.get("public_url") or "").strip()
        if public_url.startswith("http://"):
            return public_url
    return None


def _short_output(stdout: str | bytes | None, stderr: str | bytes | None) -> str:
    def _to_text(value: str | bytes | None) -> str:
        if value is None:
            return ""
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        return value

    merged = "\n".join(part for part in [_to_text(stdout), _to_text(stderr)] if part.strip()).strip()
    if not merged:
        return "no_output"
    compact = " ".join(merged.split())
    return compact[-180:]


def _require_command(cmd: str, error_code: str) -> str:
    resolved = _which(cmd)
    if resolved:
        return resolved
    raise BootStepError(error_code)


def _run_checked(
    command: Sequence[str],
    cwd: Path,
    timeout: float | None,
    error_code: str,
    stdin_data: bytes | None = None,
) -> subprocess.CompletedProcess[bytes]:
    try:
        result = subprocess.run(
            list(command),
            cwd=str(cwd),
            input=stdin_data,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise BootStepError(f"{error_code}:timeout") from exc
    except Exception as exc:
        raise BootStepError(f"{error_code}:{type(exc).__name__}") from exc
    if result.returncode != 0:
        detail = _short_output(result.stdout, result.stderr)
        raise BootStepError(f"{error_code}:{detail}")
    return result


def _creation_flags() -> int:
    return int(getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0))


def _start_process(
    runtime: BootRuntime,
    name: str,
    command: Sequence[str] | str,
    cwd: Path,
    shell: bool = False,
) -> subprocess.Popen[Any]:
    try:
        process = subprocess.Popen(
            command,
            cwd=str(cwd),
            shell=shell,
            env=os.environ.copy(),
            creationflags=_creation_flags(),
        )
    except Exception as exc:
        raise BootStepError(f"{name}_start_failed:{type(exc).__name__}") from exc
    return runtime.add_process(name, process)


def _kill_process_tree(proc: subprocess.Popen[Any]) -> None:
    if proc.poll() is not None:
        return
    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
            return
        proc.terminate()
        time.sleep(0.5)
        if proc.poll() is None:
            proc.kill()
    except Exception:
        return


def _stop_runtime(runtime: BootRuntime) -> None:
    for handle in reversed(runtime.processes):
        _kill_process_tree(handle.proc)


def _docker_ready() -> bool:
    docker = _which("docker")
    if not docker:
        return False
    try:
        result = subprocess.run([docker, "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        return result.returncode == 0
    except Exception:
        return False


def _start_memgraph_stack(repo_root: Path, compose_path: Path) -> None:
    if not compose_path.exists():
        raise BootStepError("graph_compose_missing")
    if not _docker_ready():
        raise BootStepError("docker_not_ready")
    docker = _require_command("docker", "docker_not_found")
    _run_checked([docker, "compose", "up", "-d"], cwd=compose_path.parent, timeout=120.0, error_code="docker_compose_up_failed")


def _memgraph_ready(repo_root: Path, container: str, ready_query: str) -> bool:
    docker = _which("docker")
    if not docker:
        return False
    try:
        result = subprocess.run(
            [docker, "exec", "-i", container, "mgconsole"],
            cwd=str(repo_root),
            input=ready_query.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10.0,
            check=False,
        )
    except Exception:
        return False
    return result.returncode == 0


def _wait_for_memgraph(repo_root: Path, graph: GraphSettings) -> None:
    deadline = time.monotonic() + max(graph.ready_timeout_s, graph.ready_interval_s)
    while time.monotonic() < deadline:
        if _memgraph_ready(repo_root, graph.container, graph.ready_query):
            return
        time.sleep(graph.ready_interval_s)
    raise BootStepError("memgraph_not_ready")


def _import_memgraph_data(repo_root: Path, container: str, cypherl_path: Path, marker_path: Path, force: bool = False) -> None:
    if not cypherl_path.exists():
        raise BootStepError("graph_cypherl_missing")
    if marker_path.exists() and not force:
        return
    docker = _require_command("docker", "docker_not_found")
    marker_path.parent.mkdir(parents=True, exist_ok=True)
    stdin_data = cypherl_path.read_bytes()
    _run_checked(
        [docker, "exec", "-i", container, "mgconsole"],
        cwd=repo_root,
        timeout=180.0,
        error_code="memgraph_import_failed",
        stdin_data=stdin_data,
    )
    marker_path.write_text(str(time.time()), encoding="utf-8")


def _build_cpu_command(settings: LauncherSettings) -> list[str]:
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        settings.cpu.app,
        "--host",
        settings.cpu.host,
        "--port",
        str(settings.cpu.port),
    ]
    if settings.cpu.reload:
        command.append("--reload")
    return command


def _build_ngrok_command(settings: LauncherSettings) -> list[str]:
    command = [
        settings.ngrok.executable,
        "http",
        str(settings.cpu.port),
        "--log=stdout",
        "--log-format=json",
    ]
    if settings.ngrok.region:
        command.append(f"--region={settings.ngrok.region}")
    if settings.ngrok.domain:
        command.append(f"--domain={settings.ngrok.domain}")
    return command


def _build_frontend_command(settings: LauncherSettings, port: int) -> str:
    return settings.frontend.command.format(host=settings.frontend.host, port=port)


def _port_available(host: str, port: int) -> bool:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind((host, port))
    except OSError:
        return False
    finally:
        sock.close()
    return True


def _pick_frontend_port(host: str, port_start: int) -> int:
    port = port_start
    while port < port_start + 100:
        if _port_available(host, port):
            return port
        port += 1
    raise BootStepError("frontend_port_unavailable")


def _configure_ngrok(settings: LauncherSettings) -> None:
    if not settings.ngrok.authtoken:
        return
    _run_checked(
        [settings.ngrok.executable, "config", "add-authtoken", settings.ngrok.authtoken],
        cwd=settings.repo_root,
        timeout=30.0,
        error_code="ngrok_auth_failed",
    )


def _step_1_docker_memgraph_ready(settings: LauncherSettings) -> None:
    if not settings.graph.enabled:
        raise BootStepError("graph_disabled")
    _start_memgraph_stack(settings.repo_root, settings.graph.compose_path)
    _wait_for_memgraph(settings.repo_root, settings.graph)
    _import_memgraph_data(
        settings.repo_root,
        container=settings.graph.container,
        cypherl_path=settings.graph.cypherl_path,
        marker_path=settings.graph.marker_path,
        force=settings.graph.force_import,
    )
    print("[1/5] docker_memgraph_ready", flush=True)


def _step_2_cpu_api_healthy(settings: LauncherSettings, runtime: BootRuntime) -> None:
    runtime.cpu_local_url = f"http://{settings.cpu.host}:{settings.cpu.port}"
    process = _start_process(runtime, "cpu_api", _build_cpu_command(settings), cwd=settings.repo_root, shell=False)
    payload = _wait_for_json(
        _join_url(runtime.cpu_local_url, settings.cpu.health_path),
        timeout=settings.cpu.start_timeout_s,
        interval=0.75,
        process=ManagedProcess(name="cpu_api", proc=process),
        error_code="cpu_not_healthy",
    )
    status = str(payload.get("status") or "").strip().lower()
    if status and status != "ok":
        raise BootStepError("cpu_health_not_ok")
    print("[2/5] cpu_api_healthy", flush=True)


def _step_3_graph_status_reachable(settings: LauncherSettings, runtime: BootRuntime) -> None:
    cpu_process = next((item for item in runtime.processes if item.name == "cpu_api"), None)
    payload = _wait_for_json(
        _join_url(runtime.cpu_local_url, settings.cpu.graph_status_path),
        timeout=settings.cpu.graph_status_timeout_s,
        interval=0.75,
        process=cpu_process,
        error_code="graph_status_unreachable",
    )
    runtime.graph_connected = bool(payload.get("connected"))
    print("[3/5] graph_status_reachable", flush=True)


def _step_4_ngrok_public_url_ready(settings: LauncherSettings, runtime: BootRuntime) -> None:
    if not settings.ngrok.enabled:
        raise BootStepError("ngrok_disabled")
    _configure_ngrok(settings)
    ngrok_process = _start_process(runtime, "ngrok", _build_ngrok_command(settings), cwd=settings.repo_root, shell=False)
    deadline = time.monotonic() + max(settings.ngrok.start_timeout_s, settings.ngrok.poll_interval_s)
    while time.monotonic() < deadline:
        if ngrok_process.poll() is not None:
            raise BootStepError("ngrok_exited")
        public_url = _pick_ngrok_public_url(settings.ngrok.api_base)
        if public_url:
            runtime.ngrok_public_url = public_url
            
            # Automatically update Vercel environment variables (CPU_SERVER_URL)
            try:
                print(f"\n[Vercel Sync] Syncing CPU_SERVER_URL ({public_url}) to Vercel...", flush=True)
                npx_path = shutil.which("npx")
                if npx_path:
                    # Update Production environment
                    subprocess.run(
                        [npx_path, "vercel", "env", "add", "CPU_SERVER_URL", "production", "--value", public_url, "--yes", "--force"],
                        cwd=str(settings.repo_root),
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        check=False
                    )
                    # Update Preview environment
                    subprocess.run(
                        [npx_path, "vercel", "env", "add", "CPU_SERVER_URL", "preview", "--value", public_url, "--yes", "--force"],
                        cwd=str(settings.repo_root),
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        check=False
                    )
                    print("[Vercel Sync] CPU_SERVER_URL synced to Vercel production and preview!", flush=True)
                else:
                    print("[Vercel Sync] Warning: npx not found, skipping Vercel sync.", flush=True)
            except Exception as e:
                print(f"[Vercel Sync] Warning: Failed to sync to Vercel: {e}", flush=True)
            break
        time.sleep(settings.ngrok.poll_interval_s)
    if not runtime.ngrok_public_url:
        raise BootStepError("ngrok_public_url_missing")
    print("[4/5] ngrok_public_url_ready", flush=True)


def _step_5_frontend_start(settings: LauncherSettings, runtime: BootRuntime) -> None:
    if not settings.frontend.enabled:
        raise BootStepError("frontend_disabled")
    if settings.frontend.write_cpu_server_url:
        _set_env_kv(settings.frontend.env_path, settings.cpu_server_url_key, runtime.ngrok_public_url)
    port = _pick_frontend_port(settings.frontend.host, settings.frontend.port_start)
    runtime.frontend_url = f"http://{settings.frontend.host}:{port}"
    command = _build_frontend_command(settings, port)
    frontend_process = _start_process(runtime, "frontend", command, cwd=settings.frontend.cwd, shell=True)
    deadline = time.monotonic() + max(settings.frontend.start_timeout_s, settings.frontend.poll_interval_s)
    ready_url = _join_url(runtime.frontend_url, settings.frontend.health_path)
    while time.monotonic() < deadline:
        if frontend_process.poll() is not None:
            raise BootStepError("frontend_exited")
        if _http_reachable(ready_url, timeout=2.0):
            print("[5/5] frontend_started", flush=True)
            return
        time.sleep(settings.frontend.poll_interval_s)
    raise BootStepError("frontend_not_ready")


def _print_summary(settings: LauncherSettings, runtime: BootRuntime) -> None:
    summary = BootSummary(
        cpu_local_url=runtime.cpu_local_url,
        ngrok_public_url=runtime.ngrok_public_url,
        graph_connected=runtime.graph_connected,
        frontend_url=runtime.frontend_url,
        demo_pass=settings.demo_pass,
    )
    rows = [
        ("CPU local URL", summary.cpu_local_url),
        ("Ngrok Public URL", summary.ngrok_public_url),
        ("Graph Connected", str(summary.graph_connected)),
        ("Frontend URL", summary.frontend_url),
        ("Demo Pass", summary.demo_pass),
    ]
    key_width = max(len(key) for key, _ in rows)
    value_width = max(len(value) for _, value in rows)
    line = f"+-{'-' * key_width}-+-{'-' * value_width}-+"
    print("", flush=True)
    print(settings.summary_title, flush=True)
    print(line, flush=True)
    for key, value in rows:
        print(f"| {key.ljust(key_width)} | {value.ljust(value_width)} |", flush=True)
    print(line, flush=True)


def _watch_runtime(runtime: BootRuntime) -> int:
    while True:
        for handle in runtime.processes:
            code = handle.proc.poll()
            if code is None:
                continue
            if handle.name == "frontend":
                raise BootStepError("frontend_exited")
            if handle.name == "cpu_api":
                return int(code)
            raise BootStepError(f"{handle.name}_exited")
        time.sleep(1.0)


def _resolve_demo_pass(yaml_data: Mapping[str, Any]) -> str:
    env_first = _setting_optional_str("INTERNAL_DEMO_PASS", yaml_data, "launcher.demo_pass")
    if env_first:
        return env_first
    fallback = _setting_optional_str("AGENT_KEY_PASS", yaml_data, "launcher.agent_key_pass")
    if fallback:
        return fallback
    raise BootStepError("missing_demo_pass")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=os.environ.get("CPU_BOOT_CONFIG_PATH", ""))
    parser.add_argument("--host", default="")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--app", default="")
    parser.add_argument("--reload", action="store_true")
    parser.add_argument("--no-ngrok", action="store_true")
    parser.add_argument("--ngrok-api", default="")
    parser.add_argument("--ngrok-region", default="")
    parser.add_argument("--ngrok-domain", default="")
    parser.add_argument("--no-graph", action="store_true")
    parser.add_argument("--graph-compose", default="")
    parser.add_argument("--graph-cypherl", default="")
    parser.add_argument("--graph-container", default="")
    parser.add_argument("--graph-marker", default="")
    parser.add_argument("--graph-force-import", action="store_true")
    parser.add_argument("--write-frontend-env", dest="write_frontend_env", action="store_true")
    parser.add_argument("--no-write-frontend-env", dest="write_frontend_env", action="store_false")
    parser.set_defaults(write_frontend_env=None)
    return parser.parse_args()


def _build_settings(repo_root: Path, args: argparse.Namespace) -> LauncherSettings:
    _load_dotenv_file(repo_root / ".env")
    _load_dotenv_file(repo_root / ".env.local")
    _load_dotenv_file(repo_root / "cpu_server" / ".env")
    _load_dotenv_file(repo_root / "medical-consultation-app" / ".env")
    _load_dotenv_file(repo_root / "medical-consultation-app" / ".env.local")

    config_path_value = args.config.strip() if isinstance(args.config, str) else ""
    config_path = Path(config_path_value).resolve() if config_path_value else None
    yaml_data = _read_yaml(config_path)
    frontend_command_default = "npm run dev -- --hostname {host} --port {port}"
    summary_title_default = "=== Boot Summary ==="

    if args.host:
        os.environ["CPU_HOST"] = args.host.strip()
    if args.port:
        os.environ["CPU_PORT"] = str(args.port)
    if args.app:
        os.environ["CPU_UVICORN_APP"] = args.app.strip()
    if args.reload:
        os.environ["CPU_RELOAD"] = "1"
    if args.no_ngrok:
        os.environ["CPU_NO_NGROK"] = "1"
    if args.ngrok_api:
        os.environ["NGROK_API"] = args.ngrok_api.strip()
    if args.ngrok_region:
        os.environ["NGROK_REGION"] = args.ngrok_region.strip()
    if args.ngrok_domain:
        os.environ["NGROK_DOMAIN"] = args.ngrok_domain.strip()
    if args.no_graph:
        os.environ["CPU_NO_GRAPH"] = "1"
    if args.graph_compose:
        os.environ["GRAPH_COMPOSE"] = args.graph_compose.strip()
    if args.graph_cypherl:
        os.environ["GRAPH_CYPHERL"] = args.graph_cypherl.strip()
    if args.graph_container:
        os.environ["GRAPH_CONTAINER"] = args.graph_container.strip()
    if args.graph_marker:
        os.environ["GRAPH_MARKER"] = args.graph_marker.strip()
    if args.graph_force_import:
        os.environ["GRAPH_FORCE_IMPORT"] = "1"
    if args.write_frontend_env is not None:
        os.environ["WRITE_FRONTEND_ENV"] = "1" if args.write_frontend_env else "0"

    config_dict = {
        "repo_root": repo_root,
        "cpu_server_url_key": _setting_str("CPU_SERVER_URL_KEY", yaml_data, "launcher.cpu_server_url_key", "CPU_SERVER_URL"),
        "demo_pass": _resolve_demo_pass(yaml_data),
        "summary_title": _setting_str("BOOT_SUMMARY_TITLE", yaml_data, "launcher.summary_title", summary_title_default),
        "cpu": {
            "host": _setting_str("CPU_HOST", yaml_data, "launcher.cpu.host", "127.0.0.1"),
            "port": _setting_int("CPU_PORT", yaml_data, "launcher.cpu.port", 8000),
            "app": _setting_str("CPU_UVICORN_APP", yaml_data, "launcher.cpu.app", "cpu_server.server:app"),
            "reload": _setting_bool("CPU_RELOAD", yaml_data, "launcher.cpu.reload", False),
            "health_path": _setting_str("CPU_HEALTH_PATH", yaml_data, "launcher.cpu.health_path", "/health"),
            "start_timeout_s": _setting_float("CPU_START_TIMEOUT_S", yaml_data, "launcher.cpu.start_timeout_s", 45.0),
            "graph_status_path": _setting_str("CPU_GRAPH_STATUS_PATH", yaml_data, "launcher.cpu.graph_status_path", "/v1/graph/status"),
            "graph_status_timeout_s": _setting_float("CPU_GRAPH_STATUS_TIMEOUT_S", yaml_data, "launcher.cpu.graph_status_timeout_s", 20.0),
        },
        "graph": {
            "enabled": not _setting_bool("CPU_NO_GRAPH", yaml_data, "launcher.graph.disabled", False),
            "compose_path": _setting_path(repo_root, "GRAPH_COMPOSE", yaml_data, "launcher.graph.compose_path", "memgraph-platform/docker-compose.yml"),
            "cypherl_path": _setting_path(repo_root, "GRAPH_CYPHERL", yaml_data, "launcher.graph.cypherl_path", "graph/memgraph-export.cypherl"),
            "container": _setting_str("GRAPH_CONTAINER", yaml_data, "launcher.graph.container", "memgraph-mage"),
            "marker_path": _setting_path(repo_root, "GRAPH_MARKER", yaml_data, "launcher.graph.marker_path", "memgraph-platform/.graph_imported"),
            "force_import": _setting_bool("GRAPH_FORCE_IMPORT", yaml_data, "launcher.graph.force_import", False),
            "ready_timeout_s": _setting_float("GRAPH_READY_TIMEOUT_S", yaml_data, "launcher.graph.ready_timeout_s", 60.0),
            "ready_interval_s": _setting_float("GRAPH_READY_INTERVAL_S", yaml_data, "launcher.graph.ready_interval_s", 1.0),
            "ready_query": _setting_str("GRAPH_READY_QUERY", yaml_data, "launcher.graph.ready_query", "RETURN 1;\n"),
        },
        "ngrok": {
            "enabled": not _setting_bool("CPU_NO_NGROK", yaml_data, "launcher.ngrok.disabled", False),
            "executable": _setting_str("NGROK_EXECUTABLE", yaml_data, "launcher.ngrok.executable", "ngrok"),
            "api_base": _setting_str("NGROK_API", yaml_data, "launcher.ngrok.api_base"),
            "authtoken": _setting_optional_str("NGROK_AUTHTOKEN", yaml_data, "launcher.ngrok.authtoken"),
            "region": _setting_optional_str("NGROK_REGION", yaml_data, "launcher.ngrok.region"),
            "domain": _setting_optional_str("NGROK_DOMAIN", yaml_data, "launcher.ngrok.domain"),
            "start_timeout_s": _setting_float("NGROK_START_TIMEOUT_S", yaml_data, "launcher.ngrok.start_timeout_s", 45.0),
            "poll_interval_s": _setting_float("NGROK_POLL_INTERVAL_S", yaml_data, "launcher.ngrok.poll_interval_s", 0.75),
        },
        "frontend": {
            "enabled": _setting_bool("FRONTEND_ENABLED", yaml_data, "launcher.frontend.enabled", True),
            "cwd": _setting_path(repo_root, "FRONTEND_DIR", yaml_data, "launcher.frontend.cwd", "medical-consultation-app"),
            "host": _setting_str("FRONTEND_HOST", yaml_data, "launcher.frontend.host", "127.0.0.1"),
            "port_start": _setting_int("FRONTEND_PORT_START", yaml_data, "launcher.frontend.port_start", 3000),
            "command": _setting_str("FRONTEND_START_COMMAND", yaml_data, "launcher.frontend.command", frontend_command_default),
            "health_path": _setting_str("FRONTEND_HEALTH_PATH", yaml_data, "launcher.frontend.health_path", "/tu-van"),
            "start_timeout_s": _setting_float("FRONTEND_START_TIMEOUT_S", yaml_data, "launcher.frontend.start_timeout_s", 90.0),
            "poll_interval_s": _setting_float("FRONTEND_POLL_INTERVAL_S", yaml_data, "launcher.frontend.poll_interval_s", 1.0),
            "env_path": _setting_path(repo_root, "FRONTEND_ENV_PATH", yaml_data, "launcher.frontend.env_path", "medical-consultation-app/.env.local"),
            "write_cpu_server_url": _setting_bool("WRITE_FRONTEND_ENV", yaml_data, "launcher.frontend.write_cpu_server_url", True),
        },
    }

    try:
        return LauncherSettings.model_validate(config_dict)
    except ValidationError as exc:
        raise BootStepError(f"invalid_launcher_config:{exc.errors()[0]['type']}") from exc


def main() -> int:
    runtime = BootRuntime()
    try:
        repo_root = Path(__file__).resolve().parents[2]
        args = _parse_args()
        settings = _build_settings(repo_root, args)
        _step_1_docker_memgraph_ready(settings)
        _step_2_cpu_api_healthy(settings, runtime)
        _step_3_graph_status_reachable(settings, runtime)
        _step_4_ngrok_public_url_ready(settings, runtime)
        _step_5_frontend_start(settings, runtime)
        _print_summary(settings, runtime)
        exit_code = _watch_runtime(runtime)
        _stop_runtime(runtime)
        return exit_code
    except KeyboardInterrupt:
        _stop_runtime(runtime)
        return 0
    except BootStepError as exc:
        _stop_runtime(runtime)
        print(f"ERR {exc.code}", file=sys.stderr, flush=True)
        return 1
    except Exception as exc:
        _stop_runtime(runtime)
        print(f"ERR unexpected:{type(exc).__name__}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
