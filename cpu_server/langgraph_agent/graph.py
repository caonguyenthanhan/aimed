from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import re
import time
import unicodedata
from typing import Any, Dict, List, Tuple

import requests

from . import tools as tool_impl
from .state import AgentState
from .triage_router import build_triage_fallback_text, run_semantic_triage_router, sanitize_user_visible_text


_FOZA_SESSION = requests.Session()
_LLMOPS = None
_LLMOPS_OBSERVER = None

EMBEDDABLE_FEATURE_IDS = {
    "sang-loc",
    "tri-lieu",
    "tra-cuu",
    "bac-si",
    "ke-hoach",
    "thong-ke",
}

ALLOWED_PATH_PREFIXES = [
    "/sang-loc",
    "/tri-lieu",
    "/nhac-nho",
    "/tin-tuc-y-khoa",
    "/tam-su",
    "/tu-van",
    "/bac-si",
    "/doctor",
    "/ke-hoach",
    "/tra-cuu",
    "/thong-ke",
]


def _get_llmops():
    global _LLMOPS
    global _LLMOPS_OBSERVER
    if _LLMOPS is False:
        return None, None
    if _LLMOPS is not None:
        return _LLMOPS, _LLMOPS_OBSERVER
    try:
        from core_lib.llmops import load_settings
        from core_lib.llmops.tracing.graph_observer import GraphObserver
    except Exception:
        _LLMOPS = False
        return None, None
    try:
        settings = load_settings()
        _LLMOPS = settings
        _LLMOPS_OBSERVER = GraphObserver(settings=settings)
        return _LLMOPS, _LLMOPS_OBSERVER
    except Exception:
        _LLMOPS = False
        return None, None


def _state_to_dict(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(state, dict):
        return dict(state)
    if hasattr(state, "model_dump"):
        return state.model_dump(mode="python")
    return dict(state)


def _is_allowed_path(path: str) -> bool:
    candidate = str(path or "").strip()
    if not candidate.startswith("/"):
        return False
    return any(candidate == prefix or candidate.startswith(prefix + "/") for prefix in ALLOWED_PATH_PREFIXES)


def _strip_accents(text: str) -> str:
    normalized = str(text or "").replace("đ", "d").replace("Đ", "D")
    return unicodedata.normalize("NFD", normalized).encode("ascii", "ignore").decode("ascii")


SPECIALTY_DESCRIPTIONS = {
    "triage": (
        "Triệu chứng y tế khẩn cấp, cấp cứu, nguy hiểm đến tính mạng như đau ngực, khó thở dữ dội, "
        "yếu liệt, nói khó, ngất xỉu, co giật, lú lẫn cấp tính, chảy máu nhiều không cầm được, đau bụng quằn quại, đột quỵ."
    ),
    "doctor_referral": (
        "Đặt lịch hẹn khám với bác sĩ chuyên khoa, tìm phòng khám, bệnh viện, tư vấn trực tiếp với bác sĩ, "
        "chi phí khám bệnh, bảo hiểm y tế, lịch làm việc của bác sĩ chuyên khoa tim mạch, thần kinh, nội tiết."
    ),
    "therapy": (
        "Hỗ trợ sức khỏe tinh thần, lo âu, trầm cảm, căng thẳng, stress, mất ngủ, hoảng loạn, cô đơn, "
        "tự hại hoặc muốn tự sát, các bài tập trị liệu tâm lý, cbt, thở và thiền thư giãn."
    ),
    "medication": (
        "Thông tin về thuốc, liều dùng, tác dụng phụ, tương tác thuốc, chỉ định và chống chỉ định, "
        "các loại thuốc như paracetamol, ibuprofen, kháng sinh, thuốc huyết áp statin, lisinopril, omeprazole."
    ),
    "care_plan": (
        "Xây dựng kế hoạch chăm sóc sức khỏe, lộ trình giảm cân, tăng cân, thực đơn dinh dưỡng, ăn uống lành mạnh, "
        "lịch trình tập luyện thể dục, theo dõi thói quen sinh hoạt và nhắc nhở uống thuốc hàng ngày."
    ),
}

_SPECIALTY_EMBEDDINGS: Dict[str, List[float]] = {}
_LOCAL_EMBEDDING_MODEL = None

def get_embedding(text: str) -> List[float]:
    """Get embedding of a text using FOZA embeddings or local sentence-transformers."""
    base = (os.environ.get("FOZA_BASE_URL") or "https://api.foza.ai/v1").strip().rstrip("/")
    token = (os.environ.get("FOZA_TOKEN") or os.environ.get("FOZA_TOKEN_2") or "").strip()
    model = os.environ.get("EMBEDDING_MODEL_NAME") or "text-embedding-3-small"
    
    if token:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
        payload = {
            "input": text,
            "model": model,
        }
        try:
            response = requests.post(f"{base}/embeddings", json=payload, headers=headers, timeout=10.0)
            if response.ok:
                data = response.json()
                emb = data.get("data", [{}])[0].get("embedding")
                if isinstance(emb, list) and len(emb) > 0:
                    return emb
        except Exception as e:
            print(f"[Embedding Error] Failed to get embedding from FOZA: {e}")

    # Fallback to local sentence-transformers
    global _LOCAL_EMBEDDING_MODEL
    try:
        if _LOCAL_EMBEDDING_MODEL is None:
            from sentence_transformers import SentenceTransformer
            # Using the cached Vietnamese model
            _LOCAL_EMBEDDING_MODEL = SentenceTransformer("bkai-foundation-models/vietnamese-bi-encoder")
        emb = _LOCAL_EMBEDDING_MODEL.encode(text).tolist()
        if isinstance(emb, list) and len(emb) > 0:
            return emb
    except Exception as e:
        print(f"[Embedding Fallback Error] Local sentence-transformers failed: {e}")

    return [0.0] * 1536

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    import math
    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for a, b in zip(v1, v2):
        dot += a * b
        norm_a += a * a
        norm_b += b * b
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))

def ensure_specialty_embeddings():
    global _SPECIALTY_EMBEDDINGS
    for name, desc in SPECIALTY_DESCRIPTIONS.items():
        if name not in _SPECIALTY_EMBEDDINGS or not _SPECIALTY_EMBEDDINGS[name] or all(x == 0.0 for x in _SPECIALTY_EMBEDDINGS[name]):
            emb = get_embedding(desc)
            _SPECIALTY_EMBEDDINGS[name] = emb

def _infer_agent_profile_regex(text: str) -> str:
    lower = str(text or "").lower()
    ascii_text = _strip_accents(lower)
    if re.search(r"(bác sĩ|đặt hẹn|đặt lịch|khám|tư vấn trực tiếp|hẹn khám)", lower) or re.search(
        r"(bac si|dat hen|dat lich|kham|tu van truc tiep|hen kham)", ascii_text
    ):
        return "doctor_referral"
    if re.search(r"(đau ngực|khó thở|yếu liệt|nói khó|ngất|chảy máu|co giật|lú lẫn|đau bụng dữ dội|cấp cứu)", lower) or re.search(
        r"(dau nguc|kho tho|yeu liet|noi kho|ngat|chay mau|co giat|lu lan|dau bung du doi|cap cuu)",
        ascii_text,
    ):
        return "triage"
    if re.search(r"(lo âu|hoảng loạn|trầm cảm|mất ngủ|căng thẳng|stress|tự hại|tự sát|trị liệu|bài thở|thiền|cbt)", lower) or re.search(
        r"(lo au|hoang loan|tram cam|mat ngu|cang thang|stress|tu hai|tu sat|tri lieu|bai tho|thien|cbt)",
        ascii_text,
    ):
        return "therapy"
    if re.search(r"(thuốc|uống|liều|tương tác|tác dụng phụ|chống chỉ định|ibuprofen|paracetamol|kháng sinh|statin)", lower) or re.search(
        r"(\bthuoc\b|\buong\b|\blieu\b|tuong tac|tac dung phu|chong chi dinh|ibuprofen|paracetamol|khang sinh|statin)",
        ascii_text,
    ):
        return "medication"
    if re.search(r"(kế hoạch|lộ trình|theo dõi|mục tiêu|nhật ký|routine|giảm cân|tăng cân|tập luyện)", lower) or re.search(
        r"(ke hoach|lo trinh|theo doi|muc tieu|nhat ky|routine|giam can|tang can|tap luyen)",
        ascii_text,
    ):
        return "care_plan"
    return "default"

def _detect_intent_flags_regex(text: str) -> Dict[str, Any]:
    lower = str(text or "").lower()
    ascii_text = _strip_accents(lower)
    return {
        "wants_doctor": bool(
            re.search(r"(bác sĩ|đặt hẹn|đặt lịch|khám|tư vấn trực tiếp|hẹn khám)", lower)
            or re.search(r"(bac si|dat hen|dat lich|kham|tu van truc tiep|hen kham)", ascii_text)
        ),
        "wants_triage": bool(
            re.search(r"(đau ngực|khó thở|sốt|ho|đau họng|yếu liệt|nói khó|ngất|chảy máu|co giật|lú lẫn|đau bụng dữ dội|cấp cứu)", lower)
            or re.search(r"(dau nguc|kho tho|sot|ho|dau hong|yeu liet|noi kho|ngat|chay mau|co giat|lu lan|dau bung du doi|cap cuu)", ascii_text)
        ),
        "wants_medication": bool(
            re.search(r"(thuốc|uống|liều|tương tác|tác dụng phụ|chống chỉ định|ibuprofen|paracetamol|kháng sinh|statin)", lower)
            or re.search(r"(\bthuoc\b|\buong\b|\blieu\b|tuong tac|tac dung phu|chong chi dinh|ibuprofen|paracetamol|khang sinh|statin)", ascii_text)
        ),
        "wants_plan": bool(
            re.search(r"(kế hoạch|lộ trình|theo dõi|mục tiêu|nhật ký|routine|giảm cân|tăng cân|tập luyện)", lower)
            or re.search(r"(ke hoach|lo trinh|theo doi|muc tieu|nhat ky|routine|giam can|tang can|tap luyen)", ascii_text)
        ),
        "wants_therapy": bool(
            re.search(r"(lo âu|hoảng loạn|trầm cảm|mất ngủ|căng thẳng|stress|tự hại|tự sát|trị liệu|bài thở|thiền|cbt)", lower)
            or re.search(r"(lo au|hoang loan|tram cam|mat ngu|cang thang|stress|tu hai|tu sat|tri lieu|bai tho|thien|cbt)", ascii_text)
        ),
        "wants_graph": bool(
            re.search(r"(graph|evidence|đồ thị|bằng chứng|trích dẫn|nguồn)", lower)
            or re.search(r"(graph|evidence|do thi|bang chung|trich dan|nguon)", ascii_text)
        ),
        "wants_tools": bool(
            re.search(r"(youtube|video|tra cứu|tìm|search|source|nguồn)", lower)
            or re.search(r"(youtube|video|tra cuu|tim|search|source|nguon)", ascii_text)
        ),
    }

def _infer_agent_profile(text: str) -> str:
    if not text.strip():
        return "default"
    try:
        ensure_specialty_embeddings()
        query_emb = get_embedding(text)
        if all(x == 0.0 for x in query_emb):
            return _infer_agent_profile_regex(text)
            
        scores = {}
        for name, emb in _SPECIALTY_EMBEDDINGS.items():
            if not all(x == 0.0 for x in emb):
                scores[name] = cosine_similarity(query_emb, emb)
            else:
                scores[name] = 0.0

        thresh_triage = float(os.environ.get("SEMANTIC_THRESHOLD_TRIAGE", "0.72"))
        thresh_medication = float(os.environ.get("SEMANTIC_THRESHOLD_MEDICATION", "0.75"))
        thresh_therapy = float(os.environ.get("SEMANTIC_THRESHOLD_THERAPY", "0.78"))
        thresh_doctor = float(os.environ.get("SEMANTIC_THRESHOLD_DOCTOR", "0.75"))
        thresh_plan = float(os.environ.get("SEMANTIC_THRESHOLD_PLAN", "0.70"))
        
        thresholds = {
            "triage": thresh_triage,
            "medication": thresh_medication,
            "therapy": thresh_therapy,
            "doctor_referral": thresh_doctor,
            "care_plan": thresh_plan
        }
        
        priorities = {
            "triage": 10,
            "doctor_referral": 8,
            "therapy": 7,
            "medication": 6,
            "care_plan": 5,
        }

        sorted_scores = sorted(scores.items(), key=lambda x: (x[1], priorities.get(x[0], 0)), reverse=True)
        for name, score in sorted_scores:
            t = thresholds.get(name, 0.0)
            if score >= t:
                return name
        return "default"
    except Exception as e:
        print(f"[Routing Error] Embedding routing failed, falling back to regex: {e}")
        return _infer_agent_profile_regex(text)

def _detect_intent_flags(text: str) -> Dict[str, Any]:
    if not text.strip():
        return {
            "wants_doctor": False,
            "wants_triage": False,
            "wants_medication": False,
            "wants_plan": False,
            "wants_therapy": False,
            "wants_graph": False,
            "wants_tools": False,
        }
    try:
        ensure_specialty_embeddings()
        query_emb = get_embedding(text)
        if all(x == 0.0 for x in query_emb):
            return _detect_intent_flags_regex(text)
            
        scores = {}
        for name, emb in _SPECIALTY_EMBEDDINGS.items():
            if not all(x == 0.0 for x in emb):
                scores[name] = cosine_similarity(query_emb, emb)
            else:
                scores[name] = 0.0

        thresh_triage = float(os.environ.get("SEMANTIC_THRESHOLD_TRIAGE", "0.72"))
        thresh_medication = float(os.environ.get("SEMANTIC_THRESHOLD_MEDICATION", "0.75"))
        thresh_therapy = float(os.environ.get("SEMANTIC_THRESHOLD_THERAPY", "0.78"))
        thresh_doctor = float(os.environ.get("SEMANTIC_THRESHOLD_DOCTOR", "0.75"))
        thresh_plan = float(os.environ.get("SEMANTIC_THRESHOLD_PLAN", "0.70"))
        
        lower = text.lower()
        ascii_text = _strip_accents(lower)
        
        return {
            "wants_doctor": scores.get("doctor_referral", 0.0) >= thresh_doctor,
            "wants_triage": scores.get("triage", 0.0) >= thresh_triage,
            "wants_medication": scores.get("medication", 0.0) >= thresh_medication,
            "wants_plan": scores.get("care_plan", 0.0) >= thresh_plan,
            "wants_therapy": scores.get("therapy", 0.0) >= thresh_therapy,
            "wants_graph": bool(
                re.search(r"(graph|evidence|đồ thị|bằng chứng|trích dẫn|nguồn)", lower)
                or re.search(r"(graph|evidence|do thi|bang chung|trich dan|nguon)", ascii_text)
            ),
            "wants_tools": bool(
                re.search(r"(youtube|video|tra cứu|tìm|search|source|nguồn)", lower)
                or re.search(r"(youtube|video|tra cuu|tim|search|source|nguon)", ascii_text)
            ),
        }
    except Exception as e:
        print(f"[Routing Error] Embedding intent flags failed, falling back to regex: {e}")
        return _detect_intent_flags_regex(text)


def _fallback_actions(agent_profile: str, intent: Dict[str, Any], risk_level: str, ready_for_cta: bool) -> List[Dict[str, Any]]:
    profile = str(agent_profile or "").strip().lower()
    if profile == "triage":
        if risk_level == "emergency":
            return [
                {
                    "type": "ask_navigation",
                    "args": {
                        "feature": "bac-si",
                        "reason": "Triệu chứng có dấu hiệu nguy cơ cao. Bạn muốn mở nhanh mục Bác sĩ để xem hướng hỗ trợ đúng tuyến không?",
                        "context": {"agent_profile": profile, "risk_level": risk_level},
                    },
                }
            ]
        if not ready_for_cta:
            return []
        return [
            {
                "type": "ask_navigation",
                "args": {
                    "feature": "sang-loc",
                    "reason": "Bạn muốn mở Sàng lọc để tiếp tục kiểm tra nguy cơ có cấu trúc không?",
                    "context": {"agent_profile": profile, "risk_level": risk_level},
                },
            }
        ]
    if profile == "doctor_referral" or bool((intent or {}).get("wants_doctor")):
        return [{"type": "ask_navigation", "args": {"feature": "bac-si", "reason": "Bạn muốn mở trang Bác sĩ để đặt lịch/tra cứu không?", "context": {"agent_profile": profile}}}]
    if profile == "medication" or bool((intent or {}).get("wants_medication")):
        return [{"type": "ask_navigation", "args": {"feature": "tra-cuu", "reason": "Bạn muốn mở Tra cứu để xem thông tin thuốc/chỉ số liên quan không?", "context": {"agent_profile": profile}}}]
    if profile == "care_plan" or bool((intent or {}).get("wants_plan")):
        return [{"type": "ask_navigation", "args": {"feature": "ke-hoach", "reason": "Bạn muốn mở Kế hoạch để theo dõi mục tiêu và nhắc nhở không?", "context": {"agent_profile": profile}}}]
    if profile == "therapy" or bool((intent or {}).get("wants_therapy")):
        return [{"type": "ask_navigation", "args": {"feature": "tri-lieu", "reason": "Bạn muốn mở Trị liệu để xem bài thở/thiền theo hướng dẫn không?", "context": {"agent_profile": profile}}}]
    return []


def generate_cypher_query_via_llm(user_text: str, agent_profile: str) -> str:
    """Ask the reasoning model (Foza) to write a Cypher query corresponding to the case."""
    schema_instructions = (
        "Bạn là chuyên gia cơ sở dữ liệu đồ thị Memgraph phục vụ y khoa lâm sàng.\n"
        "Nhiệm vụ của bạn là dịch câu hỏi lâm sàng của người dùng thành câu lệnh Cypher để truy vấn đồ thị Memgraph.\n\n"
        "Cơ sở dữ liệu có các nhãn Node (Entity) với các Pydantic schema như sau:\n\n"
        "class Symptom(BaseModel):\n"
        "    name: str  # Tên triệu chứng (ví dụ: 'sốt', 'đau ngực', 'khó thở')\n"
        "    label: str = \"Symptom\"\n"
        "    description: Optional[str]\n\n"
        "class Disease(BaseModel):\n"
        "    name: str  # Tên bệnh lý (ví dụ: 'cảm cúm', 'tăng huyết áp')\n"
        "    label: str = \"Disease\"\n"
        "    description: Optional[str]\n\n"
        "class ActiveIngredient(BaseModel):\n"
        "    name: str  # Hoạt chất hoặc dược chất (ví dụ: 'paracetamol', 'ibuprofen')\n"
        "    label: str = \"ActiveIngredient\"\n"
        "    description: Optional[str]\n\n"
        "Mỗi thực thể đều có thuộc tính 'name' (chuỗi tiếng Việt có dấu, viết thường hoặc viết chuẩn) và nhãn là 'Entity'.\n"
        "Các mối quan hệ (Relationships) hợp lệ trong đồ thị:\n"
        "- (a:Entity)-[:CAUSES]->(b:Entity) (Bệnh gây ra triệu chứng hoặc triệu chứng gây ra biến chứng)\n"
        "- (a:Entity)-[:MANIFESTS_AS]->(b:Entity) (Bệnh biểu hiện thành triệu chứng)\n"
        "- (a:Entity)-[:RELIEVES]->(b:Entity) (Hoạt chất làm giảm triệu chứng)\n"
        "- (a:Entity)-[:MANAGES]->(b:Entity) (Hoạt chất kiểm soát bệnh lý)\n\n"
        "Hãy viết câu lệnh Cypher tối ưu nhất để tìm kiếm các thực thể liên quan đến ca bệnh và các mối quan hệ trực tiếp (1-hop) của chúng.\n"
        "Chú ý:\n"
        "1. Luôn dùng toLower() hoặc khớp tương đối qua CONTAINS nếu cần để tăng tính linh hoạt khi tìm kiếm theo tên.\n"
        "2. Trả về thực thể gốc và các thực thể lân cận cùng mối quan hệ kết nối chúng.\n"
        "3. Không giải thích, không viết ```cypher. Chỉ trả về chuỗi câu lệnh Cypher duy nhất.\n"
        "Ví dụ:\n"
        "MATCH (e:Entity) WHERE toLower(e.name) CONTAINS 'sốt' MATCH (e)-[r]-(n) RETURN e, r, n LIMIT 30"
    )
    
    messages = [
        {"role": "system", "content": schema_instructions},
        {"role": "user", "content": f"Câu hỏi của bệnh nhân: '{user_text}'\nAgent Profile hiện tại: {agent_profile}"}
    ]
    try:
        cypher_query, _ = _foza_chat(messages, timeout_s=15.0)
        cypher_query = cypher_query.replace("```cypher", "").replace("```", "").strip()
        if cypher_query.startswith('"') and cypher_query.endswith('"'):
            cypher_query = cypher_query[1:-1].strip()
        print(f"[Agentic GraphRAG] Generated Cypher: {cypher_query}")
        return cypher_query
    except Exception as e:
        print(f"[Agentic GraphRAG Error] Failed to generate Cypher: {e}")
        return f"MATCH (e:Entity) WHERE toLower(e.name) CONTAINS 'sốt' MATCH (e)-[r]-(n) RETURN e, r, n LIMIT 30"


def _plan_tools(text: str, agent_profile: str = "default") -> List[Dict[str, Any]]:
    lower = str(text or "").lower()
    ascii_text = _strip_accents(lower)
    col = "therapy" if agent_profile == "therapy" else None
    
    # Generate Cypher query dynamically using the LLM
    cypher_query = generate_cypher_query_via_llm(text, agent_profile)
    
    requests_plan: List[Dict[str, Any]] = [{
        "name": "graph.evidence", 
        "args": {
            "query": text, 
            "cypher_query": cypher_query,
            "limit": 60, 
            "entity_limit": 6, 
            "collection": col
        }
    }]
    if "youtube" in lower or "video" in lower or "nhạc" in lower or "nhac" in ascii_text:
        requests_plan.append({"name": "youtube.search", "args": {"query": text, "maxResults": 5}})
    if re.search(r"\b(tìm|tra cứu|tim|tra cuu|nguồn|source|search)\b", ascii_text):
        requests_plan.append({"name": "web.search", "args": {"query": text, "num": 5}})
    return requests_plan[:3]



def _first_json_object(text: str) -> str | None:
    source = str(text or "")
    start = source.find("{")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escaped = False
    for idx in range(start, len(source)):
        char = source[idx]
        if in_string:
            if escaped:
                escaped = False
                continue
            if char == "\\":
                escaped = True
                continue
            if char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[start : idx + 1]
    return None


def _sanitize_actions(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    output: List[Dict[str, Any]] = []
    for action in raw[:10]:
        if not isinstance(action, dict):
            continue
        action_type = str(action.get("type") or "").strip()
        args = action.get("args") or {}
        if action_type == "navigate":
            path = str((args or {}).get("path") or "").strip()
            if _is_allowed_path(path):
                output.append({"type": "navigate", "args": {"path": path}})
            continue
        if action_type == "speak":
            text = str((args or {}).get("text") or "").strip()
            if text:
                output.append({"type": "speak", "args": {"text": text[:800]}})
            continue
        if action_type == "embed":
            feature = str((args or {}).get("feature") or "").strip()
            context = (args or {}).get("context") if isinstance((args or {}).get("context"), dict) else {}
            if feature in EMBEDDABLE_FEATURE_IDS:
                output.append({"type": "embed", "args": {"feature": feature, "context": context}})
            continue
        if action_type == "ask_navigation":
            feature = str((args or {}).get("feature") or "").strip()
            reason = str((args or {}).get("reason") or "").strip() or "Bạn muốn mở tính năng này không?"
            context = (args or {}).get("context") if isinstance((args or {}).get("context"), dict) else {}
            if feature in EMBEDDABLE_FEATURE_IDS:
                output.append({"type": "ask_navigation", "args": {"feature": feature, "reason": reason[:400], "context": context}})
            continue
        if action_type == "play_music":
            video_id = str((args or {}).get("videoId") or "").strip()
            title = str((args or {}).get("title") or "").strip()
            if video_id and title:
                payload: Dict[str, Any] = {"videoId": video_id, "title": title}
                artist = str((args or {}).get("artist") or "").strip() if isinstance((args or {}).get("artist"), str) else ""
                autoplay = (args or {}).get("autoplay") if isinstance((args or {}).get("autoplay"), bool) else None
                if artist:
                    payload["artist"] = artist
                if autoplay is not None:
                    payload["autoplay"] = autoplay
                output.append({"type": "play_music", "args": payload})
            continue
        if action_type == "recommend_music":
            recommendations = (args or {}).get("recommendations") if isinstance((args or {}).get("recommendations"), list) else []
            mood = str((args or {}).get("mood") or "").strip() if isinstance((args or {}).get("mood"), str) else ""
            message = str((args or {}).get("message") or "").strip() if isinstance((args or {}).get("message"), str) else ""
            safe_recommendations = []
            for item in recommendations[:10]:
                if not isinstance(item, dict):
                    continue
                video_id = str(item.get("videoId") or "").strip()
                title = str(item.get("title") or "").strip()
                if not video_id or not title:
                    continue
                safe_recommendations.append(
                    {
                        "videoId": video_id,
                        "title": title,
                        **({"artist": str(item.get("artist") or "").strip()} if str(item.get("artist") or "").strip() else {}),
                        **({"thumbnail": str(item.get("thumbnail") or "").strip()} if str(item.get("thumbnail") or "").strip() else {}),
                        **({"duration": str(item.get("duration") or "").strip()} if str(item.get("duration") or "").strip() else {}),
                        **({"mood": str(item.get("mood") or "").strip()} if str(item.get("mood") or "").strip() else {}),
                    }
                )
            output.append({"type": "recommend_music", "args": {"recommendations": safe_recommendations, **({"mood": mood} if mood else {}), **({"message": message[:400]} if message else {})}})
    return output


def _ensure_text(text: str) -> str:
    value = str(text or "").strip()
    return value if value else "Mình chưa nhận được đủ thông tin. Bạn mô tả thêm giúp mình nhé?"


def _foza_timeout_s() -> float:
    raw = str(os.environ.get("FOZA_REQUEST_TIMEOUT_MS") or "").strip()
    if not raw:
        return 45.0
    try:
        value = float(raw)
    except Exception:
        return 45.0
    if value <= 0:
        return 45.0
    if value > 300:
        return value / 1000.0
    return value


class StreamingTokenExtractor:
    def __init__(self):
        self.buffer = ""
        self.is_json = None
        self.found_key = False
        self.inside_string = False
        self.escaped = False

    def feed(self, text: str) -> list[str]:
        self.buffer += text
        tokens = []
        
        if self.is_json is None:
            stripped = self.buffer.strip()
            if len(stripped) > 0:
                if stripped.startswith("{"):
                    self.is_json = True
                else:
                    self.is_json = False
                    tokens.append(self.buffer)
                    self.buffer = ""
                    return tokens
            else:
                return []
        
        if not self.is_json:
            tokens.append(text)
            return tokens

        # It is JSON, find "response" : "
        if not self.found_key:
            match = re.search(r'"response"\s*:\s*"', self.buffer)
            if match:
                self.found_key = True
                self.inside_string = True
                self.buffer = self.buffer[match.end():]
            else:
                if len(self.buffer) > 60:
                    self.buffer = self.buffer[-60:]
                return []

        if self.inside_string:
            output = []
            consume_count = 0
            for char in self.buffer:
                consume_count += 1
                if self.escaped:
                    if char == 'n':
                        output.append('\n')
                    elif char == 't':
                        output.append('\t')
                    elif char == '"':
                        output.append('"')
                    elif char == '\\':
                        output.append('\\')
                    else:
                        output.append('\\' + char)
                    self.escaped = False
                    continue
                if char == '\\':
                    self.escaped = True
                    continue
                if char == '"':
                    self.inside_string = False
                    break
                output.append(char)
            
            self.buffer = self.buffer[consume_count:]
            if output:
                tokens.append("".join(output))
        
        return tokens


def _foza_chat(messages: List[Dict[str, Any]], timeout_s: float = 45.0) -> Tuple[str, Dict[str, Any]]:
    base = (os.environ.get("FOZA_BASE_URL") or "https://api.foza.ai/v1").strip().rstrip("/")
    token = (os.environ.get("FOZA_TOKEN") or os.environ.get("FOZA_TOKEN_2") or "").strip()
    model = (os.environ.get("LLM_MODEL_NAME") or "").strip()
    if not token or not model:
        raise RuntimeError("missing_foza_env")

    # Trace LLM run if active parent span is present
    tracer = None
    run = None
    try:
        from core_lib.llmops.settings import load_settings
        from core_lib.llmops.tracing.langsmith import get_langsmith_tracer, active_span
        settings = load_settings()
        tracer = get_langsmith_tracer(settings)
        if tracer is not None and active_span.get() is not None:
            run = tracer.start_run(
                name="foza_chat_llm",
                run_type="llm",
                inputs={"messages": messages, "model": model},
                metadata={"model": model},
            )
    except Exception:
        pass

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "aimed-langgraph/1.0",
        "Authorization": f"Bearer {token}",
    }
    payload = {"model": model, "messages": messages, "temperature": 0.2}
    attempts = 0
    last_error = None
    data = None
    content = ""
    metadata = {"model": model}
    
    # Import streaming queue if present
    try:
        from core_lib.llmops.tracing.graph_observer import streaming_queue
        q = streaming_queue.get()
    except Exception:
        q = None

    try:
        while attempts < 2:
            attempts += 1
            try:
                if q is not None:
                    # Stream mode
                    payload["stream"] = True
                    response = _FOZA_SESSION.post(f"{base}/chat/completions", headers=headers, json=payload, timeout=timeout_s, stream=True)
                    response.encoding = "utf-8"
                    if not response.ok:
                        raw_text = response.text or ""
                        raise RuntimeError(f"foza_error:{response.status_code}:{raw_text[:400]}")
                    
                    full_content = []
                    extractor = StreamingTokenExtractor()
                    for line in response.iter_lines():
                        if not line:
                            continue
                        line_str = line.decode("utf-8").strip()
                        if line_str.startswith("data:"):
                            data_part = line_str[5:].strip()
                            if data_part == "[DONE]":
                                break
                            try:
                                chunk_data = json.loads(data_part)
                                delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                                chunk_text = delta.get("content", "")
                                if chunk_text:
                                    full_content.append(chunk_text)
                                    for token_yielded in extractor.feed(chunk_text):
                                        q.put_nowait({
                                            "event": "token",
                                            "data": {
                                                "text": token_yielded
                                            }
                                        })
                            except Exception:
                                pass
                    content = "".join(full_content)
                    data = {
                        "choices": [{"message": {"role": "assistant", "content": content}}],
                        "usage": {}
                    }
                    break
                else:
                    # Blocking mode
                    response = _FOZA_SESSION.post(f"{base}/chat/completions", headers=headers, json=payload, timeout=timeout_s)
                    response.encoding = "utf-8"
                    raw_text = response.text or ""
                    if response.ok:
                        data = response.json()
                        break
                    if response.status_code in (408, 429, 500, 502, 503, 504) and attempts < 2:
                        time.sleep(0.6 * attempts)
                        continue
                    raise RuntimeError(f"foza_error:{response.status_code}:{raw_text[:400]}")
            except Exception as exc:
                last_error = exc
                if attempts < 2:
                    time.sleep(0.6 * attempts)
                    continue
                raise
        if data is None and last_error is not None:
            raise last_error
        message = (((data.get("choices") or [{}])[0] or {}).get("message") or {})
        content = str(message.get("content") or "").strip()
        usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
        if usage:
            metadata["usage"] = usage
        return content, metadata
    except Exception as e:
        last_error = e
        raise
    finally:
        if tracer is not None and run is not None:
            try:
                err_str = str(last_error) if last_error else None
                tracer.end_run(
                    run,
                    outputs={"response": content, "metadata": metadata} if not last_error else None,
                    error=err_str
                )
            except Exception:
                pass


def _triage_state_payload(state: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "symptoms_collected": state.get("symptoms_collected") or [],
        "risk_level": str(state.get("risk_level") or "unknown"),
        "ready_for_cta": bool(state.get("ready_for_cta")),
        "follow_up_questions": state.get("triage_follow_up_questions") or [],
        "semantic_router_trace": state.get("semantic_router_trace") or [],
    }


_STATIC_SYSTEM_INSTRUCTIONS = {
    "triage": (
        "Bạn là Tác tử Sàng lọc & Phân tầng Nguy cơ Y tế chuyên nghiệp.\n"
        "Nhiệm vụ: Đánh giá triệu chứng khách quan qua câu thoại (tính toán ngầm GAD-7, PHQ-9 dựa trên ngữ nghĩa của cuộc trò chuyện).\n"
        "Nguyên tắc lâm sàng:\n"
        "- Nếu triệu chứng có dấu hiệu khẩn cấp (nguy cơ cao/emergency): Khuyên bệnh nhân gọi ngay 115 hoặc đến phòng cấp cứu gần nhất bằng giọng văn tự nhiên, rõ ràng, khẩn thiết nhưng bình tĩnh. Không tự lái xe.\n"
        "- Tránh các bài test khảo sát cứng nhắc; hãy trò chuyện như bác sĩ sàng lọc thấu cảm.\n"
        "- Đề xuất hỏi thêm 1-2 câu ngắn để làm rõ triệu chứng nếu nguy cơ ở mức thấp/trung bình."
    ),
    "medication": (
        "Bạn là Tác tử Dược phẩm & Tương tác Y khoa chuyên sâu.\n"
        "Nhiệm vụ: Giải thích về liều dùng, công dụng, tác dụng phụ và tương tác thuốc dựa trên hồ sơ y khoa cá nhân.\n"
        "Nguyên tắc GraphRAG & Kiểm soát Ảo giác:\n"
        "- Phải dựa SÁT vào dữ liệu ngữ cảnh y khoa được cung cấp (GraphRAG, Web Search) để trả lời.\n"
        "- Không tự bịa ra thông tin bệnh lý phức tạp hay tương tác thuốc khi không có bằng chứng.\n"
        "- Nếu phát hiện nguy cơ tương tác thuốc nguy hiểm, phải cảnh báo rõ ràng và đề xuất tra cứu hoặc liên hệ bác sĩ chuyên khoa.\n"
        "- Giải thích dễ hiểu, tự nhiên, ẩn đi toàn bộ các nhãn đồ thị/JSON."
    ),
    "therapy": (
        "Bạn là Tác tử Tâm lý Trị liệu (High EQ Life Coach) sử dụng CBT (Liệu pháp Hành vi Nhận thức).\n"
        "Nhiệm vụ: Hỗ trợ cảm xúc, xoa dịu lo âu, căng thẳng, trầm cảm và nâng cao sức khỏe tinh thần.\n"
        "Nguyên tắc giao tiếp & Trị liệu Đồ thị:\n"
        "- Sử dụng thông tin từ Đồ thị Tri thức Tâm lý học (TOOL_RESULTS_JSON) để nhận diện Tác nhân (Trigger), Triệu chứng (Symptom), và gợi ý các Chiến lược đối phó (CopingStrategy) phù hợp nhất với tình trạng của người dùng.\n"
        "- Giao tiếp vô cùng thấu cảm, ấm áp, khơi gợi cảm xúc tự nhiên, tránh đưa ra các bài trắc nghiệm máy móc.\n"
        "- Tích hợp đa phương tiện: Nếu người dùng cần thư giãn hoặc thiền, hãy chủ động đề xuất hoặc phát nhạc thư giãn/video thiền (sử dụng action 'play_music' hoặc 'recommend_music' với videoId thích hợp từ kết quả YouTube)."
    ),
    "care_plan": (
        "Bạn là Tác tử Kế hoạch Chăm sóc (Behavioral Activation Agent) thuộc Lộ trình Chăm sóc Stepped Care.\n"
        "Nhiệm vụ: Lên lịch các hoạt động vi mô (micro-interventions) giúp cải thiện tâm trạng và lối sống.\n"
        "Nguyên tắc:\n"
        "- Đề xuất những hành động nhỏ, cụ thể, dễ thực hiện để phá vỡ vòng xoáy đi xuống của tâm lý.\n"
        "- Tìm hiểu các rào cản hành vi của bệnh nhân (ví dụ: mệt mỏi, thiếu thời gian) và đề xuất giải pháp vượt qua.\n"
        "- Nhắc nhở và hỗ trợ thiết lập thói quen lành mạnh."
    ),
    "doctor_referral": (
        "Bạn là Tác tử Hỗ trợ Bác sĩ & Đặt lịch khám (Administrative Action Agent).\n"
        "Nhiệm vụ: Hỗ trợ kết nối bác sĩ phù hợp, tra cứu thuốc/tồn kho nếu cần, và chuẩn bị thông tin đặt lịch.\n"
        "Nguyên tắc:\n"
        "- Khi người dùng đồng ý gặp bác sĩ hoặc đặt lịch, gợi ý mở tính năng Bác sĩ để chọn lịch hẹn (sử dụng action 'ask_navigation' hoặc 'navigate' đến đường dẫn bác sĩ).\n"
        "- Hướng dẫn quy trình đặt lịch nhẹ nhàng, cung cấp tóm tắt thông tin tư vấn lâm sàng ngắn gọn để bệnh nhân chuẩn bị khi gặp bác sĩ."
    ),
    "default": (
        "Bạn là Trợ lý Y tế & Sức khỏe toàn diện.\n"
        "Nhiệm vụ: Trò chuyện và giải đáp các thắc mắc chung về sức khỏe một cách thân thiện, khoa học, dễ hiểu."
    ),
}

def load_system_instructions() -> Dict[str, str]:
    from pathlib import Path
    import json
    p = Path(__file__).resolve().parents[2] / "data" / "optimized_prompts.json"
    instructions = dict(_STATIC_SYSTEM_INSTRUCTIONS)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    for k, v in data.items():
                        if isinstance(v, str) and v.strip():
                            instructions[k] = v.strip()
        except Exception:
            pass
    return instructions

SYSTEM_INSTRUCTIONS = load_system_instructions()


def _build_agent_prompt(
    agent_profile: str,
    user_text: str,
    tool_results: Dict[str, Any],
    triage_state: Dict[str, Any],
) -> List[Dict[str, Any]]:
    try:
        from cpu_server.graph_gateway import compress_tool_results
    except Exception:
        try:
            from graph_gateway import compress_tool_results
        except Exception:
            compress_tool_results = lambda x: x

    allow_paths = ", ".join(ALLOWED_PATH_PREFIXES)
    profile_instructions = SYSTEM_INSTRUCTIONS.get(agent_profile, SYSTEM_INSTRUCTIONS["default"])

    system_lines = [
        "Bạn là một AI agent chuyên nghiệp trong ứng dụng hỗ trợ y tế & tâm lý đa tác tử.",
        f"VAI TRÒ HIỆN TẠI CỦA BẠN: {agent_profile.upper()} AGENT.",
        "HƯỚNG DẪN VAI TRÒ:",
        profile_instructions,
        "",
        "YÊU CẦU ĐẦU RA KỸ THUẬT:",
        "- Luôn luôn trả về một JSON object duy nhất, KHÔNG ĐƯỢC chứa định dạng markdown bao quanh (không dùng ```json ... ```), chỉ trả về văn bản JSON thuần túy.",
        "- JSON Schema bắt buộc:",
        "  {",
        '    "response": "Câu trả lời tự nhiên của bạn bằng tiếng Việt cho người dùng",',
        '    "actions": [ { "type": "navigate|speak|embed|ask_navigation|play_music|recommend_music", "args": {} } ]',
        "  }",
        "- Các actions hợp lệ:",
        "  * navigate(path): điều hướng đến path. Allowlist paths: " + allow_paths,
        "  * speak(text): đọc văn bản.",
        "  * embed(feature, context): nhúng widget. Features: sang-loc, tri-lieu, tra-cuu, bac-si, ke-hoach, thong-ke.",
        "  * ask_navigation(feature, reason, context): gợi ý người dùng mở tính năng.",
        "  * play_music(videoId, title, artist, autoplay): phát bài hát trên YouTube.",
        "  * recommend_music(recommendations, mood, message): đề xuất danh sách nhạc.",
        "- TUYỆT ĐỐI KHÔNG ĐƯỢC để lộ các nhãn kỹ thuật, key JSON, tên biến hệ thống, metric codes, hay thông tin debug/guardrails vào trong trường 'response' gửi cho người dùng.",
        "- Câu trả lời trong trường 'response' phải mượt mà, thấu cảm, hoàn toàn tự nhiên và viết bằng tiếng Việt."
    ]

    return [
        {"role": "system", "content": "\n".join(system_lines)},
        {"role": "system", "content": f"TRIAGE_STATE_JSON:{json.dumps(triage_state, ensure_ascii=False)}"},
        {"role": "system", "content": f"TOOL_RESULTS_JSON:{json.dumps(compress_tool_results(tool_results or {}), ensure_ascii=False)}"},
        {"role": "user", "content": user_text},
    ]


def node_route(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    message = str(current.get("message") or "").strip()
    requested = str(current.get("agent_id") or "").strip().lower()
    agent_profile = requested if requested and requested != "auto" else _infer_agent_profile(message)
    current["intent"] = _detect_intent_flags(message)
    current["agent_profile"] = agent_profile
    current["tool_requests"] = _plan_tools(message, agent_profile) if bool(current.get("include_tools", True)) else []

    settings, _ = _get_llmops()
    if settings is None:
        current["next_node"] = "tools"
        return current
    try:
        from core_lib.llmops.guardrails import route_message, validate_user_message
    except Exception:
        current["next_node"] = "tools"
        return current

    route_decision = route_message(settings, text=message)
    injection = validate_user_message(settings, text=message)
    current["route_decision"] = route_decision.model_dump(mode="json") if hasattr(route_decision, "model_dump") else {"route": str(route_decision.route)}
    current["guardrails"] = {
        "prompt_injection": injection.model_dump(mode="json") if hasattr(injection, "model_dump") else {"allowed": bool(injection.allowed)}
    }
    if bool(injection.allowed):
        current["blocked"] = False
        current["next_node"] = "tools"
        return current

    current["blocked"] = True
    current["next_node"] = "END"
    current["response"] = str(injection.user_message or "").strip() or "Mình không thể hỗ trợ yêu cầu này."
    current["actions"] = []
    current["tool_requests"] = []
    current["metadata"] = {
        "orchestrator": "langgraph",
        "provider": "guardrails",
        "agent_profile": agent_profile,
        "intent": current.get("intent") or {},
        "blocked": True,
    }
    return current


def node_tools(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    if bool(current.get("blocked")):
        current["next_node"] = "END"
        return current

    try:
        max_calls = int(str(os.environ.get("LG_MAX_TOOL_CALLS") or "3").strip() or "3")
    except Exception:
        max_calls = 3
    max_calls = max(0, min(max_calls, 6))

    def _call(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        if name == "web.search":
            return tool_impl.web_search(query=str(args.get("query") or ""), num=int(args.get("num") or 5), timeout_s=0.0)
        if name == "youtube.search":
            return tool_impl.youtube_search(query=str(args.get("query") or ""), maxResults=int(args.get("maxResults") or 5), timeout_s=0.0)
        if name == "youtube.video":
            return tool_impl.youtube_video(videoId=str(args.get("videoId") or ""), timeout_s=0.0)
        if name == "youtube.recommend_music":
            return tool_impl.youtube_recommend_music(mood=str(args.get("mood") or ""), maxResults=int(args.get("maxResults") or 5), timeout_s=0.0)
        if name == "graph.status":
            return tool_impl.graph_status(timeout_s=0.0)
        if name == "graph.evidence":
            return tool_impl.graph_evidence(
                query=str(args.get("query") or ""),
                limit=int(args.get("limit") or 60),
                entity_limit=int(args.get("entity_limit") or 5),
                rel_types=args.get("rel_types") if isinstance(args.get("rel_types"), list) else None,
                timeout_s=0.0,
                collection=args.get("collection"),
            )
        return {"ok": False, "error": "unknown_tool"}

    tool_items = []
    for request in (current.get("tool_requests") or [])[:max_calls]:
        name = str((request or {}).get("name") or "").strip()
        args = (request or {}).get("args") or {}
        if name:
            tool_items.append((name, args))

    max_workers = min(len(tool_items) or 1, int(str(os.environ.get("LG_TOOL_MAX_WORKERS") or "3").strip() or "3"))
    max_workers = max(1, min(max_workers, 6))

    results: Dict[str, Any] = {}
    tool_durations: Dict[str, int] = {}
    started_at = time.time()
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for name, args in tool_items:
            call_started = time.time()
            futures[executor.submit(_call, name, args)] = (name, call_started)
        for future in as_completed(futures):
            name, call_started = futures[future]
            try:
                results[name] = future.result()
            except Exception as exc:
                results[name] = {"ok": False, "error": str(exc)}
            tool_durations[name] = int((time.time() - call_started) * 1000)

    current["tool_results"] = results
    current["tool_durations"] = tool_durations
    current["tool_elapsed_ms"] = int((time.time() - started_at) * 1000)

    settings, _ = _get_llmops()
    if settings is None:
        current["next_node"] = "supervisor"
        return current
    try:
        from core_lib.llmops.guardrails import enforce_grounding
    except Exception:
        current["next_node"] = "supervisor"
        return current

    grounding = enforce_grounding(
        settings,
        agent_profile=str(current.get("agent_profile") or "default"),
        tool_results=results,
        original_query=str(current.get("message") or ""),
    )
    current["guardrails"] = {
        **(current.get("guardrails") or {}),
        "grounding": grounding.model_dump(mode="json") if hasattr(grounding, "model_dump") else {"should_fallback": bool(grounding.should_fallback)},
    }
    additional_requests = grounding.additional_tool_requests if isinstance(grounding.additional_tool_requests, list) else []
    remaining = max_calls - len(tool_items)
    if grounding.should_fallback and remaining > 0 and additional_requests:
        for spec in additional_requests[:remaining]:
            name = str((spec or {}).get("name") or "").strip()
            args = (spec or {}).get("args") if isinstance((spec or {}).get("args"), dict) else {}
            if not name:
                continue
            call_started = time.time()
            try:
                results[name] = _call(name, args)
            except Exception as exc:
                results[name] = {"ok": False, "error": str(exc)}
            tool_durations[name] = int((time.time() - call_started) * 1000)
        current["tool_results"] = results
        current["tool_durations"] = tool_durations
        current["tool_elapsed_ms"] = int((time.time() - started_at) * 1000)
        # re-evaluate grounding
        grounding = enforce_grounding(
            settings,
            agent_profile=str(current.get("agent_profile") or "default"),
            tool_results=results,
            original_query=str(current.get("message") or ""),
        )
        current["guardrails"]["grounding"] = grounding.model_dump(mode="json") if hasattr(grounding, "model_dump") else {"should_fallback": bool(grounding.should_fallback)}

    if grounding.should_fallback:
        current["response"] = build_triage_fallback_text(
            risk_level=str(current.get("risk_level") or "unknown"),
            follow_up_questions=current.get("triage_follow_up_questions") or [],
            symptoms_collected=current.get("symptoms_collected") or [],
        ) if current.get("agent_profile") == "triage" else str(grounding.user_message or "").strip() or "Mình chưa có đủ thông tin để trả lời chắc chắn. Bạn cung cấp thêm chi tiết giúp mình nhé."
        current["actions"] = _fallback_actions(str(current.get("agent_profile") or "default"), current.get("intent"), str(current.get("risk_level") or "unknown"), bool(current.get("ready_for_cta")))
        current["provider"] = "guardrails"
        current["model"] = ""
        current["next_node"] = "END"
        return current

    current["next_node"] = "supervisor"
    return current


def node_supervisor(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    if bool(current.get("blocked")):
        current["next_node"] = "END"
        return current

    decision = run_semantic_triage_router(
        user_text=str(current.get("message") or ""),
        tool_results=current.get("tool_results") or {},
        requested_agent_id=str(current.get("agent_id") or "auto").strip().lower() or "auto",
        llm_caller=_foza_chat,
        timeout_s=min(_foza_timeout_s(), 25.0),
    )

    current["agent_profile"] = str(decision.agent_profile or current.get("agent_profile") or "default")
    current["symptoms_collected"] = decision.symptoms_collected
    current["risk_level"] = decision.risk_level
    current["ready_for_cta"] = bool(decision.ready_for_cta)
    current["triage_follow_up_questions"] = decision.follow_up_questions
    current["semantic_router_trace"] = [item.model_dump(mode="python") if hasattr(item, "model_dump") else item for item in decision.trace]

    current["clinical_hold"] = bool(decision.clinical_hold)
    current["stealth_phq9"] = int(decision.stealth_phq9)
    current["stealth_gad7"] = int(decision.stealth_gad7)

    try:
        from cpu_server.db import set_conversation_clinical_hold
    except Exception:
        try:
            from db import set_conversation_clinical_hold
        except Exception:
            set_conversation_clinical_hold = None

    if set_conversation_clinical_hold is not None and current.get("conversation_id"):
        try:
            set_conversation_clinical_hold(
                current["conversation_id"],
                current["clinical_hold"],
                phq9=current["stealth_phq9"],
                gad7=current["stealth_gad7"]
            )
        except Exception:
            pass

    if current["clinical_hold"]:
        current["blocked"] = True
        current["next_node"] = "END"
        current["response"] = (
            "Hiện tại, chúng tôi nhận thấy bạn đang có những chia sẻ liên quan đến tự hại hoặc tự tử. "
            "Để đảm bảo an toàn tối đa cho bạn, hệ thống đã tạm thời đóng băng hội thoại này.\n"
            "Nếu bạn đang gặp khủng hoảng hoặc cần người lắng nghe ngay lập tức, xin vui lòng liên hệ với các đường dây nóng hỗ trợ khẩn cấp sau:\n"
            "- Đường dây nóng Ngày Mai (Hỗ trợ trầm cảm & ngăn ngừa tự sát): 096 306 1414\n"
            "- Tổng đài Cấp cứu Y tế: 115\n"
            "Bạn không phải đơn độc, hãy tìm kiếm sự giúp đỡ từ những người xung quanh hoặc các chuyên gia y tế ngay lập tức."
        )
        current["actions"] = []
        return current

    route_decision = current.get("route_decision") or {}
    route_decision["semantic_router"] = decision.model_dump(mode="json")
    route_decision["router_source"] = decision.router_source
    current["route_decision"] = route_decision

    intent = current.get("intent") or {}
    if current["agent_profile"] == "triage":
        intent["wants_triage"] = True
    current["intent"] = intent

    profile_mapping = {
        "triage": "triage_agent",
        "medication": "medication_agent",
        "therapy": "therapy_agent",
        "care_plan": "care_plan_agent",
        "doctor_referral": "doctor_referral_agent",
    }
    current["next_node"] = profile_mapping.get(current["agent_profile"], "default_agent")
    return current


def _run_agent_llm(state: Dict[str, Any], agent_profile: str) -> Dict[str, Any]:
    user_text = str(state.get("message") or "").strip()
    tool_results = state.get("tool_results") or {}
    triage_state = _triage_state_payload(state)
    risk_level = str(state.get("risk_level") or "unknown")
    ready_for_cta = bool(state.get("ready_for_cta"))
    intent = state.get("intent") or _detect_intent_flags(user_text)

    settings, _ = _get_llmops()
    rag_context = ""
    rag_contexts: List[str] = []

    if settings is not None:
        try:
            from core_lib.llmops.guardrails import enforce_grounding
            from core_lib.llmops.guardrails.grounding_policy import extract_context_text
        except Exception:
            extract_context_text = None
        else:
            grounding = enforce_grounding(
                settings,
                agent_profile=agent_profile,
                tool_results=tool_results,
                original_query=user_text,
            )
            state["guardrails"] = {
                **(state.get("guardrails") or {}),
                "grounding": grounding.model_dump(mode="json") if hasattr(grounding, "model_dump") else {"has_context": bool(grounding.has_context)},
            }
            if not bool(grounding.has_context):
                is_emergency = (risk_level == "emergency") or any(
                    x in user_text.lower() for x in ["đau ngực", "khó thở", "yếu liệt", "nói khó", "ngất", "co giật", "lú lẫn", "chảy máu", "cấp cứu", "bất tỉnh", "đột quỵ", "tê cánh tay", "méo miệng", "phản vệ", "sưng môi", "thở rít", "méo", "ngọng", "yếu", "liệt"]
                )
                if is_emergency:
                    try:
                        from cpu_server.safety import build_clinical_fallback_response
                    except Exception:
                        try:
                            from safety import build_clinical_fallback_response
                        except Exception:
                            build_clinical_fallback_response = None
                    if build_clinical_fallback_response is not None:
                        fallback_text = build_clinical_fallback_response(agent_profile, user_text, triage_state)
                    else:
                        fallback_text = (
                            "Dựa trên các triệu chứng bạn mô tả, đây có thể là tình huống y tế khẩn cấp cần được xử trí ngay lập tức.\n\n"
                            "Vui lòng gọi ngay cấp cứu 115 hoặc đến phòng cấp cứu của bệnh viện gần nhất để được hỗ trợ kịp thời."
                        )
                else:
                    fallback_text = build_triage_fallback_text(
                        risk_level=risk_level,
                        follow_up_questions=state.get("triage_follow_up_questions") or [],
                        symptoms_collected=state.get("symptoms_collected") or [],
                    ) if agent_profile == "triage" else str(grounding.user_message or "").strip() or "Mình chưa có đủ thông tin để trả lời chắc chắn. Bạn cung cấp thêm chi tiết giúp mình nhé."
                
                state["response"] = sanitize_user_visible_text(fallback_text)
                state["actions"] = _fallback_actions(agent_profile, intent, risk_level, ready_for_cta)
                state["provider"] = "guardrails"
                state["model"] = ""
                state["metadata"] = {
                    "orchestrator": "langgraph",
                    "provider": "guardrails",
                    "agent_profile": agent_profile,
                    "intent": intent,
                    "blocked": False,
                    "grounding": state.get("guardrails") or {},
                    "triage": triage_state,
                }
                return state
            if extract_context_text is not None:
                rag_context = extract_context_text(tool_results)
                if rag_context.strip():
                    rag_contexts = [rag_context]

    messages = _build_agent_prompt(agent_profile, user_text, tool_results, triage_state)
    started_at = time.time()
    try:
        content, metadata = _foza_chat(messages, timeout_s=_foza_timeout_s())
    except Exception as exc:
        try:
            from cpu_server.safety import build_clinical_fallback_response
        except Exception:
            try:
                from safety import build_clinical_fallback_response
            except Exception:
                build_clinical_fallback_response = None

        if build_clinical_fallback_response is not None:
            fallback_text = build_clinical_fallback_response(agent_profile, user_text, triage_state)
        else:
            fallback_text = build_triage_fallback_text(
                risk_level=risk_level,
                follow_up_questions=state.get("triage_follow_up_questions") or [],
                symptoms_collected=state.get("symptoms_collected") or [],
            ) if agent_profile == "triage" else (
                "Mình tạm thời chưa kết nối được với trợ lý AI. Nếu xuất hiện dấu hiệu nặng như khó thở, đau ngực, lơ mơ hoặc sốt cao tăng nhanh, "
                "bạn nên gọi 115 hoặc đến cơ sở y tế gần nhất ngay."
            )
        state["response"] = sanitize_user_visible_text(fallback_text)
        state["actions"] = _fallback_actions(agent_profile, intent, risk_level, ready_for_cta)
        state["provider"] = "foza"
        state["model"] = ""
        state["metadata"] = {
            "orchestrator": "langgraph",
            "provider": "foza",
            "agent_profile": agent_profile,
            "intent": intent,
            "duration_ms": int((time.time() - started_at) * 1000),
            "tool_elapsed_ms": int(state.get("tool_elapsed_ms") or 0),
            "tool_durations": state.get("tool_durations") or {},
            "fallback": "foza_unreachable",
            "error": str(exc)[:300],
            "error_type": type(exc).__name__,
            "triage": triage_state,
            **({"rag_context": rag_context} if rag_context else {}),
        }
        return state

    parsed: Dict[str, Any] = {}
    block = _first_json_object(content)
    if block:
        try:
            parsed = json.loads(block)
        except Exception:
            parsed = {}

    response_text = parsed.get("response") if isinstance(parsed, dict) else None
    actions = parsed.get("actions") if isinstance(parsed, dict) else None
    final_actions = _sanitize_actions(actions)
    if not final_actions:
        final_actions = _fallback_actions(agent_profile, intent, risk_level, ready_for_cta)

    candidate_text = response_text if isinstance(response_text, str) else content
    final_text = sanitize_user_visible_text(_ensure_text(candidate_text))
    if not final_text and agent_profile == "triage":
        final_text = build_triage_fallback_text(
            risk_level=risk_level,
            follow_up_questions=state.get("triage_follow_up_questions") or [],
            symptoms_collected=state.get("symptoms_collected") or [],
        )
    final_text = _ensure_text(final_text)

    state["response"] = final_text
    state["actions"] = final_actions
    state["provider"] = "foza"
    state["model"] = str(metadata.get("model") or "")
    state["metadata"] = {
        "orchestrator": "langgraph",
        "provider": "foza",
        "model": str(metadata.get("model") or ""),
        "agent_profile": agent_profile,
        "intent": intent,
        "duration_ms": int((time.time() - started_at) * 1000),
        "tool_elapsed_ms": int(state.get("tool_elapsed_ms") or 0),
        "tool_durations": state.get("tool_durations") or {},
        "tool_calls": [str((item or {}).get("name") or "") for item in (state.get("tool_requests") or [])],
        "triage": triage_state,
        **({"usage": metadata.get("usage")} if isinstance(metadata.get("usage"), dict) else {}),
        **({"rag_context": rag_context} if rag_context else {}),
        **({"rag_contexts": rag_contexts} if rag_contexts else {}),
    }
    if settings is not None:
        state["metadata"]["guardrails"] = state.get("guardrails") or {}
    return state


def node_triage_agent(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    return _run_agent_llm(current, "triage")


def node_medication_agent(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    return _run_agent_llm(current, "medication")


def node_therapy_agent(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    return _run_agent_llm(current, "therapy")


def node_care_plan_agent(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    return _run_agent_llm(current, "care_plan")


def node_doctor_referral_agent(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    return _run_agent_llm(current, "doctor_referral")


def node_default_agent(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    return _run_agent_llm(current, "default")


def build_graph():
    try:
        from langgraph.graph import END, StateGraph
    except Exception as exc:
        raise RuntimeError(f"missing_langgraph:{exc}")

    graph = StateGraph(AgentState)
    _, observer = _get_llmops()

    nodes = {
        "route": node_route,
        "tools": node_tools,
        "supervisor": node_supervisor,
        "triage_agent": node_triage_agent,
        "medication_agent": node_medication_agent,
        "therapy_agent": node_therapy_agent,
        "care_plan_agent": node_care_plan_agent,
        "doctor_referral_agent": node_doctor_referral_agent,
        "default_agent": node_default_agent,
    }

    for name, fn in nodes.items():
        if observer is not None:
            graph.add_node(name, observer.wrap_node(node_name=name, fn=fn))
        else:
            graph.add_node(name, fn)

    graph.set_entry_point("route")

    def _route_after_guardrails(state: AgentState | Dict[str, Any]) -> str:
        current = _state_to_dict(state)
        return "END" if current.get("next_node") == "END" else "tools"

    graph.add_conditional_edges("route", _route_after_guardrails, {"END": END, "tools": "tools"})

    def _route_after_tools(state: AgentState | Dict[str, Any]) -> str:
        current = _state_to_dict(state)
        return "END" if current.get("next_node") == "END" else "supervisor"

    graph.add_conditional_edges("tools", _route_after_tools, {"END": END, "supervisor": "supervisor"})

    def _route_from_supervisor(state: AgentState | Dict[str, Any]) -> str:
        current = _state_to_dict(state)
        return str(current.get("next_node") or "default_agent")

    graph.add_conditional_edges(
        "supervisor",
        _route_from_supervisor,
        {
            "triage_agent": "triage_agent",
            "medication_agent": "medication_agent",
            "therapy_agent": "therapy_agent",
            "care_plan_agent": "care_plan_agent",
            "doctor_referral_agent": "doctor_referral_agent",
            "default_agent": "default_agent",
            "END": END,
        }
    )

    graph.add_edge("triage_agent", END)
    graph.add_edge("medication_agent", END)
    graph.add_edge("therapy_agent", END)
    graph.add_edge("care_plan_agent", END)
    graph.add_edge("doctor_referral_agent", END)
    graph.add_edge("default_agent", END)

    try:
        from cpu_server.db import get_checkpointer_pool
        from langgraph.checkpoint.postgres import PostgresSaver
        pool = get_checkpointer_pool()
        checkpointer = PostgresSaver(pool)
        return graph.compile(checkpointer=checkpointer)
    except Exception:
        try:
            from langgraph.checkpoint.memory import MemorySaver
            return graph.compile(checkpointer=MemorySaver())
        except Exception:
            return graph.compile()

