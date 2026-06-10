"""LangChain callback adapters for LangSmith.

The CPU agent currently uses custom HTTP calls for the LLM provider.
This module exists so that future LCEL/LlamaIndex components can share
the same tracing configuration.
"""

from __future__ import annotations

from typing import Any, Optional

from ..settings import LlmopsSettings
from .langsmith import get_langsmith_tracer


def ensure_langchain_langsmith(settings: LlmopsSettings) -> Optional[Any]:
    tracer = get_langsmith_tracer(settings)
    if tracer is None:
        return None
    try:
        from langchain_core.callbacks import CallbackManager  # type: ignore
        from langchain_core.tracers.langchain import LangChainTracer  # type: ignore
    except Exception:
        return None
    try:
        lc_tracer = LangChainTracer(project_name=tracer.project)
        return CallbackManager(handlers=[lc_tracer])
    except Exception:
        return None

