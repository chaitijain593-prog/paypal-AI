"""PayPal Sandbox integration routes."""

from fastapi import APIRouter, HTTPException

from app.services.paypal_client import paypal_client

router = APIRouter(prefix="/api/paypal", tags=["PayPal Sandbox"])


@router.get("/status")
async def get_paypal_status():
    """Check live status of PayPal Sandbox connectivity and OAuth2 token."""
    return await paypal_client.get_sandbox_status()


@router.post("/sync")
async def sync_paypal_transactions():
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
async def create_order(body: dict):
    """Create an order using PayPal Orders v2 API with idempotency."""
    amount = float(body.get("amount", 10.0))
    currency = body.get("currency", "USD")
    reference_id = body.get("reference_id")
    request_id = body.get("request_id")
    res = await paypal_client.create_order(
        amount=amount,
        currency=currency,
        reference_id=reference_id,
        request_id=request_id,
    )
    if not res or "error" in res:
        raise HTTPException(
            status_code=400,
            detail=res.get("error", "Failed to create PayPal order") if res else "Credentials not configured",
        )
    return res


@router.post("/orders/{order_id}/capture")
async def capture_order(order_id: str, body: dict | None = None):
    """Capture payment for an order using PayPal Orders v2 API with idempotency."""
    request_id = (body or {}).get("request_id")
    res = await paypal_client.capture_order(order_id=order_id, request_id=request_id)
    if not res or "error" in res:
        raise HTTPException(
            status_code=400,
            detail=res.get("error", "Failed to capture PayPal order") if res else "Credentials not configured",
        )
    return res
