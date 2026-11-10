"""
Tests for P1-6: Decimal Money Correctness End-to-End
- Elimination of floating-point drift across financial calculations
- Schema enforcement of Decimal on amounts and fees
- Precision preservation across SQLite round-trip
"""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from app.db import load_control_tower_items, save_control_tower_item
from app.models.schemas import (
    ControlTowerItem,
    ControlTowerStatus,
    AIRecommendedAction,
    DraftStatus,
)
from app.services.control_tower_service import ControlTowerStore


def _make_item(item_id: str, amount: Decimal | float) -> ControlTowerItem:
    now = datetime.now(timezone.utc)
    return ControlTowerItem(
        id=item_id,
        dispute_id=f"PP-{item_id}",
        transaction_id=f"TXN-{item_id}",
        buyer_name="Test Buyer",
        buyer_email="buyer@example.com",
        dispute_reason="ITEM_NOT_RECEIVED",
        item_name="Precision Gadget",
        amount=amount,
        currency="USD",
        dispute_fee_at_risk=Decimal("15.00"),
        sla_deadline=now,
        escalation_triggers=["MANUAL_TEST"],
        ai_confidence_score=0.95,
        ai_recommended_action=AIRecommendedAction.SUBMIT_EVIDENCE,
        ai_rationale="High confidence evidence found",
        drafted_defense_letter="Valid defense letter citing evidence",
        buyer_raw_message="Item was not delivered",
        created_at=now,
        updated_at=now,
        status=ControlTowerStatus.PENDING_REVIEW,
    )


def test_schema_amount_is_decimal():
    """ControlTowerItem amounts and fees must be Decimal instances."""
    item = _make_item("CT-DEC-001", Decimal("249.99"))
    assert isinstance(item.amount, Decimal)
    assert isinstance(item.dispute_fee_at_risk, Decimal)
    assert item.amount == Decimal("249.99")


def test_no_floating_point_drift_in_kpi_aggregation():
    """Summing fractional amounts (e.g. 0.10 + 0.20) must equal exact Decimal('0.30') without float drift."""
    store = ControlTowerStore()
    store._items.clear()

    # Three items with classical float drift values: 0.10, 0.20, 0.30
    # In IEEE 754 float: 0.1 + 0.2 = 0.30000000000000004
    for idx, amt in enumerate(["0.10", "0.20", "0.30"], start=1):
        item = _make_item(f"CT-DRIFT-{idx}", Decimal(amt))
        store._items[item.id] = item

    kpis, _ = store.get_items()
    # Total at risk must be exact Decimal('0.60')
    assert isinstance(kpis.total_amount_at_risk, Decimal)
    assert kpis.total_amount_at_risk == Decimal("0.60")
    assert str(kpis.total_amount_at_risk) == "0.60"


def test_db_roundtrip_preserves_decimal():
    """Saving and loading ControlTowerItem from SQLite preserves Decimal type and exact precision."""
    item = _make_item("CT-DEC-DB", Decimal("1234.56"))
    save_control_tower_item(item)

    loaded = load_control_tower_items()
    db_item = loaded.get("CT-DEC-DB")
    assert db_item is not None
    assert isinstance(db_item.amount, Decimal)
    assert db_item.amount == Decimal("1234.56")
