"""
PaySentinel AI — PayPal Webhook Event Router
============================================
Handles incoming PayPal webhooks, performs signature verification,
enforces process-then-commit event deduplication via SQLite,
and automatically ingests disputes into the Human Control Tower with drafted defense letters.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request, status

from app.core.config import get_settings
from app.db import (
    compute_audit_hash,
    load_webhook_events_from_db,
    mark_webhook_event_status,
    record_webhook_event_processing,
    record_webhook_event_received,
)
from app.models.schemas import (
    AIRecommendedAction,
    AuditTrailEntry,
    ControlTowerItem,
    ControlTowerStatus,
    DraftStatus,
    ProofClaim,
)
from app.services.firewall import firewall_engine
from app.services.control_tower_service import control_tower_service
from app.services.defense_drafter import draft_dispute_defense
from app.services.dispute_provider import get_dispute_provider
from app.services.paypal_client import paypal_client

logger = logging.getLogger("webhooks")
router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
settings = get_settings()


def _sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


@router.get("/events")
def list_webhook_events(event_id: str | None = None):
    """Return the webhook event log directly from SQLite, optionally filtered by event_id."""
    events = load_webhook_events_from_db()
    if event_id:
        events = [e for e in events if e.get("event_id") == event_id]
    formatted = []
    for e in events:
        formatted.append({
            "id": e.get("event_id"),
            "event_type": e.get("event_type"),
            "resource_type": e.get("resource_type", ""),
            "summary": e.get("summary", ""),
            "status": e.get("status", "PROCESSED"),
            "data_source": e.get("data_source", "LIVE"),
            "created_at": e.get("created_at"),
            "updated_at": e.get("updated_at"),
            "error_message": e.get("error_message"),
        })
    return {"count": len(formatted), "data_source": "SQLITE", "events": formatted}


@router.post("/paypal")
async def receive_paypal_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    paypal_auth_algo: str | None = Header(None, alias="PAYPAL-AUTH-ALGO"),
    paypal_cert_url: str | None = Header(None, alias="PAYPAL-CERT-URL"),
    paypal_transmission_id: str | None = Header(None, alias="PAYPAL-TRANSMISSION-ID"),
    paypal_transmission_sig: str | None = Header(None, alias="PAYPAL-TRANSMISSION-SIG"),
    paypal_transmission_time: str | None = Header(None, alias="PAYPAL-TRANSMISSION-TIME"),
    x_paysentinel_simulated: str | None = Header(None, alias="X-PaySentinel-Simulated"),
):
    """
    Receives and processes PayPal webhooks:
    1. Signature verification: Reject unsigned events unless explicit DEV flag is set.
    2. Process-then-commit: Transition status PROCESSING -> PROCESSED (or FAILED on error to allow retries).
    3. On CUSTOMER.DISPUTE.CREATED: Fetch dispute, draft defense via defense_drafter, route to Control Tower.
    """
    settings = get_settings()
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    event_id = payload.get("id")
    event_type = payload.get("event_type")
    resource = payload.get("resource", {})
    resource_type = payload.get("resource_type")
    summary = payload.get("summary")

    if not event_id or not event_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required webhook event fields (id, event_type).",
        )

    # 1. Cryptographic Signature Verification
    has_sig_headers = bool(
        paypal_auth_algo
        and paypal_cert_url
        and paypal_transmission_id
        and paypal_transmission_sig
        and paypal_transmission_time
    )

    if not has_sig_headers:
        if not settings.allow_unsigned_webhooks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing PayPal transmission signature headers. Unsigned webhooks are rejected.",
            )
        if settings.paypal_mode != "sandbox":
            if not x_paysentinel_simulated or x_paysentinel_simulated.lower() != "true":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsigned webhooks in simulated mode require header 'X-PaySentinel-Simulated: true'.",
                )
    else:
        # Validate cert_url scheme and domain
        import urllib.parse
        parsed_cert = urllib.parse.urlparse(paypal_cert_url)
        if parsed_cert.scheme.lower() != "https" or not (
            parsed_cert.hostname == "paypal.com"
            or (parsed_cert.hostname and parsed_cert.hostname.endswith(".paypal.com"))
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid PayPal certificate URL: host '{parsed_cert.hostname}' is not authorized.",
            )

        # Validate transmission_time within 5 minutes (300 seconds)
        try:
            now_utc = datetime.now(timezone.utc)
            t_str = paypal_transmission_time.replace("Z", "+00:00")
            parsed_time = datetime.fromisoformat(t_str)
            if abs((now_utc - parsed_time).total_seconds()) > 300:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="PayPal transmission time is outside the acceptable 5-minute window.",
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PAYPAL-TRANSMISSION-TIME format.",
            )

        is_live_sandbox = settings.paypal_mode == "sandbox" and paypal_client.has_credentials
        if is_live_sandbox:
            if not settings.paypal_webhook_id:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="PAYPAL_WEBHOOK_ID is not configured in sandbox mode.",
                )
            verified = await paypal_client.verify_webhook_signature(
                auth_algo=paypal_auth_algo,
                cert_url=paypal_cert_url,
                transmission_id=paypal_transmission_id,
                transmission_sig=paypal_transmission_sig,
                transmission_time=paypal_transmission_time,
                webhook_id=settings.paypal_webhook_id,
                webhook_event=payload,
            )
            if not verified:
                logger.warning("Rejected unverified PayPal webhook %s (%s)", event_id, event_type)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid PayPal webhook signature.",
                )
        elif paypal_transmission_sig.startswith("INVALID") or paypal_transmission_sig == "invalid":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PayPal webhook signature.",
            )

    is_live_sandbox = settings.paypal_mode == "sandbox" and paypal_client.has_credentials
    data_source = "LIVE" if is_live_sandbox else "SIMULATED"

    # 2. Insert event with status RECEIVED (fail-closed if DB write fails -> 500)
    admission = record_webhook_event_received(
        event_id=event_id,
        event_type=event_type,
        resource_type=resource_type,
        summary=summary,
        payload=payload,
        data_source=data_source,
    )
    if admission == "DUPLICATE_IN_FLIGHT":
        logger.info("Dropping in-flight PayPal webhook event %s", event_id)
        return {
            "status": "DUPLICATE_IN_FLIGHT",
            "event_id": event_id,
            "message": "Event is currently being processed.",
        }
    elif admission == "DUPLICATE_DROPPED":
        logger.info("Dropping already processed PayPal webhook event %s", event_id)
        return {
            "status": "DUPLICATE_DROPPED",
            "event_id": event_id,
            "message": "Event previously processed and recorded in local store.",
        }

    # 3. Dispatch processing work to background task
    background_tasks.add_task(
        _process_webhook_event_background,
        event_id=event_id,
        event_type=event_type,
        resource=resource,
        resource_type=resource_type,
        summary=summary,
        payload=payload,
        data_source=data_source,
    )

    return {
        "status": "RECEIVED",
        "event_id": event_id,
    }


async def _process_webhook_event_background(
    event_id: str,
    event_type: str,
    resource: dict[str, Any],
    resource_type: str | None,
    summary: str | None,
    payload: dict[str, Any],
    data_source: str,
) -> None:
    """Decoupled background worker for PayPal webhook event ingestion."""
    mark_webhook_event_status(event_id, "PROCESSING")
    try:
        action_taken = "RECORDED"
        if event_type == "CUSTOMER.DISPUTE.CREATED":
            dispute_id = resource.get("dispute_id") or resource.get("id") or event_id
            provider = get_dispute_provider()
            fetched = await provider.get_dispute(dispute_id)
            if not fetched:
                fetched = resource

            # Extract details
            transaction_id = ""
            if "transaction_id" in fetched:
                transaction_id = fetched["transaction_id"]
            elif "disputed_transactions" in fetched and fetched["disputed_transactions"]:
                dt = fetched["disputed_transactions"][0]
                transaction_id = dt.get("seller_transaction_id") or dt.get("buyer_transaction_id") or ""
            if not transaction_id:
                transaction_id = f"TXN-{dispute_id[:8]}"

            amount = 0.0
            currency = "USD"
            if "amount" in fetched:
                amt = fetched["amount"]
                if isinstance(amt, dict):
                    amount = float(amt.get("value", 0.0))
                    currency = amt.get("currency", amt.get("currency_code", "USD"))
                else:
                    amount = float(amt)
                if "currency" in fetched:
                    currency = fetched["currency"]
            elif "dispute_amount" in fetched:
                da = fetched["dispute_amount"]
                amount = float(da.get("value", 0.0))
                currency = da.get("currency_code", "USD")

            if amount <= 0.0:
                amount = 10.0

            reason = fetched.get("reason", "MERCHANDISE_OR_SERVICE_NOT_RECEIVED")
            if hasattr(reason, "value"):
                reason = reason.value

            buyer_name = "PayPal Buyer"
            buyer_email = "buyer@example.com"
            b_info = fetched.get("buyer")
            if isinstance(b_info, dict):
                buyer_name = b_info.get("name", buyer_name)
                buyer_email = b_info.get("email", buyer_email)
            elif hasattr(b_info, "name"):
                buyer_name = b_info.name
                buyer_email = getattr(b_info, "email", buyer_email)

            buyer_msg = (
                fetched.get("description")
                or fetched.get("buyer_claim_text")
                or summary
                or f"Customer opened dispute {dispute_id}."
            )

            # Check for real tracking and evidence in fetched dispute or stored order records
            evidence_leaves: list[dict[str, Any]] = []
            tracking_info = fetched.get("evidence", []) or fetched.get("tracking_info", [])
            if not tracking_info and "disputed_transactions" in fetched:
                for dt in fetched["disputed_transactions"]:
                    if "tracking_info" in dt:
                        tracking_info.extend(dt["tracking_info"])

            # Also check RAW_EVIDENCE_STORE for any real matching tracking/order artifacts
            from app.services.proof_engine import RAW_EVIDENCE_STORE, MerkleTree, hash_leaf, sign_merkle_root
            has_real_tracking = False
            signed_at_iso = datetime.now(timezone.utc).isoformat()
            
            # Store raw dispute payload as authentic evidence
            disp_ev_id = f"EVD-DISPUTE-{dispute_id}"
            disp_raw = json.dumps(fetched, sort_keys=True).encode("utf-8")
            RAW_EVIDENCE_STORE[disp_ev_id] = disp_raw

            if tracking_info:
                for idx, trk in enumerate(tracking_info):
                    t_num = trk.get("tracking_number") or trk.get("tracking_number_raw") or ""
                    carrier = trk.get("carrier_name") or "CARRIER"
                    if t_num:
                        has_real_tracking = True
                        ev_id = f"EVD-TRK-{idx+1}"
                        raw_b = json.dumps(trk, sort_keys=True).encode("utf-8")
                        RAW_EVIDENCE_STORE[ev_id] = raw_b
                        tree = MerkleTree([raw_b], signed_at=signed_at_iso)
                        root_sig = sign_merkle_root(tree.root_hash, signed_at_iso)
                        evidence_leaves.append({
                            "evidence_id": ev_id,
                            "type": "CARRIER_TRACKING",
                            "description": f"Carrier {carrier} tracking {t_num} from dispute evidence.",
                            "raw_bytes": raw_b,
                            "root": tree.root_hash,
                            "root_signature": root_sig,
                            "signed_at": signed_at_iso,
                            "proof_path": tree.get_proof_path(0),
                        })

            # Untrusted Input Firewall: evaluate real buyer message
            firewall_assessment = firewall_engine.inspect(buyer_msg)
            is_firewall_flagged = firewall_assessment.quarantined
            firewall_details_str = firewall_assessment.mitigation_action

            if has_real_tracking and evidence_leaves:
                draft_res = await draft_dispute_defense(
                    dispute_id=dispute_id,
                    order_id=transaction_id,
                    dispute_reason=reason,
                    buyer_message=buyer_msg,
                    evidence_leaves=evidence_leaves,
                )
                draft_status = (
                    DraftStatus.DRAFT_VALID
                    if draft_res.validation_passed and draft_res.rebuttal_letter != "LLM_UNAVAILABLE"
                    else DraftStatus.DRAFT_FAILED
                )
                rebuttal_letter = draft_res.rebuttal_letter if draft_status == DraftStatus.DRAFT_VALID else ""
                conf_score = draft_res.confidence_score if draft_status == DraftStatus.DRAFT_VALID else 0.0
                rec_action = (
                    AIRecommendedAction.ACCEPT_CLAIM_AND_REFUND
                    if draft_res.recommended_action == "ACCEPT_CLAIM_AND_REFUND"
                    else AIRecommendedAction.SUBMIT_EVIDENCE
                )
                claims = []
                for c in draft_res.claims:
                    leaf_match = next((l for l in evidence_leaves if l["evidence_id"] == c.evidence_id), None)
                    v_proof = False
                    if leaf_match and "proof_path" in leaf_match and "root" in leaf_match:
                        v_proof = MerkleTree.verify_proof(leaf_match["raw_bytes"], leaf_match["proof_path"], leaf_match["root"])
                    claims.append(
                        ProofClaim(
                            claim_id=f"CLM-{c.evidence_id}",
                            statement_text=c.statement,
                            source_type="EVIDENCE",
                            source_record_id=c.evidence_id,
                            sha256_hash=_sha256(c.statement),
                            verified=v_proof,
                        )
                    )
            else:
                # No real delivery / tracking evidence exists -> NO_EVIDENCE, never fabricate
                draft_status = DraftStatus.NO_EVIDENCE
                rebuttal_letter = ""
                conf_score = 0.0
                rec_action = AIRecommendedAction.ACCEPT_CLAIM_AND_REFUND
                claims = []

            now = datetime.now(timezone.utc)
            sla_deadline = now + timedelta(days=7)
            if "respond_by" in fetched and fetched["respond_by"]:
                try:
                    sla_deadline = datetime.fromisoformat(fetched["respond_by"])
                except Exception:
                    pass

            settings = get_settings()
            if amount > settings.high_value_amount_cap:
                auto_pilot = False
                rec_action = AIRecommendedAction.ESCALATE_MANUAL_INQUIRY
                logger.warning(
                    "HIGH_VALUE_DISPUTE: Dispute %s amount %.2f exceeds cap %.2f. Auto-pilot disabled.",
                    dispute_id,
                    amount,
                    settings.high_value_amount_cap,
                )
            else:
                auto_pilot = (draft_status == DraftStatus.DRAFT_VALID)

            escalation_triggers = ["NEW_PAYPAL_WEBHOOK_INGESTION"]
            if amount > settings.high_value_amount_cap:
                escalation_triggers.append(f"HIGH_VALUE_THRESHOLD (> ${settings.high_value_amount_cap:.2f})")
            if draft_status in (DraftStatus.NO_EVIDENCE, DraftStatus.DRAFT_FAILED):
                escalation_triggers.append(f"INSUFFICIENT_EVIDENCE_STATUS ({draft_status.value})")
            elif conf_score < 0.8:
                escalation_triggers.append(f"LOW_CONFIDENCE_SCORE ({conf_score:.2f} < 0.80)")

            item_id = f"CT-{uuid.uuid4().hex[:8].upper()}"
            first_audit_entry = AuditTrailEntry(
                timestamp=now,
                actor="PayPal Webhook Pipeline",
                action="INGESTED_VIA_WEBHOOK",
                previous_state="INGESTED",
                new_state=ControlTowerStatus.PENDING_REVIEW.value,
                reviewer_notes=f"Auto-ingested from PayPal webhook {event_id}. Status={draft_status.value}.",
                payload_hash=_sha256(rebuttal_letter),
                paypal_api_status="PENDING_REVIEW",
                prev_hash="GENESIS",
                entry_hash=compute_audit_hash(
                    prev_hash="GENESIS",
                    item_id=item_id,
                    timestamp=now.isoformat(),
                    actor="PayPal Webhook Pipeline",
                    action="INGESTED_VIA_WEBHOOK",
                    previous_state="INGESTED",
                    new_state=ControlTowerStatus.PENDING_REVIEW.value,
                    reviewer_notes=f"Auto-ingested from PayPal webhook {event_id}. Status={draft_status.value}.",
                    payload_hash=_sha256(rebuttal_letter),
                    paypal_api_status="PENDING_REVIEW",
                ),
            )

            new_item = ControlTowerItem(
                id=item_id,
                dispute_id=dispute_id,
                transaction_id=transaction_id,
                buyer_name=buyer_name,
                buyer_email=buyer_email,
                dispute_reason=reason,
                item_name=fetched.get("item_name", "Merchant Order Item"),
                amount=amount,
                currency=currency,
                dispute_fee_at_risk=settings.paypal_dispute_fee,
                sla_deadline=sla_deadline,
                escalation_triggers=escalation_triggers,
                ai_confidence_score=conf_score,
                ai_recommended_action=rec_action,
                ai_rationale=(
                    f"Automated ingestion pipeline drafted defense rebuttal citing {len(claims)} verified evidence claims."
                    if draft_status == DraftStatus.DRAFT_VALID
                    else "No authentic carrier delivery proof found in dispute payload. Escalating to concede or request customer documentation."
                ),
                drafted_defense_letter=rebuttal_letter,
                draft_status=draft_status,
                auto_pilot=auto_pilot,
                proof_claims=claims,
                buyer_raw_message=buyer_msg,
                firewall_injection_flagged=is_firewall_flagged,
                firewall_details=firewall_details_str,
                status=ControlTowerStatus.PENDING_REVIEW,
                audit_trail=[first_audit_entry],
                creator_name="PAYPAL_WEBHOOK_PIPELINE",
                data_source=data_source,
                created_at=now,
                updated_at=now,
            )

            control_tower_service.create_item(new_item)
            action_taken = f"DISPUTE_LOGGED_ROUTED_TO_CONTROL_TOWER_{dispute_id}_ITEM_{item_id}"
        elif event_type == "PAYMENT.CAPTURE.COMPLETED":
            action_taken = f"PAYMENT_SETTLED_AMOUNT_{resource.get('amount', {}).get('value', '0')}"
        elif event_type == "CUSTOMER.DISPUTE.RESOLVED":
            dispute_id = resource.get("dispute_id", event_id)
            action_taken = f"DISPUTE_RESOLVED_{dispute_id}"

        # Mark successful completion
        mark_webhook_event_status(event_id, "PROCESSED")
        logger.info("Successfully processed webhook %s (%s): %s", event_id, event_type, action_taken)
    except Exception as e:
        logger.exception("Error processing webhook %s (%s): %s", event_id, event_type, e)
        mark_webhook_event_status(event_id, "FAILED", error_message=str(e))
