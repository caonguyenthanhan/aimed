"""RAGAS evaluation (in-process LangGraph)."""

from __future__ import annotations

import os
import uuid

import pytest

from core_lib.llmops.eval.adapters_inprocess import run_inprocess_samples
from core_lib.llmops.eval.dataset_io import load_jsonl_dataset
from core_lib.llmops.eval.ragas_runner import run_ragas_evaluation


def test_ragas_inprocess(llmops_settings, sample_dataset_path, llmops_eval_enabled: bool) -> None:
    if not llmops_eval_enabled:
        pytest.skip("LLMOps eval disabled. Enable via --llmops-eval or LLMOPS_EVAL_ENABLED=1.")

    llm_cfg = llmops_settings.eval.ragas.llm
    emb_cfg = llmops_settings.eval.ragas.embeddings
    if not (os.environ.get(llm_cfg.base_url_env) or "").strip():
        pytest.skip(f"Missing env: {llm_cfg.base_url_env}")
    if not (os.environ.get(llm_cfg.api_key_env) or "").strip():
        pytest.skip(f"Missing env: {llm_cfg.api_key_env}")
    if not (os.environ.get(emb_cfg.base_url_env) or "").strip():
        pytest.skip(f"Missing env: {emb_cfg.base_url_env}")
    if not (os.environ.get(emb_cfg.api_key_env) or "").strip():
        pytest.skip(f"Missing env: {emb_cfg.api_key_env}")

    samples = load_jsonl_dataset(sample_dataset_path)
    if not samples:
        pytest.skip("No samples found.")

    sample_results = run_inprocess_samples(
        llmops_settings,
        samples=samples,
        user_id="eval-user",
        conversation_id_prefix=f"eval-inprocess-{uuid.uuid4().hex[:8]}",
        agent_id="auto",
        include_tools=True,
    )
    if not sample_results:
        pytest.skip("No in-process results. Check agent dependencies and provider env.")

    out = run_ragas_evaluation(llmops_settings, sample_results=sample_results, run_id=f"inprocess-{uuid.uuid4().hex[:8]}")
    assert out.summary_scores
    for k, v in out.summary_scores.items():
        assert 0.0 <= float(v) <= 1.0

