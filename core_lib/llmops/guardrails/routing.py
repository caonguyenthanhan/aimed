"""Semantic routing for message classification."""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Optional

from pydantic import BaseModel

from ..settings import LlmopsSettings


class RouteDecision(BaseModel):
    route: str
    score: float = 0.0
    provider: str = "disabled"
    reason: str = "disabled"


_ROUTER: Optional[object] = None


def route_message(settings: LlmopsSettings, *, text: str) -> RouteDecision:
    cfg = settings.guardrails.routing
    if not settings.guardrails.enabled or not cfg.enabled:
        return RouteDecision(route="default", provider="disabled", reason="disabled")
    if cfg.provider != "semantic_router":
        return RouteDecision(route="default", provider="disabled", reason="unsupported_provider")
    sr_cfg = cfg.semantic_router
    if not sr_cfg.enabled:
        return RouteDecision(route="default", provider="disabled", reason="semantic_router_disabled")

    router = _get_router(settings)
    if router is None:
        return RouteDecision(route="default", provider="semantic_router", reason="router_unavailable")

    try:
        choice = router(text)  # type: ignore[call-arg]
        name = str(getattr(choice, "name", "") or "") or "default"
        score = float(getattr(choice, "score", 0.0) or 0.0)
        if score < float(sr_cfg.threshold or 0.0):
            return RouteDecision(route="default", score=score, provider="semantic_router", reason="below_threshold")
        return RouteDecision(route=name, score=score, provider="semantic_router", reason="routed")
    except Exception as e:
        return RouteDecision(route="default", provider="semantic_router", reason=f"error:{e}")


def _get_router(settings: LlmopsSettings) -> Optional[object]:
    global _ROUTER
    if _ROUTER is not None:
        return _ROUTER
    cfg = settings.guardrails.routing.semantic_router
    if cfg.encoder == "openai" and not (os.environ.get("OPENAI_API_KEY") or "").strip():
        return None

    try:
        from semantic_router import Route  # type: ignore
        from semantic_router.encoders import OpenAIEncoder  # type: ignore
        from semantic_router.routers import SemanticRouter  # type: ignore
    except Exception:
        return None

    try:
        routes = [Route(name=r.name, utterances=list(r.utterances or [])) for r in (cfg.routes or [])]
        encoder = OpenAIEncoder()
        _ROUTER = SemanticRouter(encoder=encoder, routes=routes)
        return _ROUTER
    except Exception:
        return None

