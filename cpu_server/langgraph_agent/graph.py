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


def _infer_agent_profile(text: str) -> str:
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


def _detect_intent_flags(text: str) -> Dict[str, Any]:
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


def _plan_tools(text: str) -> List[Dict[str, Any]]:
    lower = str(text or "").lower()
    ascii_text = _strip_accents(lower)
    requests_plan: List[Dict[str, Any]] = [{"name": "graph.evidence", "args": {"query": text, "limit": 60, "entity_limit": 6}}]
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


def _foza_chat(messages: List[Dict[str, Any]], timeout_s: float = 45.0) -> Tuple[str, Dict[str, Any]]:
    base = (os.environ.get("FOZA_BASE_URL") or "https://api.foza.ai/v1").strip().rstrip("/")
    token = (os.environ.get("FOZA_TOKEN") or os.environ.get("FOZA_TOKEN_2") or "").strip()
    model = (os.environ.get("LLM_MODEL_NAME") or "").strip()
    if not token or not model:
        raise RuntimeError("missing_foza_env")
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
    while attempts < 2:
        attempts += 1
        try:
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
    metadata = {"model": model}
    if usage:
        metadata["usage"] = usage
    return content, metadata


def _triage_state_payload(state: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "symptoms_collected": state.get("symptoms_collected") or [],
        "risk_level": str(state.get("risk_level") or "unknown"),
        "ready_for_cta": bool(state.get("ready_for_cta")),
        "follow_up_questions": state.get("triage_follow_up_questions") or [],
        "semantic_router_trace": state.get("semantic_router_trace") or [],
    }


def _build_json_prompt(agent_profile: str, user_text: str, tool_results: Dict[str, Any], triage_state: Dict[str, Any]) -> List[Dict[str, Any]]:
    try:
        from cpu_server.graph_gateway import compress_tool_results
    except Exception:
        try:
            from graph_gateway import compress_tool_results
        except Exception:
            compress_tool_results = lambda x: x

    allow_paths = ", ".join(ALLOWED_PATH_PREFIXES)
    system_lines = [
        "Bạn là AI agent cho ứng dụng tư vấn y tế & tâm lý.",
        f"AGENT_PROFILE:{agent_profile}",
        "Luôn trả về một JSON object DUY NHẤT. Không dùng markdown.",
        "Schema:",
        "{",
        '  "response": "string",',
        '  "actions": [ { "type": "...", "args": {} } ]',
        "}",
        "Actions hợp lệ: navigate(path), speak(text), embed(feature, context), ask_navigation(feature, reason, context), play_music(videoId,title,artist,autoplay), recommend_music(recommendations,mood,message).",
        f"Allowlist paths: {allow_paths}",
        "Không được lộ key JSON, tên biến kỹ thuật, metric code, metadata, tool names hay guardrail state vào response người dùng.",
    ]
    if str(agent_profile or "").strip().lower() == "triage":
        system_lines.extend(
            [
                "Nếu risk_level là low/moderate và ready_for_cta=false: ưu tiên hỏi tiếp 1-2 câu ngắn để phân tầng nguy cơ, không đẩy CTA/hẹn bác sĩ quá sớm.",
                "Nếu risk_level là emergency: khuyên gọi 115 hoặc đi cấp cứu ngay với giọng tự nhiên, rõ ràng, ngắn gọn.",
                "Nếu đã có follow_up_questions trong state, ưu tiên dùng chúng để hỏi tiếp.",
            ]
        )
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
    current["tool_requests"] = _plan_tools(message) if bool(current.get("include_tools", True)) else []

    settings, _ = _get_llmops()
    if settings is None:
        return current
    try:
        from core_lib.llmops.guardrails import route_message, validate_user_message
    except Exception:
        return current

    route_decision = route_message(settings, text=message)
    injection = validate_user_message(settings, text=message)
    current["route_decision"] = route_decision.model_dump(mode="json") if hasattr(route_decision, "model_dump") else {"route": str(route_decision.route)}
    current["guardrails"] = {
        "prompt_injection": injection.model_dump(mode="json") if hasattr(injection, "model_dump") else {"allowed": bool(injection.allowed)}
    }
    if bool(injection.allowed):
        current["blocked"] = False
        return current

    current["blocked"] = True
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
        return current
    try:
        from core_lib.llmops.guardrails import enforce_grounding
    except Exception:
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
    if not grounding.should_fallback or remaining <= 0 or not additional_requests:
        return current

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
    return current


def node_reasoning(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    if bool(current.get("blocked")):
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

    route_decision = current.get("route_decision") or {}
    route_decision["semantic_router"] = decision.model_dump(mode="json")
    route_decision["router_source"] = decision.router_source
    current["route_decision"] = route_decision

    intent = current.get("intent") or {}
    if current["agent_profile"] == "triage":
        intent["wants_triage"] = True
    current["intent"] = intent
    return current


def node_llm(state: AgentState | Dict[str, Any]) -> Dict[str, Any]:
    current = _state_to_dict(state)
    if bool(current.get("blocked")):
        return current

    user_text = str(current.get("message") or "").strip()
    agent_profile = str(current.get("agent_profile") or "default").strip() or "default"
    tool_results = current.get("tool_results") or {}
    intent = current.get("intent") or _detect_intent_flags(user_text)
    triage_state = _triage_state_payload(current)
    risk_level = str(current.get("risk_level") or "unknown")
    ready_for_cta = bool(current.get("ready_for_cta"))
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
            current["guardrails"] = {
                **(current.get("guardrails") or {}),
                "grounding": grounding.model_dump(mode="json") if hasattr(grounding, "model_dump") else {"has_context": bool(grounding.has_context)},
            }
            if not bool(grounding.has_context):
                current["response"] = build_triage_fallback_text(
                    risk_level=risk_level,
                    follow_up_questions=current.get("triage_follow_up_questions") or [],
                    symptoms_collected=current.get("symptoms_collected") or [],
                ) if agent_profile == "triage" else str(grounding.user_message or "").strip() or "Mình chưa có đủ thông tin để trả lời chắc chắn. Bạn cung cấp thêm chi tiết giúp mình nhé."
                current["actions"] = _fallback_actions(agent_profile, intent, risk_level, ready_for_cta)
                current["provider"] = "guardrails"
                current["model"] = ""
                current["metadata"] = {
                    "orchestrator": "langgraph",
                    "provider": "guardrails",
                    "agent_profile": agent_profile,
                    "intent": intent,
                    "blocked": False,
                    "grounding": current.get("guardrails") or {},
                    "triage": triage_state,
                }
                return current
            if extract_context_text is not None:
                rag_context = extract_context_text(tool_results)
                if rag_context.strip():
                    rag_contexts = [rag_context]

    messages = _build_json_prompt(agent_profile, user_text, tool_results, triage_state)
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
                follow_up_questions=current.get("triage_follow_up_questions") or [],
                symptoms_collected=current.get("symptoms_collected") or [],
            ) if agent_profile == "triage" else (
                "Mình tạm thời chưa kết nối được với trợ lý AI. Nếu xuất hiện dấu hiệu nặng như khó thở, đau ngực, lơ mơ hoặc sốt cao tăng nhanh, "
                "bạn nên gọi 115 hoặc đến cơ sở y tế gần nhất ngay."
            )
        current["response"] = sanitize_user_visible_text(fallback_text)
        current["actions"] = _fallback_actions(agent_profile, intent, risk_level, ready_for_cta)
        current["provider"] = "foza"
        current["model"] = ""
        current["metadata"] = {
            "orchestrator": "langgraph",
            "provider": "foza",
            "agent_profile": agent_profile,
            "intent": intent,
            "duration_ms": int((time.time() - started_at) * 1000),
            "tool_elapsed_ms": int(current.get("tool_elapsed_ms") or 0),
            "tool_durations": current.get("tool_durations") or {},
            "fallback": "foza_unreachable",
            "error": str(exc)[:300],
            "error_type": type(exc).__name__,
            "triage": triage_state,
            **({"rag_context": rag_context} if rag_context else {}),
        }
        return current

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
            follow_up_questions=current.get("triage_follow_up_questions") or [],
            symptoms_collected=current.get("symptoms_collected") or [],
        )
    final_text = _ensure_text(final_text)

    current["response"] = final_text
    current["actions"] = final_actions
    current["provider"] = "foza"
    current["model"] = str(metadata.get("model") or "")
    current["metadata"] = {
        "orchestrator": "langgraph",
        "provider": "foza",
        "model": str(metadata.get("model") or ""),
        "agent_profile": agent_profile,
        "intent": intent,
        "duration_ms": int((time.time() - started_at) * 1000),
        "tool_elapsed_ms": int(current.get("tool_elapsed_ms") or 0),
        "tool_durations": current.get("tool_durations") or {},
        "tool_calls": [str((item or {}).get("name") or "") for item in (current.get("tool_requests") or [])],
        "triage": triage_state,
        **({"usage": metadata.get("usage")} if isinstance(metadata.get("usage"), dict) else {}),
        **({"rag_context": rag_context} if rag_context else {}),
        **({"rag_contexts": rag_contexts} if rag_contexts else {}),
    }
    if settings is not None:
        current["metadata"]["guardrails"] = current.get("guardrails") or {}
    return current


def build_graph():
    try:
        from langgraph.graph import END, StateGraph
    except Exception as exc:
        raise RuntimeError(f"missing_langgraph:{exc}")

    graph = StateGraph(AgentState)
    _, observer = _get_llmops()
    if observer is not None:
        graph.add_node("route", observer.wrap_node(node_name="route", fn=node_route))
        graph.add_node("tools", observer.wrap_node(node_name="tools", fn=node_tools))
        graph.add_node("reasoning", observer.wrap_node(node_name="reasoning", fn=node_reasoning))
        graph.add_node("llm", observer.wrap_node(node_name="llm", fn=node_llm))
    else:
        graph.add_node("route", node_route)
        graph.add_node("tools", node_tools)
        graph.add_node("reasoning", node_reasoning)
        graph.add_node("llm", node_llm)

    graph.set_entry_point("route")

    def _route_next(state: AgentState | Dict[str, Any]) -> str:
        current = _state_to_dict(state)
        return "blocked" if bool(current.get("blocked")) else "tools"

    graph.add_conditional_edges("route", _route_next, {"blocked": END, "tools": "tools"})
    graph.add_edge("tools", "reasoning")
    graph.add_edge("reasoning", "llm")
    graph.add_edge("llm", END)

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
