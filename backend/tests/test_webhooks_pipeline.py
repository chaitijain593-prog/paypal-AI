"""
Tests for Step 5: Webhooks Pipeline Hardening
- Process-then-commit (PROCESSING -> PROCESSED | FAILED)
- Ingestion of CUSTOMER.DISPUTE.CREATED into Control Tower with AI drafted defense
- Signature enforcement and explicit DEV allow_unsigned_webhooks flag
- GET /events reads directly from SQLite DB
- Idempotent deduplication (replay)
- Handler failure recovery upon retry
"""

import json
import sys
import uuid
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db import get_webhook_event, load_webhook_events_from_db
from app.main import app
from app.services.control_tower_service import control_tower_service
from app.services.paypal_client import paypal_client

client = TestClient(app)


def _gen_event_id() -> str:
    return f"WH-TEST-{uuid.uuid4().hex[:10].upper()}"


def test_reject_unsigned_webhook_when_flag_disabled(monkeypatch):
    """When allow_unsigned_webhooks is False, webhook missing signature headers is rejected with 400."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", False)

    payload = {
        "id": _gen_event_id(),
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-123", "amount": {"value": "100.00"}},
    }
    # No signature headers
    res = client.post("/api/webhooks/paypal", json=payload)
    assert res.status_code == 400
    assert "Missing PayPal transmission signature headers" in res.json()["detail"]


def test_allow_unsigned_webhook_when_dev_flag_enabled(monkeypatch):
    """When allow_unsigned_webhooks is True, unsigned webhook is accepted and processed."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    event_id = _gen_event_id()
    payload = {
        "id": event_id,
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-123", "amount": {"value": "100.00"}},
    }
    res = client.post("/api/webhooks/paypal", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("RECEIVED", "PROCESSED")
    assert data["event_id"] == event_id

    # Verify state in SQLite
    row = get_webhook_event(event_id)
    assert row is not None
    assert row["status"] == "PROCESSED"


def test_sandbox_signature_verification_success(monkeypatch):
    """In sandbox mode, valid signature verified via paypal_client succeeds."""
    settings = get_settings()
    monkeypatch.setattr(settings, "paypal_mode", "sandbox")
    monkeypatch.setattr(settings, "paypal_webhook_id", "WH-SANDBOX-12345")
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", False)
    monkeypatch.setattr(paypal_client, "client_id", "test-client")
    monkeypatch.setattr(paypal_client, "client_secret", "test-secret")

    event_id = _gen_event_id()
    payload = {
        "id": event_id,
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-123", "amount": {"value": "45.00"}},
    }
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123",
        "PAYPAL-TRANSMISSION-ID": "TRANS-123",
        "PAYPAL-TRANSMISSION-SIG": "VALID_SIGNATURE_BASE64",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T10:00:00Z",
    }

    with patch.object(paypal_client, "verify_webhook_signature", new=AsyncMock(return_value=True)):
        res = client.post("/api/webhooks/paypal", json=payload, headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] in ("RECEIVED", "PROCESSED")


def test_sandbox_signature_verification_failure(monkeypatch):
    """In sandbox mode, invalid signature is rejected with 400."""
    settings = get_settings()
    monkeypatch.setattr(settings, "paypal_mode", "sandbox")
    monkeypatch.setattr(settings, "paypal_webhook_id", "WH-SANDBOX-12345")
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", False)
    monkeypatch.setattr(paypal_client, "client_id", "test-client")
    monkeypatch.setattr(paypal_client, "client_secret", "test-secret")

    event_id = _gen_event_id()
    payload = {
        "id": event_id,
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-123", "amount": {"value": "45.00"}},
    }
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123",
        "PAYPAL-TRANSMISSION-ID": "TRANS-123",
        "PAYPAL-TRANSMISSION-SIG": "FORGED_SIGNATURE",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T10:00:00Z",
    }

    with patch.object(paypal_client, "verify_webhook_signature", new=AsyncMock(return_value=False)):
        res = client.post("/api/webhooks/paypal", json=payload, headers=headers)
        assert res.status_code == 400
        assert "Invalid PayPal webhook signature" in res.json()["detail"]


def test_replay_deduplication(monkeypatch):
    """Replaying an already-processed webhook returns DUPLICATE_DROPPED."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    event_id = _gen_event_id()
    payload = {
        "id": event_id,
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-REPLAY", "amount": {"value": "99.00"}},
    }

    # First call: accepted & processed in background
    res1 = client.post("/api/webhooks/paypal", json=payload)
    assert res1.status_code == 200
    assert res1.json()["status"] in ("RECEIVED", "PROCESSED")

    # Second call: duplicate dropped
    res2 = client.post("/api/webhooks/paypal", json=payload)
    assert res2.status_code == 200
    assert res2.json()["status"] == "DUPLICATE_DROPPED"


def test_handler_failure_then_successful_retry(monkeypatch):
    """If background handling raises an exception, row is marked FAILED; retry with same ID succeeds and becomes PROCESSED."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    event_id = _gen_event_id()
    payload = {
        "id": event_id,
        "event_type": "CUSTOMER.DISPUTE.CREATED",
        "resource": {
            "dispute_id": f"PP-FAIL-{uuid.uuid4().hex[:6]}",
            "amount": {"value": "50.00"},
            "evidence": [{"tracking_number": "1Z999FAIL", "carrier_name": "UPS"}],
        },
    }

    # 1. First attempt returns 200 RECEIVED, background task fails due to simulated exception
    with patch("app.routers.webhooks.draft_dispute_defense", side_effect=RuntimeError("Simulated drafter crash")):
        res1 = client.post("/api/webhooks/paypal", json=payload)
        assert res1.status_code == 200
        assert res1.json()["status"] == "RECEIVED"

    # Check DB: background task recorded status as FAILED with error message
    row = get_webhook_event(event_id)
    assert row is not None
    assert row["status"] == "FAILED"
    assert "Simulated drafter crash" in row["error_message"]

    # 2. Retry with same event_id succeeds
    res2 = client.post("/api/webhooks/paypal", json=payload)
    assert res2.status_code == 200
    assert res2.json()["status"] in ("RECEIVED", "PROCESSED")

    # Check DB: status is now PROCESSED
    row_updated = get_webhook_event(event_id)
    assert row_updated["status"] == "PROCESSED"
    assert row_updated["error_message"] is None

    # 3. Third call: now that it is PROCESSED, it gets deduplicated
    res3 = client.post("/api/webhooks/paypal", json=payload)
    assert res3.status_code == 200
    assert res3.json()["status"] == "DUPLICATE_DROPPED"


def test_customer_dispute_created_pipeline(monkeypatch):
    """CUSTOMER.DISPUTE.CREATED ingests dispute, calls drafter, and creates a Control Tower item."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    dispute_id = f"PP-INGEST-{uuid.uuid4().hex[:6]}"
    event_id = _gen_event_id()
    payload = {
        "id": event_id,
        "event_type": "CUSTOMER.DISPUTE.CREATED",
        "resource": {
            "dispute_id": dispute_id,
            "transaction_id": "TXN-AIRPODS-772",
            "amount": {"value": "249.00", "currency_code": "USD"},
            "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
            "buyer": {"name": "Jordan Smith", "email": "jordan@example.com"},
            "description": "I did not receive the package after two weeks.",
            "item_name": "Apple AirPods Pro 2nd Gen",
            "evidence": [{"tracking_number": "1Z9999999999999999", "carrier_name": "UPS"}],
        },
    }

    mock_draft = {
        "rebuttal_letter": f"Rebuttal for PayPal Dispute {dispute_id}: Formal contest citing [EVD-TRK-1].",
        "claims": [
            {"evidence_id": "EVD-TRK-1", "statement": "Carrier delivery scan confirmed release."},
        ],
        "confidence_score": 0.95,
        "recommended_action": "SUBMIT_EVIDENCE",
    }
    with patch("app.services.defense_drafter._query_gemini_defense_draft", new=AsyncMock(return_value=mock_draft)):
        res = client.post("/api/webhooks/paypal", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("RECEIVED", "PROCESSED")

    # Check that Control Tower store now has this item
    _, items = control_tower_service.get_items()
    matched = [i for i in items if i.dispute_id == dispute_id]
    assert len(matched) == 1
    item = matched[0]
    assert item.amount == 249.00
    assert item.buyer_name == "Jordan Smith"
    assert len(item.proof_claims) > 0
    assert "Rebuttal for PayPal Dispute" in item.drafted_defense_letter
    assert item.audit_trail[0].actor == "PayPal Webhook Pipeline"


def test_get_events_reads_from_database(monkeypatch):
    """GET /api/webhooks/events returns recorded events stored in SQLite."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    event_id = _gen_event_id()
    payload = {
        "id": event_id,
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-TEST-DB", "amount": {"value": "12.50"}},
    }
    client.post("/api/webhooks/paypal", json=payload)

    res = client.get("/api/webhooks/events")
    assert res.status_code == 200
    data = res.json()
    assert data["data_source"] == "SQLITE"
    assert data["count"] >= 1
    found = [e for e in data["events"] if e["id"] == event_id]
    assert len(found) == 1
    assert found[0]["event_type"] == "PAYMENT.CAPTURE.COMPLETED"
    assert found[0]["status"] == "PROCESSED"
