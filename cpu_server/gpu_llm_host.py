from __future__ import annotations

from typing import Any, Dict, List, Optional
import json
import requests


def resolve_gpu_model(requested_model: Optional[str], default_model: Optional[str]) -> str:
    m = (requested_model or "").strip()
    if m and m.lower() not in ("flash", "pro", "gemini"):
        return m
    d = (default_model or "").strip()
    return d or m or "gpt-4o-mini"


def build_openai_chat_payload(
    *,
    model: str,
    messages: List[Dict[str, Any]],
    max_tokens: Optional[int],
    temperature: Optional[float],
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"model": str(model), "messages": messages}
    if max_tokens is not None:
        payload["max_tokens"] = int(max_tokens)
    if temperature is not None:
        payload["temperature"] = float(temperature)
    return payload


def post_openai_chat_completions(
    *,
    base_url: str,
    payload: Dict[str, Any],
    auth: Optional[str] = None,
    timeout: int = 60,
) -> Dict[str, Any]:
    url = f"{str(base_url).rstrip('/')}/v1/chat/completions"
    headers: Dict[str, str] = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
    if auth:
        headers["Authorization"] = str(auth).strip()
    r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=timeout)
    r.raise_for_status()
    return r.json()


def extract_openai_chat_content(data: Any) -> str:
    if isinstance(data, dict):
        if isinstance(data.get("choices"), list) and data["choices"]:
            msg = data["choices"][0].get("message") or {}
            content = msg.get("content")
            if isinstance(content, str):
                return content
        if isinstance(data.get("response"), str):
            return data["response"]
        if isinstance(data.get("reply"), str):
            return data["reply"]
        if isinstance(data.get("error"), str):
            return data["error"]
    return ""
