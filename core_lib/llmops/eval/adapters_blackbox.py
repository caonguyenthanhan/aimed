"""Blackbox adapter that evaluates the running HTTP API."""

from __future__ import annotations

import datetime
import os
from typing import Any, Dict, List

import requests

from ..settings import LlmopsSettings
from .schemas import EvalSample, EvalSampleResult


def run_blackbox_samples(
    settings: LlmopsSettings,
    *,
    samples: List[EvalSample],
    user_id: str,
    conversation_id_prefix: str,
    agent_id: str = "auto",
    include_tools: bool = True,
) -> List[EvalSampleResult]:
    base_env = str(settings.eval.blackbox.base_url_env or "").strip() or "CPU_SERVER_URL"
    base_url = str(os.environ.get(base_env) or "").strip()
    if not base_url:
        return []
    base_url = base_url.rstrip("/")
    endpoint = str(settings.eval.blackbox.endpoint_path or "").strip() or "/v1/agent-chat"
    url = base_url + endpoint
    timeout_s = float(settings.eval.blackbox.timeout_s or 60)

    out: List[EvalSampleResult] = []
    for i, s in enumerate(samples):
        conv_id = f"{conversation_id_prefix}-{i}"
        payload = {
            "message": s.question,
            "user_id": user_id,
            "conversation_id": conv_id,
            "agent_id": agent_id,
            "include_tools": bool(include_tools),
        }
        try:
            resp = requests.post(url, json=payload, timeout=timeout_s)
            resp.encoding = "utf-8"
            if not resp.ok:
                continue
            data = resp.json()
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
                metadata={
                    "mode": "blackbox",
                    "ts": datetime.datetime.utcnow().isoformat(),
                    "llm_context": meta.get("llm_context"),
                },
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
