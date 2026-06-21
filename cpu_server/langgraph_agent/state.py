from __future__ import annotations

from typing import Any, Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field


RiskLevel = Literal["unknown", "low", "moderate", "high", "emergency"]


class AgentState(BaseModel):
    """Pydantic v2 state schema for the LangGraph medical agent."""

    message: str = ""
    user_id: str = "anonymous"
    conversation_id: str = ""
    agent_id: str = "auto"
    include_tools: bool = True
    tool_requests: List[Dict[str, Any]] = Field(default_factory=list)
    tool_results: Dict[str, Any] = Field(default_factory=dict)
    tool_durations: Dict[str, int] = Field(default_factory=dict)
    tool_elapsed_ms: int = 0
    response: str = ""
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    started_at: str = ""
    provider: str = ""
    model: str = ""
    agent_profile: str = "default"
    next_node: str = "supervisor"
    clinical_hold: bool = False
    stealth_phq9: int = -1
    stealth_gad7: int = -1
    intent: Dict[str, Any] = Field(default_factory=dict)
    route_decision: Dict[str, Any] = Field(default_factory=dict)
    blocked: bool = False
    guardrails: Dict[str, Any] = Field(default_factory=dict)
    symptoms_collected: List[str] = Field(default_factory=list)
    risk_level: RiskLevel = "unknown"
    ready_for_cta: bool = False
    triage_follow_up_questions: List[str] = Field(default_factory=list)
    semantic_router_trace: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")
