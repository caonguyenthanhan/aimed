from __future__ import annotations

import json
import os
import re
import time
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

import requests

from .state import AgentState
from . import tools as tool_impl


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


def _is_allowed_path(path: str) -> bool:
    p = str(path or "").strip()
    if not p.startswith("/"):
        return False
    return any(p == pre or p.startswith(pre + "/") for pre in ALLOWED_PATH_PREFIXES)


def _strip_accents(s: str) -> str:
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode("ascii")


def _infer_agent_profile(text: str) -> str:
    lower = str(text or "").lower()
    ascii_text = _strip_accents(lower)
    if re.search(r"(bác sĩ|đặt hẹn|đặt lịch|khám|tư vấn trực tiếp|hẹn khám)", lower) or re.search(r"(bac si|dat hen|dat lich|kham|tu van truc tiep|hen kham)", ascii_text):
        return "doctor_referral"
    if re.search(r"(đau ngực|khó thở|yếu liệt|nói khó|ngất|chảy máu|co giật|lú lẫn|đau bụng dữ dội|cấp cứu)", lower) or re.search(r"(dau nguc|kho tho|yeu liet|noi kho|ngat|chay mau|co giat|lu lan|dau bung du doi|cap cuu)", ascii_text):
        return "triage"
    if re.search(r"(lo âu|hoảng loạn|trầm cảm|mất ngủ|căng thẳng|stress|tự hại|tự sát|trị liệu|bài thở|thiền|cbt)", lower) or re.search(r"(lo au|hoang loan|tram cam|mat ngu|cang thang|stress|tu hai|tu sat|tri lieu|bai tho|thien|cbt)", ascii_text):
        return "therapy"
    if re.search(r"(thuốc|uống|liều|tương tác|tác dụng phụ|chống chỉ định|ibuprofen|paracetamol|kháng sinh|statin)", lower) or re.search(r"(thuoc|uong|lieu|tuong tac|tac dung phu|chong chi dinh|ibuprofen|paracetamol|khang sinh|statin)", ascii_text):
        return "medication"
    if re.search(r"(kế hoạch|lộ trình|theo dõi|mục tiêu|nhật ký|routine|giảm cân|tăng cân|tập luyện)", lower) or re.search(r"(ke hoach|lo trinh|theo doi|muc tieu|nhat ky|routine|giam can|tang can|tap luyen)", ascii_text):
        return "care_plan"
    return "default"


def _plan_tools(text: str) -> List[Dict[str, Any]]:
    lower = str(text or "").lower()
    ascii_text = _strip_accents(lower)
    reqs: List[Dict[str, Any]] = []
    if "graph" in lower or "evidence" in lower or "đồ thị" in lower or "do thi" in ascii_text:
        reqs.append({"name": "graph.evidence", "args": {"query": text, "limit": 60, "entity_limit": 5}})
    if "youtube" in lower or "video" in lower or "nhạc" in lower or "nhac" in ascii_text:
        reqs.append({"name": "youtube.search", "args": {"query": text, "maxResults": 5}})
    if re.search(r"\b(tìm|tra cứu|tim|tra cuu|nguồn|source|search)\b", ascii_text):
        reqs.append({"name": "web.search", "args": {"query": text, "num": 5}})
    return reqs[:3]


def _first_json_object(text: str) -> Optional[str]:
    s = str(text or "")
    start = s.find("{")
    if start < 0:
        return None
    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(s)):
        ch = s[i]
        if in_str:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return None


def _sanitize_actions(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, Any]] = []
    for a in raw[:10]:
        if not isinstance(a, dict):
            continue
        t = str(a.get("type") or "").strip()
        args = a.get("args") or {}
        if t == "navigate":
            p = str((args or {}).get("path") or "").strip()
            if _is_allowed_path(p):
                out.append({"type": "navigate", "args": {"path": p}})
            continue
        if t == "speak":
            tx = str((args or {}).get("text") or "").strip()
            if tx:
                out.append({"type": "speak", "args": {"text": tx[:800]}})
            continue
        if t == "embed":
            feat = str((args or {}).get("feature") or "").strip()
            ctx = (args or {}).get("context") if isinstance((args or {}).get("context"), dict) else {}
            if feat and feat in EMBEDDABLE_FEATURE_IDS:
                out.append({"type": "embed", "args": {"feature": feat, "context": ctx}})
            continue
        if t == "ask_navigation":
            feat = str((args or {}).get("feature") or "").strip()
            reason = str((args or {}).get("reason") or "").strip() or "Bạn muốn mở tính năng này không?"
            ctx = (args or {}).get("context") if isinstance((args or {}).get("context"), dict) else {}
            if feat and feat in EMBEDDABLE_FEATURE_IDS:
                out.append({"type": "ask_navigation", "args": {"feature": feat, "reason": reason[:400], "context": ctx}})
            continue
        if t == "play_music":
            vid = str((args or {}).get("videoId") or "").strip()
            title = str((args or {}).get("title") or "").strip()
            artist = str((args or {}).get("artist") or "").strip() if isinstance((args or {}).get("artist"), str) else ""
            autoplay = (args or {}).get("autoplay") if isinstance((args or {}).get("autoplay"), bool) else None
            if vid and title:
                payload: Dict[str, Any] = {"videoId": vid, "title": title}
                if artist:
                    payload["artist"] = artist
                if autoplay is not None:
                    payload["autoplay"] = autoplay
                out.append({"type": "play_music", "args": payload})
            continue
        if t == "recommend_music":
            recs = (args or {}).get("recommendations") if isinstance((args or {}).get("recommendations"), list) else []
            mood = str((args or {}).get("mood") or "").strip() if isinstance((args or {}).get("mood"), str) else ""
            msg = str((args or {}).get("message") or "").strip() if isinstance((args or {}).get("message"), str) else ""
            safe_recs = []
            for it in recs[:10]:
                if not isinstance(it, dict):
                    continue
                vid = str(it.get("videoId") or "").strip()
                title = str(it.get("title") or "").strip()
                if not vid or not title:
                    continue
                safe_recs.append(
                    {
                        "videoId": vid,
                        "title": title,
                        **({"artist": str(it.get("artist") or "").strip()} if str(it.get("artist") or "").strip() else {}),
                        **({"thumbnail": str(it.get("thumbnail") or "").strip()} if str(it.get("thumbnail") or "").strip() else {}),
                        **({"duration": str(it.get("duration") or "").strip()} if str(it.get("duration") or "").strip() else {}),
                        **({"mood": str(it.get("mood") or "").strip()} if str(it.get("mood") or "").strip() else {}),
                    }
                )
            out.append({"type": "recommend_music", "args": {"recommendations": safe_recs, **({"mood": mood} if mood else {}), **({"message": msg[:400]} if msg else {})}})
            continue
    return out


def _ensure_text(text: str) -> str:
    s = str(text or "").strip()
    return s if s else "Mình chưa nhận được đủ thông tin. Bạn mô tả thêm giúp mình nhé?"


def _foza_chat(messages: List[Dict[str, Any]], timeout_s: float = 45.0) -> Tuple[str, Dict[str, Any]]:
    base = (os.environ.get("FOZA_BASE_URL") or "https://api.foza.ai/v1").strip().rstrip("/")
    token = (os.environ.get("FOZA_TOKEN") or os.environ.get("FOZA_TOKEN_2") or "").strip()
    model = (os.environ.get("LLM_MODEL_NAME") or "").strip()
    if not token or not model:
        raise RuntimeError("missing_foza_env")
    url = base + "/chat/completions"
    headers = {"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "aimed-langgraph/1.0", "Authorization": f"Bearer {token}"}
    body = {"model": model, "messages": messages, "temperature": 0.2}
    resp = requests.post(url, headers=headers, json=body, timeout=timeout_s)
    resp.encoding = "utf-8"
    raw = resp.text or ""
    if not resp.ok:
        raise RuntimeError(f"foza_error:{resp.status_code}:{raw[:400]}")
    data = resp.json()
    msg = (((data.get("choices") or [{}])[0] or {}).get("message") or {})
    content = str(msg.get("content") or "").strip()
    return content, {"model": model}


def _build_json_prompt(agent_profile: str, user_text: str, tool_results: Dict[str, Any]) -> List[Dict[str, Any]]:
    allow = ", ".join(ALLOWED_PATH_PREFIXES)
    sys = "\n".join(
        [
            "Bạn là AI agent cho ứng dụng tư vấn y tế & tâm lý.",
            f"AGENT_PROFILE:{agent_profile}",
            "Trả về một JSON object DUY NHẤT theo schema dưới đây. Không dùng markdown.",
            "Schema:",
            "{",
            '  "response": "string",',
            '  "actions": [ { "type": "...", "args": {} } ]',
            "}",
            "Actions hợp lệ: navigate(path), speak(text), embed(feature, context), ask_navigation(feature, reason, context), play_music(videoId,title,artist,autoplay), recommend_music(recommendations,mood,message).",
            f"Allowlist paths: {allow}",
        ]
    )
    context = json.dumps(tool_results or {}, ensure_ascii=False)[:12000]
    return [
        {"role": "system", "content": sys},
        {"role": "system", "content": f"TOOL_RESULTS_JSON:{context}"},
        {"role": "user", "content": user_text},
    ]


def node_route(state: AgentState) -> AgentState:
    msg = str(state.get("message") or "").strip()
    requested = str(state.get("agent_id") or "").strip().lower()
    agent_profile = _infer_agent_profile(msg)
    if requested and requested != "auto":
        agent_profile = requested
    tool_reqs = _plan_tools(msg) if bool(state.get("include_tools", True)) else []
    state["agent_profile"] = agent_profile
    state["tool_requests"] = tool_reqs
    return state


def node_tools(state: AgentState) -> AgentState:
    reqs = state.get("tool_requests") or []
    try:
        max_calls = int(str(os.environ.get("LG_MAX_TOOL_CALLS") or "3").strip() or "3")
    except Exception:
        max_calls = 3
    if max_calls < 0:
        max_calls = 0
    if max_calls > 6:
        max_calls = 6
    results: Dict[str, Any] = {}
    for r in reqs[:max_calls]:
        name = str((r or {}).get("name") or "").strip()
        args = (r or {}).get("args") or {}
        if name == "web.search":
            results[name] = tool_impl.web_search(query=str(args.get("query") or ""), num=int(args.get("num") or 5), timeout_s=0.0)
        elif name == "youtube.search":
            results[name] = tool_impl.youtube_search(query=str(args.get("query") or ""), maxResults=int(args.get("maxResults") or 5), timeout_s=0.0)
        elif name == "youtube.video":
            results[name] = tool_impl.youtube_video(videoId=str(args.get("videoId") or ""), timeout_s=0.0)
        elif name == "youtube.recommend_music":
            results[name] = tool_impl.youtube_recommend_music(mood=str(args.get("mood") or ""), maxResults=int(args.get("maxResults") or 5), timeout_s=0.0)
        elif name == "graph.status":
            results[name] = tool_impl.graph_status(timeout_s=0.0)
        elif name == "graph.evidence":
            results[name] = tool_impl.graph_evidence(
                query=str(args.get("query") or ""),
                limit=int(args.get("limit") or 60),
                entity_limit=int(args.get("entity_limit") or 5),
                rel_types=args.get("rel_types") if isinstance(args.get("rel_types"), list) else None,
                timeout_s=0.0,
            )
    state["tool_results"] = results
    return state


def node_llm(state: AgentState) -> AgentState:
    user_text = str(state.get("message") or "").strip()
    agent_profile = str(state.get("agent_profile") or "default").strip() or "default"
    tool_results = state.get("tool_results") or {}
    msgs = _build_json_prompt(agent_profile, user_text, tool_results)
    t0 = time.time()
    content, meta = _foza_chat(msgs, timeout_s=float(os.environ.get("FOZA_REQUEST_TIMEOUT_MS") or 45.0))
    block = _first_json_object(content)
    parsed: Dict[str, Any] = {}
    if block:
        try:
            parsed = json.loads(block)
        except Exception:
            parsed = {}
    response_text = parsed.get("response") if isinstance(parsed, dict) else None
    actions = parsed.get("actions") if isinstance(parsed, dict) else None
    final_actions = _sanitize_actions(actions)
    final_text = _ensure_text(response_text if isinstance(response_text, str) else content)
    state["response"] = final_text
    state["actions"] = final_actions
    state["provider"] = "foza"
    state["model"] = str(meta.get("model") or "")
    state["metadata"] = {
        "orchestrator": "langgraph",
        "provider": "foza",
        "model": str(meta.get("model") or ""),
        "agent_profile": agent_profile,
        "duration_ms": int((time.time() - t0) * 1000),
        "tool_calls": [str((x or {}).get("name") or "") for x in (state.get("tool_requests") or [])],
    }
    return state


def build_graph():
    try:
        from langgraph.graph import END, StateGraph
    except Exception as e:
        raise RuntimeError(f"missing_langgraph:{e}")
    g = StateGraph(AgentState)
    g.add_node("route", node_route)
    g.add_node("tools", node_tools)
    g.add_node("llm", node_llm)
    g.set_entry_point("route")
    g.add_edge("route", "tools")
    g.add_edge("tools", "llm")
    g.add_edge("llm", END)
    return g.compile()
