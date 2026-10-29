"""Transaction routes."""

from fastapi import APIRouter, HTTPException

from app.services.mock_data import get_transaction_by_id, get_transactions

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


@router.get("")
def list_transactions():
    """Return all mock transactions."""
    txns = get_transactions()
    return {"count": len(txns), "transactions": txns}


@router.get("/{txn_id}")
def get_transaction(txn_id: str):
    """Return a single transaction by ID."""
    txn = get_transaction_by_id(txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction {txn_id} not found")
    return txn
