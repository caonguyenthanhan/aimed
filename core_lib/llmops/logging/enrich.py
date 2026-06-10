"""Helpers for creating safe log payloads."""

from __future__ import annotations

from typing import Any, Dict, Iterable, Optional


def redact_keys(obj: Any, *, keys: Iterable[str]) -> Any:
    if isinstance(obj, dict):
        out: Dict[str, Any] = {}
        keyset = {str(k).lower() for k in keys}
        for k, v in obj.items():
            if str(k).lower() in keyset:
                out[k] = "***"
            else:
                out[k] = redact_keys(v, keys=keys)
        return out
    if isinstance(obj, list):
        return [redact_keys(x, keys=keys) for x in obj]
    return obj


def safe_snapshot(state: Dict[str, Any], *, max_chars: int) -> Dict[str, Any]:
    max_chars = max(0, int(max_chars))
    out: Dict[str, Any] = {}
    for k, v in state.items():
        if k in ("tool_results",):
            out[k] = _truncate_str(v, max_chars=max_chars)
            continue
        if k in ("message", "response"):
            out[k] = _truncate_str(str(v), max_chars=max_chars)
            continue
        out[k] = v
    return out


def _truncate_str(obj: Any, *, max_chars: int) -> Any:
    if max_chars <= 0:
        return obj
    if isinstance(obj, str):
        return obj[:max_chars] if len(obj) > max_chars else obj
    try:
        s = str(obj)
        return s[:max_chars] if len(s) > max_chars else s
    except Exception:
        return None


def get_str(d: Dict[str, Any], key: str) -> Optional[str]:
    v = d.get(key)
    if isinstance(v, str):
        return v
    if v is None:
        return None
    return str(v)

