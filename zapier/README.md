# ⚡ Zapier Integration Guide for PaySentinel AI

Connect **PaySentinel AI** directly to your team's favorite business workflows (Slack, Jira, Google Sheets, HubSpot, Email) using Zapier webhooks.

---

## 🎯 Supported Zapier Triggers

PaySentinel provides real-time event hooks and sample payloads for three critical merchant risk automation flows:

### 1. `high_value_dispute_escalated`
Fires whenever an incoming PayPal dispute exceeds the configured merchant threshold (default `$500.00`) and is paused in the **Human Control Tower** for maker-checker review.
- **Sample Zap Actions**:
  - Send an urgent alert to the `#risk-operations` Slack channel.
  - Page the on-call Senior Risk Officer via PagerDuty.
  - Create a high-priority ticket in Jira / Linear with SLA countdown.

### 2. `prompt_injection_blocked`
Fires when the **Untrusted Input Security Arena** detects and quarantines an adversarial prompt injection attack embedded in customer messages or buyer-agent negotiations.
- **Sample Zap Actions**:
  - Log malicious prompt payloads to Elastic / Datadog.
  - Temporarily restrict buyer account privileges in your CRM.
  - Send an incident summary to the security engineering team.

### 3. `carrier_claim_recommended`
Fires when the AI engine analyzes courier tracking history (e.g. stalled > 10 days) and recommends conceding the dispute to avoid PayPal's \$15–\$20 dispute fee.
- **Sample Zap Actions**:
  - Automatically draft a carrier insurance claim in FedEx/USPS claim portals.
  - Notify the warehouse fulfillment team to verify courier loss.
  - Update ERP / QuickBooks ledger with insurance receivable.

---

## 🛠️ Step-by-Step Zap Setup

1. **Create a Zap**: In Zapier, select **Webhooks by Zapier** as the Trigger app.
2. **Choose Event**: Select **Catch Hook**.
3. **Copy Webhook URL**: Copy the generated Zapier Catch URL (e.g. `https://hooks.zapier.com/hooks/catch/12345/abcde`).
4. **Test Payload**: Query PaySentinel's sample trigger endpoint to verify fields:
   ```bash
   curl -X GET "http://localhost:8000/api/webhooks/zapier/sample-payloads"
   ```
5. **Dispatch Live Event**:
   ```bash
   curl -X POST "http://localhost:8000/api/webhooks/zapier/dispatch?event_type=high_value_dispute_escalated&webhook_url=YOUR_ZAPIER_CATCH_URL"
   ```
6. **Connect Destination**: In Zapier, add Slack, Email, or Jira as the action step and map fields (`dispute_id`, `amount`, `buyer_name`, `sla_hours_remaining`).

