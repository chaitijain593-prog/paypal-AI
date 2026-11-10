"""
Unit and Integration Tests for Phase 2: Real PayPal Sandbox Loop
===============================================================
Covers:
1. SandboxDisputeProvider against doc-accurate PayPal responses (200, 400, 404, 409)
2. Webhook signature verification, invalid signature rejection, and duplicate event drop
3. Maker-checker constraint enforcement (same name -> 400, distinct name -> 200)
4. Audit log cryptographic hash chain validation and tamper detection
"""

from __future__ import annotations

import sqlite3
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db import DB_PATH, get_db_connection, verify_audit_hash_chain
from app.main import app
from app.services.dispute_provider import SandboxDisputeProvider, SimulatedDisputeProvider

client = TestClient(app)


# ── 1. SandboxDisputeProvider Unit Tests ─────────────────────────────────────

@pytest.mark.anyio
async def test_sandbox_dispute_provider_provide_evidence_200():
    provider = SandboxDisputeProvider()
    with patch.object(
        provider.client,
        "provide_evidence",
        new=AsyncMock(return_value={"status": "SUCCESS", "http_status": 200, "response": {}}),
    ):
        res = await provider.provide_evidence("PP-D-12345", "FedEx tracking #12345 delivered.")
        assert res["status"] == "SUCCESS"
        assert res["http_status"] == 200


@pytest.mark.anyio
async def test_sandbox_dispute_provider_error_handling():
    provider = SandboxDisputeProvider()

    # 400 Bad Request
    with patch.object(
        provider.client,
        "provide_evidence",
        new=AsyncMock(return_value={"status": "ERROR", "http_status": 400, "error": "INVALID_EVIDENCE_TYPE"}),
    ):
        res_400 = await provider.provide_evidence("PP-D-12345", "Invalid evidence payload")
        assert res_400["status"] == "ERROR"
        assert res_400["http_status"] == 400

    # 404 Not Found
    with patch.object(
        provider.client,
        "get_dispute",
        new=AsyncMock(return_value=None),
    ):
        res_404 = await provider.get_dispute("PP-D-NONEXISTENT")
        assert res_404 is None

    # 409 Conflict / Already resolved
    with patch.object(
        provider.client,
        "accept_claim",
        new=AsyncMock(return_value={"status": "ERROR", "http_status": 409, "error": "DISPUTE_ALREADY_RESOLVED"}),
    ):
        res_409 = await provider.accept_claim("PP-D-12345", "Concede claim")
        assert res_409["status"] == "ERROR"
        assert res_409["http_status"] == 409


# ── 2. Webhook Signature Verification & Deduplication ────────────────────────

def test_webhook_happy_path_and_deduplication(monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setattr(get_settings(), "allow_unsigned_webhooks", True)

    import uuid
    event_id = f"WH-TEST-EVT-{uuid.uuid4().hex[:8]}"
    payload = {
        "id": event_id,
        "event_type": "CUSTOMER.DISPUTE.CREATED",
        "resource_type": "dispute",
        "summary": "Customer dispute created",
        "resource": {"dispute_id": "PP-D-99881", "status": "UNDER_REVIEW"},
    }

    # First delivery: accepted in RECEIVED status and processed in background
    res = client.post("/api/webhooks/paypal", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["RECEIVED", "PROCESSED"]
    assert data["event_id"] == event_id

    # Second delivery with exact same ID: duplicate dropped
    res_dup = client.post("/api/webhooks/paypal", json=payload)
    assert res_dup.status_code == 200
    data_dup = res_dup.json()
    assert data_dup["status"] == "DUPLICATE_DROPPED"
    assert data_dup["event_id"] == event_id


def test_webhook_invalid_signature_rejection():
    # In sandbox mode, missing or invalid signature headers must return 400
    with patch("app.routers.webhooks.settings.paypal_mode", "sandbox"), \
         patch.object(type(SandboxDisputeProvider().client), "has_credentials", True), \
         patch.object(
             SandboxDisputeProvider().client,
             "verify_webhook_signature",
             new=AsyncMock(return_value=False),
         ):
        headers = {
            "PAYPAL-AUTH-ALGO": "SHA256withRSA",
            "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/cert.pem",
            "PAYPAL-TRANSMISSION-ID": "TX-998811",
            "PAYPAL-TRANSMISSION-SIG": "INVALID_SIGNATURE_STRING",
            "PAYPAL-TRANSMISSION-TIME": "2026-11-08T20:00:00Z",
        }
        payload = {
            "id": "WH-FORGED-001",
            "event_type": "PAYMENT.CAPTURE.COMPLETED",
            "resource_type": "capture",
        }
        res = client.post("/api/webhooks/paypal", json=payload, headers=headers)
        assert res.status_code == 400
        assert "Invalid PayPal webhook signature" in res.json()["detail"]


# ── 3. Maker-Checker Constraint Enforcement ──────────────────────────────────

def test_maker_checker_enforcement():
    auth_senior = {"Authorization": "Bearer tok_senior_risk_001"}
    auth_creator = {"Authorization": "Bearer tok_ai_creator"}

    # Reset queue
    client.post("/api/control-tower/reset", headers=auth_senior)

    # Seed items have creator_name = "AI_DEFENSE_ENGINE"
    # Reviewer attempting self-approval (same identity from token) must fail with 400
    res_self = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=auth_creator,
        json={
            "reviewer_notes": "Attempting automated self approval",
        },
    )
    assert res_self.status_code == 400
    assert "Maker cannot be checker" in res_self.json()["detail"]

    # Reviewer with different identity and senior role succeeds
    res_ok = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=auth_senior,
        json={
            "reviewer_notes": "Reviewed and approved by human operator.",
        },
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] in ["SUBMITTED", "APPROVED_AND_SUBMITTED"]


# ── 4. Cryptographic Hash Chain Validation & Tamper Detection ────────────────

def test_audit_log_hash_chain_and_tamper_detection():
    auth = {"Authorization": "Bearer tok_senior_risk_001"}
    client.post("/api/control-tower/reset", headers=auth)

    # Step 1: Initial item has 1 audit entry, verify passes
    valid, reason = verify_audit_hash_chain("CT-9021")
    assert valid is True
    assert "Hash chain verified" in reason

    # Step 2: Approve adds second entry, verify passes
    client.post(
        "/api/control-tower/CT-9021/approve",
        headers=auth,
        json={"reviewer_notes": "Approved defense."},
    )
    valid_after_approve, reason_after = verify_audit_hash_chain("CT-9021")
    assert valid_after_approve is True
    assert "verified across" in reason_after

    # Step 3: Tamper test — directly alter a record in the database
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, payload_hash FROM audit_log WHERE item_id = 'CT-9021' ORDER BY id DESC LIMIT 1"
        )
        row = cursor.fetchone()
        row_id = row["id"]
        orig_hash = row["payload_hash"]
        cursor.execute(
            "UPDATE audit_log SET payload_hash = 'TAMPERED_HASH_CORRUPT' WHERE id = ?",
            (row_id,)
        )
        conn.commit()

    # Step 4: Verification must detect tampering and fail
    tampered_valid, tamper_reason = verify_audit_hash_chain("CT-9021")
    assert tampered_valid is False
    assert "Tampered entry" in tamper_reason

    # Restore the original hash so subsequent tests run against valid chain
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE audit_log SET payload_hash = ? WHERE id = ?",
            (orig_hash, row_id),
        )
        conn.commit()

    # Clean up reset
    client.post("/api/control-tower/reset")


# ── 5. MockTransport Tests for Exact PayPal Evidence & Claim Request Shapes ──

@pytest.mark.anyio
async def test_provide_evidence_exact_multipart_request_shape():
    """Verify provide_evidence produces exact PayPal documented multipart/form-data shape."""
    import json
    import httpx
    from app.services.paypal_client import PayPalClient

    captured_requests: list[httpx.Request] = []

    def handle_request(request: httpx.Request) -> httpx.Response:
        captured_requests.append(request)
        url_str = str(request.url)
        if request.method == "GET" and "/v1/customer/disputes/PP-D-9988" in url_str:
            return httpx.Response(
                200,
                json={"dispute_id": "PP-D-9988", "status": "WAITING_FOR_SELLER_RESPONSE"},
                headers={"paypal-debug-id": "dbg-get-dispute-1"},
            )
        if request.method == "POST" and "/provide-evidence" in url_str:
            return httpx.Response(
                200,
                json={"acknowledged": True},
                headers={"paypal-debug-id": "dbg-evidence-9988"},
            )
        return httpx.Response(404)

    test_client = PayPalClient()
    test_client._access_token = "MOCK_VALID_TOKEN"
    test_client._token_expires_at = 9999999999.0

    mock_transport = httpx.MockTransport(handle_request)
    orig_client = httpx.AsyncClient

    with patch("httpx.AsyncClient", side_effect=lambda *args, **kwargs: orig_client(transport=mock_transport, timeout=kwargs.get("timeout"))):
        res = await test_client.provide_evidence(
            dispute_id="PP-D-9988",
            notes="Carrier tracking confirmed delivery to buyer porch.",
            evidence_type="PROOF_OF_FULFILLMENT",
            tracking_info=[{"carrier_name": "FEDEX", "tracking_number": "782910482019"}],
        )

    assert res["status"] == "SUCCESS"
    assert res["http_status"] == 200
    assert res["debug_id"] == "dbg-evidence-9988"

    # Assert request shape
    evidence_req = [r for r in captured_requests if r.method == "POST" and "provide-evidence" in str(r.url)][0]
    content_type = evidence_req.headers.get("content-type", "")
    assert content_type.startswith("multipart/form-data")

    # Read body bytes
    body_text = evidence_req.content.decode("utf-8", errors="replace")
    assert 'name="input"' in body_text
    assert "application/json" in body_text

    # Extract JSON part from multipart body
    json_start = body_text.find('{"evidences":')
    assert json_start != -1
    json_end = body_text.rfind('}') + 1
    input_data = json.loads(body_text[json_start:json_end])

    assert len(input_data["evidences"]) == 1
    ev = input_data["evidences"][0]
    assert ev["evidence_type"] == "PROOF_OF_FULFILLMENT"
    assert ev["notes"] == "Carrier tracking confirmed delivery to buyer porch."
    assert ev["evidence_info"]["tracking_info"] == [{"carrier_name": "FEDEX", "tracking_number": "782910482019"}]


@pytest.mark.anyio
async def test_provide_evidence_status_check_and_type_validation():
    """Verify provide_evidence rejects non-waiting disputes and invalid evidence types."""
    import httpx
    from app.services.paypal_client import PayPalClient

    test_client = PayPalClient()
    test_client._access_token = "MOCK_VALID_TOKEN"
    test_client._token_expires_at = 9999999999.0

    # 1. Invalid Evidence Type must raise ValueError
    with pytest.raises(ValueError, match="Invalid evidence_type"):
        await test_client.provide_evidence(
            dispute_id="PP-D-1",
            evidence_type="INVALID_NON_DOC_TYPE",
            notes="Bad type",
        )

    # 2. Dispute in UNDER_REVIEW must be rejected
    def handle_request(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"dispute_id": "PP-D-1", "status": "UNDER_REVIEW"},
            headers={"paypal-debug-id": "dbg-review-1"},
        )

    mock_transport = httpx.MockTransport(handle_request)
    orig_client = httpx.AsyncClient
    with patch("httpx.AsyncClient", side_effect=lambda *args, **kwargs: orig_client(transport=mock_transport, timeout=kwargs.get("timeout"))):
        res = await test_client.provide_evidence(
            dispute_id="PP-D-1",
            evidence_type="PROOF_OF_FULFILLMENT",
            notes="Valid note",
        )
        assert res["status"] == "ERROR"
        assert res["http_status"] == 400
        assert "UNDER_REVIEW" in res["message"]


@pytest.mark.anyio
async def test_accept_claim_body_check_and_validation():
    """Verify accept_claim validates note length and sends exact JSON body."""
    import json
    import httpx
    from app.services.paypal_client import PayPalClient

    test_client = PayPalClient()
    test_client._access_token = "MOCK_VALID_TOKEN"
    test_client._token_expires_at = 9999999999.0

    # 1. Note over 2000 chars must raise ValueError
    long_note = "A" * 2001
    with pytest.raises(ValueError, match="exceeds PayPal maximum limit of 2000"):
        await test_client.accept_claim(dispute_id="PP-D-1", note=long_note)

    # 2. Valid accept_claim
    captured: list[httpx.Request] = []

    def handle_request(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(
            200,
            json={"status": "RESOLVED"},
            headers={"paypal-debug-id": "dbg-concede-123"},
        )

    mock_transport = httpx.MockTransport(handle_request)
    orig_client = httpx.AsyncClient
    with patch("httpx.AsyncClient", side_effect=lambda *args, **kwargs: orig_client(transport=mock_transport, timeout=kwargs.get("timeout"))):
        res = await test_client.accept_claim(
            dispute_id="PP-D-1",
            note="Merchant conceded claim to preserve relationship.",
            accept_claim_reason="DID_NOT_RECEIVE_ITEM",
        )

    assert res["status"] == "SUCCESS"
    assert res["debug_id"] == "dbg-concede-123"

    req = captured[0]
    payload = json.loads(req.content.decode("utf-8"))
    assert payload["note"] == "Merchant conceded claim to preserve relationship."
    assert payload["accept_claim_reason"] == "DID_NOT_RECEIVE_ITEM"


@pytest.mark.anyio
async def test_dispute_provider_extended_interface():
    """Verify DisputeProvider Protocol includes create_order, capture_order, and add_tracking."""
    from app.services.dispute_provider import DisputeProvider, SandboxDisputeProvider, SimulatedDisputeProvider

    assert issubclass(SandboxDisputeProvider, DisputeProvider)
    assert issubclass(SimulatedDisputeProvider, DisputeProvider)

    sim = SimulatedDisputeProvider()
    ord_res = await sim.create_order(100.0, "USD", "test_ref")
    assert ord_res["id"].startswith("ORD-SIM-")

    cap_res = await sim.capture_order(ord_res["id"])
    assert cap_res["status"] == "COMPLETED"

    trk_res = await sim.add_tracking(cap_res["id"], "1Z9999999999", "UPS")
    assert trk_res["status"] == "SUCCESS"
    assert trk_res["tracking_number"] == "1Z9999999999"
