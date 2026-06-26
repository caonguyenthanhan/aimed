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

    # Evaluate Cypher correctness if configured
    cypher_scores: List[float] = []
    if getattr(settings.eval.ragas.metrics, "cypher_correctness", False):
        try:
            cypher_scores = _evaluate_cypher_correctness(settings, sample_results, llm)
            if cypher_scores:
                scores["cypher_correctness"] = sum(cypher_scores) / float(len(cypher_scores))
        except Exception:
            pass

    enriched: List[EvalSampleResult] = []
    for i, s in enumerate(sample_results):
        row_scores = per_row[i] if i < len(per_row) else {}
        if i < len(cypher_scores):
            row_scores["cypher_correctness"] = cypher_scores[i]
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


def _evaluate_cypher_correctness(settings: LlmopsSettings, sample_results: List[EvalSampleResult], llm: Any) -> List[float]:
    """Evaluates the correctness of generated Cypher queries."""
    scores: List[float] = []
    
    judge_prompt = """Bản là một chuyên gia đánh giá cơ sở dữ liệu đồ thị Memgraph phục vụ y khoa lâm sàng.
Nhiệm vụ của bạn là đánh giá tính đúng đắn của câu lệnh Cypher vừa được tác tử sinh ra để trả lời câu hỏi lâm sàng của người dùng.

Thông tin về Graph Schema:
- Nhãn Node (Entity): Symptom (thuộc tính name), Disease (thuộc tính name), ActiveIngredient (thuộc tính name)
- Mối quan hệ:
  - (a:Entity)-[:CAUSES]->(b:Entity)
  - (a:Entity)-[:MANIFESTS_AS]->(b:Entity)
  - (a:Entity)-[:RELIEVES]->(b:Entity)
  - (a:Entity)-[:MANAGES]->(b:Entity)

Câu hỏi lâm sàng của bệnh nhân: "{question}"
Câu lệnh Cypher được sinh ra: "{cypher_query}"

Hãy chấm điểm độ chính xác và phù hợp của câu lệnh Cypher này trên thang điểm từ 0.0 đến 1.0 theo các tiêu chuẩn sau:
1. Đúng cú pháp Cypher cơ bản (MATCH, WHERE, RETURN, LIMIT, toLower, CONTAINS). (0 nếu sai cú pháp).
2. Khớp đúng loại nhãn Node (Symptom, Disease, ActiveIngredient) và mối quan hệ phù hợp với câu hỏi.
3. Không bị ảo giác về thực thể/quan hệ không tồn tại trong Schema.

Trả về kết quả chính xác dưới dạng JSON với định dạng sau, không giải thích gì thêm ngoài JSON:
{{
  "score": <float từ 0.0 đến 1.0>,
  "reason": "<giải thích ngắn gọn tiếng Việt>"
}}
"""

    for s in sample_results:
        llm_ctx = s.metadata.get("llm_context") or {}
        graph_data = llm_ctx.get("graph") or {}
        cypher_query = graph_data.get("cypher_query")
        
        if not cypher_query:
            profile = s.metadata.get("agent_profile") or llm_ctx.get("triage", {}).get("context", {}).get("agent_profile") or "default"
            if profile in ("triage", "medication"):
                scores.append(0.0)
            else:
                scores.append(1.0)
            continue
            
        if not graph_data.get("ok", True) or graph_data.get("error"):
            scores.append(0.0)
            continue
            
        try:
            from langchain_core.messages import HumanMessage  # type: ignore
            prompt = judge_prompt.format(question=s.question, cypher_query=cypher_query)
            msg = llm.invoke([HumanMessage(content=prompt)])
            text = str(msg.content).strip()
            
            import json
            import re
            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                score = float(data.get("score", 0.0))
            else:
                score = 0.0
            scores.append(max(0.0, min(1.0, score)))
        except Exception:
            scores.append(0.0)
            
    return scores
