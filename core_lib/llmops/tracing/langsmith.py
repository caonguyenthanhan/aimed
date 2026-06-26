"""LangSmith tracing integration.

This module uses the `langsmith` SDK directly to create runs for:
- LangGraph state transitions (node spans)
- Tool execution
- LLM calls (including latency and token usage if available)
"""

from __future__ import annotations

from dataclasses import dataclass
import contextvars
import os
from typing import Any, Dict, Optional

from ..settings import LlmopsSettings

active_span: contextvars.ContextVar[Optional[LangsmithRun]] = contextvars.ContextVar("active_span", default=None)


def _truncate(obj: Any, *, max_chars: int) -> Any:
    if max_chars <= 0:
        return obj
    if isinstance(obj, str):
        return obj[:max_chars] if len(obj) > max_chars else obj
    try:
        s = str(obj)
        return s[:max_chars] if len(s) > max_chars else s
    except Exception:
        return None


@dataclass
class LangsmithRun:
    run: Any


@dataclass
class LangsmithTracer:
    project: str
    endpoint: str
    sample_rate: float
    log_inputs: bool
    log_outputs: bool
    max_payload_chars: int

    def start_run(
        self,
        *,
        name: str,
        run_type: str,
        inputs: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        parent: Optional[LangsmithRun] = None,
    ) -> Optional[LangsmithRun]:
        if self.sample_rate <= 0:
            return None
        try:
            from langsmith.run_trees import RunTree  # type: ignore
        except Exception:
            return None
        try:
            if parent is None:
                parent = active_span.get()
            payload_inputs = inputs if (self.log_inputs and inputs is not None) else {}
            payload_outputs: Dict[str, Any] = {}
            rt = RunTree(
                name=name,
                run_type=run_type,
                inputs=_truncate(payload_inputs, max_chars=self.max_payload_chars),
                outputs=_truncate(payload_outputs, max_chars=self.max_payload_chars),
                metadata=_truncate(metadata or {}, max_chars=self.max_payload_chars),
                project_name=self.project,
            )
            if parent is not None and getattr(parent.run, "id", None) is not None:
                rt.parent_run_id = parent.run.id
            rt.post()
            return LangsmithRun(run=rt)
        except Exception:
            return None

    def end_run(
        self,
        run: Optional[LangsmithRun],
        *,
        outputs: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ) -> None:
        if run is None:
            return
        try:
            if error:
                run.run.error = error
            if self.log_outputs and outputs is not None:
                run.run.outputs = _truncate(outputs, max_chars=self.max_payload_chars)
            run.run.patch()
        except Exception:
            return


_TRACER: Optional[LangsmithTracer] = None


def get_langsmith_tracer(settings: LlmopsSettings) -> Optional[LangsmithTracer]:
    global _TRACER
    if _TRACER is not None:
        return _TRACER
    if not settings.tracing.enabled:
        return None
    if settings.tracing.provider != "langsmith":
        return None
    ls = settings.tracing.langsmith
    if not ls.enabled:
        return None
    if not (os.environ.get("LANGSMITH_API_KEY") or "").strip():
        return None

    os.environ.setdefault("LANGSMITH_TRACING", "true" if ls.tracing else "false")
    os.environ.setdefault("LANGSMITH_PROJECT", ls.project)
    os.environ.setdefault("LANGSMITH_ENDPOINT", ls.endpoint)
    _TRACER = LangsmithTracer(
        project=ls.project,
        endpoint=ls.endpoint,
        sample_rate=float(ls.sample_rate),
        log_inputs=bool(ls.log_inputs),
        log_outputs=bool(ls.log_outputs),
        max_payload_chars=int(ls.max_payload_chars),
    )
    return _TRACER
