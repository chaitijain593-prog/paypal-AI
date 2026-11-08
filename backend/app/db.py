"""
PaySentinel AI — SQLite Persistence & Hash-Chained Audit Store
==============================================================
Provides local durable storage for disputes, transactions, webhook events,
Control Tower items, and tamper-evident audit logs with cryptographic hash chaining.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "paysentinel.db"


def get_db_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0)
    conn.row_factory = sqlite3.Row
    return conn


def compute_audit_hash(prev_hash: str, actor: str, action: str, new_state: str, payload_hash: str, paypal_api_status: str) -> str:
    """Computes SHA-256 hash over previous entry's hash and current row's critical data."""
    canonical_repr = f"{prev_hash}|{actor}|{action}|{new_state}|{payload_hash}|{paypal_api_status}"
    return hashlib.sha256(canonical_repr.encode("utf-8")).hexdigest()


def init_db() -> None:
    """Initializes tables and indexes."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Control Tower Items
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS control_tower_items (
                id TEXT PRIMARY KEY,
                dispute_id TEXT NOT NULL,
                transaction_id TEXT NOT NULL,
                buyer_name TEXT NOT NULL,
                buyer_email TEXT NOT NULL,
                dispute_reason TEXT NOT NULL,
                item_name TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'USD',
                dispute_fee_at_risk REAL NOT NULL DEFAULT 15.00,
                sla_deadline TEXT NOT NULL,
                escalation_triggers_json TEXT NOT NULL,
                ai_confidence_score REAL NOT NULL,
                ai_recommended_action TEXT NOT NULL,
                ai_rationale TEXT NOT NULL,
                drafted_defense_letter TEXT NOT NULL,
                proof_claims_json TEXT NOT NULL,
                buyer_raw_message TEXT NOT NULL,
                firewall_injection_flagged INTEGER NOT NULL DEFAULT 0,
                firewall_details TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
                creator_name TEXT NOT NULL DEFAULT 'AI_DEFENSE_ENGINE',
                data_source TEXT NOT NULL DEFAULT 'SIMULATED',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # 2. Hash-Chained Audit Trail
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                previous_state TEXT NOT NULL,
                new_state TEXT NOT NULL,
                reviewer_notes TEXT,
                payload_hash TEXT NOT NULL,
                paypal_api_status TEXT NOT NULL,
                prev_hash TEXT NOT NULL,
                entry_hash TEXT NOT NULL,
                paypal_debug_id TEXT,
                paypal_response_json TEXT,
                FOREIGN KEY (item_id) REFERENCES control_tower_items(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_item_id ON audit_log(item_id)")

        # Auto-migrate columns if table already existed
        try:
            cursor.execute("ALTER TABLE audit_log ADD COLUMN paypal_debug_id TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE audit_log ADD COLUMN paypal_response_json TEXT")
        except Exception:
            pass

        # 3. Webhook Events (Deduplicated by event_id)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS webhook_events (
                event_id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                resource_type TEXT,
                summary TEXT,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'PROCESSED',
                data_source TEXT NOT NULL DEFAULT 'LIVE',
                created_at TEXT NOT NULL
            )
        """)

        # 4. Transactions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'USD',
                status TEXT NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                buyer_json TEXT NOT NULL,
                payment_method TEXT,
                has_dispute INTEGER NOT NULL DEFAULT 0,
                dispute_id TEXT,
                data_source TEXT NOT NULL DEFAULT 'SIMULATED',
                created_at TEXT NOT NULL
            )
        """)

        # 5. Disputes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS disputes (
                id TEXT PRIMARY KEY,
                transaction_id TEXT NOT NULL,
                order_id TEXT,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'USD',
                reason TEXT NOT NULL,
                status TEXT NOT NULL,
                buyer_name TEXT NOT NULL,
                buyer_email TEXT NOT NULL,
                buyer_claim_text TEXT,
                evidence_submitted INTEGER NOT NULL DEFAULT 0,
                sla_deadline TEXT NOT NULL,
                data_source TEXT NOT NULL DEFAULT 'SIMULATED',
                created_at TEXT NOT NULL
            )
        """)

        conn.commit()


def verify_audit_hash_chain(item_id: str) -> tuple[bool, str]:
    """
    Verifies that the audit log for a given item is mathematically intact.
    Returns (True, "OK") or (False, "Failure reason").
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM audit_log WHERE item_id = ? ORDER BY id ASC",
            (item_id,)
        )
        rows = cursor.fetchall()
        if not rows:
            return True, "No audit records found."

        expected_prev_hash = "GENESIS"
        for idx, row in enumerate(rows):
            if row["prev_hash"] != expected_prev_hash:
                return False, f"Broken link at step {idx}: expected prev_hash '{expected_prev_hash}', got '{row['prev_hash']}'"

            recomputed = compute_audit_hash(
                prev_hash=row["prev_hash"],
                actor=row["actor"],
                action=row["action"],
                new_state=row["new_state"],
                payload_hash=row["payload_hash"],
                paypal_api_status=row["paypal_api_status"],
            )
            if recomputed != row["entry_hash"]:
                return False, f"Tampered entry at step {idx}: computed hash '{recomputed}', found '{row['entry_hash']}'"

            expected_prev_hash = row["entry_hash"]

    return True, f"Hash chain verified across {len(rows)} entries."


def is_duplicate_webhook(event_id: str) -> bool:
    """Checks whether a webhook event has already been recorded in SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM webhook_events WHERE event_id = ?", (event_id,))
        return cursor.fetchone() is not None


def record_webhook_event(
    event_id: str,
    event_type: str,
    resource_type: str | None,
    summary: str | None,
    payload: dict[str, Any],
    data_source: str = "LIVE",
) -> bool:
    """
    Records a webhook event with deduplication.
    Returns True if inserted, False if duplicate.
    """
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO webhook_events (event_id, event_type, resource_type, summary, payload_json, status, data_source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    event_type,
                    resource_type or "",
                    summary or "",
                    json.dumps(payload),
                    "PROCESSED",
                    data_source,
                    now,
                ),
            )
            conn.commit()
            return True
    except sqlite3.IntegrityError:
        return False


def get_latest_audit_hash(item_id: str) -> str:
    """Returns the entry_hash of the most recent audit entry, or 'GENESIS' if none."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT entry_hash FROM audit_log WHERE item_id = ? ORDER BY id DESC LIMIT 1",
            (item_id,)
        )
        row = cursor.fetchone()
        return row["entry_hash"] if row else "GENESIS"


def append_audit_log_entry(
    item_id: str,
    actor: str,
    action: str,
    previous_state: str,
    new_state: str,
    reviewer_notes: str,
    payload_hash: str,
    paypal_api_status: str,
    timestamp: datetime | None = None,
    paypal_debug_id: str | None = None,
    paypal_response_json: str | None = None,
) -> tuple[str, str]:
    """
    Appends a new hash-chained audit log row with PayPal debug ID and response payload.
    Returns (prev_hash, entry_hash).
    """
    prev_hash = get_latest_audit_hash(item_id)
    entry_hash = compute_audit_hash(
        prev_hash=prev_hash,
        actor=actor,
        action=action,
        new_state=new_state,
        payload_hash=payload_hash,
        paypal_api_status=paypal_api_status,
    )
    ts = (timestamp or datetime.now(timezone.utc)).isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO audit_log (
                item_id, timestamp, actor, action, previous_state, new_state,
                reviewer_notes, payload_hash, paypal_api_status, prev_hash, entry_hash,
                paypal_debug_id, paypal_response_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item_id,
                ts,
                actor,
                action,
                previous_state,
                new_state,
                reviewer_notes,
                payload_hash,
                paypal_api_status,
                prev_hash,
                entry_hash,
                paypal_debug_id,
                paypal_response_json,
            ),
        )
        conn.commit()

    return prev_hash, entry_hash

