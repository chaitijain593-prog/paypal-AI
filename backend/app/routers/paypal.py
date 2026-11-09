"""PayPal Sandbox integration routes."""

from decimal import Decimal
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from app.core.auth import ReviewerContext, get_current_reviewer
from app.services.paypal_client import paypal_client

router = APIRouter(prefix="/api/paypal", tags=["PayPal Sandbox"])


class CreateOrderRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Amount strictly greater than 0")
    currency: str = Field(default="USD", min_length=3, max_length=3, description="3-letter ISO currency code")
    reference_id: str | None = Field(default=None, max_length=128)
    request_id: str | None = Field(default=None, max_length=128)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        code = v.strip().upper()
        if not re.match(r"^[A-Z]{3}$", code):
            raise ValueError("Currency must be a valid 3-letter uppercase ISO code (e.g. USD, EUR, GBP)")
        return code


class CaptureOrderRequest(BaseModel):
    request_id: str | None = Field(default=None, max_length=128)


@router.get("/status")
async def get_paypal_status():
    """Check live status of PayPal Sandbox connectivity and OAuth2 token."""
    return await paypal_client.get_sandbox_status()


@router.post("/sync")
async def sync_paypal_transactions(reviewer: ReviewerContext = Depends(get_current_reviewer)):
    """Sync PayPal Sandbox orders into the merchant ledger."""
    transactions = await paypal_client.sync_sandbox_orders()
    status = await paypal_client.get_sandbox_status()
    return {
        "status": "success",
        "synced_count": len(transactions),
        "sandbox_status": status,
        "transactions": transactions,
    }


@router.get("/orders/{order_id}")
async def get_order_details(order_id: str):
    """Query PayPal Orders v2 API for specific order details."""
    details = await paypal_client.get_order_details(order_id)
    if not details:
        raise HTTPException(
            status_code=404,
            detail=f"Order {order_id} not found in PayPal Sandbox or credentials not configured",
        )
    return details


@router.post("/orders/create")
async def create_order(
    body: CreateOrderRequest,
    reviewer: ReviewerContext = Depends(get_current_reviewer),
):
    """Create an order using PayPal Orders v2 API with idempotency."""
    res = await paypal_client.create_order(
        amount=float(body.amount),
        currency=body.currency,
        reference_id=body.reference_id,
        request_id=body.request_id,
    )
    if not res or "error" in res:
        raise HTTPException(
            status_code=400,
            detail=res.get("error", "Failed to create PayPal order") if res else "Credentials not configured",
        )
    return res


@router.post("/orders/{order_id}/capture")
async def capture_order(
    order_id: str,
    body: CaptureOrderRequest | None = None,
    reviewer: ReviewerContext = Depends(get_current_reviewer),
):
    """Capture payment for an order using PayPal Orders v2 API with idempotency."""
    request_id = body.request_id if body else None
    res = await paypal_client.capture_order(order_id=order_id, request_id=request_id)
    if not res or "error" in res:
        raise HTTPException(
            status_code=400,
            detail=res.get("error", "Failed to capture PayPal order") if res else "Credentials not configured",
        )
    return res
