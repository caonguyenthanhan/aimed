"""Grounding policy to prevent hallucinations."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..settings import LlmopsSettings


class GroundingDecision(BaseModel):
    has_context: bool
    should_fallback: bool
    additional_tool_requests: List[Dict[str, Any]] = Field(default_factory=list)
    user_message: Optional[str] = None
    reason: str = "ok"


def enforce_grounding(
    settings: LlmopsSettings,
    *,
    agent_profile: str,
    tool_results: Dict[str, Any],
    original_query: str,
) -> GroundingDecision:
    cfg = settings.guardrails.grounding
    if not settings.guardrails.enabled or not cfg.enabled:
        return GroundingDecision(has_context=True, should_fallback=False, reason="disabled")

    profile = str(agent_profile or "").strip().lower()
    required_profiles = {str(x).strip().lower() for x in (cfg.require_context_for_profiles or []) if str(x).strip()}
    if profile not in required_profiles:
        return GroundingDecision(has_context=True, should_fallback=False, reason="profile_not_required")

    ctx_text = extract_context_text(tool_results)
    has_ctx = len(ctx_text.strip()) >= int(cfg.context_min_chars or 0)
    if has_ctx:
        return GroundingDecision(has_context=True, should_fallback=False, reason="has_context")

    additional = []
    for spec in cfg.fallback_tools or []:
        name = str(spec.name or "").strip()
        if not name:
            continue
        args = dict(spec.args or {})
        if "query" not in args:
            args["query"] = original_query
        additional.append({"name": name, "args": args})

    return GroundingDecision(
        has_context=False,
        should_fallback=True if additional else False,
        additional_tool_requests=additional,
        user_message=str(cfg.user_facing_no_context_message or "").strip() or None,
        reason="no_context",
    )


def extract_context_text(tool_results: Dict[str, Any]) -> str:
    parts: List[str] = []
    for k, v in (tool_results or {}).items():
        key = str(k or "")
        if key == "graph.evidence":
            parts.append(_extract_graph(v))
            continue
        if key == "web.search":
            parts.append(_extract_web(v))
            continue
        if key.startswith("youtube."):
            parts.append(_extract_youtube(v))
            continue
    return "\n".join([p for p in parts if p.strip()])


def _extract_graph(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    if not payload.get("ok"):
        return ""
    ents = payload.get("entities") if isinstance(payload.get("entities"), list) else []
    edges = payload.get("edges") if isinstance(payload.get("edges"), list) else []
    if not ents and not edges:
        return ""
    lines: List[str] = []
    for e in ents[:10]:
        if isinstance(e, dict):
            name = str(e.get("name") or "").strip()
            if name:
                lines.append(name)
    for ed in edges[:40]:
        if not isinstance(ed, dict):
            continue
        a = str(ed.get("entity_name") or "").strip()
        r = str(ed.get("rel") or "").strip()
        b = str(ed.get("other_name") or "").strip()
        if a and r and b:
            lines.append(f"{a} -[{r}]- {b}")
    return "\n".join(lines)


def _extract_web(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    if not payload.get("ok"):
        return ""
    items = payload.get("results") if isinstance(payload.get("results"), list) else []
    lines: List[str] = []
    for it in items[:8]:
        if not isinstance(it, dict):
            continue
        title = str(it.get("title") or "").strip()
        snip = str(it.get("snippet") or "").strip()
        url = str(it.get("url") or "").strip()
        if title and snip:
            lines.append(f"{title}: {snip}")
        elif title:
            lines.append(title)
        if url:
            lines.append(url)
    return "\n".join(lines)


def _extract_youtube(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    if not payload.get("ok"):
        return ""
    if "video" in payload and isinstance(payload.get("video"), dict):
        return str(payload.get("video"))
    items = payload.get("results") if isinstance(payload.get("results"), list) else []
    if not items:
        return ""
    return "\n".join([str(it) for it in items[:5]])

