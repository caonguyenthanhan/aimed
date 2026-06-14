from __future__ import annotations

import datetime
from typing import Any, Dict, Optional

from .graph import build_graph

_GRAPH = None


def _get_graph():
    global _GRAPH
    if _GRAPH is None:
        try:
            from cpu_server.llmops_bootstrap import bootstrap_llmops
        except Exception:
            bootstrap_llmops = None
        if bootstrap_llmops is not None:
            try:
                bootstrap_llmops()
            except Exception:
                pass
        _GRAPH = build_graph()
    return _GRAPH


def invoke_agent(
    *,
    message: str,
    user_id: str,
    conversation_id: str,
    agent_id: Optional[str] = None,
    include_tools: bool = True,
) -> Dict[str, Any]:
    g = _get_graph()
    state = {
        "message": message,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "agent_id": agent_id or "auto",
        "include_tools": bool(include_tools),
        "started_at": datetime.datetime.utcnow().isoformat(),
    }
    out = g.invoke(state)
    md = out.get("metadata") or {}
    tool_results = out.get("tool_results") or {}
    graph_result = tool_results.get("graph.evidence") or {}
    entities = graph_result.get("entities") or []
    edges = graph_result.get("edges") or []
    graph_injected = bool(entities or edges)
    graph_reason = None if graph_injected else ("graph_empty" if graph_result.get("ok") else "graph_down")
    triage_state = {
        "symptoms_collected": out.get("symptoms_collected") or [],
        "risk_level": str(out.get("risk_level") or "unknown"),
        "ready_for_cta": bool(out.get("ready_for_cta")),
        "follow_up_questions": out.get("triage_follow_up_questions") or [],
        "semantic_router_trace": out.get("semantic_router_trace") or [],
    }
    md["llm_context"] = {
        "provider": md.get("provider", "foza"),
        "mode": "cpu",
        "user_message": message,
        "graph": graph_result,
        "graph_injected": graph_injected,
        "graph_reason": graph_reason,
        "graph_endpoint": "cpu:/v1/graph/evidence",
        "tool_calls_count": len(tool_results),
        "triage": triage_state,
    }
    return {
        "response": str(out.get("response") or ""),
        "actions": out.get("actions") or [],
        "metadata": md,
        "conversation_id": conversation_id,
    }
