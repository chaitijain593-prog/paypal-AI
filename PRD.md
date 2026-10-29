# PRD: PaySentinel AI — Production Hackathon Elevation

## Overview
PaySentinel AI is an autonomous fintech firewall and verifiable dispute defense platform for PayPal merchants. This PRD details the discrete tasks required to transition the project from a mock prototype into a fully integrated, live full-stack system ready for hackathon judging.

---

## Task 1: Wire Frontend Next.js to FastAPI Backend
Connect all frontend views to the FastAPI backend API instead of using static in-memory React state.
- Create `frontend/src/lib/api.ts` with typed fetch wrappers pointing to `http://localhost:8000`.
- Update `DisputeArena.tsx` to call `POST /api/arena/run` and `GET /api/arena/simulations` dynamically on "Run New Simulation".
- Update `TransactionTable.tsx` to fetch transactions from `GET /api/transactions`.
- Update `frontend/src/app/cashflow/page.tsx` to fetch live metrics from `GET /api/cashflow/runway`.
- Update `ProofCard.tsx` to fetch proofs from `GET /api/proofs` and trigger live verification via `GET /api/proofs/{id}/verify`.

## Task 2: AI-Powered Red-Team Simulation Engine
Replace random uniform number generators and static strings in the Dispute Arena with live LLM calls.
- Create `backend/app/services/arena_engine.py` supporting Gemini / OpenAI APIs.
- Implement Attacker AI prompt generating adversarial claims (Item Not Received, prompt injection, supervisor spoofing).
- Implement Defender AI prompt analyzing evidence records and enforcing the Untrusted Message Firewall.
- Return real-time round-by-round reasoning, threat detection tags, and confidence scores.

## Task 3: Real PayPal Sandbox API Integration
Implement genuine PayPal Sandbox connectivity using `httpx`.
- Create `backend/app/services/paypal_client.py`.
- Implement OAuth2 token exchange with `https://api-m.sandbox.paypal.com/v1/oauth2/token` using `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
- Fetch real sandbox transactions (`/v2/checkout/orders`) and mock/dispute data synchronization.
- Fallback gracefully to demo transactions if credentials are not provided or invalid.

## Task 4: AG Grid Interactive Dispute Ledger
Replace standard HTML `<table>` in `TransactionTable.tsx` with AG Grid to qualify for the $5,000 AG Grid Sponsor Prize.
- Install `ag-grid-react` and `ag-grid-community` in `frontend/package.json`.
- Implement dark-theme AG Grid with column pinning, sorting, search filter, and custom status cell renderers.
- Add quick proof drill-down detail expansion per transaction row.

## Task 5: Cryptographic SHA-256 Merkle Proof Tree Engine
Implement real Merkle tree hashing and verification in the backend.
- Create `backend/app/services/proof_engine.py` with binary Merkle Tree calculation.
- Generate real leaf hashes from evidence items (tracking number, GPS coords, signature, photo hashes).
- Compute authentic Merkle root and audit proof paths (`sibling_hash`, `parent_hash`).
- Expose verification endpoint `POST /api/proofs/verify` that mathematically re-computes hashes against the Merkle root.
