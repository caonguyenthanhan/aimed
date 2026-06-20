from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence
from urllib.parse import urlparse


class SyncError(RuntimeError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class SyncSettings:
    repo_root: Path
    app_dir: Path
    env_file: Path
    variable_name: str
    environment: str
    deploy_flag: str
    vercel_executable: str


@dataclass(frozen=True)
class CommandResult:
    command: tuple[str, ...]
    returncode: int
    stdout: str
    stderr: str

    @property
    def combined_output(self) -> str:
        return "\n".join(part for part in (self.stdout.strip(), self.stderr.strip()) if part).strip()


@dataclass(frozen=True)
class Summary:
    cpu_server_url: str
    vercel_account: str
    production_url: str
    deploy_url: str
    app_dir: str


VERCEL_IGNORE_ENTRIES: tuple[str, ...] = (
    ".next",
    ".next/**",
    "node_modules",
    "node_modules/**",
    ".git",
    ".git/**",
    ".vercel",
    ".vercel/**",
    "coverage",
    "coverage/**",
    "dist",
    "dist/**",
    "out",
    "out/**",
    "tmp",
    "tmp/**",
    "temp",
    "temp/**",
    "*.log",
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync CPU_SERVER_URL from medical-consultation-app/.env.local to Vercel production and trigger a prod deploy."
    )
    parser.add_argument("--app-dir", default="medical-consultation-app")
    parser.add_argument("--env-file", default="")
    parser.add_argument("--variable-name", default="CPU_SERVER_URL")
    parser.add_argument("--environment", default="production")
    parser.add_argument("--deploy-flag", default="--prod")
    return parser.parse_args()


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise SyncError(f"env_file_missing:{path}") from exc
    except Exception as exc:
        raise SyncError(f"env_file_unreadable:{type(exc).__name__}") from exc


def _strip_wrapped_quotes(value: str) -> str:
    text = value.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {"'", '"'}:
        return text[1:-1].strip()
    return text


def _read_env_value(env_file: Path, key: str) -> str:
    raw = _read_text(env_file)
    pattern = re.compile(rf"^\s*{re.escape(key)}\s*=\s*(.*?)\s*$", re.MULTILINE)
    match = pattern.search(raw)
    if not match:
        raise SyncError(f"missing_env_value:{key}")
    value = _strip_wrapped_quotes(match.group(1))
    if not value:
        raise SyncError(f"empty_env_value:{key}")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SyncError(f"invalid_url:{key}")
    return value


def _run_command(
    command: Sequence[str],
    cwd: Path,
    input_text: str | None = None,
    allow_failure: bool = False,
) -> CommandResult:
    try:
        completed = subprocess.run(
            list(command),
            cwd=str(cwd),
            input=input_text,
            text=True,
            capture_output=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise SyncError(f"command_not_found:{command[0]}") from exc
    except Exception as exc:
        raise SyncError(f"command_failed_to_start:{command[0]}:{type(exc).__name__}") from exc

    result = CommandResult(
        command=tuple(str(item) for item in command),
        returncode=int(completed.returncode),
        stdout=completed.stdout or "",
        stderr=completed.stderr or "",
    )
    if allow_failure or result.returncode == 0:
        return result
    raise SyncError(_short_error(f"command_failed:{command[0]}", result.combined_output))


def _resolve_vercel_executable() -> str:
    candidates = ["vercel", "vercel.cmd", "vercel.exe", "vercel.ps1"]
    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    appdata = str(Path.home() / "AppData" / "Roaming" / "npm")
    for name in ("vercel.cmd", "vercel.exe", "vercel.ps1", "vercel"):
        path = Path(appdata) / name
        if path.exists():
            return str(path)

    raise SyncError("command_not_found:vercel")


def _short_error(prefix: str, output: str) -> str:
    compact = " ".join(str(output or "").split())
    if not compact:
        return prefix
    if len(compact) > 220:
        compact = compact[:220].rstrip()
    return f"{prefix}:{compact}"


def _extract_first_nonempty_line(text: str) -> str:
    for line in text.splitlines():
        cleaned = line.strip()
        if cleaned:
            return cleaned
    return ""


def _ensure_vercelignore(app_dir: Path) -> Path:
    vercelignore_path = app_dir / ".vercelignore"
    existing_lines: list[str] = []
    if vercelignore_path.exists():
        existing_lines = vercelignore_path.read_text(encoding="utf-8").splitlines()

    merged: list[str] = []
    seen: set[str] = set()
    for line in existing_lines:
        normalized = line.strip()
        if normalized and normalized not in seen:
            merged.append(normalized)
            seen.add(normalized)
    for entry in VERCEL_IGNORE_ENTRIES:
        if entry not in seen:
            merged.append(entry)
            seen.add(entry)

    content = "\n".join(merged).strip() + "\n"
    vercelignore_path.write_text(content, encoding="utf-8")
    return vercelignore_path


def _safe_remove_dir(path: Path) -> None:
    if not path.exists():
        return
    if not path.is_dir():
        return
    try:
        shutil.rmtree(path)
    except Exception as exc:
        raise SyncError(f"cleanup_failed:{path.name}:{type(exc).__name__}") from exc


def _preflight_cleanup(app_dir: Path) -> Path:
    vercelignore_path = _ensure_vercelignore(app_dir)
    _safe_remove_dir(app_dir / ".next")
    _safe_remove_dir(app_dir / ".turbo")
    return vercelignore_path


def _check_vercel_cli(app_dir: Path, vercel_executable: str) -> str:
    version_result = _run_command((vercel_executable, "--version"), cwd=app_dir)
    version = _extract_first_nonempty_line(version_result.combined_output)
    if not version:
        raise SyncError("vercel_version_unavailable")
    return version


def _check_vercel_login(app_dir: Path, vercel_executable: str) -> str:
    whoami_result = _run_command((vercel_executable, "whoami"), cwd=app_dir, allow_failure=True)
    if whoami_result.returncode != 0:
        raise SyncError(_short_error("vercel_not_logged_in", whoami_result.combined_output))
    account = _extract_first_nonempty_line(whoami_result.stdout) or _extract_first_nonempty_line(whoami_result.stderr)
    if not account:
        raise SyncError("vercel_account_unavailable")
    return account


def _remove_env_var(app_dir: Path, vercel_executable: str, variable_name: str, environment: str) -> None:
    result = _run_command(
        (vercel_executable, "env", "rm", variable_name, environment, "-y"),
        cwd=app_dir,
        allow_failure=True,
    )
    if result.returncode == 0:
        return
    combined = result.combined_output.lower()
    if "not found" in combined or "does not exist" in combined or "could not find" in combined:
        return
    raise SyncError(_short_error("vercel_env_rm_failed", result.combined_output))


def _add_env_var(app_dir: Path, vercel_executable: str, variable_name: str, environment: str, value: str) -> None:
    result = _run_command(
        (vercel_executable, "env", "add", variable_name, environment),
        cwd=app_dir,
        input_text=value + "\n",
        allow_failure=True,
    )
    if result.returncode == 0:
        return
    raise SyncError(_short_error("vercel_env_add_failed", result.combined_output))


def _extract_urls(text: str) -> list[str]:
    return re.findall(r"https://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+", text or "")


def _select_deploy_urls(output: str) -> tuple[str, str]:
    urls = _extract_urls(output)
    cleaned: list[str] = []
    for url in urls:
        trimmed = url.rstrip(").,]")
        if trimmed not in cleaned:
            cleaned.append(trimmed)
    if not cleaned:
        raise SyncError("vercel_deploy_url_missing")

    production_url = ""
    deploy_url = cleaned[0]
    lines = output.splitlines()
    for line in lines:
        lowered = line.lower()
        line_urls = _extract_urls(line)
        if not line_urls:
            continue
        candidate = line_urls[-1].rstrip(").,]")
        if "production" in lowered or "prod" in lowered:
            production_url = candidate
        if "inspect" in lowered or "preview" in lowered or "deployment" in lowered:
            deploy_url = candidate
    if not production_url:
        vercel_app = [url for url in cleaned if ".vercel.app" in url]
        production_url = vercel_app[-1] if vercel_app else cleaned[-1]
    return production_url, deploy_url


def _deploy_prod(app_dir: Path, vercel_executable: str, deploy_flag: str) -> tuple[str, str]:
    result = _run_command(
        (vercel_executable, deploy_flag, "--yes"),
        cwd=app_dir,
        allow_failure=True,
    )
    if result.returncode != 0:
        raise SyncError(_short_error("vercel_deploy_failed", result.combined_output))
    return _select_deploy_urls(result.combined_output)


def _print_summary(summary: Summary) -> None:
    rows = [
        ("App Dir", summary.app_dir),
        ("CPU_SERVER_URL", summary.cpu_server_url),
        ("Vercel Account", summary.vercel_account),
        ("Production URL", summary.production_url),
        ("Deploy URL", summary.deploy_url),
    ]
    key_width = max(len(key) for key, _ in rows)
    value_width = max(len(value) for _, value in rows)
    line = f"+-{'-' * key_width}-+-{'-' * value_width}-+"
    print("")
    print("=== Vercel Sync Summary ===")
    print(line)
    for key, value in rows:
        print(f"| {key.ljust(key_width)} | {value.ljust(value_width)} |")
    print(line)


def _build_settings(args: argparse.Namespace) -> SyncSettings:
    repo_root = Path(__file__).resolve().parents[1]
    app_dir = Path(args.app_dir)
    if not app_dir.is_absolute():
        app_dir = (repo_root / app_dir).resolve()
    env_file_arg = str(args.env_file or "").strip()
    env_file = Path(env_file_arg) if env_file_arg else app_dir / ".env.local"
    if not env_file.is_absolute():
        env_file = (repo_root / env_file).resolve()
    return SyncSettings(
        repo_root=repo_root,
        app_dir=app_dir,
        env_file=env_file,
        variable_name=str(args.variable_name).strip() or "CPU_SERVER_URL",
        environment=str(args.environment).strip() or "production",
        deploy_flag=str(args.deploy_flag).strip() or "--prod",
        vercel_executable=_resolve_vercel_executable(),
    )


def main() -> int:
    try:
        settings = _build_settings(_parse_args())

        print("[1/5] Reading CPU_SERVER_URL from .env.local...", flush=True)
        cpu_server_url = _read_env_value(settings.env_file, settings.variable_name)

        print("[2/5] Checking Vercel CLI and login...", flush=True)
        _check_vercel_cli(settings.app_dir, settings.vercel_executable)
        account = _check_vercel_login(settings.app_dir, settings.vercel_executable)

        print("[3/5] Syncing Vercel production env...", flush=True)
        _remove_env_var(settings.app_dir, settings.vercel_executable, settings.variable_name, settings.environment)
        _add_env_var(settings.app_dir, settings.vercel_executable, settings.variable_name, settings.environment, cpu_server_url)

        print("[4/5] Preparing deploy scope...", flush=True)
        _preflight_cleanup(settings.app_dir)

        print("[5/5] Triggering production deploy...", flush=True)
        production_url, deploy_url = _deploy_prod(settings.app_dir, settings.vercel_executable, settings.deploy_flag)

        print("[6/6] Done.", flush=True)
        _print_summary(
            Summary(
                cpu_server_url=cpu_server_url,
                vercel_account=account,
                production_url=production_url,
                deploy_url=deploy_url,
                app_dir=str(settings.app_dir),
            )
        )
        return 0
    except SyncError as exc:
        print(f"ERR {exc.code}", file=sys.stderr, flush=True)
        return 1
    except KeyboardInterrupt:
        print("ERR interrupted", file=sys.stderr, flush=True)
        return 1
    except Exception as exc:
        print(f"ERR unexpected:{type(exc).__name__}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
