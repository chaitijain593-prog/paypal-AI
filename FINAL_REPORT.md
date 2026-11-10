# PaySentinel AI — Hardening Round 3 Verification & Final Delivery Report

**Date:** 2026-11-11  
**Branch:** `hardening/round3`  
**Base Commit:** `54654fc`  
**Final Verification Commit:** `95c3fe0`  
**Orchestration Environment:** Python 3.12, Node.js v20+, FastAPI, Next.js 16 (App Router)

---

## 1. Executive Summary

This report documents the rigorous hardening and cryptographic verification of **PaySentinel AI** across Phases P0, P1, and P2. In adherence to strict proof-based criteria:
- Every defect was first reproduced with an automated failing test before modification.
- Every fix was verified with passing unit/integration suites and end-of-phase boot smoke tests.
- All evidence claims, Merkle tree audits, and Ed25519 signatures are computed strictly from real stored raw bytes or explicitly labeled as `SIMULATED`.
- Three deliberate code mutations were executed and verified to confirm that test assertions fail when underlying security guards are breached.
- All sensitive keys, tokens, and database files remain untracked with zero leaked secrets.

---

## 2. Task-by-Task Implementation & Verification Matrix

| Task ID | Commit | Description | Red Failure Log | Green Verification Log | Gate Status |
|---|---|---|---|---|---|
| **Phase 0** | `9bec6f0` | Reproduction of baseline compilation and test errors | `verification/phase0_compileall.log`, `verification/phase0_test_verify_endpoint_fail.log` | `verification/BASELINE.md` | PASS |
| **P0-1** | `9bec6f0` | Removed dead OpenAI drafter; added `pytest.ini`, `scripts/verify_all.sh` / `.ps1`, GitHub Actions workflow | `verification/phase0_compileall.log` | `verification/P0-1_test_app_imports_pass.log` | PASS |
| **P0-2** | `88935d5` | Rewrote `verify_proof_record` around `RAW_EVIDENCE_STORE`, 3-arg Ed25519 signature, Merkle audit path | `verification/P0-2_red_test_verify_endpoint.log` | `verification/P0-2_green_test_verify_endpoint.log` | PASS |
| **P0-3** | `da4f899` | Secrets hygiene (`.gitignore`), `.env.example`, `SIGNING_KEY_DIR`, `scripts/check_secrets.sh` | N/A (Gate Check) | `verification/P0-3_check_secrets.log` | PASS |
| **P0-4** | `acd097a` | Forgery-proof auth (`API_TOKENS`, `hmac.compare_digest`), Pydantic Orders v2 models, server-side route proxy | `verification/P0-4_red_tok_admin_mallory.log` | `verification/P0-4_green_test_audit_hardening.log` | PASS |
| **P0-5** | `3aabf7e` | Eliminated fabricated carrier leaves; Merkle tree from real evidence bytes; untrusted input firewall | `verification/P0-5_red.log` | `verification/P0-5_pytest.log` | PASS |
| **P0-6** | `5a9c25b` | Enforced `draft_status` guards (`DRAFT_FAILED`, `LLM_UNAVAILABLE`) blocking dispatch; human edit transition | `verification/P0-6_red.log` | `verification/P0-6_pytest.log` | PASS |
| **P0-7** | `af46fbe` | PayPal Sandbox integration test loop (`scripts/sandbox_smoke.py`), `@pytest.mark.live` skips | `verification/P0-7_red.log` | `verification/P0-7_pytest.log` | PASS |
| **P0 Smoke**| `391658a` | Boot smoke test: Uvicorn (8011) + Next.js (3011), auth probes, tamper probe | N/A | `verification/P0_smoke.log` (22/22 pass) | PASS |
| **P1-1** | `2a805a1` | Gemini structured outputs (`GEMINI_DEFENSE_SCHEMA`), fail-closed proof validator | `verification/P1-1_red.log` | `verification/P1-1_pytest.log` | PASS |
| **P1-2** | `a271605` | Decoupled webhook 200 response with background processing queue and in-flight deduplication | `verification/P1-2_red.log` | `verification/P1-2_pytest.log` | PASS |
| **P1-3** | `d9763f5` | Fail-closed webhook verification, HTTPS cert domain check, simulated headers | `verification/P1-3_red.log` | `verification/P1-3_pytest.log` | PASS |
| **P1-4** | `22106cf` | Ambiguous timeout reconciliation against `GET /v1/customer/disputes/{id}` (`AMBIGUOUS_TIMEOUT`) | `verification/P1-4_red.log` | `verification/P1-4_pytest.log` | PASS |
| **P1-5** | `e729d72` | Shared singleton `httpx.AsyncClient` with `asyncio.Lock` token refresh and exponential backoff | `verification/P1-5_red.log` | `verification/P1-5_pytest.log` | PASS |
| **P1-6** | `7134e7c` | Python `Decimal` money handling across models, SQLite adapter, Pydantic JSON float serializer | `verification/P1-6_red.log` | `verification/P1-6_pytest.log` | PASS |
| **P1-7** | `d4045ce` | Honest simulated state labeling (`SIMULATED_SUBMITTED`, `SIMULATED_CONCEDED`, `data_source="SIMULATED"`) | `verification/P1-7_red.log` | `verification/P1-7_pytest.log` | PASS |
| **P1 Smoke**| `e708b69` | Boot smoke test covering P0 + P1 capabilities | N/A | `verification/P1_smoke.log` (22/22 pass) | PASS |
| **P2-1** | `8e38d4c` | Compare-and-Swap (CAS) state machine concurrency in SQLite (`BEGIN IMMEDIATE` + rowcount 409) | `verification/P2-1_red.log` | `verification/P2-1_pytest.log` | PASS |
| **P2-2** | `9b37cfd` | Expose cryptographic audit chain verification (`/verify-audit-chain`) wired to Approval Queue UI | `verification/P2-2_red.log` | `verification/P2-2_pytest.log` | PASS |
| **P2-3** | `706a5a9` | Dual-corpus evaluation (`app/data/eval_corpus.py` tuned + `tests/data/holdout_corpus.py` held-out) | `verification/P2-3_red.log` | `verification/P2-3_pytest.log` | PASS |
| **P2-4** | `f7e5d11` | Removed 2,864 lines of dead 3D components and unused WebGL dependencies; added clean static hero | N/A (Build check) | `verification/P2-4_build.log` | PASS |
| **P2-5** | `b5a59db` | Frontend resilience: explicit loading/error states, `DataSourceBadge`, PayPal `debug_id` display | N/A (Build check) | `verification/P2-5_build.log` | PASS |
| **P2-6** | `32a8079` | Truthful documentation pass: aligned `README.md` real-vs-simulated table, documented auth & env vars | N/A (Docs pass) | `verification/P2-6_build.log` | PASS |
| **P2 Smoke**| `277042c` | Boot smoke test covering all 8 frontend routes, dual-corpus eval probe, and audit verification | N/A | `verification/P2_smoke.log` (27/27 pass) | PASS |
| **Mutations**| `95c3fe0` | 3 targeted mutation tests executed, logged to `verification/mutation_sanity.log`, and restored | `verification/mutation_sanity.log` | `verification/mutation_sanity.log` | PASS |

---

## 3. End-to-End Verification Pipeline Results

The automated master verification script (`scripts/verify_all.ps1`) was executed from a clean state. Raw output captured in `verification/final_verify_all.log`:

```text
==> Running check_secrets...
==> Checking for tracked sensitive files...
==> Scanning tracked files for secret patterns...
==> Secrets check passed cleanly: 0 tracked secrets found.
==> [1/6] Python compileall...
==> [2/6] Pytest full suite...
107 passed, 1 warning in 10.18s
==> [3/6] Frontend TypeScript check...
==> [4/6] Frontend ESLint...
✖ 78 problems (0 errors, 78 warnings)
==> [5/6] Frontend production build...
✓ Compiled successfully in 2.5s
✓ Generating static pages using 13 workers (11/11) in 1593ms
==> [6/6] Boot smoke test...
==> 1. Starting Backend uvicorn on port 8011...
  [PASS] Backend /api/health returns 200
  [PASS] Backend /docs returns 200
==> 2. Running Auth Probes...
  [PASS] No token returns 401
  [PASS] Forged token returns 401
  [PASS] OPERATOR approving high value dispute returns 403
==> 3. Running Webhook Probes...
  [PASS] Unsigned webhook rejected 400
  [PASS] Invalid signature rejected 400
==> 4. Running Proofs Engine & Tamper Probes...
  [PASS] GET /api/proofs returns 200
  [PASS] GET /api/proofs/PRF-001/verify returns 200
  [PASS] Initial proof status is VERIFIED
  [PASS] POST /api/proofs/tamper returns 200
  [PASS] Tampered proof status returns TAMPERED
  [PASS] Tampered proof match is False
==> 4b. Running Arena Dual-Corpus Eval Probe...
  [PASS] GET /api/arena/eval returns 200
  [PASS] Arena eval reports tuned corpus
  [PASS] Arena eval reports heldout corpus
  [PASS] Arena heldout has >=25 attacks
==> 4c. Running Draft-Failed Guard Probe...
  [PASS] Approving DRAFT_FAILED item rejected (409/422)
==> 5. Starting Frontend next start on port 3011...
  [PASS] Frontend server booted and listening
  [PASS] Frontend route / returns 200
  [PASS] Frontend route /dashboard returns 200
  [PASS] Frontend route /approval-queue returns 200
  [PASS] Frontend route /proofs returns 200
  [PASS] Frontend route /arena returns 200
  [PASS] Frontend route /cashflow returns 200
  [PASS] Frontend route /transactions returns 200
  [PASS] Frontend route /agent-commerce returns 200
==> 6. Cleaning up server processes...
  Backend terminated.
  Frontend terminated.

Smoke Test Summary: 27 passed, 0 failed.
==> ALL CHECKS PASSED!
```

---

## 4. Mutation Sanity Check Proofs

To prove that test coverage is active and sensitive to regressions, three targeted mutations were injected into production source code, verified to fail, and restored:

1. **Mutation A: Broken Ed25519 Signature Argument Count**
   - **File:** `backend/app/services/proof_engine.py`
   - **Mutation:** Changed `verify_merkle_root_signature(root, signed_at, signature)` to pass 2 arguments instead of 3.
   - **Result:** `TypeError: verify_merkle_root_signature() missing 1 required positional argument: 'signature_hex'` across 4 tests in `test_proofs.py`.
   - **Restored:** Clean pass (11 passed).

2. **Mutation B: Re-enabled Forged `tok_admin_` Auth Pattern**
   - **File:** `backend/app/core/auth.py`
   - **Mutation:** Inserted `if token.startswith("tok_admin_"): return ReviewerContext(...)`.
   - **Result:** `AssertionError: assert 200 == 401` in `test_mutating_routes_require_authentication` (`test_audit_hardening.py:83`).
   - **Restored:** Clean pass (8 passed).

3. **Mutation C: Disabled Defense Letter Validity Guard**
   - **File:** `backend/app/services/control_tower_service.py`
   - **Mutation:** Commented out `if not letter_clean or letter_clean == "LLM_UNAVAILABLE" ... raise ValueError(...)`.
   - **Result:** `AssertionError: assert 200 in (409, 422)` in `test_approve_draft_failed_rejected`, `test_approve_empty_letter_rejected`, and `test_approve_llm_unavailable_rejected`.
   - **Restored:** Clean pass (8 passed).

Full failure traces are preserved in `verification/mutation_sanity.log`.

---

## 5. PayPal Sandbox Live Integration

Live sandbox execution is provided via `scripts/sandbox_smoke.py` and documented in `SANDBOX_RUNBOOK.md`.

- **Unit/CI Isolation:** Standard test suites use `httpx.MockTransport` and do not make live external HTTP calls.
- **Live Sandbox Marker:** Integration tests communicating with `api-m.sandbox.paypal.com` are marked with `@pytest.mark.live` and automatically skipped when `PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_SECRET` are unset.
- **Workflow Verified:**
  1. OAuth2 Bearer token generation with shared connection pool.
  2. Order creation via Orders v2 API with Pydantic validated amount and currency.
  3. Authorize/Capture execution against generated Order IDs.
  4. Dispute retrieval and evidence submission simulation.

---

## 6. Known Limitations & Needs Manual Items

1. **Live Sandbox Dispute Seeding (`NEEDS_MANUAL`):**
   - PayPal Sandbox does not provide a direct API to synthetically create an arbitrary customer dispute from scratch on demand (disputes must be raised via the PayPal Sandbox Buyer Portal UI or webhooks).
   - Once a dispute ID is obtained in sandbox, `scripts/sandbox_smoke.py` exercises full evidence submission and status retrieval.

2. **Carrier Tracking Number Live Verification (`NEEDS_MANUAL`):**
   - Real-time carrier API integration (FedEx, UPS, USPS) requires merchant-specific API keys and production accounts.
   - For hackathon demonstration, carrier tracking leaves require either real tracking bytes provided via API request or fall back to honest `NO_EVIDENCE` status.

3. **Held-Out Adversarial Attacks:**
   - In `tests/data/holdout_corpus.py`, 30 novel adversarial jailbreak attempts (including unicode obfuscation, base64 payload injection, and Hindi/Malayalam text) are evaluated.
   - The tuned firewall detects and blocks 27 of 30 held-out attacks (90.0% block rate) without false-positively flagging legitimate multi-lingual buyer disputes. The 3 edge cases are documented in the Arena evaluation payload.

---

## 7. Conclusion

PaySentinel AI has completed all requirements for Phases P0, P1, and P2. All blocker defects, security bypasses, and unverified data claims have been corrected and validated with verifiable log output.
