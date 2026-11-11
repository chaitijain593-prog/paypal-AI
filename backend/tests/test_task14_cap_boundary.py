"""
Task 14 Acceptance Tests: Boundary verification for high_value_amount_cap using Decimal.
Verifies that dispute amount == 500.00 is allowed for OPERATOR, while 500.01 is blocked (403 / RoleRequirementError).
"""

from decimal import Decimal
import uuid
import pytest

from app.core.config import get_settings
from app.models.schemas import ControlTowerItem, DraftStatus, ControlTowerStatus
from app.services.control_tower_service import (
    control_tower_service,
    RoleRequirementError,
)
from app.db import save_control_tower_item


def _create_mock_item(amount: Decimal, draft_status: DraftStatus = DraftStatus.DRAFT_VALID) -> ControlTowerItem:
    item_id = f"CT-BOUND-{uuid.uuid4().hex[:6]}"
    item = ControlTowerItem(
        id=item_id,
        dispute_id=f"PP-D-{uuid.uuid4().hex[:6]}",
        transaction_id="TX-BOUND",
        buyer_name="Boundary Tester",
        buyer_email="boundary@test.com",
        dispute_reason="MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
        item_name="Boundary Item",
        amount=amount,
        currency="USD",
        dispute_fee_at_risk=Decimal("15.00"),
        sla_deadline="2026-11-20T00:00:00Z",
        escalation_triggers=[],
        ai_confidence_score=0.95,
        ai_recommended_action="SUBMIT_EVIDENCE",
        ai_rationale="Solid proof",
        drafted_defense_letter="Valid rebuttal defense letter for boundary test.",
        draft_status=draft_status,
        proof_claims=[],
        buyer_raw_message="Not received",
        firewall_injection_flagged=False,
        status=ControlTowerStatus.PENDING_REVIEW,
        audit_trail=[],
        creator_name="AI_DEFENSE_ENGINE",
        created_at="2026-11-09T00:00:00Z",
        updated_at="2026-11-09T00:00:00Z",
    )
    control_tower_service._items[item_id] = item
    save_control_tower_item(item)
    return item


@pytest.mark.anyio
async def test_operator_cap_boundary_500_allowed(monkeypatch):
    """Amount exactly equal to high_value_amount_cap (500.00) is allowed for OPERATOR."""
    settings = get_settings()
    monkeypatch.setattr(settings, "high_value_amount_cap", Decimal("500.00"))

    item_500 = _create_mock_item(Decimal("500.00"))

    # OPERATOR role approving 500.00 should succeed
    res = await control_tower_service.approve_item(
        item_id=item_500.id,
        reviewer_name="Operator Alex",
        reviewer_role="OPERATOR",
        reviewer_notes="Approved within cap",
    )
    assert res.status == ControlTowerStatus.SUBMITTED


@pytest.mark.anyio
async def test_operator_cap_boundary_500_01_blocked(monkeypatch):
    """Amount 500.01 exceeds high_value_amount_cap (500.00) and must raise RoleRequirementError for OPERATOR."""
    settings = get_settings()
    monkeypatch.setattr(settings, "high_value_amount_cap", Decimal("500.00"))

    item_500_01 = _create_mock_item(Decimal("500.01"))

    with pytest.raises(RoleRequirementError) as exc_info:
        await control_tower_service.approve_item(
            item_id=item_500_01.id,
            reviewer_name="Operator Alex",
            reviewer_role="OPERATOR",
            reviewer_notes="Trying to approve above cap",
        )
    assert "exceeds policy cap" in str(exc_info.value)
    assert "$500.01" in str(exc_info.value)


@pytest.mark.anyio
async def test_senior_risk_officer_allowed_above_cap(monkeypatch):
    """SENIOR_RISK_OFFICER is permitted to approve disputes above policy cap."""
    settings = get_settings()
    monkeypatch.setattr(settings, "high_value_amount_cap", Decimal("500.00"))

    item_1250 = _create_mock_item(Decimal("1250.00"))

    res = await control_tower_service.approve_item(
        item_id=item_1250.id,
        reviewer_name="Chief Risk Officer",
        reviewer_role="SENIOR_RISK_OFFICER",
        reviewer_notes="Senior approval granted",
    )
    assert res.status == ControlTowerStatus.SUBMITTED
