"""
Tests for P1-5: Single Shared AsyncClient, Token Lock, and Retry
- 10 concurrent requests refresh token exactly once (single flight via asyncio.Lock)
- Shared AsyncClient persisted across requests and cleanly closed via aclose()
- Exponential backoff retry on 429 and 5xx
"""

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.paypal_client import PayPalSandboxClient


@pytest.mark.anyio
async def test_ten_concurrent_token_requests_refresh_exactly_once():
    """10 concurrent requests calling get_access_token trigger exactly 1 token refresh."""
    client = PayPalSandboxClient()
    client.client_id = "test-client-id"
    client.client_secret = "test-client-secret"
    client._access_token = None
    client._token_expires_at = 0.0

    call_count = 0

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        if "oauth2/token" in str(request.url):
            call_count += 1
            # Add artificial delay to simulate network latency and invite race conditions
            await asyncio.sleep(0.05)
            return httpx.Response(
                200,
                json={"access_token": "token-xyz-123", "expires_in": 3600},
                request=request,
            )
        return httpx.Response(404, request=request)

    transport = httpx.MockTransport(mock_handler)
    shared_http = httpx.AsyncClient(transport=transport)
    client._client = shared_http

    try:
        # Launch 10 concurrent calls
        tokens = await asyncio.gather(*(client.get_access_token() for _ in range(10)))
        assert len(tokens) == 10
        assert all(t == "token-xyz-123" for t in tokens)
        # MUST have refreshed exactly once
        assert call_count == 1
    finally:
        await client.aclose()


@pytest.mark.anyio
async def test_retry_on_429_exponential_backoff():
    """Client automatically retries on 429 Rate Limit with backoff and succeeds on 200."""
    client = PayPalSandboxClient()
    client.client_id = "test-client-id"
    client.client_secret = "test-client-secret"

    attempts = 0

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            return httpx.Response(429, json={"error": "rate_limit_exceeded"}, request=request)
        return httpx.Response(200, json={"id": "DISPUTE-OK", "status": "UNDER_REVIEW"}, request=request)

    transport = httpx.MockTransport(mock_handler)
    client._client = httpx.AsyncClient(transport=transport)

    try:
        # Mock valid token to focus on dispute query retry
        client._access_token = "valid-token"
        client._token_expires_at = 9999999999.0

        with patch("asyncio.sleep", new=AsyncMock()) as mock_sleep:
            res = await client.get_dispute("DISPUTE-OK")
            assert res is not None
            assert res.get("status") == "UNDER_REVIEW"
            assert attempts == 3
            assert mock_sleep.call_count == 2
    finally:
        await client.aclose()
