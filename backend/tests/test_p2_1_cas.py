"""
Tests for P2-1: Compare-And-Swap (CAS) SQLite Transitions
- Atomic CAS state transitions preventing lost updates or race conditions
- rows_affected == 0 on stale status/updated_at returns False and raises 409 Conflict
"""

import asyncio
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.db import update_control_tower_item_cas, get_db_connection
from app.main import app
from app.models.schemas import ControlTowerStatus

client = TestClient(app)
AUTH_SENIOR = {"Authorization": "Bearer tok_senior_risk_001"}


@pytest.fixture(autouse=True)
def clean_control_tower():
    client.post("/api/control-tower/reset", headers=AUTH_SENIOR)
    yield
    client.post("/api/control-tower/reset", headers=AUTH_SENIOR)


def test_cas_update_success_and_conflict():
    """CAS succeeds when expected status matches, and fails (rows_affected == 0) when stale."""
    now = datetime.now(timezone.utc)
    # 1. CAS transition from PENDING_REVIEW to SUBMITTING on CT-9021 must succeed
    ok = update_control_tower_item_cas(
        item_id="CT-9021",
        new_status=ControlTowerStatus.SUBMITTING.value,
        new_updated_at=now,
        expected_status=ControlTowerStatus.PENDING_REVIEW.value,
    )
    assert ok is True

    # 2. Attempting same CAS with stale expected status PENDING_REVIEW must return False
    conflict = update_control_tower_item_cas(
        item_id="CT-9021",
        new_status=ControlTowerStatus.SUBMITTED.value,
        new_updated_at=now,
        expected_status=ControlTowerStatus.PENDING_REVIEW.value,
    )
    assert conflict is False


def test_concurrent_approval_triggers_409_conflict():
    """Simultaneous approvals on the same item detect state conflict and return 409."""
    # First approval succeeds
    res1 = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_SENIOR,
        json={"reviewer_notes": "First reviewer approves"},
    )
    assert res1.status_code == 200

    # Second approval receives 409 Conflict because status is no longer PENDING_REVIEW
    res2 = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_SENIOR,
        json={"reviewer_notes": "Second reviewer race condition"},
    )
    assert res2.status_code == 409
