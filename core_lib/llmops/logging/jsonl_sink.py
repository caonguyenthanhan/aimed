"""JSONL sinks for LLMOps logs."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any, Dict, Optional

from ..settings import LlmopsSettings
from .models import LlmopsEvent, LlmopsMetric


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _truncate_payload(payload: Dict[str, Any], max_bytes: int) -> Dict[str, Any]:
    if max_bytes <= 0:
        return payload
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(raw) <= max_bytes:
        return payload
    out: Dict[str, Any] = dict(payload)
    meta = out.get("metadata") if isinstance(out.get("metadata"), dict) else None
    if meta is not None:
        trimmed: Dict[str, Any] = {}
        for k, v in meta.items():
            sv = str(v)
            trimmed[k] = sv[:3000] if len(sv) > 3000 else v
        out["metadata"] = trimmed
    msg = str(out.get("message") or "")
    if msg and len(msg) > 1500:
        out["message"] = msg[:1500]
    raw2 = json.dumps(out, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(raw2) <= max_bytes:
        return out
    out["metadata"] = {}
    return out


@dataclass(frozen=True)
class JsonlSink:
    events_path: Path
    metrics_path: Path
    max_record_bytes: int

    @staticmethod
    def from_settings(settings: LlmopsSettings) -> Optional["JsonlSink"]:
        if not settings.logging.enabled:
            return None
        jsonl_cfg = settings.logging.sinks.jsonl
        if not jsonl_cfg.enabled:
            return None
        root = _repo_root()
        events_path = (root / jsonl_cfg.events_path).resolve()
        metrics_path = (root / jsonl_cfg.metrics_path).resolve()
        return JsonlSink(events_path=events_path, metrics_path=metrics_path, max_record_bytes=int(jsonl_cfg.max_record_bytes))

    def emit_event(self, event: LlmopsEvent) -> None:
        payload = _truncate_payload(event.model_dump(mode="json"), self.max_record_bytes)
        self._append_json(self.events_path, payload)

    def emit_metric(self, metric: LlmopsMetric) -> None:
        payload = _truncate_payload(metric.model_dump(mode="json"), self.max_record_bytes)
        self._append_json(self.metrics_path, payload)

    def log_eval_run(self, run_result: Any) -> None:
        import datetime
        ts = datetime.datetime.utcnow().isoformat()
        self.emit_event(
            LlmopsEvent(
                ts=ts,
                type="eval_run_result",
                source="cpu_server.eval",
                message=f"Evaluation run completed: {run_result.run_id}",
                severity="info",
                metadata={
                    "run_id": run_result.run_id,
                    "summary_scores": run_result.summary_scores,
                    "metadata": run_result.metadata,
                },
            )
        )
        for k, v in run_result.summary_scores.items():
            self.emit_metric(
                LlmopsMetric(
                    ts=ts,
                    name=f"eval.score.{k}",
                    value=float(v),
                    tags={"run_id": run_result.run_id},
                    metadata={"run_id": run_result.run_id},
                )
            )

    def _append_json(self, path: Path, payload: Dict[str, Any]) -> None:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            line = json.dumps(payload, ensure_ascii=False)
            with path.open("a", encoding="utf-8") as f:
                f.write(line + "\n")
        except Exception:
            return

