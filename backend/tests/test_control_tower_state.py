"""
Tests for Step 3: State Machine & SQLite Persistence
===================================================
Verifies:
1. PayPal 500 transitions item to FAILED.
2. Retry from FAILED preserves the same idempotency key and succeeds on 2xx.
3. Double approve on already SUBMITTED item returns 409 Conflict.
4. Process restart (instantiating new ControlTowerStore) keeps item state and intact hash chain.
"""

from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db import verify_audit_hash_chain
from app.main import app
from app.models.schemas import ControlTowerStatus
from app.services.control_tower_service import ControlTowerStore, control_tower_service
from app.services.dispute_provider import SandboxDisputeProvider

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_control_tower():
    control_tower_service.reset_store()
    yield
    control_tower_service.reset_store()


@pytest.mark.anyio
async def test_paypal_500_ends_in_failed():
    """PayPal 500 must transition item to FAILED with error captured in audit log."""
    provider = SandboxDisputeProvider()
    with patch("app.services.control_tower_service.get_dispute_provider", return_value=provider), \
         patch.object(
             provider.client,
             "provide_evidence",
             new=AsyncMock(return_value={"status": "ERROR", "http_status": 500, "error": "INTERNAL_SERVER_ERROR", "debug_id": "DBG-500-ERR"}),
         ):
        res = client.post(
            "/api/control-tower/CT-9021/approve",
            json={"reviewer_name": "Senior Risk Auditor", "reviewer_notes": "Attempting initial submission"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == ControlTowerStatus.FAILED.value
        assert data["idempotency_key"] is not None
        assert "IDEM-" in data["idempotency_key"]

        # Audit trail must show PENDING_REVIEW -> SUBMITTING -> FAILED
        trail = data["audit_trail"]
        states = [e["new_state"] for e in trail]
        assert "SUBMITTING" in states
        assert "FAILED" in states

        # Audit chain remains cryptographically valid
        valid, reason = verify_audit_hash_chain("CT-9021")
        assert valid is True
        assert "Hash chain verified" in reason


@pytest.mark.anyio
async def test_retry_from_failed_reuses_idempotency_key():
    """Retrying from FAILED state reuses the exact same idempotency key and moves to SUBMITTED on 200."""
    provider = SandboxDisputeProvider()

    # Step 1: PayPal 500 triggers FAILED
    with patch("app.services.control_tower_service.get_dispute_provider", return_value=provider), \
         patch.object(
             provider.client,
             "provide_evidence",
             new=AsyncMock(return_value={"status": "ERROR", "http_status": 500, "error": "GATEWAY_TIMEOUT"}),
         ):
        res_fail = client.post(
            "/api/control-tower/CT-9021/approve",
            json={"reviewer_name": "Audit Officer A", "reviewer_notes": "First attempt"},
        )
        assert res_fail.status_code == 200
        failed_item = res_fail.json()
        assert failed_item["status"] == "FAILED"
        original_key = failed_item["idempotency_key"]
        assert original_key is not None

    # Step 2: Retry with PayPal 200 OK
    with patch("app.services.control_tower_service.get_dispute_provider", return_value=provider), \
         patch.object(
             provider.client,
             "provide_evidence",
             new=AsyncMock(return_value={"status": "SUCCESS", "http_status": 200, "response": {"status": "SUCCESS"}}),
         ):
        res_retry = client.post(
            "/api/control-tower/CT-9021/approve",
            json={"reviewer_name": "Audit Officer B", "reviewer_notes": "Retry attempt after PayPal recovery"},
        )
        assert res_retry.status_code == 200
        retried_item = res_retry.json()
        assert retried_item["status"] == "SUBMITTED"
        # Idempotency key must be IDENTICAL across retries
        assert retried_item["idempotency_key"] == original_key

        valid, reason = verify_audit_hash_chain("CT-9021")
        assert valid is True
        assert "Hash chain verified" in reason


def test_double_approve_returns_409_conflict():
    """Double approval on an already submitted item must return 409 Conflict."""
    # First approval: succeeds (using default simulated provider)
    res_1 = client.post(
        "/api/control-tower/CT-9021/approve",
        json={"reviewer_name": "Primary Reviewer", "reviewer_notes": "First approval"},
    )
    assert res_1.status_code == 200
    assert res_1.json()["status"] == "SUBMITTED"

    # Second approval: must be rejected with 409 Conflict
    res_2 = client.post(
        "/api/control-tower/CT-9021/approve",
        json={"reviewer_name": "Secondary Reviewer", "reviewer_notes": "Duplicate approval attempt"},
    )
    assert res_2.status_code == 409
    assert "cannot be approved" in res_2.json()["detail"]


def test_restart_keeps_state_and_audit_chain():
    """Re-instantiating ControlTowerStore (server restart) loads SQLite state without loss or reset."""
    # Step 1: Submit item
    res = client.post(
        "/api/control-tower/CT-9021/approve",
        json={"reviewer_name": "Operations Lead", "reviewer_notes": "Approved prior to restart"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SUBMITTED"

    # Step 2: Simulate backend restart by instantiating new store instance
    restarted_store = ControlTowerStore()
    item_restarted = restarted_store.get_item("CT-9021")
    assert item_restarted is not None
    assert item_restarted.status == ControlTowerStatus.SUBMITTED
    assert item_restarted.idempotency_key is not None

    # Step 3: Verify audit log entries were preserved and hash chain remains intact
    assert len(item_restarted.audit_trail) >= 2
    valid, reason = verify_audit_hash_chain("CT-9021")
    assert valid is True
    assert "Hash chain verified" in reason
