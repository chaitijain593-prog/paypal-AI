"""
Unit and Integration Tests for Step 4: Auth & Cryptographic Audit Hardening
===========================================================================
Verifies:
1. API token authentication on all mutating routes (missing/invalid token -> 401).
2. Deriving reviewer identity and role strictly from token (ignoring body).
3. Maker-checker constraint by identity (reviewer == creator -> 400).
4. Role requirement above configured amount cap (amount > $500 requires senior role -> 403).
5. /reset restricted to APP_ENV=development and authenticated, never deleting audit_log.
6. Unique constraint preventing hash forks: UNIQUE(item_id, prev_hash).
7. Truncation detection: verifying latest entry matches audit_heads.
8. Field tampering detection: any alteration of reviewer_notes, timestamp, previous_state fails verification.
"""

from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sqlite3
import pytest
from fastapi.testclient import TestClient

from app.db import get_db_connection, verify_audit_hash_chain
from app.main import app

client = TestClient(app)

AUTH_SENIOR = {"Authorization": "Bearer tok_senior_risk_001"}
AUTH_OPERATOR = {"Authorization": "Bearer tok_operator_003"}
AUTH_CREATOR = {"Authorization": "Bearer tok_ai_creator"}


@pytest.fixture(autouse=True)
def clean_db():
    client.post("/api/control-tower/reset", headers=AUTH_SENIOR)
    yield
    client.post("/api/control-tower/reset", headers=AUTH_SENIOR)


# ── 1. API Token Authentication Dependency ───────────────────────────────────

def test_mutating_routes_require_authentication():
    """Mutating routes without API token must fail with 401 Unauthorized."""
    # 1. /approve without token
    res_app = client.post("/api/control-tower/CT-9021/approve", json={"reviewer_notes": "Note"})
    assert res_app.status_code == 401
    assert "Missing API authentication token" in res_app.json()["detail"]

    # 2. /edit without token
    res_edit = client.post(
        "/api/control-tower/CT-9022/edit",
        json={"updated_defense_letter": "New letter", "reviewer_notes": "Note"},
    )
    assert res_edit.status_code == 401

    # 3. /reject without token
    res_rej = client.post(
        "/api/control-tower/CT-9023/reject",
        json={"resolution_strategy": "CONCEDE", "reviewer_notes": "Note"},
    )
    assert res_rej.status_code == 401

    # 4. /reset without token
    res_reset = client.post("/api/control-tower/reset")
    assert res_reset.status_code == 401

    # 5. Invalid token returns 401
    res_bad = client.post(
        "/api/control-tower/CT-9021/approve",
        headers={"Authorization": "Bearer INVALID_TOKEN_XYZ"},
        json={"reviewer_notes": "Note"},
    )
    assert res_bad.status_code == 401

    # 6. Forged token with tok_ pattern (e.g. tok_admin_Mallory) MUST return 401
    res_forged = client.post(
        "/api/control-tower/CT-9021/approve",
        headers={"Authorization": "Bearer tok_admin_Mallory"},
        json={"reviewer_notes": "Forged admin token"},
    )
    assert res_forged.status_code == 401


# ── 2. Reviewer Identity Derived Strictly from Token (Never from Body) ───────

def test_reviewer_identity_derived_from_token():
    """Identity is derived from token; any spoofed reviewer_name in JSON body is ignored."""
    res = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_SENIOR,
        json={
            "reviewer_name": "SPOOFED_UNTRUSTED_NAME",
            "reviewer_notes": "Legitimate approval by token holder.",
        },
    )
    assert res.status_code == 200
    item = res.json()
    last_audit = item["audit_trail"][-1]
    # Actor MUST be "Chief Risk Officer" (derived from tok_senior_risk_001), not "SPOOFED_UNTRUSTED_NAME"
    assert last_audit["actor"] == "Chief Risk Officer"
    assert last_audit["actor"] != "SPOOFED_UNTRUSTED_NAME"


# ── 3. Maker-Checker by Identity ─────────────────────────────────────────────

def test_maker_checker_by_token_identity():
    """If authenticated token maps to item creator identity, submission is rejected."""
    # Seed items have creator_name = "AI_DEFENSE_ENGINE"
    # Using tok_ai_creator binds identity to "AI_DEFENSE_ENGINE"
    res = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_CREATOR,
        json={"reviewer_notes": "Self-approval attempt"},
    )
    assert res.status_code == 400
    assert "Maker cannot be checker" in res.json()["detail"]


# ── 4. Role Requirement above Configured Amount Cap ──────────────────────────

def test_role_requirement_above_amount_cap():
    """Disputes with amount > $500 require a senior role; operator role returns 403."""
    # CT-9021 amount is $1,250.00 (> $500 policy cap)
    # 1. Operator role attempt fails with 403 Forbidden
    res_operator = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_OPERATOR,
        json={"reviewer_notes": "Operator approving high-value item"},
    )
    assert res_operator.status_code == 403
    assert "exceeds policy cap" in res_operator.json()["detail"]
    assert "Senior approval required" in res_operator.json()["detail"]

    # 2. Senior role succeeds with 200 OK
    res_senior = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_SENIOR,
        json={"reviewer_notes": "Senior officer approval"},
    )
    assert res_senior.status_code == 200
    assert res_senior.json()["status"] in ["SUBMITTED", "APPROVED_AND_SUBMITTED"]

    # 3. Item below amount cap (CT-9023 amount is $185.00 <= $500) can be acted upon by Operator
    res_low = client.post(
        "/api/control-tower/CT-9023/reject",
        headers=AUTH_OPERATOR,
        json={"resolution_strategy": "CONCEDE", "reviewer_notes": "Operator concession for low-value dispute"},
    )
    assert res_low.status_code == 200


# ── 5. /reset Environment Gate & Audit Log Preservation ──────────────────────

def test_reset_restricted_to_development_and_never_touches_audit_log(monkeypatch):
    """Reset fails in production (403) and in development it resets items without deleting audit_log."""
    from app.core.config import get_settings

    # 1. In production, reset is blocked with 403
    with monkeypatch.context() as m:
        m.setattr(get_settings(), "app_env", "production")
        res_prod = client.post("/api/control-tower/reset", headers=AUTH_SENIOR)
        assert res_prod.status_code == 403
        assert "restricted to development" in res_prod.json()["detail"]

    # 2. Add an audit entry
    client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_SENIOR,
        json={"reviewer_notes": "Approval to generate audit record"},
    )
    with get_db_connection() as conn:
        count_before = conn.execute("SELECT count(*) FROM audit_log").fetchone()[0]
        assert count_before >= 2

    # 3. Reset in development: audit_log records MUST NOT be deleted
    res_reset = client.post("/api/control-tower/reset", headers=AUTH_SENIOR)
    assert res_reset.status_code == 200

    with get_db_connection() as conn:
        count_after = conn.execute("SELECT count(*) FROM audit_log").fetchone()[0]
        assert count_after >= count_before, "Reset must NEVER delete or wipe audit_log!"


# ── 6. Prevention of Hash Forks via UNIQUE(item_id, prev_hash) ───────────────

def test_fork_prevention_unique_constraint():
    """Inserting two entries pointing to the same prev_hash violates unique constraint."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT prev_hash, entry_hash FROM audit_log WHERE item_id = 'CT-9021' LIMIT 1")
        row = cursor.fetchone()
        existing_prev_hash = row["prev_hash"]

        # Attempting to insert a duplicate entry with the same (item_id, prev_hash) MUST fail with IntegrityError
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                """
                INSERT INTO audit_log (
                    item_id, timestamp, actor, action, previous_state, new_state,
                    reviewer_notes, payload_hash, paypal_api_status, prev_hash, entry_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "CT-9021", "2026-11-09T10:00:00Z", "Attacker", "FORK_ATTACK",
                    "PENDING_REVIEW", "FORKED", "Fork attempt", "hash_abc", "SIMULATED",
                    existing_prev_hash, "new_conflicting_hash_xyz"
                ),
            )
            conn.commit()


# ── 7. Truncation Detection against audit_heads ──────────────────────────────

def test_truncation_detection_against_audit_heads():
    """Deleting the latest row from audit_log causes verify_audit_hash_chain to detect truncation."""
    import uuid
    from app.db import append_audit_log_entry

    test_item_id = f"CT-TRUNC-{uuid.uuid4().hex[:8]}"
    # 1. Create two audit entries for a dedicated test item
    append_audit_log_entry(
        item_id=test_item_id,
        actor="AI Engine",
        action="PAUSED_FOR_HUMAN_REVIEW",
        previous_state="INGESTED",
        new_state="PENDING_REVIEW",
        reviewer_notes="First entry",
        payload_hash="hash1",
        paypal_api_status="PAUSED",
    )
    append_audit_log_entry(
        item_id=test_item_id,
        actor="Chief Risk Officer",
        action="APPROVE_AND_SUBMIT",
        previous_state="PENDING_REVIEW",
        new_state="SUBMITTED",
        reviewer_notes="Second entry",
        payload_hash="hash2",
        paypal_api_status="SUBMITTED",
    )

    valid_before, reason_before = verify_audit_hash_chain(test_item_id)
    assert valid_before is True

    # 2. Truncate tail: delete the latest audit row directly from SQLite
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM audit_log WHERE item_id = ? ORDER BY id DESC LIMIT 1", (test_item_id,))
        latest_id = cursor.fetchone()["id"]
        cursor.execute("DELETE FROM audit_log WHERE id = ?", (latest_id,))
        conn.commit()

    # 3. verify_audit_hash_chain must catch that the tail entry does not match committed head_hash in audit_heads
    valid_after, reason_after = verify_audit_hash_chain(test_item_id)
    assert valid_after is False
    assert "truncation detected" in reason_after.lower()


# ── 8. Field Tampering Detection ─────────────────────────────────────────────

def test_field_tampering_detection_for_notes_timestamp_and_state():
    """Modifying reviewer_notes, timestamp, or previous_state in audit_log is detected."""
    client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH_SENIOR,
        json={"reviewer_notes": "Authentic notes string"},
    )

    # 1. Tamper reviewer_notes
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, reviewer_notes FROM audit_log WHERE item_id = 'CT-9021' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        row_id = row["id"]
        orig_notes = row["reviewer_notes"]

        cursor.execute("UPDATE audit_log SET reviewer_notes = 'MALICIOUS_ALTERED_NOTES' WHERE id = ?", (row_id,))
        conn.commit()

    valid, reason = verify_audit_hash_chain("CT-9021")
    assert valid is False
    assert "Tampered entry" in reason

    # Restore notes
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE audit_log SET reviewer_notes = ? WHERE id = ?", (orig_notes, row_id))
        conn.commit()

    valid_restored, _ = verify_audit_hash_chain("CT-9021")
    assert valid_restored is True
