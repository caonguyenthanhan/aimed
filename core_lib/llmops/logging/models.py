"""LLMOps log schemas.

These schemas are designed to be compatible with the existing JSONL-based
observability artifacts already used by the Next.js gateway.
"""

from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field
from pydantic.config import ConfigDict


class LlmopsEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    ts: str = Field(..., description="ISO-8601 timestamp")
    type: str = Field(..., description="Event type")
    source: str = Field(..., description="Producer (e.g. cpu_server.langgraph)")
    message: str = Field(..., description="Human-readable message")
    severity: Literal["debug", "info", "warn", "error"] = "info"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LlmopsMetric(BaseModel):
    model_config = ConfigDict(extra="allow")

    ts: str = Field(..., description="ISO-8601 timestamp")
    name: str = Field(..., description="Metric name")
    value: float = Field(..., description="Metric value")
    unit: Optional[str] = Field(default=None, description="Unit of the metric")
    tags: Dict[str, str] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

