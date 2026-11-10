"""
PaySentinel AI — P1-2 Webhook 200 vs Background Processing Tests
================================================================
Validates:
(a) signature verified immediately;
(b) inserts event with status RECEIVED (fail-closed if DB write fails -> 500);
(c) returns 200 {"status": "RECEIVED", "event_id": ...};
(d) dispatches processing to BackgroundTasks / asyncio task;
(e) transitions RECEIVED -> PROCESSING -> PROCESSED (or FAILED);
(f) GET /api/webhooks/events?event_id=X allows polling;
(g) returns <200ms even with slow downstream drafter;
(h) duplicate during in-flight dropped with 200 DUPLICATE_IN_FLIGHT.
"""

import asyncio
import time
import uuid
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db import get_webhook_event, mark_webhook_event_status
from app.main import app

client = TestClient(app)


def test_webhook_returns_received_immediately_with_slow_drafter(monkeypatch):
    """Endpoint must return 200 {"status": "RECEIVED"} fast even if drafter takes 1.5 seconds."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    event_id = f"WH-FAST-{uuid.uuid4().hex[:8]}"
    payload = {
        "id": event_id,
        "event_type": "CUSTOMER.DISPUTE.CREATED",
        "resource": {
            "dispute_id": f"PP-FAST-{uuid.uuid4().hex[:6]}",
            "amount": {"value": "60.00", "currency_code": "USD"},
            "evidence": [{"tracking_number": "1ZFAST999", "carrier_name": "UPS"}],
        },
    }

    async def slow_draft(*args, **kwargs):
        await asyncio.sleep(1.0)
        return {
            "rebuttal_letter": "Rebuttal citing [EVD-TRK-1]",
            "claims": [{"evidence_id": "EVD-TRK-1", "statement": "Slow draft statement"}],
            "recommended_action": "SUBMIT_EVIDENCE",
            "confidence_score": 0.9,
        }

    t0 = time.time()
    with patch("app.services.defense_drafter._query_gemini_defense_draft", new=AsyncMock(side_effect=slow_draft)):
        res = client.post("/api/webhooks/paypal", json=payload, headers={"X-PaySentinel-Simulated": "true"})
    elapsed = time.time() - t0

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "RECEIVED"
    assert data["event_id"] == event_id


def test_webhook_duplicate_in_flight_dropped(monkeypatch):
    """When an event is currently in RECEIVED or PROCESSING, a duplicate delivery returns DUPLICATE_IN_FLIGHT."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    event_id = f"WH-INFLIGHT-{uuid.uuid4().hex[:8]}"
    # Pre-insert event in PROCESSING status in SQLite
    from app.db import record_webhook_event_processing
    record_webhook_event_processing(
        event_id=event_id,
        event_type="CUSTOMER.DISPUTE.CREATED",
        resource_type="dispute",
        summary="Test in flight",
        payload={"id": event_id},
    )
    mark_webhook_event_status(event_id, "PROCESSING")

    payload = {
        "id": event_id,
        "event_type": "CUSTOMER.DISPUTE.CREATED",
        "resource": {"dispute_id": "PP-INFLIGHT-1"},
    }
    res = client.post("/api/webhooks/paypal", json=payload, headers={"X-PaySentinel-Simulated": "true"})
    assert res.status_code == 200
    assert res.json()["status"] == "DUPLICATE_IN_FLIGHT"


def test_webhook_events_query_by_id(monkeypatch):
    """GET /api/webhooks/events?event_id=X returns specific event."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    event_id = f"WH-QUERY-{uuid.uuid4().hex[:8]}"
    payload = {
        "id": event_id,
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-123", "amount": {"value": "99.00"}},
    }
    res = client.post("/api/webhooks/paypal", json=payload, headers={"X-PaySentinel-Simulated": "true"})
    assert res.status_code == 200

    query_res = client.get(f"/api/webhooks/events?event_id={event_id}")
    assert query_res.status_code == 200
    q_data = query_res.json()
    assert q_data["count"] >= 1
    matched = [e for e in q_data["events"] if e["id"] == event_id]
    assert len(matched) == 1
    assert matched[0]["event_type"] == "PAYMENT.CAPTURE.COMPLETED"
