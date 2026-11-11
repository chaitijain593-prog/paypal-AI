"""
Test Agent-vs-Agent Autonomous Commerce Loop (Feature 9)
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_agent_commerce():
    print(">>> 1. Testing GET /api/agent-commerce/status...")
    res = client.get("/api/agent-commerce/status")
    assert res.status_code == 200
    data = res.json()
    assert len(data["steps"]) == 6
    assert data["steps"][0]["actor"] == "BUYER_AGENT"
    assert data["steps"][2]["actor"] == "PAYPAL_SANDBOX"
    assert data["steps"][5]["actor"] == "MERCHANT_AGENT"
    print("  [PASS] Initial 6-step commerce session retrieved.")

    print(">>> 2. Testing POST /api/agent-commerce/run (Standard Cycle)...")
    res_run = client.post(
        "/api/agent-commerce/run",
        json={
            "product_name": "Sony Noise-Cancelling Headphones",
            "amount": 299.99,
            "simulate_dispute": True,
            "inject_adversarial": False,
        }
    )
    assert res_run.status_code == 200
    data_run = res_run.json()
    assert data_run["status"] == "COMPLETED"
    assert len(data_run["steps"]) == 6
    assert data_run["steps"][3]["action"] == "FULFILLMENT_AND_MERKLE_ANCHOR"
    print("  [PASS] Standard cycle executed cleanly with Merkle proof anchor.")

    print(">>> 3. Testing POST /api/agent-commerce/run (Adversarial Prompt Injection)...")
    res_adv = client.post(
        "/api/agent-commerce/run",
        json={
            "product_name": "Studio Monitor",
            "amount": 450.00,
            "simulate_dispute": True,
            "inject_adversarial": True,
        }
    )
    assert res_adv.status_code == 200
    data_adv = res_adv.json()
    assert data_adv["status"] == "ESCALATED"
    assert "PROMPT INJECTION" in data_adv["steps"][5]["description"]
    print("  [PASS] Adversarial injection intercepted by Untrusted Message Firewall & escalated.")

    print("\n[SUCCESS] ALL AGENT COMMERCE BACKEND TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    test_agent_commerce()
