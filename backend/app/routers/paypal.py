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
