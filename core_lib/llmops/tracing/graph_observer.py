"""LangGraph observability wrapper."""

from __future__ import annotations

import datetime
import time
from typing import Any, Callable, Dict, Optional, TypeVar

from ..logging.enrich import redact_keys, safe_snapshot
from ..logging.jsonl_sink import JsonlSink
from ..logging.models import LlmopsEvent, LlmopsMetric
from ..settings import LlmopsSettings
from .langsmith import LangsmithRun, get_langsmith_tracer


TState = TypeVar("TState", bound=Dict[str, Any])


class GraphObserver:
    def __init__(self, *, settings: LlmopsSettings) -> None:
        self._settings = settings
        self._sink = JsonlSink.from_settings(settings)
        self._tracer = get_langsmith_tracer(settings)

    def wrap_node(self, *, node_name: str, fn: Callable[[TState], TState]) -> Callable[[TState], TState]:
        def _wrapped(state: TState) -> TState:
            t0 = time.time()
            ts = datetime.datetime.utcnow().isoformat()
            run: Optional[LangsmithRun] = None
            in_state = safe_snapshot(redact_keys(dict(state), keys=("authorization", "api_key", "token")), max_chars=self._settings.tracing.langsmith.max_payload_chars)
            if self._tracer is not None:
                run = self._tracer.start_run(
                    name=f"langgraph.node.{node_name}",
                    run_type="chain",
                    inputs={"state": in_state},
                    metadata={"node": node_name},
                )

            self._emit_event(
                LlmopsEvent(
                    ts=ts,
                    type="langgraph_node_start",
                    source="cpu_server.langgraph",
                    message=f"LangGraph node start: {node_name}",
                    severity="info",
                    metadata={"node": node_name},
                )
            )

            err: Optional[str] = None
            out_state: Optional[TState] = None
            try:
                out_state = fn(state)
                return out_state
            except Exception as e:
                err = str(e)
                raise
            finally:
                elapsed_ms = int((time.time() - t0) * 1000)
                out_ts = datetime.datetime.utcnow().isoformat()
                out_snapshot = safe_snapshot(redact_keys(dict(out_state or {}), keys=("authorization", "api_key", "token")), max_chars=self._settings.tracing.langsmith.max_payload_chars)
                self._emit_metric(
                    LlmopsMetric(
                        ts=out_ts,
                        name="langgraph.node.latency_ms",
                        value=float(elapsed_ms),
                        unit="ms",
                        tags={"node": node_name},
                        metadata={"node": node_name},
                    )
                )
                self._emit_event(
                    LlmopsEvent(
                        ts=out_ts,
                        type="langgraph_node_end",
                        source="cpu_server.langgraph",
                        message=f"LangGraph node end: {node_name}",
                        severity="error" if err else "info",
                        metadata={"node": node_name, "elapsed_ms": elapsed_ms, "error": err},
                    )
                )
                if self._tracer is not None:
                    self._tracer.end_run(run, outputs={"state": out_snapshot, "elapsed_ms": elapsed_ms}, error=err)

        return _wrapped

    def _emit_event(self, event: LlmopsEvent) -> None:
        if self._sink is None:
            return
        self._sink.emit_event(event)

    def _emit_metric(self, metric: LlmopsMetric) -> None:
        if self._sink is None:
            return
        self._sink.emit_metric(metric)

