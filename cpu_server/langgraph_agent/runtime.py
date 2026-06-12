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
    return {
        "response": str(out.get("response") or ""),
        "actions": out.get("actions") or [],
        "metadata": out.get("metadata") or {},
        "conversation_id": conversation_id,
    }
