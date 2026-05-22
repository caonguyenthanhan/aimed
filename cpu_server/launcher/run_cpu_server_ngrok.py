import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path


def _which(cmd: str) -> str | None:
    try:
        return shutil.which(cmd)
    except Exception:
        return None


def _http_get_json(url: str, timeout: float = 2.0) -> dict | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            data = r.read().decode("utf-8", errors="replace")
        return json.loads(data)
    except Exception:
        return None


def _pick_ngrok_public_url(api_base: str) -> str | None:
    data = _http_get_json(f"{api_base.rstrip('/')}/api/tunnels", timeout=2.0)
    if not data:
        return None
    tunnels = data.get("tunnels", [])
    for t in tunnels:
        u = str(t.get("public_url") or "")
        if u.startswith("https://"):
            return u
    for t in tunnels:
        u = str(t.get("public_url") or "")
        if u.startswith("http://"):
            return u
    return None


def _set_env_kv(env_path: Path, key: str, value: str) -> None:
    env_path.parent.mkdir(parents=True, exist_ok=True)
    existing = ""
    if env_path.exists():
        existing = env_path.read_text(encoding="utf-8", errors="ignore")
    lines = [ln for ln in existing.splitlines() if ln.strip() != ""]
    out: list[str] = []
    replaced = False
    for ln in lines:
        if ln.startswith(f"{key}="):
            out.append(f"{key}={value}")
            replaced = True
        else:
            out.append(ln)
    if not replaced:
        out.append(f"{key}={value}")
    env_path.write_text("\n".join(out) + "\n", encoding="utf-8")


def _docker_ready() -> bool:
    docker = _which("docker")
    if not docker:
        return False
    try:
        r = subprocess.run([docker, "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        return r.returncode == 0
    except Exception:
        return False


def _start_memgraph_stack(repo_root: Path, compose_path: Path) -> bool:
    if not compose_path.exists():
        return False
    if not _docker_ready():
        return False
    docker = _which("docker")
    if not docker:
        return False
    try:
        r = subprocess.run(
            [docker, "compose", "up", "-d"],
            cwd=str(compose_path.parent),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
        )
        if r.returncode != 0:
            print(r.stdout[-2000:], file=sys.stderr, flush=True)
            return False
        return True
    except Exception as e:
        print(f"Failed to start memgraph stack: {e}", file=sys.stderr, flush=True)
        return False


def _import_memgraph_data(repo_root: Path, container: str, cypherl_path: Path, marker_path: Path, force: bool = False) -> bool:
    if not cypherl_path.exists():
        return False
    if marker_path.exists() and not force:
        return True
    if not _docker_ready():
        return False
    docker = _which("docker")
    if not docker:
        return False
    try:
        marker_path.parent.mkdir(parents=True, exist_ok=True)
        with cypherl_path.open("rb") as f:
            r = subprocess.run(
                [docker, "exec", "-i", container, "mgconsole"],
                stdin=f,
                cwd=str(repo_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                check=False,
            )
        if r.returncode != 0:
            try:
                tail = (r.stdout or b"")[-2000:]
                print(tail.decode("utf-8", errors="replace"), file=sys.stderr, flush=True)
            except Exception:
                pass
            return False
        marker_path.write_text(str(time.time()), encoding="utf-8")
        return True
    except Exception as e:
        print(f"Failed to import memgraph data: {e}", file=sys.stderr, flush=True)
        return False


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--host", default=os.environ.get("CPU_HOST", "127.0.0.1"))
    p.add_argument("--port", type=int, default=int(os.environ.get("CPU_PORT", "8000")))
    p.add_argument("--app", default=os.environ.get("CPU_UVICORN_APP", "cpu_server.server:app"))
    p.add_argument("--reload", action="store_true", default=os.environ.get("CPU_RELOAD", "").strip() == "1")
    p.add_argument("--no-ngrok", action="store_true")
    p.add_argument("--ngrok-api", default=os.environ.get("NGROK_API", "http://127.0.0.1:4040"))
    p.add_argument("--ngrok-region", default=os.environ.get("NGROK_REGION", ""))
    p.add_argument("--ngrok-domain", default=os.environ.get("NGROK_DOMAIN", ""))
    p.add_argument("--no-graph", action="store_true", default=os.environ.get("CPU_NO_GRAPH", "").strip() == "1")
    p.add_argument("--graph-compose", default=os.environ.get("GRAPH_COMPOSE", "memgraph-platform/docker-compose.yml"))
    p.add_argument("--graph-cypherl", default=os.environ.get("GRAPH_CYPHERL", "graph/memgraph-export.cypherl"))
    p.add_argument("--graph-container", default=os.environ.get("GRAPH_CONTAINER", "memgraph-mage"))
    p.add_argument("--graph-marker", default=os.environ.get("GRAPH_MARKER", "memgraph-platform/.graph_imported"))
    p.add_argument("--graph-force-import", action="store_true", default=os.environ.get("GRAPH_FORCE_IMPORT", "").strip() == "1")
    p.add_argument("--write-frontend-env", action="store_true", default=True)
    p.add_argument("--frontend-env-path", default=os.environ.get("FRONTEND_ENV_PATH", "medical-consultation-app/.env.local"))
    args = p.parse_args()

    uvicorn_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        args.app,
        "--host",
        str(args.host),
        "--port",
        str(args.port),
    ]
    if args.reload:
        uvicorn_cmd.append("--reload")

    ngrok_proc: subprocess.Popen | None = None
    uvicorn_proc: subprocess.Popen | None = None

    try:
        repo_root = Path(__file__).resolve().parents[2]
        graph_started = False
        if not args.no_graph:
            compose_path = (repo_root / args.graph_compose).resolve()
            graph_started = _start_memgraph_stack(repo_root, compose_path)
        uvicorn_proc = subprocess.Popen(uvicorn_cmd, cwd=str(repo_root))
        if graph_started:
            cypherl_path = (repo_root / args.graph_cypherl).resolve()
            marker_path = (repo_root / args.graph_marker).resolve()
            if cypherl_path.exists() and (args.graph_force_import or not marker_path.exists()):
                container = str(args.graph_container or "memgraph-mage")
                force = bool(args.graph_force_import)

                def _bg_import():
                    ok = _import_memgraph_data(repo_root, container=container, cypherl_path=cypherl_path, marker_path=marker_path, force=force)
                    if ok:
                        print("Graph import: OK", flush=True)
                    else:
                        print("Graph import: FAILED", flush=True)

                threading.Thread(target=_bg_import, daemon=True).start()

        public_url: str | None = None
        if not args.no_ngrok:
            ngrok = _which("ngrok")
            if not ngrok:
                raise RuntimeError("Không tìm thấy ngrok trong PATH. Cài ngrok và thử lại.")

            token = os.environ.get("NGROK_AUTHTOKEN", "").strip()
            if token:
                subprocess.run([ngrok, "config", "add-authtoken", token], check=False)

            ngrok_cmd = [ngrok, "http", str(args.port), "--log=stdout", "--log-format=json"]
            if args.ngrok_region.strip():
                ngrok_cmd.append(f"--region={args.ngrok_region.strip()}")
            if args.ngrok_domain.strip():
                ngrok_cmd.append(f"--domain={args.ngrok_domain.strip()}")
            ngrok_proc = subprocess.Popen(ngrok_cmd, cwd=str(repo_root))

            deadline = time.time() + 30
            while time.time() < deadline:
                if ngrok_proc.poll() is not None:
                    break
                u = _pick_ngrok_public_url(args.ngrok_api)
                if u:
                    public_url = u
                    break
                time.sleep(0.5)

        local_url = f"http://{args.host}:{args.port}"
        print(f"CPU server local: {local_url}", flush=True)
        if public_url:
            print(f"CPU server public: {public_url}", flush=True)
            print(f"CPU_SERVER_URL={public_url}", flush=True)
            if args.write_frontend_env:
                env_path = Path(args.frontend_env_path)
                _set_env_kv(env_path, "CPU_SERVER_URL", public_url)
                print(f"Updated {env_path.as_posix()} with CPU_SERVER_URL", flush=True)

        if uvicorn_proc:
            return uvicorn_proc.wait()
        return 0
    except KeyboardInterrupt:
        return 0
    finally:
        for proc in [ngrok_proc, uvicorn_proc]:
            try:
                if proc and proc.poll() is None:
                    proc.terminate()
            except Exception:
                pass
        time.sleep(0.5)
        for proc in [ngrok_proc, uvicorn_proc]:
            try:
                if proc and proc.poll() is None:
                    proc.kill()
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
