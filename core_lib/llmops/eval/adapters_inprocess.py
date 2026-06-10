"""In-process adapter that runs LangGraph directly (no HTTP)."""

from __future__ import annotations

import datetime
from typing import Any, Dict, List

from ..settings import LlmopsSettings
from .schemas import EvalSample, EvalSampleResult


def run_inprocess_samples(
    settings: LlmopsSettings,
    *,
    samples: List[EvalSample],
    user_id: str,
    conversation_id_prefix: str,
    agent_id: str = "auto",
    include_tools: bool = True,
) -> List[EvalSampleResult]:
    if not settings.eval.inprocess.enabled:
        return []
    try:
        from cpu_server.langgraph_agent.runtime import invoke_agent  # type: ignore
    except Exception:
        return []

    out: List[EvalSampleResult] = []
    for i, s in enumerate(samples):
        conv_id = f"{conversation_id_prefix}-{i}"
        try:
            data = invoke_agent(
                message=s.question,
                user_id=user_id,
                conversation_id=conv_id,
                agent_id=agent_id,
                include_tools=bool(include_tools),
            )
        except Exception:
            continue
        answer = str(data.get("response") or "").strip()
        meta = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
        contexts = _extract_contexts(meta)
        out.append(
            EvalSampleResult(
                id=s.id,
                question=s.question,
                answer=answer,
                contexts=contexts,
                ground_truth=s.ground_truth,
                metadata={"mode": "inprocess", "ts": datetime.datetime.utcnow().isoformat()},
            )
        )
    return out


def _extract_contexts(metadata: Dict[str, Any]) -> List[str]:
    ctxs: List[str] = []
    if isinstance(metadata.get("rag_contexts"), list):
        for x in metadata.get("rag_contexts")[:20]:
            if isinstance(x, str) and x.strip():
                ctxs.append(x.strip())
    if not ctxs:
        raw = metadata.get("rag_context")
        if isinstance(raw, str) and raw.strip():
            ctxs.append(raw.strip())
    return ctxs

