# PaySentinel AI — Phase 0 Baseline Report
**Generated:** 2026-11-08  
**Branch:** `hardening/honest-loop`  
**Git Base Commit:** `f0f4172` (Merged main)  
**Role:** Principal Payments Architect & Senior Software Engineer  

---

## 1. Environment & Git Tracking Audit

- **Branch Created:** `hardening/honest-loop`
- **Secrets & Virtualenv Hygiene:**
  - `backend/.env` is **NOT tracked** in git (ignored via root `.gitignore`).
  - `backend/venv/` is **NOT tracked** in git (ignored via root `.gitignore`).
  - `frontend/node_modules/` and `frontend/.next/` are **NOT tracked**.
  - Only `backend/.env.example` is committed as a reference template.
- **Git Status:** Working directory clean before characterization tests.

---

## 2. Test Execution & Build Baseline

| Test Suite / Command | Result | Notes |
| :--- | :--- | :--- |
| `frontend` `npx tsc --noEmit` | **PASS (0 errors)** | All TypeScript definitions, components, and pages pass typechecking. |
| `frontend` `npm run lint` | **FAIL (28 errors, 66 warnings)** | 28 lint errors: primarily `@typescript-eslint/no-explicit-any` in API clients/tables, React 19 compiler `react-hooks/immutability` warnings in Three.js canvas components, and `prefer-const`. *(Per Rule 2: Reported here; untouched until designated cleanup phase).* |
| `frontend` `npm run build` | **PASS (0 errors)** | Next.js 16.4.3 Turbopack compiles all 12 static/prerendered routes successfully in 2.7s. |
| `backend` `test_agent_commerce.py` | **PASS (3/3 passed)** | Verifies baseline agent commerce flow (status retrieval, standard cycle, adversarial injection). |
| `backend` `test_control_tower.py` | **PASS (7/7 passed)** | Verifies baseline approval, edit, reject, and 409 idempotency logic. |
| `backend/tests/test_baseline.py` | **PASS (10/10 passed)** | **New Characterization Suite** locking in Merkle build/verify, Firewall inspection rules, Control Tower state transitions + 409 idempotency, and Arena fallback output shapes. |

---

## 3. Comprehensive Endpoint Reality Audit

Every endpoint registered in `backend/app/main.py` was forensically audited to determine whether it is:
- **REAL:** Executes an actual external network call (e.g., PayPal REST API v2, Gemini REST API) or reads persistent external state.
- **MOCK:** Returns static hardcoded fixture objects from `mock_data.py` without dynamic processing.
- **SCRIPTED:** Executes procedural in-memory state machines or regex rules without true external calls or persistence.

| Router | Method & Path | Reality Status | Mechanism & Reality Description |
| :--- | :--- | :--- | :--- |
| **Health** | `GET /health`, `GET /api/health` | **REAL** | Returns local server UTC timestamp, version, and environment. |
| **Root** | `GET /` | **REAL** | Returns static API index with doc links. |
| **Dashboard** | `GET /api/dashboard/stats` | **MOCK** | Computes statistics strictly over in-memory static arrays `TRANSACTIONS` and `DISPUTES` in `mock_data.py`. No database or real PayPal data. |
| **Transactions** | `GET /api/transactions` | **MOCK** | Returns 10 hardcoded mock transactions from `mock_data.py`. |
| **Transactions** | `GET /api/transactions/{id}` | **MOCK** | In-memory ID lookup in `TRANSACTIONS` list. |
| **Transactions** | `POST /api/transactions/nl-query` | **SCRIPTED** | Regex and keyword matching across `TRANSACTIONS` list. Falsely advertises "AI translated intent". |
| **Disputes** | `GET /api/disputes` | **MOCK** | Returns 4 hardcoded dispute fixtures from `mock_data.py`. |
| **Disputes** | `GET /api/disputes/{id}` | **MOCK** | In-memory lookup in `DISPUTES`. |
| **Disputes** | `POST /api/disputes/{id}/respond` | **SCRIPTED** | Appends in-memory timeline entry; does not send evidence or response to PayPal API. |
| **Disputes** | `POST /api/disputes/{id}/accept` | **SCRIPTED** | Sets `outcome = BUYER_WINS` in-memory only; no PayPal Sandbox dispute concession call. |
| **Proofs** | `GET /api/proofs` | **MOCK** | Returns precomputed static list `PROOF_STORE` (5 hardcoded items) from `proof_engine.py`. |
| **Proofs** | `GET /api/proofs/{id}/verify` | **SCRIPTED** | Recomputes SHA-256 hash of static hardcoded string; returns pre-baked verdict. |
| **Proofs** | `POST /api/proofs/generate` | **SCRIPTED** | Constructs an in-memory `MerkleTree` from synthetic hardcoded string fields. |
| **Cashflow** | `GET /api/cashflow/runway` | **SCRIPTED** | Computes burn rate and runway formulas over `mock_data.py` transactions. No real bank/merchant feeds. |
| **Webhooks** | `GET /api/webhooks/events` | **MOCK** | Returns static `WEBHOOK_EVENTS` list from `mock_data.py`. |
| **Webhooks** | `POST /api/webhooks/simulate` | **SCRIPTED** | Generates synthetic webhook JSON and appends to in-memory list without signature verification. |
| **PayPal** | `GET /api/paypal/status` | **REAL (Conditional)** | Attempts live OAuth2 token exchange with `https://api-m.sandbox.paypal.com/v1/oauth2/token` if credentials exist in `.env`; otherwise returns simulated status. |
| **PayPal** | `POST /api/paypal/sync` | **MOCK** | Returns `TRANSACTIONS` from `mock_data.py`. Does not actually sync from PayPal. |
| **PayPal** | `GET /api/paypal/orders/{order_id}` | **REAL (Conditional)** | Calls real PayPal Orders v2 API `GET /v2/checkout/orders/{id}` if bearer token is valid. |
| **Control Tower** | `GET /api/control-tower/pending` | **MOCK** | Returns 3 in-memory seeded cases (`CT-9021`, `CT-9022`, `CT-9023`). |
| **Control Tower** | `POST /api/control-tower/{id}/approve` | **SCRIPTED** | In-memory state transition. **Fabricates** audit log entry: `PAYPAL_SANDBOX_200_OK [Trace: PP-DSP-...]` without calling PayPal API. |
| **Control Tower** | `POST /api/control-tower/{id}/edit` | **SCRIPTED** | In-memory state transition. **Fabricates** audit log entry: `PAYPAL_SANDBOX_200_OK`. |
| **Control Tower** | `POST /api/control-tower/{id}/reject` | **SCRIPTED** | In-memory state transition. **Fabricates** audit log entry: `200_CONCEDED (Fee waived by PayPal Dispute Automation rule)`. |
| **Control Tower** | `POST /api/control-tower/reset` | **SCRIPTED** | Resets in-memory list to the initial 3 cases. |
| **Agent Commerce**| `GET /api/agent-commerce/status` | **MOCK** | Returns static 6-step pre-generated session. |
| **Agent Commerce**| `GET /api/agent-commerce/sessions` | **MOCK** | Alias of `/status`. |
| **Agent Commerce**| `POST /api/agent-commerce/run` | **SCRIPTED** | Constructs procedural steps. Synthesizes fake Order ID (`ORD-XXXX`), fake Capture ID (`CAPT-XXXX`), claims "escrow held", and hardcodes "99.2% GPS confidence" without calling PayPal. |
| **Arena** | `GET /api/arena/simulations` | **MOCK** | Returns static `ARENA_SIMULATIONS` list from `mock_data.py`. |
| **Arena** | `POST /api/arena/run` | **SCRIPTED / REAL (LLM only)** | If `GEMINI_API_KEY` is present, calls Google Gemini REST API to generate conversational moves; otherwise falls back to a deterministic script. Does not interact with PayPal. |
| **Arena** | `POST /api/arena/evaluate-attack` | **SCRIPTED** | Runs regex rules from `firewall.py` and returns a hardcoded scripted template response with fake rule citations. |

---

## 4. Key Fabrications & Discrepancies Identified

1. **Fabricated HTTP Statuses:**
   - [control_tower_service.py](file:///c:/paypal/paypal-AI/backend/app/services/control_tower_service.py#L336): `PAYPAL_SANDBOX_200_OK [Trace: {trace_id}]` and `200_CONCEDED (Fee waived by PayPal Dispute Automation rule)`. No external HTTP call was ever made.
2. **Fabricated Commerce Evidence:**
   - [agent_commerce_service.py](file:///c:/paypal/paypal-AI/backend/app/services/agent_commerce_service.py#L120): Fabricates capture IDs, claims "escrow held by PayPal", hardcodes "99.2% GPS confidence", and claims "SHA-256 Merkle root anchored" without hashing real evidence.
3. **Invented Citations & Legal Framing:**
   - Several responses cite `"Visa Compelling Evidence 3.0 § 4.2 (Cryptographic Geofence Proof)"`, `"PayPal Seller Protection Policy § 11.2"`, and `"Untrusted Input Firewall Rule #SEC-0451"`.
   - **PayPal/Visa Fact Discrepancy:** Visa Compelling Evidence 3.0 (CE 3.0) is strictly a dispute defense rule for **Condition 10.4 (Fraud / Unauthorized Transactions)** requiring evidence of previous undisputed transactions from the same cardholder. It is NOT applicable to Item Not Received (INR) disputes.
4. **Unsupported Marketing Terminology:**
   - Code and comments refer to "Zero-Knowledge Predicates", "AST Isolation", "Authentic", and "Irrefutable" when the actual implementations are simple SHA-256 strings and regex pattern matching.
5. **Hardcoded Frontend Marketing Metrics:**
   - [frontend/src/app/page.tsx](file:///c:/paypal/paypal-AI/frontend/src/app/page.tsx): Displays hardcoded metrics: `"60+ Mobile Screen"`, `"100+ Components"`, `"42sec CE 3.0 Rebuttal"`, `"$0 Dispute Loss"`. None are computed from live telemetry.

---

## 5. Next Steps for Phase 1 (Honesty Fixes)

Pending user approval to proceed:
1. Add `data_source: "LIVE" | "SIMULATED"` to all API models and responses.
2. Replace fabricated `PAYPAL_SANDBOX_200_OK` / `200_CONCEDED` with `"SIMULATED_NOT_SENT"` until Phase 2 wires real sandbox endpoints.
3. Remove fabricated escrow, capture ID, and GPS claims from `agent_commerce_service.py`.
4. Replace silent fallback in `frontend/src/lib/api.ts` with explicit UI error states and display LIVE / SIMULATED badges.
5. Strip invented legal citations and correct Visa CE 3.0 framing.
6. Remove unbacked stats on landing page and add the Truthful Status Table to `README.md`.
7. Update and expand characterization tests with mock transports.
