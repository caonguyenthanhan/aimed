import json
import os
import sys
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Load .env file
def _load_dotenv_file(path: str) -> None:
    try:
        if not path or not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                key = k.strip()
                val = v.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        return

_load_dotenv_file(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "medical-consultation-app", ".env")))

# 1. Pydantic v2 Graph Schema
NodeType = Literal["Trigger", "Emotion", "Symptom", "CopingStrategy"]
RelType = Literal["CAUSES", "MANIFESTS_AS", "RELIEVES", "MANAGES"]

class Entity(BaseModel):
    name: str = Field(description="Tên của thực thể tâm lý, viết bằng tiếng Việt chuẩn, viết hoa chữ cái đầu (ví dụ: 'Áp lực công việc', 'Lo âu', 'Mất ngủ')")
    label: NodeType = Field(description="Nhãn thực thể tâm lý")
    description: Optional[str] = Field(None, description="Mô tả ngắn gọn về thực thể")

class Relationship(BaseModel):
    source: str = Field(description="Tên thực thể nguồn")
    type: RelType = Field(description="Loại quan hệ")
    target: str = Field(description="Tên thực thể đích")

class PsychologicalGraph(BaseModel):
    entities: List[Entity] = Field(default_factory=list)
    relationships: List[Relationship] = Field(default_factory=list)

# 2. Raw training/knowledge data for psychology (Burnout, FOMO, Stress, Insomnia & CBT)
RAW_PSYCHOLOGY_TEXT = """
Tài liệu hướng dẫn lâm sàng về stress, burnout, FOMO và mất ngủ:
1. Áp lực công việc (Work overload) là một Tác nhân (Trigger) phổ biến thường gây ra Cảm xúc (Emotion) Kiệt sức (Burnout). Sự Kiệt sức này thường có biểu hiện Triệu chứng (Symptom) là Mất ngủ (Insomnia) và Chán nản (Depressed mood). Để đối phó, Chiến lược (CopingStrategy) Kế hoạch làm việc vi mô (Micro-planning) và Kỹ thuật hít thở 4-7-8 giúp Làm giảm (RELIEVES) triệu chứng Mất ngủ. Đồng thời, kỹ thuật Thiền chánh niệm (Mindfulness meditation) giúp Kiểm soát (MANAGES) cảm xúc Kiệt sức.

2. Áp lực đồng trang lứa (Peer pressure) hay còn gọi là FOMO (Fear of missing out) là một Tác nhân (Trigger) gây ra Cảm xúc (Emotion) Lo âu xã hội (Social anxiety). Cảm xúc Lo âu xã hội này thường Biểu hiện thành (MANIFESTS_AS) Triệu chứng (Symptom) Né tránh giao tiếp (Social withdrawal) và Tim đập nhanh (Palpitations). Liệu pháp Nhìn nhận lại giá trị bản thân (Self-affirmation) giúp Làm giảm (RELIEVES) Né tránh giao tiếp, và kỹ thuật Viết nhật ký biết ơn (Gratitude journaling) giúp Kiểm soát (MANAGES) cảm xúc Lo âu xã hội.

3. Mâu thuẫn gia đình (Family conflict) là một Tác nhân (Trigger) gây ra Cảm xúc (Emotion) Trầm cảm lâm sàng (Clinical depression). Trầm cảm lâm sàng thường Biểu hiện thành (MANIFESTS_AS) Triệu chứng (Symptom) Mất ngủ (Insomnia) và Mất động lực (Amotivation). Liệu pháp Kích hoạt hành vi (Behavioral activation) giúp Làm giảm (RELIEVES) Mất động lực và giúp Kiểm soát (MANAGES) Trầm cảm lâm sàng.
"""

def extract_psychological_graph() -> PsychologicalGraph:
    # We will invoke the Foza LLM using graph._foza_chat
    from cpu_server.langgraph_agent.graph import _foza_chat, _foza_timeout_s
    
    schema_desc = json.dumps(PsychologicalGraph.model_json_schema(), ensure_ascii=False, indent=2)
    system_prompt = (
        "Bạn là chuyên gia trích xuất thực thể đồ thị tâm lý học (Graph Triplet Extractor).\n"
        "Nhiệm vụ của bạn là đọc đoạn văn bản tiếng Việt và chuyển hóa thành định dạng JSON hợp lệ tuân thủ chính xác Schema sau:\n"
        f"{schema_desc}\n"
        "Yêu cầu:\n"
        "- Chỉ trả về JSON duy nhất, không bao quanh bằng ```json ... ``` hay bất cứ ký tự thừa nào.\n"
        "- Tên thực thể phải chuẩn hóa, viết hoa chữ cái đầu và viết bằng tiếng Việt.\n"
        "- Gán nhãn NodeType và RelType chính xác như định nghĩa trong schema.\n"
        "- Đảm bảo các quan hệ liên kết đúng tên thực thể tồn tại trong danh sách entities."
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": RAW_PSYCHOLOGY_TEXT}
    ]
    
    print("Sending request to Foza LLM for parsing psychological data...")
    content, _ = _foza_chat(messages, timeout_s=45.0)
    
    # Strip any markdown backticks
    raw = content.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()
    
    try:
        data = json.loads(raw)
        validated = PsychologicalGraph.model_validate(data)
        return validated
    except Exception as e:
        print(f"Failed to parse LLM output. Raw content: {raw[:500]}")
        raise e

if __name__ == "__main__":
    try:
        graph_data = extract_psychological_graph()
        output_path = os.path.join(os.path.dirname(__file__), "psych_graph_data.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(graph_data.model_dump(), f, ensure_ascii=False, indent=2)
        print(f"Successfully extracted and saved graph data to {output_path}")
        print(f"Extracted {len(graph_data.entities)} entities and {len(graph_data.relationships)} relationships.")
    except Exception as exc:
        print(f"Error occurred: {exc}")
        sys.exit(1)
