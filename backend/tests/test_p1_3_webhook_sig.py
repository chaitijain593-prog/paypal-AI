"""
PaySentinel AI — P1-3 Webhook Signature Fail-Closed Tests
=========================================================
Validates:
(a) ALLOW_UNSIGNED_WEBHOOKS=true in APP_ENV=production refuses to start (raises RuntimeError);
(b) cert_url must be https and host must end with .paypal.com or be paypal.com;
(c) transmission_time must be within 5 minutes of now;
(d) In simulated mode, unsigned webhooks require 'X-PaySentinel-Simulated: true';
(e) Valid simulated payload with 'X-PaySentinel-Simulated: true' returns 200.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app, lifespan

client = TestClient(app)


@pytest.mark.anyio
async def test_allow_unsigned_in_prod_fails_lifespan(monkeypatch):
    """Lifespan must refuse to start in production if allow_unsigned_webhooks is enabled."""
    settings = get_settings()
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    with pytest.raises(RuntimeError, match="ALLOW_UNSIGNED_WEBHOOKS"):
        async with lifespan(app):
            pass


def test_fake_cert_url_host_rejected_400(monkeypatch):
    """Webhook with untrusted certificate domain (e.g. evil.com) must be rejected with 400."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", False)

    now_iso = datetime.now(timezone.utc).isoformat()
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://evil.com/certs/paypal_fake.pem",
        "PAYPAL-TRANSMISSION-ID": "TRANS-EVIL-1",
        "PAYPAL-TRANSMISSION-SIG": "VALID_FORMAT_SIG",
        "PAYPAL-TRANSMISSION-TIME": now_iso,
    }
    payload = {
        "id": "WH-TEST-EVIL-CERT",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-001"},
    }
    res = client.post("/api/webhooks/paypal", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Invalid PayPal certificate URL" in res.json()["detail"]


def test_stale_transmission_time_rejected_400(monkeypatch):
    """Webhook with transmission timestamp older than 5 minutes must be rejected with 400."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", False)

    ten_mins_ago = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123",
        "PAYPAL-TRANSMISSION-ID": "TRANS-STALE-1",
        "PAYPAL-TRANSMISSION-SIG": "VALID_FORMAT_SIG",
        "PAYPAL-TRANSMISSION-TIME": ten_mins_ago,
    }
    payload = {
        "id": "WH-TEST-STALE-TIME",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-002"},
    }
    res = client.post("/api/webhooks/paypal", json=payload, headers=headers)
    assert res.status_code == 400
    assert "5-minute" in res.json()["detail"]


def test_simulated_unsigned_without_header_rejected_400(monkeypatch):
    """In simulated mode, unsigned webhooks without X-PaySentinel-Simulated: true must be rejected 400."""
    settings = get_settings()
    monkeypatch.setattr(settings, "paypal_mode", "simulated")
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    payload = {
        "id": "WH-TEST-SIM-NO-HDR",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-003"},
    }
    res = client.post("/api/webhooks/paypal", json=payload)
    assert res.status_code == 400
    assert "X-PaySentinel-Simulated" in res.json()["detail"]


def test_simulated_unsigned_with_header_accepted_200(monkeypatch):
    """In simulated mode, unsigned webhooks with X-PaySentinel-Simulated: true must be accepted 200."""
    import uuid
    settings = get_settings()
    monkeypatch.setattr(settings, "paypal_mode", "simulated")
    monkeypatch.setattr(settings, "allow_unsigned_webhooks", True)

    payload = {
        "id": f"WH-TEST-SIM-VALID-{uuid.uuid4().hex[:8]}",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-004"},
    }
    res = client.post(
        "/api/webhooks/paypal",
        json=payload,
        headers={"X-PaySentinel-Simulated": "true"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "RECEIVED"
