"""
PaySentinel AI — Dispute Provider Protocol & Implementations
============================================================
Defines the DisputeProvider abstraction with two implementations:
1. SandboxDisputeProvider: Interacts directly with PayPal Sandbox Disputes REST API v1.
2. SimulatedDisputeProvider: In-memory simulation with seed fixture datasets.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable
from app.core.config import get_settings
from app.services.paypal_client import paypal_client


@runtime_checkable
class DisputeProvider(Protocol):
    """Protocol defining the dispute operations."""

    async def list_disputes(self, page_size: int = 10) -> list[dict[str, Any]]:
        ...

    async def get_dispute(self, dispute_id: str) -> dict[str, Any] | None:
        ...

    async def provide_evidence(
        self,
        dispute_id: str,
        notes: str,
        evidence_type: str = "PROOF_OF_DELIVERY",
        tracking_info: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        ...

    async def accept_claim(
        self,
        dispute_id: str,
        note: str = "Conceded by merchant to waive dispute fee",
    ) -> dict[str, Any]:
        ...


class SandboxDisputeProvider:
    """Live PayPal Sandbox Disputes API provider."""

    def __init__(self) -> None:
        self.client = paypal_client

    async def list_disputes(self, page_size: int = 10) -> list[dict[str, Any]]:
        res = await self.client.list_disputes(page_size=page_size)
        if res and "items" in res:
            return res["items"]
        return []

    async def get_dispute(self, dispute_id: str) -> dict[str, Any] | None:
        return await self.client.get_dispute(dispute_id)

    async def provide_evidence(
        self,
        dispute_id: str,
        notes: str,
        evidence_type: str = "PROOF_OF_DELIVERY",
        tracking_info: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return await self.client.provide_evidence(
            dispute_id=dispute_id,
            evidence_type=evidence_type,
            notes=notes,
            tracking_info=tracking_info,
        )

    async def accept_claim(
        self,
        dispute_id: str,
        note: str = "Conceded by merchant to waive dispute fee",
    ) -> dict[str, Any]:
        return await self.client.accept_claim(
            dispute_id=dispute_id,
            note=note,
        )


class SimulatedDisputeProvider:
    """Simulated provider for test suites and offline hackathon demos."""

    def __init__(self) -> None:
        from app.services.mock_data import DISPUTES
        self._disputes = DISPUTES

    async def list_disputes(self, page_size: int = 10) -> list[dict[str, Any]]:
        return [d.model_dump() for d in self._disputes[:page_size]]

    async def get_dispute(self, dispute_id: str) -> dict[str, Any] | None:
        for d in self._disputes:
            if d.id == dispute_id:
                return d.model_dump()
        return None

    async def provide_evidence(
        self,
        dispute_id: str,
        notes: str,
        evidence_type: str = "PROOF_OF_DELIVERY",
        tracking_info: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return {
            "status": "SUCCESS",
            "http_status": 200,
            "dispute_id": dispute_id,
            "action": "EVIDENCE_SUBMITTED_SIMULATED",
            "data_source": "SIMULATED",
            "notes": notes,
        }

    async def accept_claim(
        self,
        dispute_id: str,
        note: str = "Conceded by merchant to waive dispute fee",
    ) -> dict[str, Any]:
        return {
            "status": "SUCCESS",
            "http_status": 200,
            "dispute_id": dispute_id,
            "action": "CLAIM_CONCEDED_SIMULATED",
            "data_source": "SIMULATED",
            "note": note,
        }


def get_dispute_provider(mode: str | None = None) -> DisputeProvider:
    """Factory selecting the appropriate dispute provider based on PAYPAL_MODE."""
    settings = get_settings()
    effective_mode = (mode or settings.paypal_mode).lower()
    if effective_mode == "sandbox" and paypal_client.has_credentials:
        return SandboxDisputeProvider()
    return SimulatedDisputeProvider()
