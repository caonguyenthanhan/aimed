"""Evaluation gating for release readiness."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

from ..settings import LlmopsSettings


class GateCheck(BaseModel):
    dimension: str
    label: str
    current: Optional[float] = None
    baseline: Optional[float] = None
    passed: bool
    reason: str


class GateDecision(BaseModel):
    passed: bool
    checks: List[GateCheck] = Field(default_factory=list)
    metadata: Dict[str, str] = Field(default_factory=dict)


def evaluate_gate(
    settings: LlmopsSettings,
    *,
    summary_scores: Dict[str, float],
) -> GateDecision:
    if not settings.eval.gating.enabled:
        return GateDecision(passed=True, checks=[], metadata={"enabled": "false"})

    baseline = _load_baseline(settings)
    checks: List[GateCheck] = []
    passed_all = True

    for dim, metrics in (settings.eval.reporting.metric_map or {}).items():
        label = str((settings.eval.reporting.labels or {}).get(dim) or dim)
        current = _aggregate(summary_scores, metrics)
        base = _aggregate(baseline, metrics) if baseline is not None else None
        min_q = _min_quality(settings, dim)
        max_drop = float(settings.eval.gating.max_relative_drop or 0.0)
        chk = _check_dimension(dim=dim, label=label, current=current, baseline=base, min_quality=min_q, max_relative_drop=max_drop)
        checks.append(chk)
        passed_all = passed_all and bool(chk.passed)

    return GateDecision(passed=passed_all, checks=checks, metadata={"enabled": "true"})


def _check_dimension(
    *,
    dim: str,
    label: str,
    current: Optional[float],
    baseline: Optional[float],
    min_quality: Optional[float],
    max_relative_drop: float,
) -> GateCheck:
    if current is None:
        return GateCheck(dimension=dim, label=label, current=None, baseline=baseline, passed=False, reason="missing_current_score")

    if min_quality is not None and current < float(min_quality):
        return GateCheck(
            dimension=dim,
            label=label,
            current=float(current),
            baseline=float(baseline) if baseline is not None else None,
            passed=False,
            reason="below_minimum_quality",
        )

    if baseline is None:
        return GateCheck(
            dimension=dim,
            label=label,
            current=float(current),
            baseline=None,
            passed=True,
            reason="no_baseline_available",
        )

    if baseline <= 0:
        return GateCheck(
            dimension=dim,
            label=label,
            current=float(current),
            baseline=float(baseline),
            passed=True,
            reason="invalid_baseline_non_positive",
        )

    rel_drop = (float(baseline) - float(current)) / float(baseline)
    if rel_drop > float(max_relative_drop):
        return GateCheck(
            dimension=dim,
            label=label,
            current=float(current),
            baseline=float(baseline),
            passed=False,
            reason="regression_vs_baseline",
        )

    return GateCheck(
        dimension=dim,
        label=label,
        current=float(current),
        baseline=float(baseline),
        passed=True,
        reason="passed",
    )


def _aggregate(scores: Dict[str, float], metrics: List[str]) -> Optional[float]:
    if not metrics:
        return None
    vals: List[float] = []
    for m in metrics:
        if m in scores:
            try:
                vals.append(float(scores[m]))
            except Exception:
                continue
    if not vals:
        return None
    return sum(vals) / float(len(vals))


def _min_quality(settings: LlmopsSettings, dim: str) -> Optional[float]:
    raw = (settings.eval.gating.min_quality or {}).get(dim)
    if raw is None:
        return None
    try:
        return float(raw)
    except Exception:
        return None


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_baseline(settings: LlmopsSettings) -> Optional[Dict[str, float]]:
    rel = str(settings.eval.gating.baseline_path or "").strip()
    if not rel:
        return None
    path = (_repo_root() / rel).resolve()
    if not path.exists():
        return None
    try:
        import yaml  # type: ignore
    except Exception:
        return None
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    scores = data.get("summary_scores") if isinstance(data.get("summary_scores"), dict) else data
    if not isinstance(scores, dict):
        return None
    out: Dict[str, float] = {}
    for k, v in scores.items():
        try:
            out[str(k)] = float(v)
        except Exception:
            continue
    return out


def write_baseline(
    settings: LlmopsSettings,
    *,
    summary_scores: Dict[str, float],
) -> Tuple[bool, str]:
    rel = str(settings.eval.gating.baseline_path or "").strip()
    if not rel:
        return False, "missing_baseline_path"
    path = (_repo_root() / rel).resolve()
    try:
        import yaml  # type: ignore
    except Exception as e:
        return False, f"missing_dependency:PyYAML:{e}"
    try:
        payload = {"summary_scores": summary_scores}
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(payload, sort_keys=True), encoding="utf-8")
        return True, str(path)
    except Exception as e:
        return False, str(e)

