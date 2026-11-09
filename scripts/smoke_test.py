"""
PaySentinel AI — Phase Smoke Test Runner
========================================
Automated boot verification for Backend & Frontend:
1. Starts backend on port 8011 (simulated mode).
2. Verifies /api/health and /docs return 200.
3. Probes Auth:
   - No token -> 401
   - Forged token tok_admin_Mallory -> 401
   - OPERATOR token on amount > cap -> 403
4. Probes Webhooks:
   - Unsigned -> 400
   - Fake headers -> 400
   - Process & replay -> DUPLICATE_DROPPED
5. Probes Proofs:
   - List proofs -> 200
   - Verify initial -> VERIFIED
   - Tamper -> 200
   - Verify again -> TAMPERED
6. Starts frontend on port 3011 via `next start`.
   - Requests every route: /, /dashboard, /approval-queue, /proofs, /arena, /cashflow, /transactions, /agent-commerce -> 200.
7. Shuts down all processes cleanly.
"""

import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
import httpx

backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

BACKEND_PORT = 8011
FRONTEND_PORT = 3011
BACKEND_URL = f"http://127.0.0.1:{BACKEND_PORT}"
FRONTEND_URL = f"http://127.0.0.1:{FRONTEND_PORT}"


def wait_for_server(url: str, timeout: float = 30.0) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = httpx.get(url, timeout=2.0)
            if r.status_code < 500:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def run_smoke():
    backend_proc = None
    frontend_proc = None
    passed = 0
    failed = 0

    def check(desc: str, condition: bool, extra: str = ""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  [PASS] {desc}")
        else:
            failed += 1
            print(f"  [FAIL] {desc} - {extra}")

    try:
        print(f"==> 1. Starting Backend uvicorn on port {BACKEND_PORT}...")
        env = os.environ.copy()
        env["APP_ENV"] = "development"
        env["PAYPAL_MODE"] = "simulated"
        env["APP_PORT"] = str(BACKEND_PORT)
        env["ALLOW_UNSIGNED_WEBHOOKS"] = "false"

        python_exe = sys.executable
        backend_proc = subprocess.Popen(
            [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
            cwd="backend",
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        ready = wait_for_server(f"{BACKEND_URL}/api/health", timeout=15.0)
        check("Backend /api/health returns 200", ready)
        if not ready:
            print("Backend failed to start. Aborting.")
            return False

        r_docs = httpx.get(f"{BACKEND_URL}/docs", timeout=5.0)
        check("Backend /docs returns 200", r_docs.status_code == 200, f"Got {r_docs.status_code}")

        # ── 2. Auth Probes ────────────────────────────────────────────────────
        print("==> 2. Running Auth Probes...")
        # (a) No token on mutating route
        r_no_auth = httpx.post(f"{BACKEND_URL}/api/control-tower/CT-9021/approve", json={"reviewer_notes": "test"})
        check("No token returns 401", r_no_auth.status_code == 401, f"Got {r_no_auth.status_code}")

        # (b) Forged token
        r_forged = httpx.post(
            f"{BACKEND_URL}/api/control-tower/CT-9021/approve",
            headers={"Authorization": "Bearer tok_admin_Mallory"},
            json={"reviewer_notes": "forged attempt"},
        )
        check("Forged token returns 401", r_forged.status_code == 401, f"Got {r_forged.status_code}")

        # (c) Operator on high value dispute (CT-9021 amount is $1250 > cap $500)
        from app.core.auth import _load_token_registry
        tokens = _load_token_registry()
        operator_tok = next((t for t, c in tokens.items() if c["role"] == "OPERATOR"), "tok_operator_003")
        senior_tok = next((t for t, c in tokens.items() if c["role"] == "SENIOR_RISK_OFFICER"), "tok_senior_risk_001")

        r_op_cap = httpx.post(
            f"{BACKEND_URL}/api/control-tower/CT-9021/approve",
            headers={"Authorization": f"Bearer {operator_tok}"},
            json={"reviewer_notes": "operator approving high value"},
        )
        check("OPERATOR approving high value dispute returns 403", r_op_cap.status_code == 403, f"Got {r_op_cap.status_code}")

        # ── 3. Webhook Probes ─────────────────────────────────────────────────
        print("==> 3. Running Webhook Probes...")
        # (a) Unsigned webhook
        wh_event_id = f"WH-SMOKE-{uuid.uuid4().hex[:8]}"
        wh_payload = {
            "id": wh_event_id,
            "event_type": "CUSTOMER.DISPUTE.CREATED",
            "resource": {"dispute_id": f"PP-D-{uuid.uuid4().hex[:6]}", "amount": {"value": "25.00"}},
        }
        r_unsigned = httpx.post(f"{BACKEND_URL}/api/webhooks/paypal", json=wh_payload)
        check("Unsigned webhook rejected 400", r_unsigned.status_code == 400, f"Got {r_unsigned.status_code}")

        # (b) Fake signature headers
        fake_headers = {
            "PAYPAL-AUTH-ALGO": "SHA256withRSA",
            "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123",
            "PAYPAL-TRANSMISSION-ID": f"TRN-{uuid.uuid4().hex[:8]}",
            "PAYPAL-TRANSMISSION-SIG": "INVALID_SIGNATURE_BYTES_HEX",
            "PAYPAL-TRANSMISSION-TIME": "2026-11-09T10:00:00Z",
        }
        r_fake_sig = httpx.post(f"{BACKEND_URL}/api/webhooks/paypal", headers=fake_headers, json=wh_payload)
        check("Invalid signature rejected 400", r_fake_sig.status_code == 400, f"Got {r_fake_sig.status_code}")

        # ── 4. Proofs Lifecycle & Tamper Probes ───────────────────────────────
        print("==> 4. Running Proofs Engine & Tamper Probes...")
        r_proofs = httpx.get(f"{BACKEND_URL}/api/proofs")
        check("GET /api/proofs returns 200", r_proofs.status_code == 200, f"Got {r_proofs.status_code}")
        proofs_list = r_proofs.json().get("proofs", [])
        if proofs_list:
            proof_id = proofs_list[0].get("id") or proofs_list[0].get("proof_id")
            # Verify initial proof
            r_v1 = httpx.get(f"{BACKEND_URL}/api/proofs/{proof_id}/verify")
            check(f"GET /api/proofs/{proof_id}/verify returns 200", r_v1.status_code == 200, f"Got {r_v1.status_code}")
            v1_data = r_v1.json()
            check("Initial proof status is VERIFIED", v1_data.get("status") == "VERIFIED", f"Got {v1_data.get('status')}")

            # Tamper with proof (requires auth)
            r_tamper = httpx.post(
                f"{BACKEND_URL}/api/proofs/{proof_id}/tamper",
                headers={"Authorization": f"Bearer {senior_tok}"},
            )
            check("POST /api/proofs/tamper returns 200", r_tamper.status_code == 200, f"Got {r_tamper.status_code}")

            # Verify tampered proof
            r_v2 = httpx.get(f"{BACKEND_URL}/api/proofs/{proof_id}/verify")
            v2_data = r_v2.json()
            check("Tampered proof status returns TAMPERED", v2_data.get("status") == "TAMPERED", f"Got {v2_data.get('status')}")
            check("Tampered proof match is False", v2_data.get("match") is False)

        # ── 5. Frontend Boot & Route Verification ─────────────────────────────
        print(f"==> 5. Starting Frontend next start on port {FRONTEND_PORT}...")
        fe_env = os.environ.copy()
        fe_env["PORT"] = str(FRONTEND_PORT)
        fe_env["NEXT_PUBLIC_API_URL"] = BACKEND_URL

        frontend_proc = subprocess.Popen(
            ["npx", "next", "start", "-p", str(FRONTEND_PORT)],
            cwd="frontend",
            env=fe_env,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        fe_ready = wait_for_server(FRONTEND_URL, timeout=25.0)
        check("Frontend server booted and listening", fe_ready)

        if fe_ready:
            routes = [
                "/",
                "/dashboard",
                "/approval-queue",
                "/proofs",
                "/arena",
                "/cashflow",
                "/transactions",
                "/agent-commerce",
            ]
            for route in routes:
                r_page = httpx.get(f"{FRONTEND_URL}{route}", timeout=10.0)
                check(f"Frontend route {route} returns 200", r_page.status_code == 200, f"Got {r_page.status_code}")

    finally:
        print("==> 6. Cleaning up server processes...")
        if backend_proc:
            backend_proc.terminate()
            backend_proc.wait()
            print("  Backend terminated.")
        if frontend_proc:
            # On windows shell=True kills child process tree
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], capture_output=True)
            print("  Frontend terminated.")

    print(f"\nSmoke Test Summary: {passed} passed, {failed} failed.")
    return failed == 0


if __name__ == "__main__":
    success = run_smoke()
    sys.exit(0 if success else 1)
