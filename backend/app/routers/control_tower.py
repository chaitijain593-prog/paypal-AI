"""
PaySentinel AI — Human Control Tower & Approval Queue Router
============================================================
FastAPI routes managing human-in-the-loop dispute approvals,
inline defense editing, and concession fallbacks.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.models.schemas import (
    ControlTowerApproveRequest,
    ControlTowerEditRequest,
    ControlTowerItem,
    ControlTowerListResponse,
    ControlTowerRejectRequest,
)
from app.services.control_tower_service import control_tower_service

router = APIRouter(prefix="/api/control-tower", tags=["Human Control Tower"])


@router.get("/pending", response_model=ControlTowerListResponse)
def list_control_tower_items(
    status: Optional[str] = Query(
        default=None,
        description="Filter by status: PENDING_REVIEW, APPROVED_AND_SUBMITTED, EDITED_AND_SUBMITTED, REJECTED_CONCEDED, or ALL",
    )
):
    """
    List all Human Control Tower dispute queue items and high-level KPIs.
    Supports filtering by status or viewing all items including audit history.
    """
    kpis, items = control_tower_service.get_items(status=status)
    return ControlTowerListResponse(
        kpis=kpis,
        count=len(items),
        items=items,
    )


@router.get("/{item_id}", response_model=ControlTowerItem)
def get_control_tower_item(item_id: str):
    """Retrieve details for a single Control Tower queue item."""
    item = control_tower_service.get_item(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Control Tower item '{item_id}' not found.",
        )
    return item


@router.post("/{item_id}/approve", response_model=ControlTowerItem)
def approve_control_tower_item(item_id: str, body: ControlTowerApproveRequest):
    """
    Approve an AI-drafted dispute defense and dispatch it directly to PayPal Sandbox.
    Enforces idempotency and records an immutable audit log entry.
    """
    try:
        updated = control_tower_service.approve_item(
            item_id=item_id,
            reviewer_name=body.reviewer_name,
            reviewer_notes=body.reviewer_notes,
        )
        return updated
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Control Tower item '{item_id}' not found.",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.post("/{item_id}/edit", response_model=ControlTowerItem)
def edit_control_tower_item(item_id: str, body: ControlTowerEditRequest):
    """
    Save operator revisions to the AI-drafted defense letter and submit to PayPal Sandbox.
    Enforces idempotency, records operator diff notes, and logs cryptographic payload hash.
    """
    try:
        updated = control_tower_service.edit_item(
            item_id=item_id,
            updated_defense_letter=body.updated_defense_letter,
            updated_action=body.updated_action,
            reviewer_name=body.reviewer_name,
            reviewer_notes=body.reviewer_notes,
        )
        return updated
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Control Tower item '{item_id}' not found.",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.post("/{item_id}/reject", response_model=ControlTowerItem)
def reject_control_tower_item(item_id: str, body: ControlTowerRejectRequest):
    """
    Reject the AI defense and execute a concession/refund via PayPal Sandbox
    to eliminate merchant dispute penalty fees ($15 saved).
    """
    try:
        updated = control_tower_service.reject_item(
            item_id=item_id,
            resolution_strategy=body.resolution_strategy,
            reviewer_name=body.reviewer_name,
            reviewer_notes=body.reviewer_notes,
        )
        return updated
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Control Tower item '{item_id}' not found.",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.post("/reset", response_model=ControlTowerListResponse)
def reset_control_tower_store():
    """Reset Control Tower store to initial 3 seed items for repeat hackathon demos."""
    control_tower_service.reset_store()
    kpis, items = control_tower_service.get_items()
    return ControlTowerListResponse(
        kpis=kpis,
        count=len(items),
        items=items,
    )
