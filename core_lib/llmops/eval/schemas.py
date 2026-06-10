"""Evaluation schemas (Pydantic v2)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EvalSample(BaseModel):
    id: str
    question: str
    ground_truth: Optional[str] = None
    contexts: List[str] = Field(default_factory=list)
    answer: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvalSampleResult(BaseModel):
    id: str
    question: str
    answer: str
    contexts: List[str] = Field(default_factory=list)
    ground_truth: Optional[str] = None
    scores: Dict[str, float] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvalRunResult(BaseModel):
    run_id: str
    summary_scores: Dict[str, float] = Field(default_factory=dict)
    samples: List[EvalSampleResult] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

