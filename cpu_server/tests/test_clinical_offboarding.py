from __future__ import annotations

import json
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from cpu_server.langgraph_agent.triage_router import (
    SemanticRouterDecision,
    TriageTraceStep,
    _fallback_router_decision,
    _parse_router_output,
)
from cpu_server.langgraph_agent import graph, runtime
from cpu_server.server import app
from cpu_server import db


def test_suicidal_keyword_fallback():
    # Test that suicidal keywords are matched in fallback router decision
    decision_1 = _fallback_router_decision("Tôi muốn tự tử", None)
    assert decision_1.clinical_hold is True
    assert decision_1.risk_level == "emergency"
    assert decision_1.agent_profile == "triage"

    decision_2 = _fallback_router_decision("I want to commit suicide", None)
    assert decision_2.clinical_hold is True
    assert decision_2.risk_level == "emergency"

    decision_3 = _fallback_router_decision("Tôi đang rất mệt mỏi và muốn chết đi cho xong", None)
    assert decision_3.clinical_hold is True
    assert decision_3.risk_level == "emergency"


def test_suicidal_keyword_override_in_parse():
    # Test that even if LLM returns a normal route, suicidal keywords override it
    raw_response = json.dumps({
        "agent_profile": "default",
        "symptoms_collected": [],
        "risk_level": "low",
        "ready_for_cta": False,
        "next_step": "follow_up",
        "follow_up_questions": ["Bạn khoẻ không?"],
        "trace": [],
        "router_source": "test",
        "stealth_phq9": 5,
        "stealth_gad7": 2,
        "clinical_hold": False
    })
    decision = _parse_router_output(raw_response, None, "Tôi muốn quyên sinh")
    assert decision.clinical_hold is True
    assert decision.risk_level == "emergency"
    assert decision.agent_profile == "triage"
    assert decision.ready_for_cta is True


def test_langgraph_clinical_hold_transition(monkeypatch):
    # Setup test doubles
    monkeypatch.setattr(graph, "_get_llmops", lambda: (None, None))
    monkeypatch.setattr(runtime, "_GRAPH", None)
    monkeypatch.setattr(db, "get_checkpointer_pool", lambda: (_ for _ in ()).throw(Exception("Unit Test DB mock")))

    # Mock DB clinical hold update
    db_calls = []
    def mock_set_hold(conv_id, hold, phq9=-1, gad7=-1):
        db_calls.append((conv_id, hold, phq9, gad7))
    monkeypatch.setattr(db, "set_conversation_clinical_hold", mock_set_hold)

    # Force router decision to clinical_hold = True
    router_decision = SemanticRouterDecision(
        agent_profile="triage",
        symptoms_collected=["nguy cơ tự hại/tự tử"],
        risk_level="emergency",
        ready_for_cta=True,
        next_step="emergency",
        clinical_hold=True,
        stealth_phq9=20,
        stealth_gad7=15,
    )
    monkeypatch.setattr(graph, "run_semantic_triage_router", lambda **kwargs: router_decision)

    result = runtime.invoke_agent(
        message="Tôi muốn tự tử",
        user_id="user-suicide",
        conversation_id="conv-suicide-123",
        agent_id="auto",
        include_tools=False,
    )

    assert "Ngày Mai" in result["response"]
    assert "096 306 1414" in result["response"]
    assert "115" in result["response"]
    assert result["actions"] == []
    
    # Check that DB was called to set clinical hold
    assert len(db_calls) == 1
    assert db_calls[0] == ("conv-suicide-123", True, 20, 15)


def test_db_clinical_hold_blocks_append_message(monkeypatch):
    # Mock is_conversation_on_clinical_hold to return True
    monkeypatch.setattr(db, "is_conversation_on_clinical_hold", lambda cid: True)

    with pytest.raises(ValueError, match="Conversation is on clinical hold"):
        db.append_message("conv-held", "user", "Hello again")


def test_fastapi_endpoint_short_circuits_clinical_hold(monkeypatch):
    # Mock db to return clinical_hold = True
    from cpu_server import server
    monkeypatch.setattr(server, "_db_is_conversation_on_clinical_hold", lambda cid: True)

    # Mock auth in server to bypass token validation
    monkeypatch.setattr(server, "get_current_user", lambda req: "user-123")

    client = TestClient(app)
    response = client.post(
        "/v1/agent-chat",
        json={
            "message": "Hello",
            "conversation_id": "conv-held-456",
            "user_id": "user-123",
            "agent_id": "auto",
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "Ngày Mai" in data["response"]
    assert data["metadata"]["clinical_hold"] is True
    assert data["metadata"]["blocked"] is True
