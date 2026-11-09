"""
PaySentinel AI — PayPal Sandbox Client
======================================
Connects to PayPal REST API v2 using OAuth2 Client Credentials grant.
Handles sandbox token exchange, Orders v2 inspection, and dispute synchronization.
"""

from __future__ import annotations

import base64
import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.models.schemas import (
    BuyerInfo,
    SellerInfo,
    Transaction,
    TransactionStatus,
)

logger = logging.getLogger("paypal_client")
settings = get_settings()


class PayPalSandboxClient:
    """Official PayPal Sandbox API v2 integration client."""

    def __init__(self) -> None:
        self.base_url = settings.paypal_base_url.rstrip("/")
        self.client_id = settings.paypal_client_id
        self.client_secret = settings.paypal_client_secret
        self._access_token: str | None = None
        self._token_expires_at: float = 0.0

    @property
    def has_credentials(self) -> bool:
        return bool(self.client_id and self.client_secret)

    async def get_access_token(self) -> str | None:
        """Fetch OAuth2 bearer token from PayPal Sandbox."""
        if not self.has_credentials:
            return None

        # Return cached token if still valid
        now = datetime.now(timezone.utc).timestamp()
        if self._access_token and now < self._token_expires_at:
            return self._access_token

        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"grant_type": "client_credentials"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/v1/oauth2/token",
                    headers=headers,
                    data=data,
                )
                if res.status_code == 200:
                    body = res.json()
                    self._access_token = body.get("access_token")
                    expires_in = body.get("expires_in", 3600)
                    self._token_expires_at = now + expires_in - 60
                    return self._access_token
                else:
                    logger.error(
                        "PayPal OAuth2 failed: %s — %s", res.status_code, res.text
                    )
        except Exception as e:
            logger.error("PayPal OAuth2 network error: %s", e)

        return None

    async def get_sandbox_status(self) -> dict[str, Any]:
        """Check live sandbox connection health and credentials validity."""
        if not self.has_credentials:
            return {
                "connected": False,
                "mode": "SANDBOX_SIMULATED",
                "message": "Using simulated sandbox ledger. Set PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET in .env for live token exchange.",
                "base_url": self.base_url,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        token = await self.get_access_token()
        if token:
            return {
                "connected": True,
                "mode": "SANDBOX_LIVE",
                "message": "Successfully authenticated with PayPal Sandbox API v2.",
                "base_url": self.base_url,
                "client_id_prefix": self.client_id[:8] + "...",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        return {
            "connected": False,
            "mode": "SANDBOX_AUTH_FAILED",
            "message": "Invalid client ID or secret for PayPal Sandbox.",
            "base_url": self.base_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def get_order_details(self, order_id: str) -> dict[str, Any] | None:
        """Fetch real order record from PayPal Orders v2 API, with simulated fallback."""
        token = await self.get_access_token()
        if not token:
            from app.services.mock_data import get_transactions
            for t in get_transactions():
                if t.order_id == order_id or t.id == order_id:
                    return {
                        "id": t.order_id,
                        "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                        "intent": "CAPTURE",
                        "purchase_units": [
                            {
                                "reference_id": "default",
                                "amount": {"currency_code": t.currency, "value": f"{t.amount:.2f}"},
                                "description": t.description,
                                "payee": {"email_address": t.seller.email, "merchant_id": t.seller.merchant_id},
                            }
                        ],
                        "create_time": t.created_at.isoformat(),
                        "data_source": "SIMULATED_SANDBOX",
                    }
            return {
                "id": order_id,
                "status": "COMPLETED",
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": "default",
                        "amount": {"currency_code": "USD", "value": "129.99"},
                        "description": f"Simulated order {order_id}",
                    }
                ],
                "create_time": datetime.now(timezone.utc).isoformat(),
                "data_source": "SIMULATED_SANDBOX",
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.base_url}/v2/checkout/orders/{order_id}",
                    headers=headers,
                )
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.error("Error fetching PayPal order %s: %s", order_id, e)

        return None

    async def create_order(
        self,
        amount: float,
        currency: str = "USD",
        reference_id: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Create order in PayPal Sandbox using Orders v2 API with idempotency and simulated mode support."""
        token = await self.get_access_token()
        if not token:
            import uuid
            sim_order_id = f"ORD-SANDBOX-{uuid.uuid4().hex[:8].upper()}"
            return {
                "id": sim_order_id,
                "status": "CREATED",
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": reference_id or "default",
                        "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                        "payee": {"email_address": "merchant-sandbox@techvault.store", "merchant_id": "MERCH-TV8294X1"},
                    }
                ],
                "create_time": datetime.now(timezone.utc).isoformat(),
                "links": [
                    {
                        "href": f"https://www.sandbox.paypal.com/checkoutnow?token={sim_order_id}",
                        "rel": "approve",
                        "method": "GET",
                    },
                    {
                        "href": f"https://api-m.sandbox.paypal.com/v2/checkout/orders/{sim_order_id}/capture",
                        "rel": "capture",
                        "method": "POST",
                    },
                ],
                "data_source": "SIMULATED_SANDBOX",
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        if request_id:
            headers["PayPal-Request-Id"] = request_id

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": reference_id or "default",
                    "amount": {
                        "currency_code": currency,
                        "value": f"{amount:.2f}",
                    },
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/v2/checkout/orders",
                    headers=headers,
                    json=payload,
                )
                if res.status_code in (200, 201):
                    return res.json()
                logger.error("PayPal create_order error %s: %s", res.status_code, res.text)
                return {"error": res.text, "status_code": res.status_code}
        except Exception as e:
            logger.error("Error creating PayPal order: %s", e)
            return None

    async def capture_order(
        self,
        order_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Capture payment for order in PayPal Sandbox with idempotency and simulated mode support."""
        token = await self.get_access_token()
        if not token:
            import uuid
            capture_id = f"CAP-SANDBOX-{uuid.uuid4().hex[:8].upper()}"
            now_iso = datetime.now(timezone.utc).isoformat()
            return {
                "id": order_id,
                "status": "COMPLETED",
                "payment_source": {
                    "paypal": {
                        "email_address": "buyer-sandbox@gmail.com",
                        "account_id": "PAYER-SANDBOX-7X3",
                    }
                },
                "purchase_units": [
                    {
                        "reference_id": "default",
                        "payments": {
                            "captures": [
                                {
                                    "id": capture_id,
                                    "status": "COMPLETED",
                                    "amount": {"currency_code": "USD", "value": "10.00"},
                                    "final_capture": True,
                                    "seller_protection": {
                                        "status": "ELIGIBLE",
                                        "dispute_categories": [
                                            "ITEM_NOT_RECEIVED",
                                            "UNAUTHORIZED_TRANSACTION"
                                        ]
                                    },
                                    "create_time": now_iso,
                                    "update_time": now_iso,
                                }
                            ]
                        }
                    }
                ],
                "data_source": "SIMULATED_SANDBOX",
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        if request_id:
            headers["PayPal-Request-Id"] = request_id

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
                    headers=headers,
                )
                if res.status_code in (200, 201):
                    return res.json()
                logger.error("PayPal capture_order error %s: %s", res.status_code, res.text)
                return {"error": res.text, "status_code": res.status_code}
        except Exception as e:
            logger.error("Error capturing PayPal order %s: %s", order_id, e)
            return None

    async def list_disputes(self, page_size: int = 10) -> dict[str, Any] | None:
        """Fetch list of disputes from PayPal Disputes API (GET /v1/customer/disputes)."""
        token = await self.get_access_token()
        if not token:
            return None

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(
                    f"{self.base_url}/v1/customer/disputes?page_size={page_size}",
                    headers=headers,
                )
                if res.status_code == 200:
                    return res.json()
                logger.error("PayPal list_disputes error %s: %s", res.status_code, res.text)
                return None
        except Exception as e:
            logger.error("Error listing PayPal disputes: %s", e)
            return None

    async def get_dispute(self, dispute_id: str) -> dict[str, Any] | None:
        """Fetch dispute detail from PayPal Disputes API (GET /v1/customer/disputes/{id})."""
        token = await self.get_access_token()
        if not token:
            return None

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(
                    f"{self.base_url}/v1/customer/disputes/{dispute_id}",
                    headers=headers,
                )
                if res.status_code == 200:
                    return res.json()
                return None
        except Exception as e:
            logger.error("Error fetching PayPal dispute %s: %s", dispute_id, e)
            return None

    VALID_EVIDENCE_TYPES = frozenset({"PROOF_OF_FULFILLMENT", "PROOF_OF_REFUND", "OTHER"})

    async def provide_evidence(
        self,
        dispute_id: str,
        notes: str = "",
        evidence_type: str = "PROOF_OF_FULFILLMENT",
        tracking_info: list[dict[str, Any]] | None = None,
        validate_status: bool = True,
    ) -> dict[str, Any]:
        """
        Submit dispute defense evidence to PayPal Disputes API
        POST /v1/customer/disputes/{id}/provide-evidence
        Payload is multipart/form-data with an `input` JSON part according to official PayPal API specifications.
        """
        if evidence_type not in self.VALID_EVIDENCE_TYPES:
            raise ValueError(
                f"Invalid evidence_type '{evidence_type}'. Must be one of: {sorted(self.VALID_EVIDENCE_TYPES)}"
            )

        token = await self.get_access_token()
        if not token:
            return {"status": "ERROR", "message": "No PayPal access token available"}

        # 1. Check dispute status is WAITING_FOR_SELLER_RESPONSE first
        if validate_status:
            dispute = await self.get_dispute(dispute_id)
            if not dispute:
                return {"status": "ERROR", "message": f"Dispute {dispute_id} not found"}
            status_val = dispute.get("status")
            if status_val != "WAITING_FOR_SELLER_RESPONSE":
                return {
                    "status": "ERROR",
                    "http_status": 400,
                    "message": f"Dispute {dispute_id} is in status '{status_val}'. PayPal only accepts evidence in 'WAITING_FOR_SELLER_RESPONSE'.",
                    "dispute_status": status_val,
                }

        # 2. Build input JSON part per PayPal's documented schema
        evidence_entry: dict[str, Any] = {
            "evidence_type": evidence_type,
            "notes": notes,
        }
        if tracking_info:
            evidence_entry["evidence_info"] = {"tracking_info": tracking_info}

        input_payload = {"evidences": [evidence_entry]}
        input_json_str = json.dumps(input_payload)

        headers = {
            "Authorization": f"Bearer {token}",
        }
        # httpx multipart/form-data with input JSON part
        files = {
            "input": (None, input_json_str, "application/json"),
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/v1/customer/disputes/{dispute_id}/provide-evidence",
                    headers=headers,
                    files=files,
                )
                debug_id = res.headers.get("paypal-debug-id", "")
                res_content: Any = {}
                if res.content:
                    try:
                        res_content = res.json()
                    except Exception:
                        res_content = res.text

                if res.status_code in (200, 204):
                    return {
                        "status": "SUCCESS",
                        "http_status": res.status_code,
                        "debug_id": debug_id,
                        "response": res_content,
                    }
                return {
                    "status": "ERROR",
                    "http_status": res.status_code,
                    "debug_id": debug_id,
                    "error": res_content or res.text,
                }
        except Exception as e:
            logger.error("Error submitting PayPal dispute evidence: %s", e)
            return {"status": "ERROR", "message": str(e)}

    async def accept_claim(
        self,
        dispute_id: str,
        note: str = "Conceded by merchant to waive fees",
        accept_claim_reason: str | None = None,
    ) -> dict[str, Any]:
        """
        Concede/accept dispute claim via PayPal Disputes API (POST /v1/customer/disputes/{id}/accept-claim).
        Validates note length (max 2000 chars per PayPal docs).
        """
        if len(note) > 2000:
            raise ValueError(f"Note length ({len(note)}) exceeds PayPal maximum limit of 2000 characters.")

        token = await self.get_access_token()
        if not token:
            return {"status": "ERROR", "message": "No PayPal access token available"}

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {"note": note}
        if accept_claim_reason:
            payload["accept_claim_reason"] = accept_claim_reason

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/v1/customer/disputes/{dispute_id}/accept-claim",
                    headers=headers,
                    json=payload,
                )
                debug_id = res.headers.get("paypal-debug-id", "")
                res_content: Any = {}
                if res.content:
                    try:
                        res_content = res.json()
                    except Exception:
                        res_content = res.text

                if res.status_code in (200, 204):
                    return {
                        "status": "SUCCESS",
                        "http_status": res.status_code,
                        "debug_id": debug_id,
                        "response": res_content,
                    }
                return {
                    "status": "ERROR",
                    "http_status": res.status_code,
                    "debug_id": debug_id,
                    "error": res_content or res.text,
                }
        except Exception as e:
            logger.error("Error accepting PayPal dispute claim: %s", e)
            return {"status": "ERROR", "message": str(e)}

    async def add_tracking(
        self,
        transaction_id: str,
        tracking_number: str,
        carrier: str = "FEDEX",
        status: str = "SHIPPED",
    ) -> dict[str, Any]:
        """
        Submit shipment tracking to PayPal Shipping API (POST /v1/shipping/trackers-batch).
        """
        token = await self.get_access_token()
        if not token:
            return {"status": "ERROR", "message": "No PayPal access token available"}

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "trackers": [
                {
                    "transaction_id": transaction_id,
                    "tracking_number": tracking_number,
                    "status": status,
                    "carrier": carrier,
                }
            ]
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/v1/shipping/trackers-batch",
                    headers=headers,
                    json=payload,
                )
                debug_id = res.headers.get("paypal-debug-id", "")
                res_content: Any = {}
                if res.content:
                    try:
                        res_content = res.json()
                    except Exception:
                        res_content = res.text

                if res.status_code in (200, 201, 204):
                    return {
                        "status": "SUCCESS",
                        "http_status": res.status_code,
                        "debug_id": debug_id,
                        "response": res_content,
                    }
                return {
                    "status": "ERROR",
                    "http_status": res.status_code,
                    "debug_id": debug_id,
                    "error": res_content or res.text,
                }
        except Exception as e:
            logger.error("Error submitting tracking to PayPal: %s", e)
            return {"status": "ERROR", "message": str(e)}

    async def verify_webhook_signature(
        self,
        auth_algo: str,
        cert_url: str,
        transmission_id: str,
        transmission_sig: str,
        transmission_time: str,
        webhook_id: str,
        webhook_event: dict[str, Any],
    ) -> bool:
        """Verify webhook signature with PayPal (POST /v1/notifications/verify-webhook-signature)."""
        token = await self.get_access_token()
        if not token:
            return False

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "auth_algo": auth_algo,
            "cert_url": cert_url,
            "transmission_id": transmission_id,
            "transmission_sig": transmission_sig,
            "transmission_time": transmission_time,
            "webhook_id": webhook_id,
            "webhook_event": webhook_event,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/v1/notifications/verify-webhook-signature",
                    headers=headers,
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    return data.get("verification_status") == "SUCCESS"
        except Exception as e:
            logger.error("Error verifying PayPal webhook signature: %s", e)
        return False

    async def sync_sandbox_orders(self) -> list[Transaction]:
        """Fetch and harmonize live or simulated sandbox transactions."""
        from app.services.mock_data import get_transactions
        return get_transactions()


# Singleton instance
paypal_client = PayPalSandboxClient()
PayPalClient = PayPalSandboxClient
