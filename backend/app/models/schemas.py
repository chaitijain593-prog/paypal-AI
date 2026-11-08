"""Pydantic v2 models for all PaySentinel AI entities."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


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


# ── Live Attack & Dynamic Proof Models ──────────────────────────────────

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
    use_zero_knowledge_predicates: bool = True


class GenerateProofResponse(BaseModel):
    proof_id: str
    order_id: str
    merkle_root: str
    leaf_count: int
    leaf_hashes: list[str]
    proof_path: list[dict[str, str]]
    zk_predicates_applied: list[str]
    status: ProofStatus
    created_at: datetime
    proof_record: dict[str, Any]

