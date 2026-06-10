"""CPU server bootstrap for LLMOps integration."""

from __future__ import annotations

from typing import Optional

from core_lib.llmops import LlmopsSettings, load_settings
from core_lib.llmops.tracing.langsmith import get_langsmith_tracer


_BOOTSTRAPPED: bool = False
_SETTINGS: Optional[LlmopsSettings] = None


def bootstrap_llmops(*, force_reload: bool = False) -> Optional[LlmopsSettings]:
    global _BOOTSTRAPPED
    global _SETTINGS
    if _BOOTSTRAPPED and not force_reload:
        return _SETTINGS
    try:
        settings = load_settings(force_reload=force_reload)
    except Exception:
        _BOOTSTRAPPED = True
        _SETTINGS = None
        return None
    try:
        get_langsmith_tracer(settings)
    except Exception:
        pass
    _BOOTSTRAPPED = True
    _SETTINGS = settings
    return settings

