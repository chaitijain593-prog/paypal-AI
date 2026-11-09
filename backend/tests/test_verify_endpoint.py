import pytest

def test_verify_endpoint_recomputed_from_raw_bytes():
    """Phase 0 Gate: Ensure GET /api/proofs/PRF-001/verify returns 200 with recomputed_from_raw_bytes."""
    from app.main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.get("/api/proofs/PRF-001/verify")
    assert response.status_code == 200
    data = response.json()
    assert data["recomputed_from_raw_bytes"] is True
    assert data["match"] is True
    assert data["signature_verified"] is True
