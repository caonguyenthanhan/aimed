"""Plain-language evaluation reporting."""

from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel, Field

from ..settings import LlmopsSettings
from .gating import GateDecision


class ExecutiveSummary(BaseModel):
    overall_status: str
    key_findings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


def build_executive_summary(
    settings: LlmopsSettings,
    *,
    summary_scores: Dict[str, float],
    gate: GateDecision,
    run_scope: str,
) -> ExecutiveSummary:
    if not settings.eval.enabled:
        return ExecutiveSummary(
            overall_status="Not evaluated",
            key_findings=["Evaluation is disabled by configuration."],
            recommendations=["Enable evaluation in the LLMOps configuration to establish quality baselines."],
        )

    if not summary_scores:
        return ExecutiveSummary(
            overall_status="Not evaluated",
            key_findings=["No measurable results were produced by the evaluation run."],
            recommendations=["Verify model endpoints and credentials, then rerun evaluation to generate a baseline."],
        )

    status = "Release gate: PASS" if gate.passed else "Release gate: FAIL"
    findings: List[str] = []
    recs: List[str] = []

    findings.append(f"Scope: {run_scope}.")

    for chk in gate.checks:
        label = chk.label or chk.dimension
        if chk.passed:
            findings.append(f"{label}: meets the current release standard.")
            continue
        if chk.reason == "below_minimum_quality":
            findings.append(f"{label}: below the minimum accepted quality threshold.")
            recs.append(f"Strengthen retrieval and grounding for {label.lower()} before release.")
        elif chk.reason == "regression_vs_baseline":
            findings.append(f"{label}: quality regression compared to the established baseline.")
            recs.append(f"Investigate changes impacting {label.lower()} and restore baseline performance.")
        elif chk.reason == "missing_current_score":
            findings.append(f"{label}: could not be measured in this run.")
            recs.append(f"Ensure required evaluation dependencies and judge endpoints are reachable for {label.lower()}.")
        else:
            findings.append(f"{label}: did not meet the gate due to {chk.reason}.")
            recs.append(f"Review the evaluation configuration for {label.lower()} and rerun.")

    if not recs and gate.passed:
        recs.append("Maintain current quality controls and continue monitoring for regressions.")

    return ExecutiveSummary(overall_status=status, key_findings=_dedupe(findings), recommendations=_dedupe(recs))


def _dedupe(items: List[str]) -> List[str]:
    out: List[str] = []
    seen = set()
    for x in items:
        s = str(x).strip()
        if not s:
            continue
        if s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out

