"""
PaySentinel AI — Agent-vs-Agent Autonomous Commerce Loop Router (Feature 9)
===========================================================================
Exposes endpoints to simulate and inspect autonomous Buyer Agent to
Merchant Defense Agent commerce cycles using PayPal Orders v2 Sandbox.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import (
    AgentCommerceRunRequest,
    AgentCommerceSession,
)
from app.services.agent_commerce_service import agent_commerce_service

router = APIRouter(prefix="/api/agent-commerce", tags=["Agent Commerce Loop"])


@router.get("/status", response_model=AgentCommerceSession)
@router.get("/sessions", response_model=AgentCommerceSession)
def get_agent_commerce_status():
    """Retrieve the latest Agent-vs-Agent commerce session and step trace."""
    return agent_commerce_service.get_latest_session()


@router.post("/run", response_model=AgentCommerceSession)
def run_agent_commerce_cycle(body: AgentCommerceRunRequest):
    """
    Execute a full autonomous commerce cycle:
    1. Buyer Agent checks spend policy & creates PayPal Orders v2
    2. PayPal Sandbox captures payment
    3. Merchant Agent pushes courier tracking & anchors Merkle leaf
    4. Buyer Agent raises dispute
    5. PaySentinel Firewall inspects & merchant agent counters or escalates
    """
    return agent_commerce_service.run_cycle(body)
