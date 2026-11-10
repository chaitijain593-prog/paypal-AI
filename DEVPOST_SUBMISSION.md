# 🏆 PayPal AI Hackathon 2026 — Devpost Submission Package

## 📌 Project Overview
- **Project Title**: **PaySentinel AI**
- **Tagline**: Cryptographic Dispute Firewall & Verifiable Autonomous Commerce for PayPal Merchants
- **Primary Category**: Best Overall / Financial AI Agent / Risk Infrastructure
- **License**: MIT License (included in repository root)
- **Code Repository**: Public GitHub repository with complete source code, tests, and instructions.

---

## 💡 Inspiration & The Problem

PayPal moves billions of dollars daily for millions of merchants. However, two existential challenges plague the merchant payments ecosystem:

1. **The Chargeback & Dispute Tax**:
   Merchants lose billions annually to "Friendly Fraud" (Item Not Received claims where the customer actually received the goods) and administrative dispute fees ($15–$20 per case). Compounding this, dispute evidence is routinely submitted as unstructured text or easily modified PDFs that lack cryptographic non-repudiation.
2. **The New Frontier of "AI Agent Commerce" Fraud**:
   As autonomous AI buyer agents negotiate purchases on behalf of consumers, they introduce an entirely new threat surface: **Prompt Injection Attacks**. Malicious buyers craft text designed to trick merchant billing models into granting unauthorized discounts, skipping physical signature requirements, or waiving return policies.

**PaySentinel AI** answers the hackathon's core question: *"What happens when you put AI behind the wheel of PayPal's platform?"*
Our answer: **Give merchants an intelligent, cryptographic copilot that safeguards cash flow, proves delivery authenticity with mathematical certainty, prevents prompt injection, and automates dispute defense.**

---

## 🚀 What It Does

PaySentinel AI is a production-grade, 4-tier risk firewall and autonomous commerce platform:

### 1. 🛡️ Autonomous Agent Commerce & PayPal Checkout
- **Autonomous Negotiation**: Simulates and executes buyer-agent vs. merchant-agent purchase negotiation with strict spending caps and policy adherence.
- **PayPal Orders v2 Integration**: Dynamically creates and captures PayPal Sandbox orders (`POST /v2/checkout/orders` and `POST /v2/checkout/orders/{id}/capture`).
- **Zero-Friction Fallback**: Operates in live PayPal Sandbox mode when credentials are provided, or realistic simulated mode so hackathon judges can test without API keys.

### 2. 🌲 Cryptographic Evidence Vault (RFC 6962 Merkle Trees + Ed25519)
- **Immutable Byte-Level Evidence**: Takes carrier tracking proofs, adult GPS delivery signatures, buyer IP logs, and order snapshots, binding them into an **RFC 6962 binary SHA-256 Merkle tree**.
- **Ed25519 Merchant Root Signatures**: Signs the Merkle root with persistent asymmetric merchant keys, guaranteeing non-repudiation.
- **Dynamic Tamper Detection**: If any third party or attacker flips even a single byte in an evidence artifact, PaySentinel detects the discrepancy mathematically and flags `status: TAMPERED`.

### 3. 🧠 AI Dispute Defense Drafter & "Know When to Fold" Intelligence
- **Evidence-Citing Rebuttals**: Utilizes **Google Gemini 2.0 Flash** / **OpenAI** with structured JSON outputs to generate airtight, legally sound defense letters that cite verified Merkle leaves and carrier proofs.
- **Fee-Saving Concession Advice**: Analyzes tracking history (e.g. package stalled > 10 days in transit). When fighting a dispute is statistically unviable, PaySentinel recommends conceding early, saving the merchant PayPal's $15.00 dispute fee and triggering carrier insurance recovery.

### 4. 🥊 Untrusted Input Security Firewall (Arena)
- **Multi-Stage Security Pipeline**: Strips zero-width unicode obfuscations, folds homoglyphs (Cyrillic/Greek mimicking Latin), and quarantines delimiter escapes before untrusted buyer messages reach LLMs.
- **Empirical Dual-Corpus Benchmark**: Evaluates model performance across both a tuned evaluation set and an independent held-out red-team corpus (30 attacks + 45 benign) with measured block rate and 0% false positives on genuine international customers.

### 5. 🗼 Human Control Tower & Maker-Checker State Machine
- **Atomic Compare-and-Set (CAS)**: Powered by persistent SQLite with optimistic locking to prevent double submissions or race conditions.
- **Maker-Checker Governance**: High-value transactions (>$500.00) pause automatically for human approval. The reviewer's identity is strictly authenticated via cryptographic tokens; the creator cannot approve their own items.
- **Append-Only Audit Log**: Every state transition is cryptographically chained (`prev_hash` to `entry_hash`) with head verification.

---

## 🛠️ How We Built It

- **PayPal Developer Platform**:
  - Live OAuth2 Client Credentials token exchange with exponential backoff & stampede prevention.
  - PayPal Orders v2 (`/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`).
  - PayPal Disputes API (`/v1/customer/disputes/{id}/provide-evidence`, `/accept-claim`).
  - PayPal Webhooks v1 with 5-header cryptographic signature verification and idempotent deduplication.
- **AI Core**:
  - Google Gemini 2.0 Flash (`google-genai` / REST) and OpenAI GPT-4o-mini structured outputs.
  - Multi-tier pre-LLM deterministic security firewall for prompt injection defense.
- **Backend**:
  - Python 3.14 / FastAPI 0.115 with Pydantic v2 schemas.
  - SQLite with atomic CAS transactions and cryptographic audit log hash chaining.
  - `cryptography` library for RFC 6962 domain separation and Ed25519 digital signatures.
  - 107 passing automated pytest tests.
- **Frontend**:
  - Next.js 16.4.3 (App Router) + React 19 + TypeScript.
  - Tailwind CSS v4 + Framer Motion animations.
  - Interactive WebGL/Three.js responsive silk mesh canvas.
  - Server-side authenticated token proxy (`/api/proxy/[...path]`).

---

## 🏆 Hackathon Sponsor Integrations

PaySentinel incorporates 6 official hackathon sponsor tools:

1. **AG Grid** ([ag-grid.com](https://www.ag-grid.com)):
   - Serves as our primary enterprise financial data ledger in [`TransactionTable.tsx`](frontend/src/components/TransactionTable.tsx).
   - Uses **AG Grid v36** with a custom dark fintech theme (`themeQuartz`), custom status renderers, confidence bars, and client-side filtering.
2. **Postman** ([postman.com](https://www.postman.com)):
   - Complete, turn-key Postman workspace located at [`postman/PaySentinel_PayPal_AI.postman_collection.json`](postman/PaySentinel_PayPal_AI.postman_collection.json) and local environment [`postman/PaySentinel_Environment.postman_environment.json`](postman/PaySentinel_Environment.postman_environment.json).
3. **Render** ([render.com](https://render.com)):
   - Production Blueprint Specification at [`render.yaml`](render.yaml) for 1-click cloud deployment of both FastAPI and Next.js services with automated health checks.
4. **APIMatic** ([apimatic.io](https://www.apimatic.io)):
   - Exported OpenAPI 3.1 schema at [`apimatic/openapi.json`](apimatic/openapi.json) and APIMatic metadata at [`apimatic/apimatic.json`](apimatic/apimatic.json) for multi-language SDK generation (TypeScript, Python, C#, Go, Java).
5. **Zapier** ([zapier.com](https://zapier.com)):
   - Webhook trigger endpoints (`/api/webhooks/zapier/dispatch`, `/sample-payloads`) and guide at [`zapier/README.md`](zapier/README.md) enabling automated Slack, Jira, and email workflows.
6. **Elastic** ([elastic.co](https://www.elastic.co)):
   - Elasticsearch DSL endpoint at [`/api/control-tower/audit/elastic-search`](backend/app/routers/control_tower.py) allowing SOC teams to query dispute audit logs using standard Elastic queries and Kibana dashboards.

---

## 🎬 3-Minute Video Pitch & Demo Script

*(Designed specifically for YouTube submission under 3 minutes)*

### [0:00 - 0:30] The Hook & Problem
> *"PayPal moves money for millions of businesses worldwide. But as e-commerce accelerates into the era of autonomous AI agents, merchants face two massive problems: Friendly Fraud chargebacks costing billions in dispute fees, and malicious prompt injections targeting AI commerce agents. Meet **PaySentinel AI** — the world's first Cryptographic Dispute Firewall and Verifiable Commerce platform for PayPal."*

### [0:30 - 1:15] Architecture & AG Grid Ledger
> *(Screen shows Next.js dashboard with interactive WebGL background and AG Grid transaction ledger)*
> *"PaySentinel operates as a continuous risk copilot. Here on our main dashboard, transactions flow directly from the PayPal Orders v2 Sandbox. Powered by **AG Grid**, risk officers can filter transactions, inspect dispute probabilities, and review real-time cash flow runway impact."*

### [1:15 - 1:55] Merkle Proof Vault & AI Defense Drafter
> *(Screen switches to `/proofs` and clicks 'Verify Proof')*
> *"When a dispute arises, PaySentinel doesn't just guess. It compiles raw courier tracking bytes, GPS coordinates, and recipient signatures into an RFC 6962 SHA-256 Merkle tree signed with the merchant's Ed25519 digital key. Watch what happens if an attacker tampers with a single byte: the engine instantly flags it. Our Gemini AI engine then drafts an airtight, evidence-backed rebuttal citing the exact Merkle leaves."*

### [1:55 - 2:30] Human Control Tower & Security Arena
> *(Screen switches to `/approval-queue` and `/arena`)*
> *"For high-value items over $500, our Human Control Tower pauses automated submissions under strict Maker-Checker governance. Every action is recorded in an append-only, hash-chained audit log. And in our Security Arena, incoming customer messages pass through our deterministic firewall — neutralizing prompt injections, homoglyphs, and delimiter escapes before they ever reach an LLM."*

### [2:30 - 3:00] Sponsor Tooling & Conclusion
> *(Screen shows Postman collection, Render deploy, and mobile-responsive UI)*
> *"Built with PayPal Orders & Disputes APIs, AG Grid, Postman, Render, APIMatic, Zapier, and Elastic — PaySentinel AI gives merchants the trust, security, and proof they need to thrive in the future of autonomous commerce. Thank you."*

---

## 🏃 Local Setup Instructions for Judges

### 1. Start Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate | On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

### 2. Start Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
- UI: `http://localhost:3000`

### 3. Run Automated Tests
```bash
# Backend pytest suite (107/107 passing):
python -m pytest backend

# Verify frontend production build:
cd frontend && npm run build
```

