"""Dispute routes — list, detail, and AI-powered respond."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import DisputeResponse
from app.services.mock_data import get_dispute_by_id, get_disputes, respond_to_dispute

router = APIRouter(prefix="/api/disputes", tags=["Disputes"])


@router.get("")
def list_disputes():
    """Return all mock disputes with evidence and timelines."""
    disputes = get_disputes()
    return {"count": len(disputes), "disputes": disputes}


@router.get("/{dispute_id}")
def get_dispute(dispute_id: str):
    """Return a single dispute by ID."""
    dispute = get_dispute_by_id(dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail=f"Dispute {dispute_id} not found")
    return dispute


@router.post("/{dispute_id}/respond")
def respond_dispute(dispute_id: str, body: DisputeResponse):
    """Submit a response to a dispute with AI analysis."""
    result = respond_to_dispute(dispute_id, body)
    if not result:
        raise HTTPException(status_code=404, detail=f"Dispute {dispute_id} not found")
    return result
