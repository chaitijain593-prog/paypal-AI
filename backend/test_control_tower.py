"""
Self-Testing Script for Wave 1, Feature 4: Human Control Tower & Approval Queue
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
AUTH = {"Authorization": "Bearer tok_senior_risk_001"}

def test_control_tower_lifecycle():
    # Ensure fresh initial state
    client.post("/api/control-tower/reset", headers=AUTH)
    print(">>> 1. Testing GET /api/control-tower/pending...")
    res = client.get("/api/control-tower/pending")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["count"] == 3, f"Expected 3 items, got {data['count']}"
    assert data["kpis"]["pending_count"] == 3
    assert data["kpis"]["total_amount_at_risk"] == 1775.00
    assert data["kpis"]["urgent_24h_count"] == 1
    print(f"  [PASS] 3 seeded items loaded. Total at risk: ${data['kpis']['total_amount_at_risk']}")

    print(">>> 2. Testing Case 1 (High-Value): POST /api/control-tower/CT-9021/approve...")
    res = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH,
        json={"reviewer_notes": "Physical signature verified with FedEx tracking."}
    )
    assert res.status_code == 200
    item = res.json()
    assert item["status"] in ["APPROVED_AND_SUBMITTED", "SUBMITTED"]
    assert len(item["audit_trail"]) >= 2
    assert item["audit_trail"][-1]["action"] == "APPROVE_AND_SUBMIT"
    assert item["audit_trail"][-1]["paypal_api_status"] == "SIMULATED_NOT_SENT"
    assert item["data_source"] == "SIMULATED"
    print("  [PASS] CT-9021 successfully approved with honest SIMULATED_NOT_SENT status.")

    print(">>> 3. Testing Idempotency on CT-9021 (Double Approval)...")
    res_idempotent = client.post(
        "/api/control-tower/CT-9021/approve",
        headers=AUTH,
        json={"reviewer_notes": "Duplicate attempt"}
    )
    assert res_idempotent.status_code == 409
    print("  [PASS] Idempotency enforced: 409 Conflict returned on re-approval.")

    print(">>> 4. Testing Case 2 (Low-Confidence & Prompt Injection): POST /api/control-tower/CT-9022/edit...")
    res = client.post(
        "/api/control-tower/CT-9022/edit",
        headers=AUTH,
        json={
            "updated_defense_letter": "REVISED BY MERCHANT: Customer build verified by serial QC-9941. Offering replacement switch pack.",
            "updated_action": "SUBMIT_EVIDENCE",
            "reviewer_notes": "Neutralized prompt injection and offered targeted switch pack replacement."
        }
    )
    assert res.status_code == 200
    item2 = res.json()
    assert item2["status"] == "EDITED_AND_SUBMITTED"
    assert "REVISED BY MERCHANT" in item2["drafted_defense_letter"]
    assert item2["audit_trail"][-1]["action"] == "EDIT_AND_SUBMIT"
    print("  [PASS] CT-9022 successfully edited and submitted.")

    print(">>> 5. Testing Case 3 (Know When to Fold): POST /api/control-tower/CT-9023/reject...")
    res = client.post(
        "/api/control-tower/CT-9023/reject",
        headers=AUTH,
        json={
            "resolution_strategy": "CONCEDE_AND_REFUND",
            "reviewer_notes": "Conceded claim to save $15 dispute fee. USPS claim filed separately."
        }
    )
    assert res.status_code == 200
    item3 = res.json()
    assert item3["status"] in ["REJECTED_CONCEDED", "CONCEDED"]
    assert item3["audit_trail"][-1]["action"] == "REJECT_AND_CONCEDE"
    print("  [PASS] CT-9023 conceded; $15 dispute fee waived.")

    print(">>> 6. Testing GET /api/control-tower/pending?status=ALL...")
    res_all = client.get("/api/control-tower/pending?status=ALL")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["kpis"]["pending_count"] == 0
    assert data_all["kpis"]["resolved_count"] == 3
    assert data_all["kpis"]["fees_saved"] == 45.00
    print(f"  [PASS] All 3 items resolved. Total fees saved: ${data_all['kpis']['fees_saved']}")

    print(">>> 7. Testing POST /api/control-tower/reset...")
    res_reset = client.post("/api/control-tower/reset", headers=AUTH)
    assert res_reset.status_code == 200
    assert res_reset.json()["kpis"]["pending_count"] == 3
    print("  [PASS] Store reset successfully back to 3 pending items.")

    print("\n[SUCCESS] ALL 7 HUMAN CONTROL TOWER BACKEND TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    test_control_tower_lifecycle()
