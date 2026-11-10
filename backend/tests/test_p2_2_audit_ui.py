"""
Tests for P2-2: Cryptographic Audit Chain Verification Endpoint
- GET /api/control-tower/{item_id}/verify-audit-chain returns 200 with verification status
- Cryptographic verification proves intact SHA-256 hash chaining from genesis to current item state
- Unknown item returns 404
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
AUTH_SENIOR = {"Authorization": "Bearer tok_senior_risk_001"}


def test_verify_audit_chain_endpoint():
    """GET /api/control-tower/{item_id}/verify-audit-chain returns verified: True for intact item."""
    res = client.get("/api/control-tower/CT-9021/verify-audit-chain")
    assert res.status_code == 200
    data = res.json()
    assert data["item_id"] == "CT-9021"
    assert data["verified"] is True
    assert "Hash chain verified" in data["details"]


def test_verify_audit_chain_unknown_item():
    """GET /api/control-tower/UNKNOWN/verify-audit-chain returns 404."""
    res = client.get("/api/control-tower/CT-NONEXISTENT/verify-audit-chain")
    assert res.status_code == 404
