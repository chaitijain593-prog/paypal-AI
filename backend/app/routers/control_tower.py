"""
PaySentinel AI — Human Control Tower & Approval Queue Router
============================================================
FastAPI routes managing human-in-the-loop dispute approvals,
inline defense editing, and concession fallbacks.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import ReviewerContext, get_current_reviewer
from app.core.config import get_settings
from app.db import verify_audit_hash_chain
from app.models.schemas import (
    ControlTowerApproveRequest,
    ControlTowerEditRequest,
    ControlTowerItem,
    ControlTowerListResponse,
    ControlTowerRejectRequest,
)
from app.services.control_tower_service import (
    MakerCheckerError,
    RoleRequirementError,
    control_tower_service,
)

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


@router.get("/{item_id}/verify-audit-chain")
def verify_item_audit_chain(item_id: str):
    """Verifies cryptographic hash chain of the item's audit log."""
    item = control_tower_service.get_item(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Control Tower item '{item_id}' not found.",
        )
    valid, reason = verify_audit_hash_chain(item_id)
    return {"item_id": item_id, "verified": valid, "details": reason}


@router.post("/{item_id}/approve", response_model=ControlTowerItem)
async def approve_control_tower_item(
    item_id: str,
    body: ControlTowerApproveRequest,
    reviewer: ReviewerContext = Depends(get_current_reviewer),
):
    """
    Approve an AI-drafted dispute defense and dispatch it directly to PayPal Sandbox.
    Derives reviewer identity and role strictly from authenticated API token.
    Enforces maker-checker and senior role requirements for high-value claims.
    """
    try:
        updated = await control_tower_service.approve_item(
            item_id=item_id,
            reviewer_name=reviewer.identity,
            reviewer_role=reviewer.role,
            reviewer_notes=body.reviewer_notes,
        )
        return updated
    except MakerCheckerError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RoleRequirementError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
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
async def edit_control_tower_item(
    item_id: str,
    body: ControlTowerEditRequest,
    reviewer: ReviewerContext = Depends(get_current_reviewer),
):
    """
    Save operator revisions to the AI-drafted defense letter and submit to PayPal Sandbox.
    Derives reviewer identity and role strictly from authenticated API token.
    Enforces maker-checker and senior role requirements for high-value claims.
    """
    try:
        updated = await control_tower_service.edit_item(
            item_id=item_id,
            updated_defense_letter=body.updated_defense_letter,
            updated_action=body.updated_action,
            reviewer_name=reviewer.identity,
            reviewer_role=reviewer.role,
            reviewer_notes=body.reviewer_notes,
        )
        return updated
    except MakerCheckerError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RoleRequirementError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
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
async def reject_control_tower_item(
    item_id: str,
    body: ControlTowerRejectRequest,
    reviewer: ReviewerContext = Depends(get_current_reviewer),
):
    """
    Reject the AI defense and execute a concession/refund via PayPal Sandbox
    to eliminate merchant dispute penalty fees ($15 saved).
    Derives reviewer identity and role strictly from authenticated API token.
    """
    try:
        updated = await control_tower_service.reject_item(
            item_id=item_id,
            resolution_strategy=body.resolution_strategy,
            reviewer_name=reviewer.identity,
            reviewer_role=reviewer.role,
            reviewer_notes=body.reviewer_notes,
        )
        return updated
    except MakerCheckerError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RoleRequirementError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
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
def reset_control_tower_store(reviewer: ReviewerContext = Depends(get_current_reviewer)):
    """
    Reset Control Tower store to initial seed items.
    Strictly restricted to APP_ENV=development and authenticated operators.
    NEVER deletes or modifies historical audit_log rows.
    """
    settings = get_settings()
    if settings.app_env.lower() != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reset endpoint is strictly restricted to development environment (APP_ENV=development).",
        )
    control_tower_service.reset_store()
    kpis, items = control_tower_service.get_items()
    return ControlTowerListResponse(
        kpis=kpis,
        count=len(items),
        items=items,
    )
