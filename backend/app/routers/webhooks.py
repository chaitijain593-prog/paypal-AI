"""
PaySentinel AI — PayPal Webhook Event Router
============================================
Handles incoming PayPal webhooks, performs signature verification,
enforces event deduplication via SQLite, and updates local payment state.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.config import get_settings
from app.db import is_duplicate_webhook, record_webhook_event
from app.services.mock_data import get_webhook_events
from app.services.paypal_client import paypal_client

logger = logging.getLogger("webhooks")
router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
settings = get_settings()


@router.get("/events")
def list_webhook_events():
    """Return the webhook event log."""
    events = get_webhook_events()
    return {"count": len(events), "data_source": "SIMULATED", "events": events}


@router.post("/paypal")
async def receive_paypal_webhook(
    request: Request,
    paypal_auth_algo: str | None = Header(None, alias="PAYPAL-AUTH-ALGO"),
    paypal_cert_url: str | None = Header(None, alias="PAYPAL-CERT-URL"),
    paypal_transmission_id: str | None = Header(None, alias="PAYPAL-TRANSMISSION-ID"),
    paypal_transmission_sig: str | None = Header(None, alias="PAYPAL-TRANSMISSION-SIG"),
    paypal_transmission_time: str | None = Header(None, alias="PAYPAL-TRANSMISSION-TIME"),
):
    """
    Receives and processes PayPal webhooks.
    1. Verifies cryptographic signature against PayPal Sandbox if running in sandbox mode.
    2. Enforces idempotent deduplication by PayPal event ID.
    3. Handles PAYMENT.CAPTURE.COMPLETED, CUSTOMER.DISPUTE.CREATED, and CUSTOMER.DISPUTE.RESOLVED.
    """
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

    # 1. Signature Verification in LIVE/SANDBOX Mode
    is_live_sandbox = settings.paypal_mode == "sandbox" and paypal_client.has_credentials
    if is_live_sandbox:
        if not (paypal_auth_algo and paypal_cert_url and paypal_transmission_id and paypal_transmission_sig and paypal_transmission_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing PayPal transmission signature headers in sandbox mode.",
            )

        webhook_id = settings.paypal_webhook_id or "WEBHOOK_VERIFY_ID"
        verified = await paypal_client.verify_webhook_signature(
            auth_algo=paypal_auth_algo,
            cert_url=paypal_cert_url,
            transmission_id=paypal_transmission_id,
            transmission_sig=paypal_transmission_sig,
            transmission_time=paypal_transmission_time,
            webhook_id=webhook_id,
            webhook_event=payload,
        )
        if not verified:
            logger.warning("Rejected unverified PayPal webhook %s (%s)", event_id, event_type)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PayPal webhook signature.",
            )

    # 2. Idempotent Deduplication
    if is_duplicate_webhook(event_id):
        logger.info("Dropping duplicate PayPal webhook event %s", event_id)
        return {
            "status": "DUPLICATE_DROPPED",
            "event_id": event_id,
            "message": "Event previously processed and recorded in local store.",
        }

    # 3. Record in SQLite
    record_webhook_event(
        event_id=event_id,
        event_type=event_type,
        resource_type=resource_type,
        summary=summary,
        payload=payload,
        data_source="LIVE" if is_live_sandbox else "SIMULATED",
    )

    # 4. Handle Specific Event Types
    action_taken = "RECORDED"
    if event_type == "PAYMENT.CAPTURE.COMPLETED":
        # Capture completed
        action_taken = f"PAYMENT_SETTLED_AMOUNT_{resource.get('amount', {}).get('value', '0')}"
    elif event_type == "CUSTOMER.DISPUTE.CREATED":
        # Incoming customer dispute
        dispute_id = resource.get("dispute_id", event_id)
        action_taken = f"DISPUTE_LOGGED_ROUTED_TO_CONTROL_TOWER_{dispute_id}"
    elif event_type == "CUSTOMER.DISPUTE.RESOLVED":
        # Dispute resolved
        dispute_id = resource.get("dispute_id", event_id)
        action_taken = f"DISPUTE_RESOLVED_{dispute_id}"

    return {
        "status": "PROCESSED",
        "event_id": event_id,
        "event_type": event_type,
        "action_taken": action_taken,
        "data_source": "LIVE" if is_live_sandbox else "SIMULATED",
    }
