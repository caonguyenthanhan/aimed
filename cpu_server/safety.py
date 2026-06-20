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


def build_clinical_fallback_response(agent_profile: str, user_text: str, triage_state: Optional[dict] = None) -> str:
    profile = str(agent_profile or "default").strip().lower()
    text = str(user_text or "").strip().lower()
    state = triage_state or {}
    
    # 1. Triage profile
    if profile == "triage":
        is_emergency = (state.get("risk_level") == "emergency") or any(
            x in text for x in ["đau ngực", "khó thở", "yếu liệt", "nói khó", "ngất", "co giật", "lú lẫn", "chảy máu", "cấp cứu", "bất tỉnh"]
        )
        if is_emergency:
            return (
                "Dựa trên các triệu chứng bạn mô tả, đây có thể là tình huống y tế khẩn cấp cần được xử trí ngay lập tức.\n\n"
                "Sơ cứu khẩn cấp:\n"
                "- Nếu đau ngực/khó thở: Ngừng mọi vận động, ngồi nghỉ tư thế nửa nằm nửa ngồi (Fowler), nới lỏng quần áo cổ, tránh tự di chuyển và nhờ người bên cạnh hỗ trợ.\n"
                "- Nếu có dấu hiệu đột quỵ (méo miệng, yếu tay chân, nói khó): Hãy ghi nhớ thời điểm khởi phát để báo với y bác sĩ.\n\n"
                "Bạn cần gọi ngay cấp cứu 115 hoặc đến phòng cấp cứu của bệnh viện gần nhất để được kiểm tra y tế kịp thời."
            )
        
        symptoms = state.get("symptoms_collected") or []
        symptom_line = ""
        if symptoms:
            symptom_line = f"Mình ghi nhận hiện tại bạn đang nhắc tới: {', '.join(symptoms[:4])}.\n"
        
        return (
            f"{symptom_line}"
            "Mình ghi nhận thông tin sức khỏe của bạn. Để có thể phân tầng nguy cơ chính xác hơn, bạn vui lòng chia sẻ thêm:\n"
            "1. Triệu chứng đã xuất hiện bao lâu và bạn có đo được nhiệt độ cụ thể không?\n"
            "2. Ngoài ra bạn có kèm theo các dấu hiệu nặng như khó thở, đau ngực bóp nghẹt, co giật hay lơ mơ không?"
        )
        
    # 2. Therapy profile
    elif profile == "therapy":
        return (
            "Mình cảm nhận bạn đang trải qua những cảm xúc rất khó khăn. Nếu bạn đang cảm thấy quá tải hoặc có ý định tự làm hại, hãy nhớ rằng bạn không đơn độc.\n\n"
            "Hỗ trợ khẩn cấp:\n"
            "- Gọi 115 hoặc đến cơ sở y tế gần nhất.\n"
            "- Đường dây nóng hỗ trợ tâm lý Ngày Mai: 096 306 1414.\n\n"
            "Bài tập làm dịu nhanh (Phương pháp thở 4-7-8):\n"
            "1. Thở ra hết sạch hơi qua miệng.\n"
            "2. Hít vào lặng lẽ qua mũi trong 4 giây.\n"
            "3. Nín thở giữ hơi trong 7 giây.\n"
            "4. Thở ra hoàn toàn qua miệng tạo ra âm thanh nhẹ trong 8 giây.\n"
            "Lặp lại chu kỳ này 4 lần để giúp hệ thần kinh dịu lại."
        )
        
    # 3. Medication profile
    elif profile == "medication":
        return (
            "Để đảm bảo an toàn khi sử dụng thuốc, bạn cần tuân thủ các nguyên tắc y khoa cơ bản:\n"
            "- Tuyệt đối không tự ý thay đổi liều lượng, tự ý ngưng thuốc hoặc sử dụng thuốc theo đơn của người khác.\n"
            "- Luôn đọc kỹ hướng dẫn sử dụng, lưu ý các tương tác thuốc (nếu dùng nhiều loại) và tác dụng phụ ghi trên nhãn.\n"
            "- Nếu xuất hiện các phản ứng bất thường như phát ban, ngứa, sưng mặt, khó thở hoặc buồn nôn dữ dội sau khi uống thuốc, hãy ngừng thuốc và liên hệ ngay với bác sĩ kê đơn hoặc đến cơ sở y tế gần nhất.\n\n"
            "Bạn có thể cho mình biết cụ thể tên thuốc hoặc triệu chứng bạn gặp phải sau khi dùng thuốc không?"
        )
        
    # 4. Care plan profile
    elif profile == "care_plan":
        return (
            "Để duy trì và nâng cao sức khỏe mỗi ngày, một kế hoạch chăm sóc bản thân lành mạnh bao gồm:\n"
            "- Dinh dưỡng: Ăn đủ bữa, cân đối các nhóm chất, tăng cường rau xanh và uống đủ nước (1.5 - 2 lít/ngày).\n"
            "- Vận động: Duy trì vận động thể chất nhẹ nhàng phù hợp (ví dụ: đi bộ 15-30 phút mỗi ngày).\n"
            "- Giấc ngủ: Thiết lập khung giờ ngủ cố định, ngủ đủ 7-8 tiếng/đêm và hạn chế thiết bị điện tử trước khi ngủ 1 giờ.\n"
            "- Ghi chép: Ghi lại các chỉ số sức khỏe cơ bản (huyết áp, nhịp tim, giấc ngủ, số bước chân) vào nhật ký hàng ngày để theo dõi xu hướng.\n\n"
            "Bạn muốn lập mục tiêu cụ thể nào cho sức khỏe tinh thần hoặc thể chất hôm nay?"
        )
        
    # 5. Doctor referral profile
    elif profile == "doctor_referral":
        return (
            "Nếu các triệu chứng y tế của bạn kéo dài hoặc gây lo ngại, việc thăm khám trực tiếp với bác sĩ chuyên khoa là cách tốt nhất để chẩn đoán chính xác.\n\n"
            "Lời khuyên chuẩn bị khám:\n"
            "- Ghi chép lại thời gian bắt đầu, tần suất và mức độ của các triệu chứng.\n"
            "- Chuẩn bị sẵn danh sách các thuốc đang dùng (bao gồm cả thực phẩm chức năng).\n"
            "- Ghi lại các câu hỏi bạn muốn thảo luận với bác sĩ.\n\n"
            "Bạn có muốn kết nối với hệ thống đặt lịch hẹn hoặc tìm kiếm danh sách bác sĩ chuyên khoa phù hợp không?"
        )
        
    # 6. Default profile
    else:
        return (
            "Hệ thống trợ lý AI hiện đang gián đoạn kết nối tạm thời. Tuy nhiên, an toàn của bạn là ưu tiên hàng đầu.\n\n"
            "Nguyên tắc an toàn y tế:\n"
            "- Nếu gặp các triệu chứng cấp tính (như khó thở, đau ngực, sốt cao đột ngột), vui lòng liên hệ ngay hotline cấp cứu 115 hoặc đến trung tâm y tế gần nhất.\n"
            "- Không tự ý chẩn đoán hoặc tự điều trị các bệnh lý phức tạp dựa trên thông tin trực tuyến.\n"
            "Bạn có thể mô tả chi tiết hơn triệu chứng hoặc vấn đề bạn cần hỗ trợ để chúng mình hỗ trợ kịp thời khi kết nối phục hồi không?"
        )

