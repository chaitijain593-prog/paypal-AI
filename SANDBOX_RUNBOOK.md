# PaySentinel AI — PayPal Sandbox 5-Minute Evaluation Runbook

> [!NOTE]
> **Zero-Config Simulated Evaluation Mode**: If you are a hackathon judge or evaluator and want to explore the entire application immediately without creating PayPal Developer sandbox accounts, simply keep `PAYPAL_MODE=simulated` (the default). The application will simulate authentic PayPal Orders v2, dispute webhooks, and carrier tracking while executing real cryptographic Merkle proof calculations and real AI defense drafting.

**Goal:** Step-by-step verification of real PayPal Sandbox Dispute Ingestion, Merkle Tree Proof verification, AI Firewall inspection, Maker-Checker Review, and Evidence Submission to PayPal.

---

## 1. Prerequisites (2 Minutes)

1. **PayPal Developer Sandbox Accounts:**
   - Log into [developer.paypal.com](https://developer.paypal.com)
   - Go to **Testing Tools** > **Sandbox Accounts**
   - You need:
     - 1 **Business (Merchant) Account**
     - 1 **Personal (Buyer) Account**
2. **Configure Backend Environment:**
   Ensure `backend/.env` contains your merchant credentials:
   ```env
   PAYPAL_MODE=sandbox
   PAYPAL_CLIENT_ID=<Your_Sandbox_Client_ID>
   PAYPAL_CLIENT_SECRET=<Your_Sandbox_Client_Secret>
   PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
   PAYPAL_WEBHOOK_ID=<Your_Sandbox_Webhook_ID>
   APP_ENV=development
   ```

---

## 2. Start Services & Webhook Tunnel (1 Minute)

1. **Start Backend (FastAPI):**
   ```bash
   cd backend
   python -m uvicorn app.main:app --port 8000
   ```
2. **Start Frontend (Next.js):**
   ```bash
   cd frontend
   npm run dev
   ```
3. **Expose Localhost Webhook Endpoint via ngrok (or Cloudflare Tunnel):**
   ```bash
   ngrok http 8000
   ```
   *Copy your forwarding HTTPS URL, e.g., `https://abcdef123.ngrok-free.app`.*
4. **Register Webhook in PayPal Developer Dashboard:**
   - Navigate to your Sandbox App in Developer Dashboard.
   - Click **Add Webhook**.
   - URL: `https://abcdef123.ngrok-free.app/api/webhooks/paypal`
   - Select Event: **Customer dispute created** (`CUSTOMER.DISPUTE.CREATED`).
   - Copy the generated Webhook ID into `backend/.env` as `PAYPAL_WEBHOOK_ID`.

---

## 3. Trigger Live Dispute in Sandbox Resolution Center (1 Minute)

1. Open [sandbox.paypal.com](https://sandbox.paypal.com) and log in with your **Personal (Buyer)** Sandbox credentials.
2. If you already have a completed purchase, go to **Activity**, select the transaction, and click **Report a problem**.
   *(Alternatively, create a purchase by approving an order created via `python scripts/sandbox_smoke.py`).*
3. In the Resolution Center:
   - Select reason: **I didn't receive an item I purchased** (`MERCHANDISE_OR_SERVICE_NOT_RECEIVED`).
   - Message: `"The package has not arrived after two weeks. Please refund."`
   - Submit Dispute.

---

## 4. Verify Live Ingestion & Merkle Proof in PaySentinel (1 Minute)

1. **Observe Webhook Intake:**
   - Check backend logs:
     ```text
     INFO: Received PayPal webhook event WH-... (CUSTOMER.DISPUTE.CREATED)
     INFO: Signature verified authentic via PayPal Sandbox API.
     INFO: Stored raw dispute payload in RAW_EVIDENCE_STORE.
     INFO: Ingested into Control Tower queue item CT-...
     ```
2. **Open PaySentinel Control Tower:**
   - Navigate to `http://localhost:3000/approval-queue` in your browser.
   - Observe the newly ingested dispute at the top of the queue.
   - Inspect:
     - **Draft Status:** Displays `NO_EVIDENCE` (if carrier tracking was absent) or `DRAFT_VALID` (if tracking scan was attached).
     - **Audit Trail:** Shows initial entry with `prev_hash="GENESIS"` and valid SHA-256 state chain.
3. **Exercise Maker-Checker Review:**
   - Select role **Operator** in Top Navigation.
   - Click **Edit Defense**, enter authentic shipment tracking:
     `"Carrier UPS tracking 1Z9999999999999999 confirms delivery to buyer front porch on 2026-11-04."`
   - Click **Save Edits** -> Draft status transitions to `HUMAN_AUTHORED`.
   - Switch role to **Senior Risk Officer** in Top Navigation.
   - Click **Approve & Push to PayPal API**.
4. **Inspect Sandbox Dispute Resolution:**
   - Return to [sandbox.paypal.com](https://sandbox.paypal.com) logged into the **Business (Merchant)** account.
   - Open **Resolution Center** > View Dispute History.
   - Confirm your defense letter and evidence submission appear in the official PayPal Sandbox dispute timeline!

---

## 5. Automated Headless Verification

You can verify PayPal Sandbox connectivity at any time using:
```bash
python scripts/sandbox_smoke.py
```
This script validates OAuth2 token generation, creates a real sandbox order, checks capture behavior, and validates the dispute schema.
