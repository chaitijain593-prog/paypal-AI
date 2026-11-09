# PaySentinel AI — Phase 0 Gate Baseline Report

**Timestamp:** 2026-11-09T16:02:00+05:30  
**Branch:** `hardening/round3`  
**Engineer:** Principal Payments Architect + Senior SDE  

---

## 1. Summary of Gate Verification Runs

| Check | Command Run | Exit Code | Raw Log Path | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Python Bytecode Compile** | `python -m compileall -q backend/app backend/tests` | `1` (FAIL) | `verification/phase0_compileall.log` | **SyntaxError (Blocker)** |
| **Backend Test Suite** | `pytest -q backend` | `2` (FAIL) | `verification/phase0_pytest.log` | **10 Collection Errors** |
| **Frontend TypeScript** | `cd frontend && npx tsc --noEmit` | `0` (PASS) | `verification/phase0_tsc.log` | Clean |
| **Frontend ESLint** | `cd frontend && npm run lint` | `0` (PASS) | `verification/phase0_lint.log` | Clean |
| **Frontend Build** | `cd frontend && npm run build` | `0` (PASS) | `verification/phase0_build.log` | Clean (10 routes prerendered) |

---

## 2. Detailed Reproduction of Known Issues

### Failure 1: `SyntaxError` in `defense_drafter.py` Prevents App Import
- **Command:** `backend\venv\Scripts\python.exe -m compileall -q backend/app backend/tests`
- **Error Log:** `verification/phase0_compileall.log`
```text
*** Error compiling 'backend/app\\services\\defense_drafter.py'...
  File "backend/app\services\defense_drafter.py", line 246
    async with httpx.AsyncClient(timeout=10.0) as client:
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
SyntaxError: 'async with' outside async function
```
- **Root Cause:** Dead function `_query_openai_defense_draft` declared as non-async `def` but containing `async with httpx.AsyncClient(...)` and `await client.post(...)`, referencing undefined variable `previous_validation_error`, sending Gemini API key to OpenAI endpoint format.
- **Impact:** Any file importing `app.main` (all test modules and routers) fails to load during pytest collection.
- **Reproducing Test:** Added `backend/tests/test_app_imports.py` asserting `from app.main import app; TestClient(app).get("/api/health")`. Fails on import with SyntaxError (`verification/phase0_test_app_imports_fail.log`).

### Failure 2: Half-Reverted Hybrid `proof_engine.verify_proof_record`
- **Command:** `backend\venv\Scripts\python.exe -c "import proof_engine; proof_engine.verify_proof_record('PRF-001')"`
- **Error Log:** `verification/phase0_verify_proof_record_runtime_error.log`
```text
  File "C:\paypal\paypal-AI\backend\app\services\proof_engine.py", line 411, in verify_proof_record
    sig_valid = verify_merkle_root_signature(ACTIVE_MERKLE_TREE.root_hash, ACTIVE_MERKLE_TREE.ed25519_signature)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
TypeError: verify_merkle_root_signature() missing 1 required positional argument: 'signature_hex'
```
- **Subsequent Errors on line 430-432:**
  - `stored.ed25519_signature` -> `NameError: name 'stored' is not defined`
  - `sig_valid and is_valid` -> `NameError: name 'is_valid' is not defined`
- **Hardcoded Evidence Timestamps:** Line 414 hardcodes `"2026-10-15T14:34:22Z"` in `chain_of_custody` instead of real recorded timestamps.
- **Reproducing Test:** Added `backend/tests/test_verify_endpoint.py` asserting `GET /api/proofs/PRF-001/verify` returns 200 with `recomputed_from_raw_bytes: True`, `match: True`, `signature_verified: True`. Currently blocked by app import failure (`verification/phase0_test_verify_endpoint_fail.log`).

---

## 3. Baseline Test Failure Manifest

Pytest collection failed across 10 modules:
1. `backend/test_agent_commerce.py` (SyntaxError via `app.main`)
2. `backend/test_control_tower.py` (SyntaxError via `app.main`)
3. `backend/tests/test_arena_attacks.py` (SyntaxError via `app.services.defense_drafter`)
4. `backend/tests/test_audit_hardening.py` (SyntaxError via `app.main`)
5. `backend/tests/test_baseline.py` (SyntaxError via `app.main`)
6. `backend/tests/test_control_tower_state.py` (SyntaxError via `app.main`)
7. `backend/tests/test_drafter_hardening.py` (SyntaxError via `app.services.defense_drafter`)
8. `backend/tests/test_paypal_loop.py` (SyntaxError via `app.main`)
9. `backend/tests/test_proofs.py` (SyntaxError via `app.main`)
10. `backend/tests/test_webhooks_pipeline.py` (SyntaxError via `app.main`)
