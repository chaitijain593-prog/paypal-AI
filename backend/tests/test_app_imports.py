import pytest

def test_import_app_main_and_health():
    """Phase 0 Gate: Ensure app.main can be imported and /api/health works."""
    from app.main import app
    from fastapi.testclient import TestClient
    
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
