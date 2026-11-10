"""
Tests for P1-7: Honest Simulated States
- In simulated mode, audit entries display SIMULATED_SUBMITTED and SIMULATED_CONCEDED
- Prevents misleading claims of live PayPal transmission in local/offline modes
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.services.control_tower_service import control_tower_service

client = TestClient(app)
AUTH_SENIOR = {"Authorization": "Bearer tok_senior_risk_001"}


@pytest.fixture(autouse=True)
def clean_control_tower(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "paypal_mode", "simulated")
    client.post("/api/control-tower/reset", headers=AUTH_SENIOR)
    yield
    client.post("/api/control-tower/reset", headers=AUTH_SENIOR)


def test_simulated_mode_approve_audit_entry_honesty():
    """In simulated mode, approving an item records SIMULATED_SUBMITTED in audit trail."""
    res = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_SENIOR,
        json={"reviewer_notes": "Approving defense in simulated environment"},
    )
    assert res.status_code == 200
    item = res.json()
    latest_audit = item["audit_trail"][-1]
    assert latest_audit["paypal_api_status"] == "SIMULATED_SUBMITTED"
    assert "SIMULATED" in latest_audit["reviewer_notes"]


def test_simulated_mode_reject_audit_entry_honesty():
    """In simulated mode, rejecting/conceding records SIMULATED_CONCEDED in audit trail."""
    res = client.post(
        "/api/control-tower/CT-9023/reject",
        headers=AUTH_SENIOR,
        json={"resolution_strategy": "CONCEDE_AND_REFUND", "reviewer_notes": "Conceding dispute fee"},
    )
    assert res.status_code == 200
    item = res.json()
    latest_audit = item["audit_trail"][-1]
    assert latest_audit["paypal_api_status"] == "SIMULATED_CONCEDED"
    assert "SIMULATED" in latest_audit["reviewer_notes"]
