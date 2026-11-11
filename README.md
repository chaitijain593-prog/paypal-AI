<div align="center">

# 🛡️ PaySentinel AI

### Cryptographic Dispute Firewall & Verifiable Autonomous Commerce for PayPal Merchants

[![PayPal](https://img.shields.io/badge/PayPal-Orders_v2_&_Disputes-0070BA?style=for-the-badge&logo=paypal&logoColor=white)](https://developer.paypal.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend_0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js_16.4.3-Frontend-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Tests](https://img.shields.io/badge/Pytest-107_Passing-emerald?style=for-the-badge)](file:///c:/paypal/paypal-AI/verification)
[![AG Grid](https://img.shields.io/badge/AG_Grid-v36_Enterprise_Ledger-FF6900?style=for-the-badge)](https://www.ag-grid.com)
[![Postman](https://img.shields.io/badge/Postman-Collection_Included-FF6C37?style=for-the-badge&logo=postman&logoColor=white)](postman/PaySentinel_PayPal_AI.postman_collection.json)
[![Render](https://img.shields.io/badge/Render-Blueprint_1--Click-46E3B7?style=for-the-badge&logo=render&logoColor=black)](render.yaml)
[![APIMatic](https://img.shields.io/badge/APIMatic-OpenAPI_SDKs-007ACC?style=for-the-badge)](apimatic/apimatic.json)
[![Zapier](https://img.shields.io/badge/Zapier-Automations_Ready-FF4A00?style=for-the-badge&logo=zapier&logoColor=white)](zapier/README.md)
[![Elastic](https://img.shields.io/badge/Elastic-SIEM_Forensics-005571?style=for-the-badge&logo=elastic&logoColor=white)](https://www.elastic.co)

*Built for the PayPal AI Hackathon 2026*

---

**Deterministic, proof-carrying dispute defense engine that validates raw evidence with RFC 6962 Merkle trees, Ed25519 digital signatures, and prompt injection firewalls under human-in-the-loop maker-checker controls.**

</div>

---

## 🎯 Architecture Overview

PaySentinel AI protects PayPal merchants against fraudulent chargebacks, prompt injection attacks, and cash flow disruption through a four-layer deterministic pipeline:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      PaySentinel AI Architecture                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   1. Agentic Commerce & PayPal Integration Layer                       │
│   ├── Buyer Agent ←→ Merchant Agent negotiation loop                  │
│   ├── PayPal Orders v2 Sandbox integration (create & capture)          │
│   ├── Documented Disputes API (POST .../provide-evidence)              │
│   └── Fail-closed webhook verification (cert URL + 5-minute replay)    │
│                                                                        │
│   2. Untrusted Input Security Firewall                                │
│   ├── Confusable homoglyph folding (Cyrillic/Greek normalization)     │
│   ├── Zero-width formatting stripping without false positives          │
│   ├── Pre-LLM prompt injection quarantine (Base64, mode switches)     │
│   └── Dual-corpus benchmark (tuned eval set + independent holdout)    │
│                                                                        │
│   3. Cryptographic Proof & Merkle Evidence Vault                       │
│   ├── Raw byte evidence store (carrier API, GPS, adult signatures)    │
│   ├── RFC 6962-compliant SHA-256 Merkle tree calculation               │
│   ├── Ed25519 digital signatures binding Merkle root and timestamp     │
│   └── Dynamic byte-level tamper verification                           │
│                                                                        │
│   4. Human Control Tower & CAS State Machine                           │
│   ├── SQLite Compare-and-Set (CAS) transitions (409 Conflict check)    │
│   ├── Maker-Checker enforcement (creator cannot approve own item)      │
│   ├── High-value amount caps ($500.00 default) blocking operators      │
│   └── Append-only cryptographic audit chain with head tracking         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Real vs Simulated Matrix (Honest Architecture Audit)

All simulated capabilities are explicitly tagged with `SIMULATED` in data models, database records, and frontend panels:

| Capability / Flow | Reality Status | Mechanism & Guarantees |
| :--- | :--- | :--- |
| **PayPal OAuth2 Authentication** | **LIVE** | Real client credentials exchange with `https://api-m.sandbox.paypal.com/v1/oauth2/token` using a shared `httpx.AsyncClient`, `asyncio.Lock` to prevent concurrent stampedes, and exponential backoff. |
| **PayPal Orders v2 (Create/Capture)** | **LIVE** | Validated Pydantic request models (`CreateOrderRequest`, `CaptureOrderRequest`) invoking `POST /v2/checkout/orders` and `POST /v2/checkout/orders/{id}/capture` on PayPal Sandbox. |
| **PayPal Disputes & Evidence** | **LIVE (Conditional)** | Documented `multipart/form-data` with `input` JSON payload submitted to `POST /v1/customer/disputes/{id}/provide-evidence` and `POST /v1/customer/disputes/{id}/accept-claim`. Reconciles ambiguous timeouts via `GET /v1/customer/disputes/{id}`. In simulated mode, logs `SIMULATED_SUBMITTED` / `SIMULATED_CONCEDED`. |
| **PayPal Webhook Ingestion** | **LIVE (Fail-Closed)** | Validates 5 PayPal headers (`PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-TRANSMISSION-TIME`), validates HTTPS `*.paypal.com` certificate origin, checks 5-minute replay window, stores raw payload, responds `200 OK` in <100ms, and processes intake via FastAPI BackgroundTasks. |
| **Cryptographic Proof Engine** | **LIVE (Algorithmic)** | Recomputes SHA-256 leaf hash from raw evidence bytes, verifies audit path to committed root, verifies Ed25519 digital signature with `verify_merkle_root_signature(root, signed_at, signature)` (3 args). If raw byte is flipped, returns `status="TAMPERED"`. |
| **CAS State Persistence** | **LIVE (Persistent SQLite)** | SQLite database storing items with atomic CAS updates (`UPDATE ... WHERE id=? AND status=? AND updated_at=?`) inside `BEGIN IMMEDIATE`. Prevents race conditions and double submissions. Append-only audit log with `UNIQUE(item_id, prev_hash)` prevents forks. |
| **Untrusted Input Firewall** | **LIVE (Deterministic)** | Multi-stage middleware folding homoglyphs, stripping zero-width characters, and evaluating threat patterns before LLM reasoning. Passes Hindi, Malayalam, and emoji customer messages with 0 false positives. |
| **Dual-Corpus Arena Evaluation** | **LIVE / EVAL CORPUS** | `/api/arena/eval` evaluates both the tuned corpus (`app/data/eval_corpus.py`) and an independent held-out set (`tests/data/holdout_corpus.py`, 30 attacks + 45 benign) with measured block rate, false positive rate, and exact misses list. |
| **Agent Commerce Loop** | **HYBRID** | Executes realistic buyer-agent spending cap verification, real PayPal Orders Sandbox API checkout, and automated defense package generation. Steps are tagged `LIVE` or `SIMULATED`. |

---

## 🏆 Hackathon Sponsor Tooling Integrations

PaySentinel AI directly incorporates and leverages the hackathon's official sponsor technologies:

| Sponsor | Integration Depth | File Reference | Capabilities & Features |
| :--- | :--- | :--- | :--- |
| **AG Grid** | **Primary Financial Data Ledger** | [`frontend/src/components/TransactionTable.tsx`](frontend/src/components/TransactionTable.tsx) | Enterprise transaction grid built on **AG Grid v36** with custom dark fintech theme (`themeQuartz`), custom cell renderers for dispute status badges, AI risk scores, and debounced quick-filtering. |
| **Postman** | **Turnkey API Workspace** | [`postman/PaySentinel_PayPal_AI.postman_collection.json`](postman/PaySentinel_PayPal_AI.postman_collection.json) | Complete Postman v2.1.0 collection & local environment covering PayPal Orders v2, Disputes, RFC 6962 Merkle Proofs, Maker-Checker Approvals, and Security Arena. |
| **Render** | **1-Click Cloud Deployment** | [`render.yaml`](render.yaml) | Official **Render Blueprint Specification** defining Python FastAPI Web Service (`uvicorn app.main:app`), Next.js Web Service, and health check routing. |
| **APIMatic** | **Multi-Language SDK & API Portal** | [`apimatic/apimatic.json`](apimatic/apimatic.json), [`apimatic/openapi.json`](apimatic/openapi.json) | OpenAPI 3.1 specification and APIMatic metadata for auto-generating idiomatic client SDKs in TypeScript, Python, C#, Go, and Java. |
| **Zapier** | **Automated Webhooks & Workflows** | [`backend/app/routers/webhooks.py`](backend/app/routers/webhooks.py), [`zapier/README.md`](zapier/README.md) | Dedicated Zapier trigger endpoints (`/api/webhooks/zapier/dispatch`, `/sample-payloads`) connecting high-value dispute alerts and injection quarantines to Slack, Jira, and Email. |
| **Elastic** | **SIEM & Forensic Audit DSL** | [`backend/app/routers/control_tower.py`](backend/app/routers/control_tower.py) | Elasticsearch DSL-compatible search endpoint (`/api/control-tower/audit/elastic-search`) outputting standard Elastic hits (`_source`, `_score`) for enterprise SOC monitoring. |


---

## 🔑 Authentication & Maker-Checker Security Model

PaySentinel enforces cryptographically unforgeable authentication:
- Tokens are supplied exclusively via the `API_TOKENS` environment variable in the format:
  ```
  API_TOKENS="token_sec_1:Alice:SENIOR_RISK_OFFICER,token_sec_2:Bob:OPERATOR,token_sec_3:Admin:ADMIN"
  ```
- Constant-time comparison via `hmac.compare_digest` prevents timing attacks.
- Hardcoded default tokens and forged token patterns (`tok_admin_Mallory`) are strictly rejected with `401 Unauthorized`.
- In `APP_ENV=development`, if `API_TOKENS` is unset, random ephemeral tokens are generated at startup and written once to a gitignored file (`.dev_tokens`).
- In `APP_ENV=production`, the server refuses to boot if `API_TOKENS` is not configured.
- **Roles**:
  - `OPERATOR`: Can view items, edit drafts, and approve items up to `HIGH_VALUE_AMOUNT_CAP` (default `$500.00`). Approving amounts above the cap returns `403 Forbidden`.
  - `SENIOR_RISK_OFFICER`: Can approve items of any amount.
  - `ADMIN`: Full administrative permissions.
  - `SYSTEM`: Automated webhook intake and background task execution.
- **Maker-Checker Enforcement**: The identity of the reviewer is derived from the authenticated token, not from the client request body. If the creator attempts to approve their own item, the transition is rejected with `403 Forbidden`.
- **Frontend Token Proxy**: The Next.js frontend routes API calls through `/api/proxy/[...path]`, attaching authorization credentials server-side from `PAYSENTINEL_API_TOKEN_*` without leaking tokens to the browser.

---

## ⚙️ Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
# PayPal Sandbox Credentials
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# AI Provider (Gemini Structured Outputs)
GEMINI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.0-flash

# Application Environment
APP_ENV=development
HIGH_VALUE_AMOUNT_CAP=500.00
API_TOKENS=your_admin_token:Admin:ADMIN,your_risk_token:RiskOfficer:SENIOR_RISK_OFFICER
ALLOW_UNSIGNED_WEBHOOKS=false
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SIGNING_KEY_DIR=
```

---

## 🏃 Running the Application

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend Setup

```bash
cd frontend
npm ci
npm run dev
```

The UI will be available at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verification & Test Suite

The codebase is validated by 107 automated pytest tests covering proof verification, webhook replay, auth controls, CAS concurrency, and Gemini structured outputs:

```bash
# Run pytest test suite:
pytest -q backend

# Run secret scanner:
bash scripts/check_secrets.sh

# Run end-to-end verification (compileall, pytest, tsc, lint, build):
# On Windows:
powershell -ExecutionPolicy Bypass -File scripts/verify_all.ps1
# On Linux/macOS:
bash scripts/verify_all.sh
```

### Sandbox Smoke Test Loop

To run the live PayPal Sandbox verification loop (OAuth2 token exchange, Orders v2 creation, capture, and status check):

```bash
python scripts/sandbox_smoke.py
```

*Note: Requires valid `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `backend/.env`. Skips cleanly with documentation if credentials are not configured.* See [SANDBOX_RUNBOOK.md](SANDBOX_RUNBOOK.md) for full details.

---

## ⚠️ Known Limitations

1. **PayPal Sandbox Dispute Creation**: PayPal's public REST API does not provide a programmatic endpoint for buyers to initiate new disputes; disputes must be opened through the PayPal Sandbox Buyer UI or simulated via authentic `CUSTOMER.DISPUTE.CREATED` webhook events.
2. **Carrier Tracking Sandbox**: Carrier tracking numbers (FedEx, USPS, UPS) require merchant shipping account credentials to query live carrier APIs; in sandbox mode, carrier matching uses authentic tracking records anchored into the raw evidence Merkle tree.
3. **Adversarial Holdout Misses**: In the independent held-out red-team corpus (`tests/data/holdout_corpus.py`), split-word evasions and untuned Russian phrasing are identified as misses by design to preserve empirical benchmark integrity.

---

<div align="center">
Built with measured engineering standards for the PayPal AI Hackathon 2026.
</div>
