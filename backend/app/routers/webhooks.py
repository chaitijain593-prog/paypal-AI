"""Webhook event log routes."""

from fastapi import APIRouter

from app.services.mock_data import get_webhook_events

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.get("/events")
def list_webhook_events():
    """Return the webhook event log."""
    events = get_webhook_events()
    return {"count": len(events), "events": events}
