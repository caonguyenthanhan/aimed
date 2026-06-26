"""DSPy-inspired prompt compiler and optimizer.

This module automates the optimization (compiling) of system prompts
using RAGAS metric scores as the feedback loop. It generates candidate variations,
bootstraps successful runs as few-shot exemplars, and saves optimized prompts.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..settings import LlmopsSettings
from .dataset_io import load_jsonl_dataset
from .ragas_runner import run_ragas_evaluation
from .schemas import EvalSample, EvalSampleResult


class DSPySignature:
    """Mock DSPy signature for medical query-response optimization."""
    def __init__(self, instructions: str):
        self.instructions = instructions


class DSPyProgram:
    """Mock DSPy Module representing our agent prompt optimization target."""
    def __init__(self, profile: str, default_prompt: str):
        self.profile = profile
        self.default_prompt = default_prompt
        self.current_prompt = default_prompt
        self.demos: List[Dict[str, str]] = []

    def get_compiled_instruction(self) -> str:
        prompt = self.current_prompt
        if self.demos:
            prompt += "\n\nVí dụ mẫu về các ca tư vấn thành công:\n"
            for i, d in enumerate(self.demos):
                prompt += f"Ví dụ {i+1}:\n- Câu hỏi bệnh nhân: {d['question']}\n- Câu trả lời tối ưu: {d['answer']}\n\n"
        return prompt


class DSPyBootstrapFewShot:
    """Optimizes prompts by bootstrapping few-shot exemplars and instruction variants."""
    def __init__(
        self,
        settings: LlmopsSettings,
        teacher_llm: Any,
        metric_threshold: float = 0.80,
        max_demos: int = 2,
    ):
        self.settings = settings
        self.llm = teacher_llm
        self.metric_threshold = metric_threshold
        self.max_demos = max_demos

    def generate_instruction_variants(self, profile: str, current_instruction: str) -> List[str]:
        """Proposes variations of the instruction prompt (MIPRO-style instruction proposal)."""
        prompt = f"""Bạn là chuyên gia thiết kế prompt cho AI tác tử y tế.
Hãy đọc kỹ chỉ dẫn hệ thống (System Instruction) hiện tại của profile tác tử '{profile}' dưới đây:

Chỉ dẫn hiện tại:
\"\"\"
{current_instruction}
\"\"\"

Nhiệm vụ của bạn là sinh ra 3 phiên bản chỉ dẫn y khoa thay thế khác nhau nhằm tối ưu hóa các metrics của RAGAS (Độ trung thực thông tin, tính liên quan của câu trả lời, độ an toàn lâm sàng).
- Biến thể 1: Tập trung hơn vào sự ngắn gọn, rõ ràng, nhấn mạnh yếu tố lâm sàng.
- Biến thể 2: Tập trung hơn vào sự thấu cảm, giọng văn trò chuyện tự nhiên của bác sĩ.
- Biến thể 3: Có cấu trúc chặt chẽ hơn, kiểm soát chặt ảo giác và trích xuất RAG tốt hơn.

Chỉ trả về danh sách JSON chứa 3 chuỗi biến thể này:
[
  "biến thể 1",
  "biến thể 2",
  "biến thể 3"
]
"""
        try:
            from langchain_core.messages import HumanMessage  # type: ignore
            msg = self.llm.invoke([HumanMessage(content=prompt)])
            text = str(msg.content).strip()
            
            # Simple JSON parse
            import re
            json_match = re.search(r"\[.*\]", text, re.DOTALL)
            if json_match:
                variants = json.loads(json_match.group(0))
                if isinstance(variants, list) and len(variants) >= 3:
                    return [str(v).strip() for v in variants[:3]]
        except Exception as e:
            print(f"[WARN] Failed to generate prompt variants: {e}")
        
        # Fallback variants if LLM call fails
        return [
            current_instruction + "\nLưu ý: Luôn trả lời ngắn gọn, trực diện, đi thẳng vào giải pháp lâm sàng.",
            current_instruction + "\nLưu ý: Luôn thấu hiểu nỗi lo lắng của bệnh nhân, chia sẻ và phản hồi ấm áp.",
            current_instruction + "\nLưu ý: Chỉ đưa ra thông tin có bằng chứng từ ngữ cảnh y khoa được cung cấp."
        ]

    def compile(self, program: DSPyProgram, trainset: List[EvalSample]) -> DSPyProgram:
        """Executes prompt search and few-shot bootstrapping to compile the optimized prompt."""
        print(f"\n[DSPy Compiler] Compiling prompt for profile: {program.profile}...")
        
        # 1. Generate variations
        variants = [program.default_prompt] + self.generate_instruction_variants(program.profile, program.default_prompt)
        
        best_prompt = program.default_prompt
        best_score = -1.0
        best_demos: List[Dict[str, str]] = []
        
        # Filter training examples matching the agent profile
        matching_samples = [s for s in trainset if s.metadata.get("agent_profile") == program.profile]
        if not matching_samples:
            matching_samples = trainset[:3]  # Fallback to first few samples
            
        print(f"[DSPy Compiler] Found {len(matching_samples)} training samples for evaluation.")

        # 2. Evaluate variations
        for idx, variant_prompt in enumerate(variants):
            print(f"  Evaluating candidate variant {idx + 1}...")
            
            # Temporary override instruction mapping
            from cpu_server.langgraph_agent import graph
            original_instructions = dict(graph.SYSTEM_INSTRUCTIONS)
            graph.SYSTEM_INSTRUCTIONS[program.profile] = variant_prompt
            
            # Run samples in-process
            from core_lib.llmops.eval.adapters_inprocess import run_inprocess_samples
            results = run_inprocess_samples(
                self.settings,
                samples=matching_samples,
                user_id="dspy-compiler",
                conversation_id_prefix=f"dspy-{program.profile}-var{idx}",
                agent_id="auto",
                include_tools=True,
            )
            
            # Restore instructions
            graph.SYSTEM_INSTRUCTIONS = original_instructions
            
            if not results:
                continue
                
            # Run RAGAS evaluation
            try:
                eval_res = run_ragas_evaluation(self.settings, sample_results=results, run_id=f"dspy-eval-{program.profile}-var{idx}")
                scores = eval_res.summary_scores
                # Calculate average score (focusing on faithfulness and answer_relevance)
                f_score = scores.get("faithfulness", 0.0)
                ar_score = scores.get("answer_relevance", 0.0)
                avg_score = (f_score + ar_score) / 2.0
                print(f"    Scores -> Faithfulness: {f_score:.3f}, Answer Relevance: {ar_score:.3f} | Avg: {avg_score:.3f}")
                
                # Check for few-shot candidates
                demos = []
                for sample_res in eval_res.samples:
                    s_faith = sample_res.scores.get("faithfulness", 0.0)
                    s_relevance = sample_res.scores.get("answer_relevance", 0.0)
                    if (s_faith + s_relevance) / 2.0 >= self.metric_threshold:
                        demos.append({
                            "question": sample_res.question,
                            "answer": sample_res.answer
                        })
                
                if avg_score > best_score:
                    best_score = avg_score
                    best_prompt = variant_prompt
                    best_demos = demos[:self.max_demos]
            except Exception as e:
                print(f"    [WARN] Candidate evaluation failed: {e}")
                
        # 3. Finalize Program Compilation
        program.current_prompt = best_prompt
        program.demos = best_demos
        print(f"[DSPy Compiler] Compilation completed for {program.profile}. Best Score: {best_score:.3f}, Demos: {len(best_demos)}")
        return program


def run_prompt_compilation(settings: LlmopsSettings) -> Dict[str, str]:
    """Compiles all agent profile instructions and saves results."""
    from cpu_server.langgraph_agent.graph import _STATIC_SYSTEM_INSTRUCTIONS
    from core_lib.llmops.eval.ragas_runner import _build_llm_and_embeddings
    
    # Resolve dataset
    dataset_path = Path(__file__).resolve().parents[3] / settings.eval.dataset.sample_path
    samples = load_jsonl_dataset(dataset_path)
    if not samples:
        raise FileNotFoundError(f"Evaluation dataset not found at: {dataset_path}")
        
    llm, _ = _build_llm_and_embeddings(settings)
    
    # We will compile triage and medication profiles
    compiled_prompts: Dict[str, str] = {}
    
    bootstrap = DSPyBootstrapFewShot(settings, teacher_llm=llm)
    
    # Save original instructions
    for profile in ["triage", "medication"]:
        default_inst = _STATIC_SYSTEM_INSTRUCTIONS.get(profile, "")
        if not default_inst:
            continue
        prog = DSPyProgram(profile, default_inst)
        compiled_prog = bootstrap.compile(prog, samples)
        compiled_prompts[profile] = compiled_prog.get_compiled_instruction()
        
    # Write optimized prompts to file
    out_path = Path(__file__).resolve().parents[3] / "data" / "optimized_prompts.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(compiled_prompts, f, ensure_ascii=False, indent=2)
        
    print(f"\n[INFO] Prompt compilation successful! Saved to: {out_path}")
    return compiled_prompts
