# 📘 PayPal Sandbox End-to-End Runbook

This runbook guides you through running the **complete end-to-end PayPal Sandbox loop** in PaySentinel AI:

$$\text{Buyer Orders} \longrightarrow \text{Dispute Filed} \longrightarrow \text{Control Tower Pauses} \longrightarrow \text{Operator Approves} \longrightarrow \text{Live PayPal API Dispatched} \longrightarrow \text{Webhook Updates}$$

---

## ⚠️ Important PayPal Architectural Limitation

> **Public API Limitation:** PayPal provides public REST APIs for **merchants** to list disputes, provide evidence, and accept claims (`/v1/customer/disputes`), but **does not provide a public REST API for buyer-initiated dispute creation**.
> In PayPal's architecture, disputes are initiated either by buyers through the sandbox consumer web interface, or automatically simulated via webhooks. Both methods are detailed below.

---

## 🛠️ Step 0: Sandbox Configuration & Environment

Ensure `backend/.env` has your PayPal Developer credentials:

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=your_registered_webhook_id
```

Verify your sandbox credentials by querying the health status:

```bash
curl -X GET http://localhost:8000/api/paypal/status
```

Expected response:
```json
{
  "connected": true,
  "mode": "SANDBOX_LIVE",
  "message": "Successfully authenticated with PayPal Sandbox API v2.",
  "base_url": "https://api-m.sandbox.paypal.com"
}
```

---

## 🛒 Step 1: Create and Capture an Order (Orders v2 API)

Generate an order with an idempotent `PayPal-Request-Id`:

```bash
# 1. Obtain Bearer Token directly or via our backend
curl -X POST http://localhost:8000/api/paypal/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1250.00,
    "currency": "USD",
    "reference_id": "ORD-LIVE-001",
    "request_id": "REQ-778899-IDEMP-01"
  }'
```

Or execute against PayPal directly with curl:

```bash
ACCESS_TOKEN=$(curl -s -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" | jq -r .access_token)

ORDER_ID=$(curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "PayPal-Request-Id: REQ-778899-IDEMP-01" \
  -d '{
    "intent": "CAPTURE",
    "purchase_units": [{
      "reference_id": "ORD-LIVE-001",
      "amount": {"currency_code": "USD", "value": "1250.00"}
    }]
  }' | jq -r .id)

echo "Created Sandbox Order: $ORDER_ID"
```

Capture the order:

```bash
curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders/$ORDER_ID/capture \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "PayPal-Request-Id: CAP-778899-IDEMP-01"
```

---

## 🚨 Step 2: File the Dispute

### Option A: Via PayPal Sandbox Resolution Center UI (Real Buyer Account)
1. Log in to [sandbox.paypal.com](https://www.sandbox.paypal.com) using your PayPal Sandbox **Buyer Account**.
2. Find the capture transaction for `$1,250.00`.
3. Click **Report a Problem** / **Resolution Center** $\rightarrow$ select **I haven't received an item I purchased**.
4. Submit the dispute. PayPal will issue a real Dispute ID (format: `PP-D-XXXXX`).

### Option B: Trigger via Webhook Event
Simulate the incoming `CUSTOMER.DISPUTE.CREATED` webhook:

```bash
curl -X POST http://localhost:8000/api/webhooks/paypal \
  -H "Content-Type: application/json" \
  -d '{
    "id": "WH-EVT-998811",
    "event_type": "CUSTOMER.DISPUTE.CREATED",
    "resource_type": "dispute",
    "summary": "Customer dispute created for order $1250.00",
    "resource": {
      "dispute_id": "PP-D-88412",
      "dispute_amount": {"value": "1250.00", "currency_code": "USD"},
      "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      "status": "UNDER_REVIEW"
    }
  }'
```

---

## 🛡️ Step 3: Inspect the Human Control Tower Queue

Check the pending queue:

```bash
curl -X GET http://localhost:8000/api/control-tower/pending
```

Notice that `CT-9021` (`PP-D-88412`) was automatically paused because the amount ($1,250.00) exceeds the $500 safety policy ceiling.

---

## ✍️ Step 4: Approve and Dispatch Evidence to PayPal API

Review and approve the dispute defense package:

```bash
curl -X POST http://localhost:8000/api/control-tower/CT-9021/approve \
  -H "Content-Type: application/json" \
  -d '{
    "reviewer_name": "Chief Risk Officer",
    "reviewer_notes": "Physical signature verified on MC93 terminal. FedEx GPS within 0.1mi."
  }'
```

When `PAYPAL_MODE=sandbox`, this executes an authentic HTTP call to:
`POST https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-88412/provide-evidence`

Response verifies live submission:
```json
{
  "id": "CT-9021",
  "status": "APPROVED_AND_SUBMITTED",
  "audit_trail": [
    ...,
    {
      "actor": "Chief Risk Officer",
      "action": "APPROVE_AND_SUBMIT",
      "previous_state": "PENDING_REVIEW",
      "new_state": "APPROVED_AND_SUBMITTED",
      "paypal_api_status": "PAYPAL_SANDBOX_SUBMITTED (HTTP 200)",
      "prev_hash": "GENESIS",
      "entry_hash": "a4f89d..."
    }
  ]
}
```

---

## 🔐 Step 5: Verify the Cryptographic Audit Hash Chain

Ensure the tamper-evident log has not been modified:

```bash
curl -X GET http://localhost:8000/api/control-tower/CT-9021/verify-audit-chain
```

Expected output:
```json
{
  "item_id": "CT-9021",
  "verified": true,
  "details": "Hash chain verified across 2 entries."
}
```

---

## 🔁 Step 6: Test Maker-Checker Security Enforcement

Attempting to approve an item where the reviewer is the same as the creator (`AI_DEFENSE_ENGINE`):

```bash
curl -X POST http://localhost:8000/api/control-tower/CT-9021/approve \
  -H "Content-Type: application/json" \
  -d '{
    "reviewer_name": "AI_DEFENSE_ENGINE",
    "reviewer_notes": "Self approval attempt"
  }'
```

Expected HTTP 400 Bad Request:
```json
{
  "detail": "Maker cannot be checker: reviewer must be different from item creator"
}
```
