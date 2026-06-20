from __future__ import annotations

import pytest
from cpu_server.safety import build_clinical_fallback_response


def test_fallback_triage_emergency():
    # Test triage profile with emergency conditions
    text = "tôi bị đau ngực dữ dội và khó thở"
    state = {"risk_level": "emergency"}
    res = build_clinical_fallback_response("triage", text, state)
    assert "tình huống y tế khẩn cấp" in res
    assert "115" in res
    assert "Sơ cứu khẩn cấp" in res
    assert "đau ngực/khó thở" in res


def test_fallback_triage_non_emergency():
    # Test triage profile with non-emergency conditions
    text = "tôi bị sốt nhẹ"
    state = {"risk_level": "low", "symptoms_collected": ["sốt nhẹ"]}
    res = build_clinical_fallback_response("triage", text, state)
    assert "sốt nhẹ" in res
    assert "phân tầng nguy cơ chính xác hơn" in res
    assert "nhiệt độ cụ thể không" in res


def test_fallback_therapy():
    # Test therapy profile fallback response
    res = build_clinical_fallback_response("therapy", "tôi cảm thấy rất buồn và stress")
    assert "Ngày Mai" in res
    assert "096 306 1414" in res
    assert "4-7-8" in res


def test_fallback_medication():
    # Test medication profile fallback response
    res = build_clinical_fallback_response("medication", "tác dụng phụ của paracetamol")
    assert "an toàn khi sử dụng thuốc" in res
    assert "tự ý thay đổi liều lượng" in res
    assert "tên thuốc hoặc triệu chứng" in res


def test_fallback_care_plan():
    # Test care_plan profile fallback response
    res = build_clinical_fallback_response("care_plan", "kế hoạch giảm cân")
    assert "kế hoạch chăm sóc bản thân" in res
    assert "Dinh dưỡng" in res
    assert "Giấc ngủ" in res


def test_fallback_doctor_referral():
    # Test doctor_referral profile fallback response
    res = build_clinical_fallback_response("doctor_referral", "tôi muốn khám tổng quát")
    assert "bác sĩ chuyên khoa" in res
    assert "chuẩn bị khám" in res


def test_fallback_default():
    # Test default/unknown profile fallback response
    res = build_clinical_fallback_response("unknown_profile", "xin chào")
    assert "gián đoạn kết nối tạm thời" in res
    assert "115" in res
