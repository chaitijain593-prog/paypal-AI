"""Pydantic v2 models for all PaySentinel AI entities."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


# ── Enums ──────────────────────────────────────────────────────────────────

class TransactionStatus(str, Enum):
    COMPLETED = "COMPLETED"
    PENDING = "PENDING"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    DENIED = "DENIED"
    REVERSED = "REVERSED"


class DisputeStatus(str, Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    WAITING_FOR_SELLER = "WAITING_FOR_SELLER"
    WAITING_FOR_BUYER = "WAITING_FOR_BUYER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class DisputeReason(str, Enum):
    ITEM_NOT_RECEIVED = "ITEM_NOT_RECEIVED"
    UNAUTHORIZED_TRANSACTION = "UNAUTHORIZED_TRANSACTION"
    SIGNIFICANTLY_NOT_AS_DESCRIBED = "SIGNIFICANTLY_NOT_AS_DESCRIBED"
    DUPLICATE_TRANSACTION = "DUPLICATE_TRANSACTION"
    INCORRECT_AMOUNT = "INCORRECT_AMOUNT"


class DisputeOutcome(str, Enum):
    SELLER_WINS = "SELLER_WINS"
    BUYER_WINS = "BUYER_WINS"
    PENDING = "PENDING"


class ArenaRole(str, Enum):
    ATTACKER = "ATTACKER"
    DEFENDER = "DEFENDER"


class ProofStatus(str, Enum):
    VERIFIED = "VERIFIED"
    TAMPERED = "TAMPERED"
    PENDING = "PENDING"


class WebhookEventType(str, Enum):
    PAYMENT_CAPTURE_COMPLETED = "PAYMENT.CAPTURE.COMPLETED"
    PAYMENT_CAPTURE_DENIED = "PAYMENT.CAPTURE.DENIED"
    CUSTOMER_DISPUTE_CREATED = "CUSTOMER.DISPUTE.CREATED"
    CUSTOMER_DISPUTE_RESOLVED = "CUSTOMER.DISPUTE.RESOLVED"
    CUSTOMER_DISPUTE_UPDATED = "CUSTOMER.DISPUTE.UPDATED"
    CHECKOUT_ORDER_APPROVED = "CHECKOUT.ORDER.APPROVED"


# ── Transaction Models ─────────────────────────────────────────────────────

class BuyerInfo(BaseModel):
    name: str
    email: str
    payer_id: str


class SellerInfo(BaseModel):
    name: str
    email: str
    merchant_id: str


class Transaction(BaseModel):
    id: str = Field(..., description="PayPal transaction ID")
    order_id: str
    amount: float
    currency: str = "USD"
    status: TransactionStatus
    buyer: BuyerInfo
    seller: SellerInfo
    description: str
    created_at: datetime
    updated_at: datetime
    payment_method: str = "PayPal Balance"
    risk_score: float = Field(ge=0.0, le=100.0)
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


# ── Dispute Models ─────────────────────────────────────────────────────────

class EvidenceItem(BaseModel):
    id: str
    type: str
    filename: str
    sha256_hash: str
    uploaded_at: datetime
    description: str


class DisputeTimeline(BaseModel):
    timestamp: datetime
    event: str
    actor: str
    details: str


class Dispute(BaseModel):
    id: str = Field(..., description="PayPal dispute ID")
    transaction_id: str
    reason: DisputeReason
    status: DisputeStatus
    amount: float
    currency: str = "USD"
    buyer: BuyerInfo
    seller: SellerInfo
    description: str
    evidence: list[EvidenceItem] = []
    timeline: list[DisputeTimeline] = []
    outcome: DisputeOutcome = DisputeOutcome.PENDING
    created_at: datetime
    updated_at: datetime
    respond_by: datetime
    ai_recommendation: str = ""
    win_probability: float = Field(ge=0.0, le=1.0, default=0.0)
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


class DisputeResponse(BaseModel):
    message: str
    evidence_ids: list[str] = []
    counter_amount: float | None = None


class DisputeResponseResult(BaseModel):
    dispute_id: str
    status: str
    ai_analysis: str
    recommended_action: str
    confidence: float
    response_submitted: bool
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


# ── Arena Models ───────────────────────────────────────────────────────────

class ArenaMove(BaseModel):
    round: int
    role: ArenaRole
    action: str
    argument: str
    score_delta: float
    cumulative_score: float


class ArenaSimulation(BaseModel):
    id: str
    dispute_type: DisputeReason
    attacker_strategy: str
    defender_strategy: str
    attacker_final_score: float
    defender_final_score: float
    winner: ArenaRole
    rounds: list[ArenaMove]
    total_rounds: int
    created_at: datetime
    duration_ms: int
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


class ArenaRunRequest(BaseModel):
    dispute_type: DisputeReason = DisputeReason.ITEM_NOT_RECEIVED
    attacker_strategy: str = "aggressive"
    defender_strategy: str = "evidence_based"
    num_rounds: int = Field(default=5, ge=1, le=10)


# ── Proof Models ───────────────────────────────────────────────────────────

class ProofRecord(BaseModel):
    id: str
    evidence_id: str
    filename: str
    original_hash: str
    current_hash: str
    status: ProofStatus
    algorithm: str = "SHA-256"
    verified_at: datetime
    file_size_bytes: int
    mime_type: str
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


class ProofVerifyResult(BaseModel):
    proof_id: str
    evidence_id: str
    filename: str
    original_hash: str
    computed_hash: str
    match: bool
    status: ProofStatus
    verified_at: datetime
    chain_of_custody: list[dict[str, Any]]
    ed25519_signature: str | None = None
    signature_verified: bool | None = None
    signed_at: str | None = None
    recomputed_from_raw_bytes: bool = True
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


# ── Cash Flow Models ──────────────────────────────────────────────────────

class CashFlowEntry(BaseModel):
    month: str
    revenue: float
    expenses: float
    net: float
    disputed_amount: float
    available_balance: float


class CashFlowRunway(BaseModel):
    current_balance: float
    monthly_burn_rate: float
    monthly_revenue: float
    runway_months: float
    runway_with_disputes: float
    total_disputed: float
    total_held: float
    open_disputes_count: int
    projected_cash_flow: list[CashFlowEntry]
    risk_level: str
    recommendation: str
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


# ── Dashboard Models ──────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_transactions: int
    total_revenue: float
    total_disputes: int
    open_disputes: int
    dispute_rate: float
    win_rate: float
    avg_resolution_days: float
    total_at_risk: float
    proofs_verified: int
    proofs_tampered: int
    arena_simulations_run: int
    defender_win_rate: float
    runway_months: float
    monthly_revenue: float
    monthly_expenses: float
    recent_alerts: list[dict[str, Any]]
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


# ── Webhook Models ────────────────────────────────────────────────────────

class WebhookEvent(BaseModel):
    id: str
    event_type: WebhookEventType
    resource_type: str
    resource_id: str
    summary: str
    created_at: datetime
    status: str = "PROCESSED"
    payload_preview: dict[str, Any]
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


# ── Live Attack & Dynamic Proof Models (Friend Incoming) ─────────────────

class LiveAttackRequest(BaseModel):
    attack_text: str
    dispute_type: DisputeReason = DisputeReason.ITEM_NOT_RECEIVED
    order_id: str = "PP-7829-MNQR"
    attacker_strategy: str = "custom_adversarial"


class LiveAttackResult(BaseModel):
    id: str
    attack_text: str
    is_threat: bool
    risk_score: float
    threat_category: str
    quarantined: bool
    sanitized_text: str
    defender_rebuttal: str
    confidence_score: float
    status: str  # BLOCKED, DEFENDED, ESCALATED
    mitigation_action: str
    rule_citations: list[str]
    evidence_matches: list[dict[str, Any]]
    processing_time_ms: float
    created_at: datetime
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


class GenerateProofRequest(BaseModel):
    order_id: str
    dispute_id: str | None = None
    evidence_type: str = "Delivery Confirmation & Geofence"
    carrier: str = "USPS"
    tracking_number: str = "9400111899223033005282"
    buyer_name: str = "Carlos Martinez"
    latitude: float = 30.2672
    longitude: float = -97.7431
    delivery_address: str = "123 Oak St, Austin, TX 78701"
    use_salted_commitments: bool = True
    use_zero_knowledge_predicates: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_commitment_flag(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "use_zero_knowledge_predicates" in data and "use_salted_commitments" not in data:
                data["use_salted_commitments"] = data["use_zero_knowledge_predicates"]
        return data


class GenerateProofResponse(BaseModel):
    proof_id: str
    order_id: str
    dispute_id: str | None = None
    merkle_root: str
    leaf_count: int
    leaf_hashes: list[str]
    proof_path: list[dict[str, str]]
    zk_predicates_applied: list[str] = Field(default_factory=list)
    salted_commitments_applied: list[str] = Field(default_factory=list)
    ed25519_signature: str | None = None
    signed_at: str | None = None
    merchant_public_key: str | None = None
    status: ProofStatus
    created_at: datetime
    proof_record: dict[str, Any]
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


# ── Human Control Tower & Approval Queue Models (Feature 4) ───────────────

class ControlTowerStatus(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    SUBMITTING = "SUBMITTING"
    SUBMITTED = "SUBMITTED"
    APPROVED_AND_SUBMITTED = "APPROVED_AND_SUBMITTED"
    EDITED_AND_SUBMITTED = "EDITED_AND_SUBMITTED"
    CONCEDING = "CONCEDING"
    CONCEDED = "CONCEDED"
    REJECTED_CONCEDED = "REJECTED_CONCEDED"
    FAILED = "FAILED"


class AIRecommendedAction(str, Enum):
    SUBMIT_EVIDENCE = "SUBMIT_EVIDENCE"
    ACCEPT_CLAIM_AND_REFUND = "ACCEPT_CLAIM_AND_REFUND"
    ESCALATE_MANUAL_INQUIRY = "ESCALATE_MANUAL_INQUIRY"


class ProofClaim(BaseModel):
    claim_id: str
    statement_text: str
    source_type: str  # CARRIER_TRACKING, ORDER_LOG, BUYER_CHAT, FIRA_INVOICE
    source_record_id: str
    sha256_hash: str
    verified: bool = True


class AuditTrailEntry(BaseModel):
    timestamp: datetime
    actor: str
    action: str
    previous_state: str
    new_state: str
    reviewer_notes: str
    payload_hash: str
    paypal_api_status: str
    prev_hash: str | None = None
    entry_hash: str | None = None
    paypal_debug_id: str | None = None
    paypal_response_json: str | None = None


class ControlTowerItem(BaseModel):
    id: str = Field(..., description="Unique Queue ID, e.g. CT-9021")
    dispute_id: str = Field(..., description="PayPal Sandbox Dispute ID, e.g. PP-D-88412")
    transaction_id: str = Field(..., description="Associated PayPal Order/Capture ID")
    buyer_name: str
    buyer_email: str
    dispute_reason: str
    item_name: str
    amount: float = Field(..., gt=0.0)
    currency: str = "USD"
    dispute_fee_at_risk: float = 15.00
    sla_deadline: datetime
    escalation_triggers: list[str]
    ai_confidence_score: float = Field(..., ge=0.0, le=1.0)
    ai_recommended_action: AIRecommendedAction
    ai_rationale: str
    drafted_defense_letter: str
    proof_claims: list[ProofClaim] = Field(default_factory=list)
    buyer_raw_message: str
    firewall_injection_flagged: bool = False
    firewall_details: str | None = None
    status: ControlTowerStatus = ControlTowerStatus.PENDING_REVIEW
    audit_trail: list[AuditTrailEntry] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    creator_name: str = "AI_DEFENSE_ENGINE"
    idempotency_key: str | None = None
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


class ControlTowerApproveRequest(BaseModel):
    reviewer_name: str = "Merchant Admin"
    reviewer_notes: str | None = None


class ControlTowerEditRequest(BaseModel):
    updated_defense_letter: str = Field(..., min_length=1)
    updated_action: str | None = None
    reviewer_name: str = "Merchant Admin"
    reviewer_notes: str = Field(..., min_length=1)


class ControlTowerRejectRequest(BaseModel):
    resolution_strategy: str = "CONCEDE_AND_REFUND"  # CONCEDE_AND_REFUND | HOLD_FOR_MANUAL_FILING
    reviewer_name: str = "Merchant Admin"
    reviewer_notes: str = Field(..., min_length=1)


class ControlTowerSummaryKPI(BaseModel):
    total_amount_at_risk: float
    pending_count: int
    urgent_24h_count: int
    fees_saved: float
    resolved_count: int


class ControlTowerListResponse(BaseModel):
    kpis: ControlTowerSummaryKPI
    count: int
    items: list[ControlTowerItem]
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


# ── Agent-vs-Agent Commerce Loop Models (Feature 9) ───────────────────────

class AgentCommerceActor(str, Enum):
    BUYER_AGENT = "BUYER_AGENT"
    MERCHANT_AGENT = "MERCHANT_AGENT"
    PAYPAL_SANDBOX = "PAYPAL_SANDBOX"


class AgentCommerceStep(BaseModel):
    step_number: int
    actor: AgentCommerceActor
    action: str
    description: str
    timestamp: datetime
    status: str = "SUCCESS"  # SUCCESS | WAITING | INTERCEPTED
    payload_preview: dict[str, Any] = Field(default_factory=dict)
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


class AgentCommerceSession(BaseModel):
    session_id: str
    product_name: str
    amount: float
    currency: str = "USD"
    buyer_spend_cap: float = 500.00
    status: str = "COMPLETED"  # IN_PROGRESS | COMPLETED | ESCALATED
    dispute_id: str | None = None
    steps: list[AgentCommerceStep] = Field(default_factory=list)
    created_at: datetime
    data_source: Literal["LIVE", "SIMULATED"] = "SIMULATED"


class AgentCommerceRunRequest(BaseModel):
    product_name: str = "Keychron Q1 Pro Mechanical Keyboard"
    amount: float = 249.99
    simulate_dispute: bool = True
    inject_adversarial: bool = False
