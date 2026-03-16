import re
from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class SafetyHit:
    category: str
    term: str


_TERMS_SELF_HARM = [
    "tự tử",
    "tự sát",
    "muốn chết",
    "kết liễu",
    "nhảy lầu",
    "cắt tay",
    "cắt cổ",
    "uống thuốc quá liều",
    "quá liều",
    "overdose",
    "tôi muốn chết",
    "tôi không muốn sống nữa",
]

_TERMS_VIOLENCE = [
    "giết người",
    "giết ai đó",
    "làm hại người khác",
    "bom",
    "chế tạo bom",
]

_TERMS = {
    "self_harm": _TERMS_SELF_HARM,
    "violence": _TERMS_VIOLENCE,
}

_NORMALIZE_RE = re.compile(r"\s+")


def _normalize(text: str) -> str:
    t = (text or "").lower().strip()
    t = _NORMALIZE_RE.sub(" ", t)
    return t


def check_text(text: str) -> List[SafetyHit]:
    t = _normalize(text)
    if not t:
        return []
    hits: List[SafetyHit] = []
    for cat, terms in _TERMS.items():
        for term in terms:
            if term in t:
                hits.append(SafetyHit(category=cat, term=term))
    return hits


def build_block_response(hits: List[SafetyHit]) -> str:
    cats = {h.category for h in hits}
    if "self_harm" in cats:
        return (
            "Mình nghe bạn đang ở trong trạng thái rất khó chịu. Vì an toàn của bạn, mình không thể hỗ trợ nội dung liên quan đến tự làm hại bản thân.\n\n"
            "Nếu bạn đang có ý định hoặc cảm thấy có thể làm hại bản thân ngay lúc này:\n"
            "- Gọi số khẩn cấp tại nơi bạn đang ở (115 ở Việt Nam) hoặc nhờ người thân ở cạnh.\n"
            "- Nếu có thể, hãy đến cơ sở y tế gần nhất hoặc gọi người thân/bạn bè tin cậy.\n\n"
            "Nếu bạn muốn, bạn có thể nói: lúc này cảm xúc nào đang mạnh nhất, và điều gì vừa xảy ra trước đó?"
        )
    return (
        "Vì an toàn, mình không thể hỗ trợ nội dung liên quan đến gây hại cho người khác hoặc hướng dẫn bạo lực.\n\n"
        "Nếu bạn đang mất kiểm soát, hãy rời khỏi tình huống ngay và tìm hỗ trợ từ người thân hoặc dịch vụ khẩn cấp tại nơi bạn đang ở."
    )


def should_block(user_text: str, history: Optional[list] = None) -> List[SafetyHit]:
    parts = [user_text or ""]
    if isinstance(history, list):
        for m in history[-8:]:
            if isinstance(m, dict) and str(m.get("role") or "").lower() == "user":
                parts.append(str(m.get("content") or ""))
    return check_text(" ".join(parts))

