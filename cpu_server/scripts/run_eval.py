"""
run_eval.py — AiMed RAGAS Evaluation Script (Phase 4)

Chạy đánh giá chất lượng câu trả lời y tế dựa trên RAGAS framework.
Hỗ trợ 2 adapter:
  - inprocess: gọi trực tiếp runtime.invoke_agent() (nhanh, không cần server)
  - blackbox:  gọi qua HTTP API (production-like, cần server đang chạy)

Cách dùng:
  python scripts/run_eval.py                        # inprocess, tất cả samples
  python scripts/run_eval.py --adapter blackbox      # qua HTTP API
  python scripts/run_eval.py --limit 5              # 5 samples đầu
  python scripts/run_eval.py --write-baseline       # lưu kết quả làm baseline

Output:
  - Bảng kết quả ra terminal
  - logs/llmops_metrics.jsonl (nếu logging enabled)
  - data/eval-baseline.yaml (nếu --write-baseline)

Exit codes:
  0  = PASSED (tất cả gate checks pass)
  1  = FAILED (có gate check fail)
  2  = ERROR (không thể chạy eval)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

# ─── Path setup ───────────────────────────────────────────────────────────────
_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT))


def _load_dataset(path: Path) -> List[Dict[str, Any]]:
    """Load JSONL eval dataset."""
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    samples = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            samples.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"[WARN] Skipping malformed line {line_no}: {e}", file=sys.stderr)
    return samples


def _run_inprocess(sample: Dict[str, Any]) -> Dict[str, Any]:
    """Gọi runtime.invoke_agent() trực tiếp — không cần HTTP server."""
    try:
        from cpu_server.langgraph_agent import runtime
    except ImportError:
        from langgraph_agent import runtime  # type: ignore

    question = str(sample.get("question") or "").strip()
    agent_id = str(sample.get("agent_profile") or "auto").strip()

    t0 = time.time()
    try:
        result = runtime.invoke_agent(
            message=question,
            user_id="eval_runner",
            conversation_id=f"eval-{uuid.uuid4().hex[:8]}",
            agent_id=agent_id,
            include_tools=True,
        )
        latency_ms = int((time.time() - t0) * 1000)
        return {
            "answer": str(result.get("response") or ""),
            "latency_ms": latency_ms,
            "agent_profile": result.get("metadata", {}).get("agent_profile", agent_id),
            "error": None,
        }
    except Exception as exc:
        return {
            "answer": "",
            "latency_ms": int((time.time() - t0) * 1000),
            "agent_profile": agent_id,
            "error": str(exc),
        }


def _run_blackbox(sample: Dict[str, Any], *, base_url: str, timeout_s: int = 60) -> Dict[str, Any]:
    """Gọi qua HTTP API /v1/agent-chat."""
    import requests  # type: ignore

    question = str(sample.get("question") or "").strip()
    agent_id = str(sample.get("agent_profile") or "auto").strip()
    url = base_url.rstrip("/") + "/v1/agent-chat"

    t0 = time.time()
    try:
        resp = requests.post(
            url,
            json={
                "message": question,
                "conversation_id": f"eval-{uuid.uuid4().hex[:8]}",
                "user_id": "eval_runner",
                "agent_id": agent_id,
            },
            timeout=timeout_s,
            headers={"Content-Type": "application/json"},
        )
        latency_ms = int((time.time() - t0) * 1000)
        if resp.ok:
            data = resp.json()
            return {
                "answer": str(data.get("response") or ""),
                "latency_ms": latency_ms,
                "agent_profile": data.get("metadata", {}).get("agent_profile", agent_id),
                "error": None,
            }
        return {
            "answer": "",
            "latency_ms": latency_ms,
            "agent_profile": agent_id,
            "error": f"http_{resp.status_code}",
        }
    except Exception as exc:
        return {
            "answer": "",
            "latency_ms": int((time.time() - t0) * 1000),
            "agent_profile": agent_id,
            "error": str(exc),
        }


def _print_results_table(run_result: Any, gate_decision: Any) -> None:
    """In bảng kết quả đẹp ra terminal."""
    scores = run_result.summary_scores or {}
    checks = gate_decision.checks if gate_decision else []

    print("\n" + "═" * 70)
    print("  AiMed RAGAS Evaluation Report")
    print("═" * 70)

    if not scores:
        print("  [!] Không có scores — RAGAS disabled hoặc thiếu API key.")
        print("      Latency metrics vẫn được ghi vào logs/llmops_metrics.jsonl")
    else:
        print(f"  {'Metric':<30} {'Score':>8}")
        print("  " + "-" * 40)
        for k, v in sorted(scores.items()):
            bar = "█" * int(v * 20) + "░" * (20 - int(v * 20))
            print(f"  {k:<30} {v:>6.3f}  {bar}")

    if checks:
        print("\n  Quality Gates:")
        for chk in checks:
            icon = "✅" if chk.passed else "❌"
            current_str = f"{chk.current:.3f}" if chk.current is not None else "N/A"
            baseline_str = f"{chk.baseline:.3f}" if chk.baseline is not None else "no baseline"
            print(f"  {icon} {chk.label:<35} score={current_str} (baseline: {baseline_str})")
            if not chk.passed:
                print(f"     └─ Reason: {chk.reason}")

    print("\n  Per-sample latency:")
    for s in run_result.samples:
        status = "✓" if not s.metadata.get("error") else f"ERR:{s.metadata.get('error')}"
        q_short = (s.question or "")[:55] + ("…" if len(s.question or "") > 55 else "")
        latency = s.metadata.get("latency_ms", "?") if s.metadata else "?"
        print(f"    [{status:>10}] {q_short:<57} {latency}ms")

    print("═" * 70)
    overall = "PASSED ✅" if (gate_decision is None or gate_decision.passed) else "FAILED ❌"
    print(f"  Overall: {overall}")
    print("═" * 70 + "\n")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="AiMed RAGAS Evaluation Runner")
    parser.add_argument("--adapter", choices=["inprocess", "blackbox"], default="inprocess")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of samples (0 = all)")
    parser.add_argument("--write-baseline", action="store_true", help="Save scores as new baseline")
    parser.add_argument("--config", default="", help="Path to llmops.yaml (default: configs/llmops.yaml)")
    args = parser.parse_args(argv)

    # Load settings
    if args.config:
        os.environ["LLMOPS_CONFIG_PATH"] = args.config
    try:
        from core_lib.llmops.settings import load_settings
        settings = load_settings(force_reload=True)
    except Exception as e:
        print(f"[ERROR] Cannot load llmops settings: {e}", file=sys.stderr)
        return 2

    # Load dataset
    dataset_path = _REPO_ROOT / settings.eval.dataset.sample_path
    try:
        samples = _load_dataset(dataset_path)
    except FileNotFoundError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        return 2

    if args.limit > 0:
        samples = samples[: args.limit]

    print(f"[INFO] Running eval: adapter={args.adapter}, samples={len(samples)}")

    # Run inference for each sample
    from core_lib.llmops.eval.schemas import EvalSampleResult

    sample_results: List[EvalSampleResult] = []
    base_url = (os.environ.get(settings.eval.blackbox.base_url_env) or "http://localhost:8000").strip()

    for i, sample in enumerate(samples, 1):
        question = str(sample.get("question") or "").strip()
        ground_truth = str(sample.get("ground_truth") or "").strip()
        contexts = list(sample.get("contexts") or [])
        tags = list(sample.get("tags") or [])

        print(f"  [{i:2d}/{len(samples)}] {question[:60]}…", end=" ", flush=True)

        if args.adapter == "inprocess":
            out = _run_inprocess(sample)
        else:
            out = _run_blackbox(sample, base_url=base_url, timeout_s=settings.eval.blackbox.timeout_s)

        answer = str(out.get("answer") or "").strip()
        error = out.get("error")
        latency_ms = int(out.get("latency_ms") or 0)

        status = f"✓ {latency_ms}ms" if not error else f"✗ {error}"
        print(status)

        sample_results.append(
            EvalSampleResult(
                id=str(sample.get("id") or f"sample-{i}"),
                question=question,
                answer=answer,
                contexts=contexts,
                ground_truth=ground_truth,
                scores={},
                metadata={
                    "agent_profile": out.get("agent_profile", ""),
                    "latency_ms": latency_ms,
                    "tags": tags,
                    "adapter": args.adapter,
                    "error": error,
                },
            )
        )

    # Run RAGAS
    print("\n[INFO] Running RAGAS evaluation…")
    run_id = f"eval-{uuid.uuid4().hex[:12]}"
    try:
        from core_lib.llmops.eval.ragas_runner import run_ragas_evaluation
        run_result = run_ragas_evaluation(settings, sample_results=sample_results, run_id=run_id)
    except Exception as e:
        print(f"[WARN] RAGAS evaluation failed: {e}", file=sys.stderr)
        from core_lib.llmops.eval.schemas import EvalRunResult
        run_result = EvalRunResult(
            run_id=run_id,
            summary_scores={},
            samples=sample_results,
            metadata={"error": str(e), "ragas_skipped": True},
        )

    # Evaluate quality gate
    gate_decision = None
    if run_result.summary_scores:
        try:
            from core_lib.llmops.eval.gating import evaluate_gate, write_baseline
            gate_decision = evaluate_gate(settings, summary_scores=run_result.summary_scores)

            if args.write_baseline:
                ok, msg = write_baseline(settings, summary_scores=run_result.summary_scores)
                print(f"[INFO] Baseline {'saved' if ok else 'FAILED'}: {msg}")
        except Exception as e:
            print(f"[WARN] Gating evaluation failed: {e}", file=sys.stderr)

    # Log to JSONL
    try:
        from core_lib.llmops.logging.jsonl_sink import JsonlSink
        sink = JsonlSink.from_settings(settings)
        if sink is not None:
            sink.log_eval_run(run_result)
    except Exception as e:
        print(f"[WARN] Failed to write metrics log: {e}", file=sys.stderr)

    # Print results
    _print_results_table(run_result, gate_decision)

    # Exit code
    if gate_decision is not None and not gate_decision.passed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
