from typing import Any, Dict, List, Optional, TypedDict


class AgentState(TypedDict, total=False):
    message: str
    user_id: str
    conversation_id: str
    agent_id: str
    include_tools: bool
    tool_requests: List[Dict[str, Any]]
    tool_results: Dict[str, Any]
    tool_durations: Dict[str, int]
    tool_elapsed_ms: int
    response: str
    actions: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    started_at: str
    provider: str
    model: str
    agent_profile: str
    intent: Dict[str, Any]
    route_decision: Dict[str, Any]
    blocked: bool
    guardrails: Dict[str, Any]
