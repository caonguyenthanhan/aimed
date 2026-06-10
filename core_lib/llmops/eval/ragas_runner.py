"""RAGAS evaluation runner."""

from __future__ import annotations

import datetime
import os
from typing import Any, Dict, List

from ..settings import LlmopsSettings
from .schemas import EvalRunResult, EvalSampleResult


def run_ragas_evaluation(
    settings: LlmopsSettings,
    *,
    sample_results: List[EvalSampleResult],
    run_id: str,
) -> EvalRunResult:
    if not settings.eval.enabled or not settings.eval.ragas.enabled:
        return EvalRunResult(run_id=run_id, summary_scores={}, samples=sample_results, metadata={"enabled": False})

    dataset = _build_dataset(sample_results)
    llm, embeddings = _build_llm_and_embeddings(settings)
    metrics = _build_metrics(settings)

    try:
        from ragas import evaluate  # type: ignore
    except Exception as e:
        raise RuntimeError(f"missing_dependency:ragas:{e}")

    try:
        res = evaluate(dataset=dataset, metrics=metrics, llm=llm, embeddings=embeddings)
    except Exception as e:
        raise RuntimeError(f"ragas_evaluate_failed:{e}")

    scores = _result_to_dict(res)
    per_row = _result_rows(res, n=len(sample_results))
    enriched: List[EvalSampleResult] = []
    for i, s in enumerate(sample_results):
        row_scores = per_row[i] if i < len(per_row) else {}
        enriched.append(s.model_copy(update={"scores": row_scores}))

    return EvalRunResult(
        run_id=run_id,
        summary_scores=scores,
        samples=enriched,
        metadata={"ts": datetime.datetime.utcnow().isoformat(), "metrics": list(scores.keys())},
    )


def _build_dataset(samples: List[EvalSampleResult]) -> Any:
    try:
        from datasets import Dataset  # type: ignore
    except Exception as e:
        raise RuntimeError(f"missing_dependency:datasets:{e}")

    rows: Dict[str, List[Any]] = {
        "question": [],
        "answer": [],
        "contexts": [],
        "ground_truth": [],
    }
    for s in samples:
        rows["question"].append(s.question)
        rows["answer"].append(s.answer)
        rows["contexts"].append(list(s.contexts or []))
        rows["ground_truth"].append(s.ground_truth or "")
    return Dataset.from_dict(rows)


def _build_llm_and_embeddings(settings: LlmopsSettings) -> Any:
    try:
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings  # type: ignore
    except Exception as e:
        raise RuntimeError(f"missing_dependency:langchain-openai:{e}")

    llm_cfg = settings.eval.ragas.llm
    emb_cfg = settings.eval.ragas.embeddings
    llm_base = (os.environ.get(llm_cfg.base_url_env) or "").strip()
    llm_key = (os.environ.get(llm_cfg.api_key_env) or "").strip()
    emb_base = (os.environ.get(emb_cfg.base_url_env) or "").strip()
    emb_key = (os.environ.get(emb_cfg.api_key_env) or "").strip()

    if not llm_base or not llm_key:
        llm_base, llm_key = _resolve_fallback(
            base_url_env=str(getattr(llm_cfg, "fallback_base_url_env", "") or "").strip(),
            api_key_envs=list(getattr(llm_cfg, "fallback_api_key_envs", []) or []),
        )
    if not emb_base or not emb_key:
        emb_base, emb_key = _resolve_fallback(
            base_url_env=str(getattr(emb_cfg, "fallback_base_url_env", "") or "").strip(),
            api_key_envs=list(getattr(emb_cfg, "fallback_api_key_envs", []) or []),
        )

    if not llm_base or not llm_key:
        raise RuntimeError(f"missing_eval_llm_env:{llm_cfg.base_url_env},{llm_cfg.api_key_env}")
    if not emb_base or not emb_key:
        raise RuntimeError(f"missing_eval_embeddings_env:{emb_cfg.base_url_env},{emb_cfg.api_key_env}")

    model_name = str(llm_cfg.model)
    fallback_model_env = str(getattr(llm_cfg, "fallback_model_env", "") or "").strip()
    if fallback_model_env and os.environ.get(fallback_model_env):
        model_name = str(os.environ.get(fallback_model_env) or "").strip() or model_name

    llm = ChatOpenAI(
        model=model_name,
        base_url=llm_base.rstrip("/"),
        api_key=llm_key,
        temperature=0.0,
    )
    embeddings = OpenAIEmbeddings(
        model=str(emb_cfg.model),
        base_url=emb_base.rstrip("/"),
        api_key=emb_key,
    )
    return llm, embeddings


def _resolve_fallback(*, base_url_env: str, api_key_envs: List[str]) -> Any:
    base = (os.environ.get(base_url_env) or "").strip() if base_url_env else ""
    key = ""
    for k in api_key_envs:
        kk = str(k or "").strip()
        if not kk:
            continue
        v = (os.environ.get(kk) or "").strip()
        if v:
            key = v
            break
    return base, key


def _build_metrics(settings: LlmopsSettings) -> List[Any]:
    try:
        from ragas.metrics import answer_relevance, context_precision, context_recall, faithfulness  # type: ignore
    except Exception as e:
        raise RuntimeError(f"missing_dependency:ragas.metrics:{e}")

    flags = settings.eval.ragas.metrics
    out: List[Any] = []
    if flags.faithfulness:
        out.append(faithfulness)
    if flags.answer_relevance:
        out.append(answer_relevance)
    if flags.context_precision:
        out.append(context_precision)
    if flags.context_recall:
        out.append(context_recall)
    return out


def _result_to_dict(res: Any) -> Dict[str, float]:
    try:
        raw = res.to_pandas().mean(numeric_only=True).to_dict()  # type: ignore[attr-defined]
    except Exception:
        try:
            raw = dict(res)  # type: ignore[arg-type]
        except Exception:
            raw = {}
    out: Dict[str, float] = {}
    for k, v in (raw or {}).items():
        try:
            out[str(k)] = float(v)
        except Exception:
            continue
    return out


def _result_rows(res: Any, *, n: int) -> List[Dict[str, float]]:
    try:
        df = res.to_pandas()  # type: ignore[attr-defined]
        rows = df.to_dict(orient="records")
    except Exception:
        rows = []
    out: List[Dict[str, float]] = []
    for r in rows[:n]:
        d: Dict[str, float] = {}
        for k, v in (r or {}).items():
            try:
                d[str(k)] = float(v)
            except Exception:
                continue
        out.append(d)
    while len(out) < n:
        out.append({})
    return out
