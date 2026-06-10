"""CLI runner for LLMOps evaluation (RAGAS)."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
import uuid

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from core_lib.llmops import load_settings
from core_lib.llmops.eval.adapters_blackbox import run_blackbox_samples
from core_lib.llmops.eval.adapters_inprocess import run_inprocess_samples
from core_lib.llmops.eval.dataset_io import load_jsonl_dataset
from core_lib.llmops.eval.gating import evaluate_gate, write_baseline
from core_lib.llmops.eval.ragas_runner import run_ragas_evaluation
from core_lib.llmops.eval.reporting import build_executive_summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["inprocess", "blackbox", "both"], default="both")
    parser.add_argument("--user-id", default="eval-user")
    parser.add_argument("--agent-id", default="auto")
    parser.add_argument("--include-tools", action="store_true", default=True)
    parser.add_argument("--write-baseline", action="store_true", default=False)
    parser.add_argument("--report-path", default="")
    args = parser.parse_args()

    settings = load_settings()
    ok, missing = _preflight_judge_env(settings)
    if not ok:
        print("Evaluation cannot start because judge model credentials/endpoints are not configured.")
        for m in missing:
            print(f"- Missing: {m}")
        print("Action: Configure either the primary LLMOPS_EVAL_* variables or the Foza fallback variables, then rerun.")
        return 5

    dataset_path = _REPO_ROOT / settings.eval.dataset.sample_path
    samples = load_jsonl_dataset(dataset_path)
    if not samples:
        print(f"No samples found at: {dataset_path}")
        return 2

    run_id = uuid.uuid4().hex[:8]
    all_results = []
    if args.mode in ("inprocess", "both"):
        all_results.extend(
            run_inprocess_samples(
                settings,
                samples=samples,
                user_id=str(args.user_id),
                conversation_id_prefix=f"llmops-inprocess-{run_id}",
                agent_id=str(args.agent_id),
                include_tools=bool(args.include_tools),
            )
        )
    if args.mode in ("blackbox", "both"):
        all_results.extend(
            run_blackbox_samples(
                settings,
                samples=samples,
                user_id=str(args.user_id),
                conversation_id_prefix=f"llmops-blackbox-{run_id}",
                agent_id=str(args.agent_id),
                include_tools=bool(args.include_tools),
            )
        )

    if not all_results:
        print("No evaluation results generated. Check provider env and CPU server connectivity.")
        return 3

    try:
        out = run_ragas_evaluation(settings, sample_results=all_results, run_id=f"ragas-{run_id}")
    except Exception as e:
        print("Evaluation failed to complete due to a missing dependency or unreachable judge endpoint.")
        print(f"Error: {e}")
        return 4

    if args.write_baseline:
        ok, msg = write_baseline(settings, summary_scores=out.summary_scores)
        if ok:
            print(f"Baseline updated: {msg}")
        else:
            print(f"Baseline update failed: {msg}")

    gate = evaluate_gate(settings, summary_scores=out.summary_scores)
    run_scope = args.mode
    summary = build_executive_summary(settings, summary_scores=out.summary_scores, gate=gate, run_scope=run_scope)

    print("Executive Summary:")
    print(f"- Status: {summary.overall_status}")
    print("- Findings:")
    for x in summary.key_findings:
        print(f"  - {x}")
    print("- Recommendations:")
    for x in summary.recommendations:
        print(f"  - {x}")

    rp = str(args.report_path or "").strip()
    if rp:
        path = (Path(rp) if Path(rp).is_absolute() else (_REPO_ROOT / rp)).resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(_render_report_md(summary), encoding="utf-8")
        print(f"Report written: {path}")

    if not gate.passed and settings.eval.gating.enabled:
        return 10
    return 0


def _render_report_md(summary: object) -> str:
    if not hasattr(summary, "overall_status"):
        return ""
    overall = str(getattr(summary, "overall_status") or "")
    findings = list(getattr(summary, "key_findings") or [])
    recs = list(getattr(summary, "recommendations") or [])
    lines = ["# LLMOps Evaluation Report", "", f"**Status:** {overall}", "", "## Key Findings"]
    for x in findings:
        lines.append(f"- {str(x)}")
    lines.extend(["", "## Recommendations"])
    for x in recs:
        lines.append(f"- {str(x)}")
    lines.append("")
    return "\n".join(lines)


def _preflight_judge_env(settings) -> tuple[bool, list[str]]:
    import os

    llm = settings.eval.ragas.llm
    emb = settings.eval.ragas.embeddings

    def _has_primary(base_env: str, key_env: str) -> bool:
        return bool((os.environ.get(base_env) or "").strip()) and bool((os.environ.get(key_env) or "").strip())

    def _has_fallback(base_env: str, key_envs: list[str]) -> bool:
        if not bool((os.environ.get(base_env) or "").strip()):
            return False
        for k in key_envs:
            if bool((os.environ.get(str(k) or "") or "").strip()):
                return True
        return False

    llm_ok = _has_primary(llm.base_url_env, llm.api_key_env) or _has_fallback(getattr(llm, "fallback_base_url_env", ""), list(getattr(llm, "fallback_api_key_envs", []) or []))
    emb_ok = _has_primary(emb.base_url_env, emb.api_key_env) or _has_fallback(getattr(emb, "fallback_base_url_env", ""), list(getattr(emb, "fallback_api_key_envs", []) or []))

    missing: list[str] = []
    if not llm_ok:
        missing.append(f"{llm.base_url_env} + {llm.api_key_env} (or Foza fallback)")
    if not emb_ok:
        missing.append(f"{emb.base_url_env} + {emb.api_key_env} (or Foza fallback)")
    return (len(missing) == 0), missing


if __name__ == "__main__":
    raise SystemExit(main())
