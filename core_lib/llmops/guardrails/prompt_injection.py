"""Prompt injection detection and blocking."""

from __future__ import annotations

import re
from typing import List

from pydantic import BaseModel

from ..settings import LlmopsSettings


class PromptInjectionResult(BaseModel):
    allowed: bool
    reason: str
    user_message: str


def validate_user_message(settings: LlmopsSettings, *, text: str) -> PromptInjectionResult:
    cfg = settings.guardrails.prompt_injection
    s = str(text or "")
    if not settings.guardrails.enabled or not cfg.enabled:
        return PromptInjectionResult(allowed=True, reason="disabled", user_message=s)

    if cfg.max_chars > 0 and len(s) > cfg.max_chars:
        s = s[: cfg.max_chars]

    matches = _find_matches(s, patterns=cfg.blocked_patterns, substrings=cfg.blocked_substrings)
    if matches:
        if cfg.allow_on_match:
            return PromptInjectionResult(allowed=True, reason="matched_but_allowed", user_message=s)
        return PromptInjectionResult(allowed=False, reason="blocked:" + ",".join(matches[:5]), user_message=cfg.user_facing_block_message)

    return PromptInjectionResult(allowed=True, reason="ok", user_message=s)


def _find_matches(text: str, *, patterns: List[str], substrings: List[str]) -> List[str]:
    out: List[str] = []
    low = text.lower()
    for ss in substrings or []:
        needle = str(ss or "").strip()
        if needle and needle.lower() in low:
            out.append("substr:" + needle)
    for pat in patterns or []:
        p = str(pat or "").strip()
        if not p:
            continue
        try:
            if re.search(p, text):
                out.append("re:" + p)
        except Exception:
            continue
    return out

