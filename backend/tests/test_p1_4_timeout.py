"""
Tests for P1-4: Ambiguous Timeout Reconciliation
- On dispute submit timeout or connection drop, do NOT immediately fail
- Query GET /v1/customer/disputes/{dispute_id}
- If status is UNDER_REVIEW and evidence is present, reconcile as APPROVED_AND_SUBMITTED
- If still WAITING_FOR_PRV_EVIDENCE (or WAITING_FOR_SELLER_RESPONSE), mark AMBIGUOUS_TIMEOUT
- Manual refresh endpoint allows reconciling AMBIGUOUS_TIMEOUT once evidence registers
"""

from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import ControlTowerStatus
from app.services.control_tower_service import control_tower_service
from app.services.dispute_provider import SandboxDisputeProvider

client = TestClient(app)
AUTH_SENIOR = {"Authorization": "Bearer tok_senior_risk_001"}


@pytest.fixture(autouse=True)
def clean_control_tower():
    client.post("/api/control-tower/reset", headers=AUTH_SENIOR)
    yield
    client.post("/api/control-tower/reset", headers=AUTH_SENIOR)


def test_submit_timeout_reconciles_to_approved_and_submitted():
    """Submit timeout with subsequent GET dispute showing UNDER_REVIEW reconciles to APPROVED_AND_SUBMITTED."""
    provider = SandboxDisputeProvider()
    dispute_under_review = {
        "dispute_id": "PP-D-88412",
        "status": "UNDER_REVIEW",
        "evidences": [{"evidence_type": "PROOF_OF_FULFILLMENT", "notes": "Carrier tracking confirmed"}],
    }

    with patch("app.services.control_tower_service.get_dispute_provider", return_value=provider), \
         patch.object(
             provider.client,
             "provide_evidence",
             new=AsyncMock(side_effect=httpx.ReadTimeout("Read timeout from PayPal")),
         ), \
         patch.object(
             provider.client,
             "get_dispute",
             new=AsyncMock(return_value=dispute_under_review),
         ):
        res = client.post(
            "/api/control-tower/CT-9021/approve",
            headers=AUTH_SENIOR,
            json={"reviewer_notes": "Approving defense with simulated timeout"},
        )
        assert res.status_code == 200
        item = res.json()
        assert item["status"] in ("APPROVED_AND_SUBMITTED", "SUBMITTED")
        assert item["status"] == "APPROVED_AND_SUBMITTED"
        assert item["status"] != "FAILED"


def test_submit_timeout_waiting_for_evidence_becomes_ambiguous_timeout():
    """Submit timeout where GET dispute still shows WAITING_FOR_PRV_EVIDENCE transitions to AMBIGUOUS_TIMEOUT."""
    provider = SandboxDisputeProvider()
    dispute_still_waiting = {
        "dispute_id": "PP-D-88412",
        "status": "WAITING_FOR_PRV_EVIDENCE",
        "evidences": [],
    }

    with patch("app.services.control_tower_service.get_dispute_provider", return_value=provider), \
         patch.object(
             provider.client,
             "provide_evidence",
             new=AsyncMock(side_effect=httpx.ConnectTimeout("Connect timeout to PayPal")),
         ), \
         patch.object(
             provider.client,
             "get_dispute",
             new=AsyncMock(return_value=dispute_still_waiting),
         ):
        res = client.post(
            "/api/control-tower/CT-9021/approve",
            headers=AUTH_SENIOR,
            json={"reviewer_notes": "Approving defense that will hang in ambiguous state"},
        )
        assert res.status_code == 200
        item = res.json()
        assert item["status"] == "AMBIGUOUS_TIMEOUT"


def test_manual_refresh_reconciles_ambiguous_timeout():
    """Manual reconcile/refresh endpoint transitions AMBIGUOUS_TIMEOUT to APPROVED_AND_SUBMITTED."""
    provider = SandboxDisputeProvider()
    dispute_still_waiting = {
        "dispute_id": "PP-D-88412",
        "status": "WAITING_FOR_PRV_EVIDENCE",
        "evidences": [],
    }

    with patch("app.services.control_tower_service.get_dispute_provider", return_value=provider), \
         patch.object(
             provider.client,
             "provide_evidence",
             new=AsyncMock(side_effect=httpx.ConnectTimeout("Connect timeout")),
         ), \
         patch.object(
             provider.client,
             "get_dispute",
             new=AsyncMock(return_value=dispute_still_waiting),
         ):
        res = client.post(
            "/api/control-tower/CT-9021/approve",
            headers=AUTH_SENIOR,
            json={"reviewer_notes": "Step 1: timeout occurs"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "AMBIGUOUS_TIMEOUT"

    # Now dispute has been processed by PayPal
    dispute_now_under_review = {
        "dispute_id": "PP-D-88412",
        "status": "UNDER_REVIEW",
        "evidences": [{"evidence_type": "PROOF_OF_FULFILLMENT"}],
    }

    with patch("app.services.control_tower_service.get_dispute_provider", return_value=provider), \
         patch.object(
             provider.client,
             "get_dispute",
             new=AsyncMock(return_value=dispute_now_under_review),
         ):
        res_refresh = client.post(
            "/api/control-tower/CT-9021/reconcile",
            headers=AUTH_SENIOR,
        )
        assert res_refresh.status_code == 200
        item = res_refresh.json()
        assert item["status"] in ("APPROVED_AND_SUBMITTED", "SUBMITTED")
        assert item["status"] == "APPROVED_AND_SUBMITTED"
