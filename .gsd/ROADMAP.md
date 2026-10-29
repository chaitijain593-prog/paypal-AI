# Roadmap: PaySentinel AI

## Milestone 1: Production Hackathon Elevation

### Phase 1: API Pipeline & Client-Server Connectivity
- Connect Next.js frontend pages to FastAPI backend endpoints.
- Establish clean CORS and health checks between `:3000` and `:8000`.

### Phase 2: Live AI Red-Team Arena
- Replace procedural string arrays with live Gemini 2.5 Flash agent reasoning.
- Implement Untrusted Input Firewall that programmatically flags and sanitizes prompt injections.

### Phase 3: PayPal Sandbox Integration
- Connect `backend/app/services/paypal_client.py` using `httpx`.
- Implement OAuth2 token exchange with PayPal Sandbox.
- Pull real sandbox orders/disputes.

### Phase 4: AG Grid Financial Ledger
- Integrate AG Grid React component with custom theme matching the dark-cyan fintech UI.
- Implement master-detail drill-down to qualify for $5,000 AG Grid Sponsor Prize.

### Phase 5: Cryptographic Merkle Proof Engine
- Implement binary Merkle tree calculating real SHA-256 hashes and proof trees.
- Display verified cryptographic proof chains in the Proof Vault.
