"""Transaction routes with natural language query support."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import get_settings
from app.models.schemas import TransactionStatus
from app.services.mock_data import get_dispute_by_id, get_disputes, get_transaction_by_id, get_transactions

logger = logging.getLogger("transactions")
settings = get_settings()
router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


class NLQueryRequest(BaseModel):
    query: str


class NLQueryResponse(BaseModel):
    query: str
    interpreted_filters: dict[str, Any]
    matched_count: int
    matching_ids: list[str]
    ai_explanation: str
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


@router.get("")
def list_transactions():
    """Return all mock transactions."""
    txns = get_transactions()
    return {"count": len(txns), "data_source": "SIMULATED", "transactions": txns}


@router.post("/nl-query", response_model=NLQueryResponse)
def natural_language_query(body: NLQueryRequest):
    """
    Translates plain-English transaction queries into validated filters
    (e.g., 'Show disputes over $500', 'Find failed or pending payments').
    """
    q = body.query.lower().strip()
    txns = get_transactions()

    filters: dict[str, Any] = {}
    matched = list(txns)

    # 1. Status extraction
    if "dispute" in q or "chargeback" in q:
        filters["status"] = "DISPUTED"
        disputed_ids = {d.transaction_id for d in get_disputes()}
        matched = [t for t in matched if t.id in disputed_ids or getattr(t.status, "value", str(t.status)) == "DISPUTED"]
    elif "pending" in q:
        filters["status"] = "PENDING"
        matched = [t for t in matched if t.status == TransactionStatus.PENDING]
    elif "completed" in q or "successful" in q or "paid" in q:
        filters["status"] = "COMPLETED"
        matched = [t for t in matched if t.status == TransactionStatus.COMPLETED]
    elif "refund" in q:
        filters["status"] = "REFUNDED"
        matched = [t for t in matched if t.status in (TransactionStatus.REFUNDED, TransactionStatus.PARTIALLY_REFUNDED)]

    # 2. Amount extraction (e.g. "over $500", "over 500", "> 500", "greater than 500")
    over_match = re.search(r'(?:over|greater than|above|>)\s*\$?(\d+(?:\.\d+)?)', q)
    if over_match:
        min_val = float(over_match.group(1))
        filters["min_amount"] = min_val
        matched = [t for t in matched if t.amount >= min_val]

    under_match = re.search(r'(?:under|less than|below|<)\s*\$?(\d+(?:\.\d+)?)', q)
    if under_match:
        max_val = float(under_match.group(1))
        filters["max_amount"] = max_val
        matched = [t for t in matched if t.amount <= max_val]

    # 3. High risk extraction
    if "high risk" in q or "risky" in q:
        filters["risk_score_gt"] = 10.0
        matched = [t for t in matched if t.risk_score >= 10.0]

    # 4. Text keyword fallback
    keywords = ["macbook", "sony", "samsung", "keyboard", "invoice", "service", "carlos", "sarah", "apple"]
    for kw in keywords:
        if kw in q:
            filters["keyword"] = kw
            matched = [
                t for t in matched
                if kw in t.description.lower()
                or kw in t.buyer.name.lower()
                or kw in t.type.lower()
            ]

    # Compose explanation
    desc_parts = []
    if "status" in filters:
        desc_parts.append(f"status '{filters['status']}'")
    if "min_amount" in filters:
        desc_parts.append(f"amount ≥ ${filters['min_amount']:,.2f}")
    if "max_amount" in filters:
        desc_parts.append(f"amount ≤ ${filters['max_amount']:,.2f}")
    if "keyword" in filters:
        desc_parts.append(f"keyword '{filters['keyword']}'")

    if desc_parts:
        explanation = f"Deterministic parsing: {', '.join(desc_parts)}. Found {len(matched)} matching transaction(s)."
    else:
        explanation = f"Matched {len(matched)} transaction(s) across all records."

    return NLQueryResponse(
        query=body.query,
        interpreted_filters=filters,
        matched_count=len(matched),
        matching_ids=[t.id for t in matched],
        ai_explanation=explanation,
        data_source="SIMULATED",
    )


@router.get("/{txn_id}")
def get_transaction(txn_id: str):
    """Return a single transaction by ID."""
    txn = get_transaction_by_id(txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction {txn_id} not found")
    return txn
