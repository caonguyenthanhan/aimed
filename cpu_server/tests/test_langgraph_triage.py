from __future__ import annotations

import json

from cpu_server.langgraph_agent import graph, runtime
from cpu_server.langgraph_agent.triage_router import (
    SemanticRouterDecision,
    TriageTraceStep,
    run_semantic_triage_router,
)


def _install_test_doubles(
    monkeypatch,
    *,
    router_decision: SemanticRouterDecision,
    llm_response: str,
):
    monkeypatch.setattr(graph, "_get_llmops", lambda: (None, None))
    monkeypatch.setattr(
        graph.tool_impl,
        "graph_evidence",
        lambda **kwargs: {
            "ok": True,
            "entities": [{"name": "Upper respiratory infection"}],
            "edges": [{"source": "sot", "type": "related_to", "target": "triage"}],
        },
    )
    monkeypatch.setattr(graph, "run_semantic_triage_router", lambda **kwargs: router_decision)
    monkeypatch.setattr(graph, "_foza_chat", lambda messages, timeout_s=45.0: (llm_response, {"model": "test-foza"}))
    
    from cpu_server import db
    monkeypatch.setattr(db, "get_checkpointer_pool", lambda: (_ for _ in ()).throw(Exception("Unit Test DB mock")))
    
    monkeypatch.setattr(runtime, "_GRAPH", None)


def test_mild_fever_keeps_follow_up_flow(monkeypatch):
    router_decision = SemanticRouterDecision(
        agent_profile="triage",
        symptoms_collected=["sốt nhẹ", "đau họng"],
        risk_level="low",
        ready_for_cta=False,
        next_step="follow_up",
        follow_up_questions=[
            "Bạn sốt khoảng bao nhiêu độ và đã kéo dài bao lâu rồi?",
            "Ngoài sốt, bạn có ho, khó thở hoặc bệnh nền nào không?",
        ],
        trace=[
            TriageTraceStep(
                observation="Chưa có red-flag rõ ràng, triệu chứng giống viêm hô hấp trên nhẹ.",
                implication="Cần hỏi tiếp để phân tầng nguy cơ trước khi CTA.",
            )
        ],
    )
    llm_response = json.dumps(
        {
            "response": (
                "risk_level: low\n"
                "ready_for_cta: false\n"
                "Mình cần hỏi thêm vài ý ngắn để phân tầng nguy cơ chính xác hơn:\n"
                "1. Bạn sốt khoảng bao nhiêu độ và đã kéo dài bao lâu rồi?\n"
                "2. Ngoài sốt, bạn có ho, khó thở hoặc bệnh nền nào không?"
            ),
            "actions": [],
        },
        ensure_ascii=False,
    )
    _install_test_doubles(monkeypatch, router_decision=router_decision, llm_response=llm_response)

    result = runtime.invoke_agent(
        message="Em sốt nhẹ 37.8 độ từ sáng, hơi đau họng.",
        user_id="user-1",
        conversation_id="conv-1",
        agent_id="auto",
        include_tools=True,
    )

    assert "Bạn sốt khoảng bao nhiêu độ" in result["response"]
    assert "risk_level" not in result["response"]
    assert "ready_for_cta" not in result["response"]
    assert result["actions"] == []
    assert result["metadata"]["llm_context"]["triage"]["risk_level"] == "low"
    assert result["metadata"]["llm_context"]["triage"]["ready_for_cta"] is False


def test_chest_pain_routes_to_115_immediately(monkeypatch):
    router_decision = SemanticRouterDecision(
        agent_profile="triage",
        symptoms_collected=["đau ngực", "khó thở"],
        risk_level="emergency",
        ready_for_cta=True,
        next_step="emergency",
        cta_reason="Có red-flag tim mạch/hô hấp.",
        trace=[
            TriageTraceStep(
                observation="Đau ngực kèm khó thở là red-flag cần xử trí khẩn.",
                implication="Khuyên gọi 115 ngay thay vì kéo dài follow-up.",
            )
        ],
    )
    llm_response = json.dumps(
        {
            "response": (
                '{"risk_level":"emergency"}\n'
                "Bạn có dấu hiệu nguy hiểm. Hãy gọi 115 ngay hoặc đến cơ sở y tế gần nhất càng sớm càng tốt."
            ),
            "actions": [],
        },
        ensure_ascii=False,
    )
    _install_test_doubles(monkeypatch, router_decision=router_decision, llm_response=llm_response)

    result = runtime.invoke_agent(
        message="Tôi bị đau ngực bóp nghẹt và khó thở.",
        user_id="user-2",
        conversation_id="conv-2",
        agent_id="auto",
        include_tools=True,
    )

    assert "115" in result["response"]
    assert "risk_level" not in result["response"]
    assert result["metadata"]["llm_context"]["triage"]["risk_level"] == "emergency"
    assert result["metadata"]["llm_context"]["triage"]["ready_for_cta"] is True
    assert result["actions"]
    assert result["actions"][0]["type"] == "ask_navigation"
    assert result["actions"][0]["args"]["feature"] == "bac-si"


def test_semantic_router_prompt_escapes_literal_json_schema():
    observed = {"called": False, "messages": []}

    def fake_llm(messages, timeout_s=25.0):
        observed["called"] = True
        observed["messages"] = messages
        return (
            json.dumps(
                {
                    "agent_profile": "triage",
                    "symptoms_collected": ["đau đầu"],
                    "risk_level": "low",
                    "ready_for_cta": False,
                    "next_step": "follow_up",
                    "follow_up_questions": [
                        "Bạn đau đầu từ khi nào?",
                        "Bạn có sốt, cứng gáy hoặc nhìn mờ không?",
                    ],
                    "cta_reason": "",
                    "user_response_hint": "Hỏi thêm về red flags.",
                    "trace": [
                        {
                            "observation": "Chưa có red-flag rõ ràng.",
                            "implication": "Cần follow-up ngắn trước khi CTA.",
                        }
                    ],
                    "router_source": "semantic_router_lcel",
                },
                ensure_ascii=False,
            ),
            {"model": "fake"},
        )

    decision = run_semantic_triage_router(
        user_text="Tôi bị đau đầu, có phải cảm cúm không?",
        tool_results={"graph.evidence": {"ok": True, "entities": [], "edges": []}},
        requested_agent_id="auto",
        llm_caller=fake_llm,
        timeout_s=5.0,
    )

    assert observed["called"] is True
    assert any("router_source" in str(msg.get("content") or "") for msg in observed["messages"])
    assert decision.router_source == "semantic_router_lcel"
    assert decision.agent_profile == "triage"
    assert decision.ready_for_cta is False


def test_multi_agent_routing_medication(monkeypatch):
    router_decision = SemanticRouterDecision(
        agent_profile="medication",
        symptoms_collected=[],
        risk_level="unknown",
        ready_for_cta=False,
        next_step="follow_up",
        trace=[],
    )
    llm_response = json.dumps(
        {
            "response": "Bạn cần dùng Paracetamol 500mg mỗi 4-6 giờ khi sốt trên 38.5 độ.",
            "actions": [],
        },
        ensure_ascii=False,
    )
    _install_test_doubles(monkeypatch, router_decision=router_decision, llm_response=llm_response)

    result = runtime.invoke_agent(
        message="Thuốc paracetamol uống thế nào",
        user_id="user-3",
        conversation_id="conv-3",
        agent_id="auto",
        include_tools=True,
    )

    assert "Paracetamol" in result["response"]
    assert result["metadata"]["agent_profile"] == "medication"


def test_multi_agent_routing_therapy(monkeypatch):
    router_decision = SemanticRouterDecision(
        agent_profile="therapy",
        symptoms_collected=[],
        risk_level="unknown",
        ready_for_cta=False,
        next_step="follow_up",
        trace=[],
    )
    llm_response = json.dumps(
        {
            "response": "Tôi hiểu bạn đang căng thẳng. Hãy cùng tập bài thở sâu nhé.",
            "actions": [{"type": "play_music", "args": {"videoId": "123", "title": "Nhạc thiền"}}],
        },
        ensure_ascii=False,
    )
    _install_test_doubles(monkeypatch, router_decision=router_decision, llm_response=llm_response)

    result = runtime.invoke_agent(
        message="Stress mất ngủ quá",
        user_id="user-4",
        conversation_id="conv-4",
        agent_id="auto",
        include_tools=True,
    )

    assert "căng thẳng" in result["response"]
    assert result["metadata"]["agent_profile"] == "therapy"
    assert len(result["actions"]) == 1
    assert result["actions"][0]["type"] == "play_music"


def test_multi_agent_routing_doctor(monkeypatch):
    router_decision = SemanticRouterDecision(
        agent_profile="doctor_referral",
        symptoms_collected=[],
        risk_level="unknown",
        ready_for_cta=False,
        next_step="follow_up",
        trace=[],
    )
    llm_response = json.dumps(
        {
            "response": "Để tôi giúp bạn kết nối với bác sĩ chuyên khoa phù hợp.",
            "actions": [{"type": "ask_navigation", "args": {"feature": "bac-si", "reason": "Đặt lịch với bác sĩ"}}],
        },
        ensure_ascii=False,
    )
    _install_test_doubles(monkeypatch, router_decision=router_decision, llm_response=llm_response)

    result = runtime.invoke_agent(
        message="Đặt lịch hẹn khám",
        user_id="user-5",
        conversation_id="conv-5",
        agent_id="auto",
        include_tools=True,
    )

    assert "bác sĩ" in result["response"]
    assert result["metadata"]["agent_profile"] == "doctor_referral"
    assert result["actions"][0]["type"] == "ask_navigation"


def test_multi_agent_routing_default(monkeypatch):
    router_decision = SemanticRouterDecision(
        agent_profile="default",
        symptoms_collected=[],
        risk_level="unknown",
        ready_for_cta=False,
        next_step="follow_up",
        trace=[],
    )
    llm_response = json.dumps(
        {
            "response": "Xin chào! Mình có thể giúp gì cho sức khỏe của bạn hôm nay?",
            "actions": [],
        },
        ensure_ascii=False,
    )
    _install_test_doubles(monkeypatch, router_decision=router_decision, llm_response=llm_response)

    result = runtime.invoke_agent(
        message="Xin chào bạn",
        user_id="user-6",
        conversation_id="conv-6",
        agent_id="auto",
        include_tools=True,
    )

    assert "Xin chào" in result["response"]
    assert result["metadata"]["agent_profile"] == "default"

