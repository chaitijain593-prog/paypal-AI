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

from app.models.schemas import (
    AIRecommendedAction,
    AuditTrailEntry,
    BuyerInfo,
    ControlTowerItem,
    ControlTowerStatus,
    Dispute,
    DisputeOutcome,
    DisputeReason,
    DisputeStatus,
    ProofClaim,
    SellerInfo,
    Transaction,
    TransactionStatus,
)

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "paysentinel.db"


def get_db_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0)
    conn.row_factory = sqlite3.Row
    return conn


def compute_audit_hash(
    prev_hash: str,
    item_id: str,
    timestamp: str,
    actor: str,
    action: str,
    previous_state: str,
    new_state: str,
    reviewer_notes: str | None,
    payload_hash: str,
    paypal_api_status: str,
) -> str:
    """Computes SHA-256 hash over previous entry's hash, item_id, timestamp, actor, action, previous_state, new_state, reviewer_notes, payload_hash, and paypal_api_status."""
    notes = reviewer_notes or ""
    canonical_repr = (
        f"{prev_hash}|{item_id}|{timestamp}|{actor}|{action}|"
        f"{previous_state}|{new_state}|{notes}|{payload_hash}|{paypal_api_status}"
    )
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
                idempotency_key TEXT,
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
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_item_prev_hash ON audit_log(item_id, prev_hash)")

        # 2b. Audit Heads (Committed head hash per item to detect truncation)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_heads (
                item_id TEXT PRIMARY KEY,
                head_hash TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # Auto-migrate columns if table already existed
        try:
            cursor.execute("ALTER TABLE audit_log ADD COLUMN paypal_debug_id TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE audit_log ADD COLUMN paypal_response_json TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE control_tower_items ADD COLUMN idempotency_key TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN payload_json TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE disputes ADD COLUMN payload_json TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE webhook_events ADD COLUMN error_message TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE webhook_events ADD COLUMN updated_at TEXT")
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
    Detects forks, broken links, field tampering, and tail truncation against audit_heads.
    Returns (True, "OK") or (False, "Failure reason").
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT head_hash FROM audit_heads WHERE item_id = ?", (item_id,))
        head_row = cursor.fetchone()
        committed_head = head_row["head_hash"] if head_row else None

        cursor.execute(
            "SELECT * FROM audit_log WHERE item_id = ? ORDER BY id ASC",
            (item_id,)
        )
        rows = cursor.fetchall()
        if not rows:
            if committed_head:
                return False, f"Audit log truncation detected: audit records deleted, expected head hash '{committed_head}'."
            return True, "No audit records found."

        expected_prev_hash = "GENESIS"
        for idx, row in enumerate(rows):
            if row["prev_hash"] != expected_prev_hash:
                return False, f"Broken link at step {idx}: expected prev_hash '{expected_prev_hash}', got '{row['prev_hash']}'"

            recomputed = compute_audit_hash(
                prev_hash=row["prev_hash"],
                item_id=row["item_id"],
                timestamp=row["timestamp"],
                actor=row["actor"],
                action=row["action"],
                previous_state=row["previous_state"],
                new_state=row["new_state"],
                reviewer_notes=row["reviewer_notes"],
                payload_hash=row["payload_hash"],
                paypal_api_status=row["paypal_api_status"],
            )
            if recomputed != row["entry_hash"]:
                return False, f"Tampered entry at step {idx}: computed hash '{recomputed}', found '{row['entry_hash']}'"

            expected_prev_hash = row["entry_hash"]

        # Truncation check: last row's entry_hash must match committed head_hash
        if committed_head and rows[-1]["entry_hash"] != committed_head:
            return (
                False,
                f"Audit log truncation detected: latest entry hash '{rows[-1]['entry_hash']}' "
                f"does not match committed head hash '{committed_head}'."
            )

    return True, f"Hash chain verified across {len(rows)} entries."


def is_duplicate_webhook(event_id: str) -> bool:
    """Checks whether a webhook event has already been successfully processed in SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM webhook_events WHERE event_id = ?", (event_id,))
        row = cursor.fetchone()
        if not row:
            return False
        return row["status"] == "PROCESSED"


def record_webhook_event_processing(
    event_id: str,
    event_type: str,
    resource_type: str | None,
    summary: str | None,
    payload: dict[str, Any],
    data_source: str = "LIVE",
) -> bool:
    """
    Records or updates a webhook event in PROCESSING status.
    Returns:
      True: if the event is new OR currently in FAILED status (eligible for retry).
      False: if the event is already in PROCESSED status (replay / duplicate).
    """
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM webhook_events WHERE event_id = ?", (event_id,))
        row = cursor.fetchone()
        if row:
            if row["status"] == "PROCESSED":
                return False
            cursor.execute(
                """
                UPDATE webhook_events
                SET status = 'PROCESSING', error_message = NULL, updated_at = ?
                WHERE event_id = ?
                """,
                (now, event_id),
            )
            conn.commit()
            return True
        else:
            cursor.execute(
                """
                INSERT INTO webhook_events (
                    event_id, event_type, resource_type, summary, payload_json,
                    status, data_source, created_at, updated_at, error_message
                ) VALUES (?, ?, ?, ?, ?, 'PROCESSING', ?, ?, ?, NULL)
                """,
                (
                    event_id,
                    event_type,
                    resource_type or "",
                    summary or "",
                    json.dumps(payload),
                    data_source,
                    now,
                    now,
                ),
            )
            conn.commit()
            return True


def mark_webhook_event_status(
    event_id: str,
    status: str,
    error_message: str | None = None,
) -> None:
    """Updates the status and optional error message of a webhook event."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE webhook_events
            SET status = ?, error_message = ?, updated_at = ?
            WHERE event_id = ?
            """,
            (status, error_message, now, event_id),
        )
        conn.commit()


def get_webhook_event(event_id: str) -> dict[str, Any] | None:
    """Fetches a webhook event by ID from SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM webhook_events WHERE event_id = ?", (event_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)


def load_webhook_events_from_db() -> list[dict[str, Any]]:
    """Loads all webhook events from SQLite in reverse chronological order."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM webhook_events ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def record_webhook_event(
    event_id: str,
    event_type: str,
    resource_type: str | None,
    summary: str | None,
    payload: dict[str, Any],
    data_source: str = "LIVE",
) -> bool:
    """
    Records a webhook event directly in PROCESSED status with deduplication.
    Returns True if inserted, False if duplicate.
    """
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO webhook_events (event_id, event_type, resource_type, summary, payload_json, status, data_source, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        cursor.execute("SELECT head_hash FROM audit_heads WHERE item_id = ?", (item_id,))
        row = cursor.fetchone()
        if row:
            return row["head_hash"]
        cursor.execute(
            "SELECT entry_hash FROM audit_log WHERE item_id = ? ORDER BY id DESC LIMIT 1",
            (item_id,)
        )
        row2 = cursor.fetchone()
        return row2["entry_hash"] if row2 else "GENESIS"


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
    Appends a new hash-chained audit log row using BEGIN IMMEDIATE and UNIQUE(item_id, prev_hash).
    Prevents forks, binds all item metadata and notes into the entry hash, and updates audit_heads.
    Returns (prev_hash, entry_hash).
    """
    ts = (timestamp or datetime.now(timezone.utc)).isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Acquire reserved lock immediately to prevent concurrent head races
        cursor.execute("BEGIN IMMEDIATE")

        cursor.execute("SELECT head_hash FROM audit_heads WHERE item_id = ?", (item_id,))
        head_row = cursor.fetchone()
        if head_row:
            prev_hash = head_row["head_hash"]
        else:
            cursor.execute(
                "SELECT entry_hash FROM audit_log WHERE item_id = ? ORDER BY id DESC LIMIT 1",
                (item_id,)
            )
            latest_log = cursor.fetchone()
            prev_hash = latest_log["entry_hash"] if latest_log else "GENESIS"

        entry_hash = compute_audit_hash(
            prev_hash=prev_hash,
            item_id=item_id,
            timestamp=ts,
            actor=actor,
            action=action,
            previous_state=previous_state,
            new_state=new_state,
            reviewer_notes=reviewer_notes,
            payload_hash=payload_hash,
            paypal_api_status=paypal_api_status,
        )

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

        cursor.execute(
            """
            INSERT INTO audit_heads (item_id, head_hash, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(item_id) DO UPDATE SET
                head_hash = excluded.head_hash,
                updated_at = excluded.updated_at
            """,
            (item_id, entry_hash, ts),
        )

        conn.commit()

    return prev_hash, entry_hash


def save_control_tower_item(item: ControlTowerItem) -> None:
    """Persists or updates a single Control Tower item in SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO control_tower_items (
                id, dispute_id, transaction_id, buyer_name, buyer_email, dispute_reason,
                item_name, amount, currency, dispute_fee_at_risk, sla_deadline,
                escalation_triggers_json, ai_confidence_score, ai_recommended_action,
                ai_rationale, drafted_defense_letter, proof_claims_json, buyer_raw_message,
                firewall_injection_flagged, firewall_details, status, creator_name,
                idempotency_key, data_source, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                dispute_id=excluded.dispute_id,
                transaction_id=excluded.transaction_id,
                buyer_name=excluded.buyer_name,
                buyer_email=excluded.buyer_email,
                dispute_reason=excluded.dispute_reason,
                item_name=excluded.item_name,
                amount=excluded.amount,
                currency=excluded.currency,
                dispute_fee_at_risk=excluded.dispute_fee_at_risk,
                sla_deadline=excluded.sla_deadline,
                escalation_triggers_json=excluded.escalation_triggers_json,
                ai_confidence_score=excluded.ai_confidence_score,
                ai_recommended_action=excluded.ai_recommended_action,
                ai_rationale=excluded.ai_rationale,
                drafted_defense_letter=excluded.drafted_defense_letter,
                proof_claims_json=excluded.proof_claims_json,
                buyer_raw_message=excluded.buyer_raw_message,
                firewall_injection_flagged=excluded.firewall_injection_flagged,
                firewall_details=excluded.firewall_details,
                status=excluded.status,
                creator_name=excluded.creator_name,
                idempotency_key=excluded.idempotency_key,
                data_source=excluded.data_source,
                updated_at=excluded.updated_at
            """,
            (
                item.id,
                item.dispute_id,
                item.transaction_id,
                item.buyer_name,
                item.buyer_email,
                item.dispute_reason,
                item.item_name,
                item.amount,
                item.currency,
                item.dispute_fee_at_risk,
                item.sla_deadline.isoformat(),
                json.dumps(item.escalation_triggers),
                item.ai_confidence_score,
                item.ai_recommended_action.value if hasattr(item.ai_recommended_action, "value") else str(item.ai_recommended_action),
                item.ai_rationale,
                item.drafted_defense_letter,
                json.dumps([c.model_dump() if hasattr(c, "model_dump") else c.dict() for c in item.proof_claims]),
                item.buyer_raw_message,
                1 if item.firewall_injection_flagged else 0,
                item.firewall_details,
                item.status.value if hasattr(item.status, "value") else str(item.status),
                item.creator_name,
                item.idempotency_key,
                item.data_source,
                item.created_at.isoformat(),
                item.updated_at.isoformat(),
            ),
        )
        conn.commit()


def load_control_tower_items() -> dict[str, ControlTowerItem]:
    """Loads all Control Tower items and their hash-chained audit trails from SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM control_tower_items")
        rows = cursor.fetchall()
        items: dict[str, ControlTowerItem] = {}
        for r in rows:
            cursor.execute(
                "SELECT * FROM audit_log WHERE item_id = ? ORDER BY id ASC",
                (r["id"],),
            )
            audit_rows = cursor.fetchall()
            audit_trail = [
                AuditTrailEntry(
                    timestamp=datetime.fromisoformat(ar["timestamp"]),
                    actor=ar["actor"],
                    action=ar["action"],
                    previous_state=ar["previous_state"],
                    new_state=ar["new_state"],
                    reviewer_notes=ar["reviewer_notes"],
                    payload_hash=ar["payload_hash"],
                    paypal_api_status=ar["paypal_api_status"],
                    prev_hash=ar["prev_hash"],
                    entry_hash=ar["entry_hash"],
                    paypal_debug_id=ar["paypal_debug_id"] if "paypal_debug_id" in ar.keys() else None,
                    paypal_response_json=ar["paypal_response_json"] if "paypal_response_json" in ar.keys() else None,
                )
                for ar in audit_rows
            ]

            claims_data = json.loads(r["proof_claims_json"])
            proof_claims = [ProofClaim(**c) for c in claims_data]

            item = ControlTowerItem(
                id=r["id"],
                dispute_id=r["dispute_id"],
                transaction_id=r["transaction_id"],
                buyer_name=r["buyer_name"],
                buyer_email=r["buyer_email"],
                dispute_reason=r["dispute_reason"],
                item_name=r["item_name"],
                amount=float(r["amount"]),
                currency=r["currency"],
                dispute_fee_at_risk=float(r["dispute_fee_at_risk"]),
                sla_deadline=datetime.fromisoformat(r["sla_deadline"]),
                escalation_triggers=json.loads(r["escalation_triggers_json"]),
                ai_confidence_score=float(r["ai_confidence_score"]),
                ai_recommended_action=AIRecommendedAction(r["ai_recommended_action"]),
                ai_rationale=r["ai_rationale"],
                drafted_defense_letter=r["drafted_defense_letter"],
                proof_claims=proof_claims,
                buyer_raw_message=r["buyer_raw_message"],
                firewall_injection_flagged=bool(r["firewall_injection_flagged"]),
                firewall_details=r["firewall_details"],
                status=ControlTowerStatus(r["status"]),
                audit_trail=audit_trail,
                creator_name=r["creator_name"],
                idempotency_key=r["idempotency_key"] if "idempotency_key" in r.keys() else None,
                data_source=r["data_source"],
                created_at=datetime.fromisoformat(r["created_at"]),
                updated_at=datetime.fromisoformat(r["updated_at"]),
            )
            items[item.id] = item
        return items


def save_transactions_to_db(txns: list[Transaction]) -> None:
    """Persists a list of transactions to SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for t in txns:
            cursor.execute(
                """
                INSERT INTO transactions (
                    id, order_id, amount, currency, status, type, description,
                    buyer_json, payment_method, has_dispute, dispute_id, data_source,
                    created_at, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    order_id=excluded.order_id,
                    amount=excluded.amount,
                    currency=excluded.currency,
                    status=excluded.status,
                    payload_json=excluded.payload_json
                """,
                (
                    t.id,
                    t.order_id,
                    t.amount,
                    t.currency,
                    t.status.value if hasattr(t.status, "value") else str(t.status),
                    "PAYMENT",
                    t.description,
                    json.dumps(t.buyer.model_dump() if hasattr(t.buyer, "model_dump") else t.buyer.dict()),
                    t.payment_method,
                    0,
                    None,
                    t.data_source,
                    t.created_at.isoformat(),
                    json.dumps(t.model_dump(mode="json") if hasattr(t, "model_dump") else t.dict()),
                ),
            )
        conn.commit()


def load_transactions_from_db() -> list[Transaction]:
    """Loads all transactions from SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM transactions")
        rows = cursor.fetchall()
        if not rows:
            return []
        txns: list[Transaction] = []
        for r in rows:
            if "payload_json" in r.keys() and r["payload_json"]:
                txns.append(Transaction(**json.loads(r["payload_json"])))
            else:
                buyer_data = json.loads(r["buyer_json"])
                txns.append(
                    Transaction(
                        id=r["id"],
                        order_id=r["order_id"],
                        amount=float(r["amount"]),
                        currency=r["currency"],
                        status=TransactionStatus(r["status"]),
                        buyer=BuyerInfo(**buyer_data),
                        seller=SellerInfo(
                            name="TechVault Electronics",
                            email="payments@techvault.store",
                            merchant_id="MERCH-TV8294X1",
                        ),
                        description=r["description"] or "",
                        created_at=datetime.fromisoformat(r["created_at"]),
                        updated_at=datetime.fromisoformat(r["created_at"]),
                        payment_method=r["payment_method"] or "PayPal Balance",
                        risk_score=12.0,
                        data_source=r["data_source"],
                    )
                )
        return txns


def save_disputes_to_db(disputes: list[Dispute]) -> None:
    """Persists a list of disputes to SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for d in disputes:
            cursor.execute(
                """
                INSERT INTO disputes (
                    id, transaction_id, order_id, amount, currency, reason,
                    status, buyer_name, buyer_email, buyer_claim_text, evidence_submitted,
                    sla_deadline, data_source, created_at, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    transaction_id=excluded.transaction_id,
                    amount=excluded.amount,
                    currency=excluded.currency,
                    reason=excluded.reason,
                    status=excluded.status,
                    payload_json=excluded.payload_json
                """,
                (
                    d.id,
                    d.transaction_id,
                    None,
                    d.amount,
                    d.currency,
                    d.reason.value if hasattr(d.reason, "value") else str(d.reason),
                    d.status.value if hasattr(d.status, "value") else str(d.status),
                    d.buyer.name,
                    d.buyer.email,
                    d.description,
                    len(d.evidence),
                    d.respond_by.isoformat(),
                    d.data_source,
                    d.created_at.isoformat(),
                    json.dumps(d.model_dump(mode="json") if hasattr(d, "model_dump") else d.dict()),
                ),
            )
        conn.commit()


def load_disputes_from_db() -> list[Dispute]:
    """Loads all disputes from SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM disputes")
        rows = cursor.fetchall()
        if not rows:
            return []
        disputes: list[Dispute] = []
        for r in rows:
            if "payload_json" in r.keys() and r["payload_json"]:
                disputes.append(Dispute(**json.loads(r["payload_json"])))
            else:
                disputes.append(
                    Dispute(
                        id=r["id"],
                        transaction_id=r["transaction_id"],
                        reason=DisputeReason(r["reason"]),
                        status=DisputeStatus(r["status"]),
                        amount=float(r["amount"]),
                        currency=r["currency"],
                        buyer=BuyerInfo(
                            name=r["buyer_name"],
                            email=r["buyer_email"],
                            payer_id="PAYER-UNKNOWN",
                        ),
                        seller=SellerInfo(
                            name="TechVault Electronics",
                            email="payments@techvault.store",
                            merchant_id="MERCH-TV8294X1",
                        ),
                        description=r["buyer_claim_text"] or "",
                        evidence=[],
                        timeline=[],
                        created_at=datetime.fromisoformat(r["created_at"]),
                        updated_at=datetime.fromisoformat(r["created_at"]),
                        respond_by=datetime.fromisoformat(r["sla_deadline"]),
                        data_source=r["data_source"],
                    )
                )
        return disputes

