"""Rich, realistic mock data for PaySentinel AI demo."""

from __future__ import annotations

import hashlib
import random
import uuid
from datetime import datetime, timedelta, timezone

from app.models.schemas import (
    ArenaMove,
    ArenaRole,
    ArenaRunRequest,
    ArenaSimulation,
    BuyerInfo,
    CashFlowEntry,
    CashFlowRunway,
    DashboardStats,
    Dispute,
    DisputeOutcome,
    DisputeReason,
    DisputeResponse,
    DisputeResponseResult,
    DisputeStatus,
    DisputeTimeline,
    EvidenceItem,
    ProofRecord,
    ProofStatus,
    ProofVerifyResult,
    SellerInfo,
    Transaction,
    TransactionStatus,
    WebhookEvent,
    WebhookEventType,
)

# ── Helpers ────────────────────────────────────────────────────────────────

_NOW = datetime.now(timezone.utc)


def _ts(days_ago: int = 0, hours_ago: int = 0) -> datetime:
    return _NOW - timedelta(days=days_ago, hours=hours_ago)


def _txn_id() -> str:
    return f"TXN-{uuid.uuid4().hex[:12].upper()}"


def _order_id() -> str:
    return f"ORD-{random.randint(10000000, 99999999)}"


def _dispute_id(n: int) -> str:
    return f"PP-D-{80000 + n}"


def _evidence_id() -> str:
    return f"EVD-{uuid.uuid4().hex[:8].upper()}"


def _sha256(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def _proof_id() -> str:
    return f"PRF-{uuid.uuid4().hex[:8].upper()}"


def _webhook_id() -> str:
    return f"WH-{uuid.uuid4().hex[:10].upper()}"


# ── Buyers & Sellers ──────────────────────────────────────────────────────

BUYERS = [
    BuyerInfo(name="Sarah Mitchell", email="sarah.m@gmail.com", payer_id="PAYER-7X3K9M2"),
    BuyerInfo(name="James Rodriguez", email="j.rodriguez@outlook.com", payer_id="PAYER-4F8N1Q6"),
    BuyerInfo(name="Emily Chen", email="emily.chen@icloud.com", payer_id="PAYER-2R5T8W1"),
    BuyerInfo(name="Michael Thompson", email="m.thompson@yahoo.com", payer_id="PAYER-9D6J3P5"),
    BuyerInfo(name="Aisha Patel", email="aisha.p@hotmail.com", payer_id="PAYER-1L4H7V0"),
    BuyerInfo(name="David Kowalski", email="d.kowalski@gmail.com", payer_id="PAYER-6B2M8K3"),
    BuyerInfo(name="Lisa Nakamura", email="l.nakamura@proton.me", payer_id="PAYER-3E9C5N7"),
    BuyerInfo(name="Robert Kim", email="r.kim@outlook.com", payer_id="PAYER-8G1F4S2"),
]

SELLER = SellerInfo(
    name="TechVault Electronics",
    email="payments@techvault.store",
    merchant_id="MERCH-TV8294X1",
)

# ── Transactions ──────────────────────────────────────────────────────────

TRANSACTIONS: list[Transaction] = [
    Transaction(
        id="TXN-5PAY84A3BN2K",
        order_id="ORD-29481037",
        amount=1249.99,
        currency="USD",
        status=TransactionStatus.COMPLETED,
        buyer=BUYERS[0],
        seller=SELLER,
        description='MacBook Air M3 - 15" Space Gray',
        created_at=_ts(days_ago=12),
        updated_at=_ts(days_ago=12),
        payment_method="PayPal Balance",
        risk_score=12.3,
    ),
    Transaction(
        id="TXN-9FKR27D6WT8M",
        order_id="ORD-83920164",
        amount=89.99,
        currency="USD",
        status=TransactionStatus.COMPLETED,
        buyer=BUYERS[1],
        seller=SELLER,
        description="Sony WH-1000XM5 Wireless Headphones",
        created_at=_ts(days_ago=10),
        updated_at=_ts(days_ago=10),
        payment_method="Visa •••• 4242",
        risk_score=8.1,
    ),
    Transaction(
        id="TXN-3QME61H9PC4V",
        order_id="ORD-47210583",
        amount=549.00,
        currency="USD",
        status=TransactionStatus.COMPLETED,
        buyer=BUYERS[2],
        seller=SELLER,
        description="Samsung Galaxy S24 Ultra 256GB",
        created_at=_ts(days_ago=8),
        updated_at=_ts(days_ago=8),
        payment_method="PayPal Credit",
        risk_score=15.7,
    ),
    Transaction(
        id="TXN-7YLB45S2NA0X",
        order_id="ORD-61038295",
        amount=34.99,
        currency="USD",
        status=TransactionStatus.COMPLETED,
        buyer=BUYERS[3],
        seller=SELLER,
        description="Anker USB-C Hub 7-in-1",
        created_at=_ts(days_ago=7),
        updated_at=_ts(days_ago=7),
        payment_method="Mastercard •••• 5555",
        risk_score=3.2,
    ),
    Transaction(
        id="TXN-1HGD89J0KE7R",
        order_id="ORD-15724068",
        amount=199.00,
        currency="USD",
        status=TransactionStatus.PENDING,
        buyer=BUYERS[4],
        seller=SELLER,
        description="Apple AirPods Pro 2nd Gen",
        created_at=_ts(days_ago=5),
        updated_at=_ts(days_ago=5),
        payment_method="PayPal Balance",
        risk_score=22.6,
    ),
    Transaction(
        id="TXN-6ZCT32W8FP1N",
        order_id="ORD-90382147",
        amount=2199.99,
        currency="USD",
        status=TransactionStatus.COMPLETED,
        buyer=BUYERS[5],
        seller=SELLER,
        description='Dell XPS 16 - i9 / 32GB / 1TB SSD',
        created_at=_ts(days_ago=4),
        updated_at=_ts(days_ago=4),
        payment_method="Amex •••• 3782",
        risk_score=31.4,
    ),
    Transaction(
        id="TXN-8VNA56Q4LM3B",
        order_id="ORD-28471590",
        amount=74.50,
        currency="USD",
        status=TransactionStatus.REFUNDED,
        buyer=BUYERS[6],
        seller=SELLER,
        description="Logitech MX Master 3S Mouse",
        created_at=_ts(days_ago=3),
        updated_at=_ts(days_ago=2),
        payment_method="PayPal Balance",
        risk_score=5.8,
    ),
    Transaction(
        id="TXN-2KPF70X1GS9C",
        order_id="ORD-63841207",
        amount=449.00,
        currency="USD",
        status=TransactionStatus.COMPLETED,
        buyer=BUYERS[7],
        seller=SELLER,
        description="iPad Air M2 11-inch Wi-Fi 128GB",
        created_at=_ts(days_ago=2),
        updated_at=_ts(days_ago=2),
        payment_method="Visa •••• 1234",
        risk_score=18.9,
    ),
    Transaction(
        id="TXN-4RJW18Y5DH6A",
        order_id="ORD-50273841",
        amount=159.99,
        currency="USD",
        status=TransactionStatus.COMPLETED,
        buyer=BUYERS[0],
        seller=SELLER,
        description="JBL Charge 5 Portable Speaker",
        created_at=_ts(days_ago=1),
        updated_at=_ts(days_ago=1),
        payment_method="PayPal Balance",
        risk_score=6.5,
    ),
    Transaction(
        id="TXN-0BMS93U2VQ5E",
        order_id="ORD-71940325",
        amount=329.00,
        currency="USD",
        status=TransactionStatus.COMPLETED,
        buyer=BUYERS[3],
        seller=SELLER,
        description="Nintendo Switch OLED - White",
        created_at=_ts(hours_ago=6),
        updated_at=_ts(hours_ago=6),
        payment_method="Discover •••• 6011",
        risk_score=10.0,
    ),
]

# ── Disputes ──────────────────────────────────────────────────────────────

DISPUTES: list[Dispute] = [
    Dispute(
        id="PP-D-80001",
        transaction_id="TXN-5PAY84A3BN2K",
        reason=DisputeReason.ITEM_NOT_RECEIVED,
        status=DisputeStatus.OPEN,
        amount=1249.99,
        buyer=BUYERS[0],
        seller=SELLER,
        description="Buyer claims MacBook Air M3 was never delivered despite tracking showing 'Delivered'. Buyer states package was not at door and no safe place was available.",
        evidence=[
            EvidenceItem(
                id="EVD-A1B2C3D4",
                type="SHIPPING_PROOF",
                filename="usps_tracking_confirmation.pdf",
                sha256_hash=_sha256("usps_tracking_confirmation_content"),
                uploaded_at=_ts(days_ago=10),
                description="USPS tracking #9400111899223847563290 showing delivered status",
            ),
            EvidenceItem(
                id="EVD-E5F6G7H8",
                type="DELIVERY_PHOTO",
                filename="delivery_photo_front_door.jpg",
                sha256_hash=_sha256("delivery_photo_content"),
                uploaded_at=_ts(days_ago=10),
                description="Photo proof of package at buyer's front door taken by carrier",
            ),
            EvidenceItem(
                id="EVD-I9J0K1L2",
                type="SIGNATURE",
                filename="delivery_signature.png",
                sha256_hash=_sha256("delivery_signature_content"),
                uploaded_at=_ts(days_ago=9),
                description="Electronic signature confirmation from recipient",
            ),
        ],
        timeline=[
            DisputeTimeline(timestamp=_ts(days_ago=12), event="ORDER_PLACED", actor="buyer", details="Order placed for MacBook Air M3"),
            DisputeTimeline(timestamp=_ts(days_ago=11), event="SHIPPED", actor="seller", details="Package shipped via USPS Priority Mail"),
            DisputeTimeline(timestamp=_ts(days_ago=9), event="DELIVERED", actor="carrier", details="Package marked as delivered"),
            DisputeTimeline(timestamp=_ts(days_ago=8), event="DISPUTE_OPENED", actor="buyer", details="Buyer opened Item Not Received dispute"),
            DisputeTimeline(timestamp=_ts(days_ago=7), event="EVIDENCE_SUBMITTED", actor="seller", details="Seller submitted tracking and delivery proof"),
        ],
        outcome=DisputeOutcome.PENDING,
        created_at=_ts(days_ago=8),
        updated_at=_ts(days_ago=7),
        respond_by=_ts(days_ago=-7),
        ai_recommendation="STRONG DEFENSE — Submit delivery confirmation with photo evidence and GPS coordinates. Signature match increases win probability to 87%. Recommend requesting carrier affidavit.",
        win_probability=0.87,
    ),
    Dispute(
        id="PP-D-80002",
        transaction_id="TXN-3QME61H9PC4V",
        reason=DisputeReason.SIGNIFICANTLY_NOT_AS_DESCRIBED,
        status=DisputeStatus.UNDER_REVIEW,
        amount=549.00,
        buyer=BUYERS[2],
        seller=SELLER,
        description="Buyer claims Samsung Galaxy S24 Ultra arrived with a cracked screen and scratches on the back panel. Listing advertised 'Brand New in Box'.",
        evidence=[
            EvidenceItem(
                id="EVD-M3N4O5P6",
                type="PRODUCT_PHOTO",
                filename="pre_shipment_inspection.jpg",
                sha256_hash=_sha256("pre_shipment_inspection_content"),
                uploaded_at=_ts(days_ago=6),
                description="Photos taken during quality check before shipping",
            ),
            EvidenceItem(
                id="EVD-Q7R8S9T0",
                type="PACKAGING_PROOF",
                filename="packaging_video_thumbnail.mp4",
                sha256_hash=_sha256("packaging_video_content"),
                uploaded_at=_ts(days_ago=6),
                description="Video recording of item being packaged with bubble wrap and sealed box",
            ),
        ],
        timeline=[
            DisputeTimeline(timestamp=_ts(days_ago=8), event="ORDER_PLACED", actor="buyer", details="Order placed for Samsung Galaxy S24 Ultra"),
            DisputeTimeline(timestamp=_ts(days_ago=7), event="SHIPPED", actor="seller", details="Package shipped via FedEx 2-Day"),
            DisputeTimeline(timestamp=_ts(days_ago=5), event="DELIVERED", actor="carrier", details="Package delivered and signed for"),
            DisputeTimeline(timestamp=_ts(days_ago=4), event="DISPUTE_OPENED", actor="buyer", details="Buyer opened SNAD dispute with photos of damage"),
            DisputeTimeline(timestamp=_ts(days_ago=3), event="EVIDENCE_SUBMITTED", actor="seller", details="Seller submitted pre-shipment photos and packaging video"),
            DisputeTimeline(timestamp=_ts(days_ago=2), event="UNDER_REVIEW", actor="paypal", details="PayPal reviewing evidence from both parties"),
        ],
        outcome=DisputeOutcome.PENDING,
        created_at=_ts(days_ago=4),
        updated_at=_ts(days_ago=2),
        respond_by=_ts(days_ago=-10),
        ai_recommendation="MODERATE DEFENSE — Pre-shipment photos are strong evidence but packaging video metadata should be verified. Consider offering partial refund ($150) as goodwill gesture to improve resolution odds.",
        win_probability=0.62,
    ),
    Dispute(
        id="PP-D-80003",
        transaction_id="TXN-6ZCT32W8FP1N",
        reason=DisputeReason.UNAUTHORIZED_TRANSACTION,
        status=DisputeStatus.WAITING_FOR_SELLER,
        amount=2199.99,
        buyer=BUYERS[5],
        seller=SELLER,
        description="Buyer claims they did not authorize this purchase of Dell XPS 16. States their PayPal account may have been compromised.",
        evidence=[
            EvidenceItem(
                id="EVD-U1V2W3X4",
                type="IP_LOG",
                filename="login_ip_analysis.pdf",
                sha256_hash=_sha256("ip_analysis_content"),
                uploaded_at=_ts(days_ago=2),
                description="IP address and device fingerprint analysis from transaction",
            ),
        ],
        timeline=[
            DisputeTimeline(timestamp=_ts(days_ago=4), event="ORDER_PLACED", actor="buyer", details="Order placed from IP 192.168.45.201"),
            DisputeTimeline(timestamp=_ts(days_ago=3), event="SHIPPED", actor="seller", details="Package shipped via UPS Next Day Air"),
            DisputeTimeline(timestamp=_ts(days_ago=2), event="DISPUTE_OPENED", actor="buyer", details="Unauthorized transaction claim filed"),
            DisputeTimeline(timestamp=_ts(days_ago=1), event="SELLER_NOTIFIED", actor="paypal", details="Seller requested to provide evidence within 10 days"),
        ],
        outcome=DisputeOutcome.PENDING,
        created_at=_ts(days_ago=2),
        updated_at=_ts(days_ago=1),
        respond_by=_ts(days_ago=-8),
        ai_recommendation="HIGH RISK — Unauthorized transaction claims are difficult to defend. IP analysis shows transaction originated from buyer's known location. Recommend submitting device fingerprint match and previous purchase history from same account.",
        win_probability=0.41,
    ),
    Dispute(
        id="PP-D-80004",
        transaction_id="TXN-7YLB45S2NA0X",
        reason=DisputeReason.DUPLICATE_TRANSACTION,
        status=DisputeStatus.RESOLVED,
        amount=34.99,
        buyer=BUYERS[3],
        seller=SELLER,
        description="Buyer was charged twice for Anker USB-C Hub. System glitch during checkout caused duplicate payment.",
        evidence=[],
        timeline=[
            DisputeTimeline(timestamp=_ts(days_ago=7), event="DISPUTE_OPENED", actor="buyer", details="Duplicate charge reported"),
            DisputeTimeline(timestamp=_ts(days_ago=6), event="SELLER_ACKNOWLEDGED", actor="seller", details="Seller confirmed duplicate and issued refund"),
            DisputeTimeline(timestamp=_ts(days_ago=5), event="RESOLVED", actor="paypal", details="Dispute resolved — refund of $34.99 issued"),
        ],
        outcome=DisputeOutcome.BUYER_WINS,
        created_at=_ts(days_ago=7),
        updated_at=_ts(days_ago=5),
        respond_by=_ts(days_ago=5),
        ai_recommendation="RESOLVED — Duplicate charge confirmed. Refund was the correct action. No further action needed.",
        win_probability=0.0,
    ),
    Dispute(
        id="PP-D-80005",
        transaction_id="TXN-8VNA56Q4LM3B",
        reason=DisputeReason.ITEM_NOT_RECEIVED,
        status=DisputeStatus.RESOLVED,
        amount=74.50,
        buyer=BUYERS[6],
        seller=SELLER,
        description="Buyer claimed Logitech MX Master 3S was not received. Seller provided tracking showing delivery to wrong address due to buyer's input error.",
        evidence=[
            EvidenceItem(
                id="EVD-Y5Z6A7B8",
                type="ADDRESS_PROOF",
                filename="buyer_provided_address.pdf",
                sha256_hash=_sha256("address_proof_content"),
                uploaded_at=_ts(days_ago=15),
                description="Screenshot of buyer's shipping address at time of order",
            ),
        ],
        timeline=[
            DisputeTimeline(timestamp=_ts(days_ago=20), event="DISPUTE_OPENED", actor="buyer", details="INR dispute opened"),
            DisputeTimeline(timestamp=_ts(days_ago=18), event="EVIDENCE_SUBMITTED", actor="seller", details="Seller proved item shipped to buyer-provided address"),
            DisputeTimeline(timestamp=_ts(days_ago=14), event="RESOLVED", actor="paypal", details="Dispute resolved in seller's favor"),
        ],
        outcome=DisputeOutcome.SELLER_WINS,
        created_at=_ts(days_ago=20),
        updated_at=_ts(days_ago=14),
        respond_by=_ts(days_ago=14),
        ai_recommendation="WON — Seller successfully demonstrated item was shipped to buyer-provided address. Strong precedent for future similar cases.",
        win_probability=1.0,
    ),
]

# ── Arena Simulations ─────────────────────────────────────────────────────

ARENA_SIMULATIONS: list[ArenaSimulation] = [
    ArenaSimulation(
        id="ARENA-001",
        dispute_type=DisputeReason.ITEM_NOT_RECEIVED,
        attacker_strategy="aggressive",
        defender_strategy="evidence_based",
        attacker_final_score=32.5,
        defender_final_score=67.5,
        winner=ArenaRole.DEFENDER,
        total_rounds=5,
        rounds=[
            ArenaMove(round=1, role=ArenaRole.ATTACKER, action="CLAIM_NO_DELIVERY", argument="Package never arrived. No safe place for delivery. Carrier left no notice.", score_delta=15.0, cumulative_score=15.0),
            ArenaMove(round=1, role=ArenaRole.DEFENDER, action="PRESENT_TRACKING", argument="USPS tracking #9400111899223847563290 confirms delivery on Oct 15 at 2:34 PM.", score_delta=20.0, cumulative_score=20.0),
            ArenaMove(round=2, role=ArenaRole.ATTACKER, action="DISPUTE_SIGNATURE", argument="I never signed for this. The signature doesn't match my name.", score_delta=8.0, cumulative_score=23.0),
            ArenaMove(round=2, role=ArenaRole.DEFENDER, action="SHOW_GPS_DATA", argument="GPS coordinates from delivery scan match buyer's registered address within 15 meters.", score_delta=18.0, cumulative_score=38.0),
            ArenaMove(round=3, role=ArenaRole.ATTACKER, action="CLAIM_STOLEN", argument="Someone must have stolen it from my porch before I got home.", score_delta=5.0, cumulative_score=28.0),
            ArenaMove(round=3, role=ArenaRole.DEFENDER, action="DELIVERY_PHOTO", argument="Carrier photo shows package at front door with house number visible. Timestamp: 2:34 PM.", score_delta=15.0, cumulative_score=53.0),
            ArenaMove(round=4, role=ArenaRole.ATTACKER, action="EMOTIONAL_APPEAL", argument="This is a $1,250 laptop. I'm a student and can't afford to lose this money.", score_delta=3.0, cumulative_score=31.0),
            ArenaMove(round=4, role=ArenaRole.DEFENDER, action="PRIOR_HISTORY", argument="Buyer has 3 previous successful deliveries to same address. No prior delivery issues reported.", score_delta=8.0, cumulative_score=61.0),
            ArenaMove(round=5, role=ArenaRole.ATTACKER, action="THREATEN_CHARGEBACK", argument="I'll escalate to my credit card company if PayPal doesn't resolve this.", score_delta=1.5, cumulative_score=32.5),
            ArenaMove(round=5, role=ArenaRole.DEFENDER, action="CARRIER_AFFIDAVIT", argument="Submitted carrier affidavit confirming delivery with signature match confidence of 94%.", score_delta=6.5, cumulative_score=67.5),
        ],
        created_at=_ts(days_ago=3),
        duration_ms=2340,
    ),
    ArenaSimulation(
        id="ARENA-002",
        dispute_type=DisputeReason.UNAUTHORIZED_TRANSACTION,
        attacker_strategy="social_engineering",
        defender_strategy="forensic_analysis",
        attacker_final_score=55.0,
        defender_final_score=45.0,
        winner=ArenaRole.ATTACKER,
        total_rounds=5,
        rounds=[
            ArenaMove(round=1, role=ArenaRole.ATTACKER, action="DENY_PURCHASE", argument="I did not make this purchase. My account was compromised.", score_delta=18.0, cumulative_score=18.0),
            ArenaMove(round=1, role=ArenaRole.DEFENDER, action="IP_ANALYSIS", argument="Transaction IP 73.162.45.89 matches buyer's known residential IP range.", score_delta=12.0, cumulative_score=12.0),
            ArenaMove(round=2, role=ArenaRole.ATTACKER, action="VPN_CLAIM", argument="Hackers could have used a VPN near my location. IP alone isn't proof.", score_delta=10.0, cumulative_score=28.0),
            ArenaMove(round=2, role=ArenaRole.DEFENDER, action="DEVICE_FINGERPRINT", argument="Browser fingerprint matches buyer's Chrome 118 on Windows 11 — same device used in 12 prior purchases.", score_delta=14.0, cumulative_score=26.0),
            ArenaMove(round=3, role=ArenaRole.ATTACKER, action="SHARED_DEVICE", argument="My family members also use this computer. Anyone could have used my saved login.", score_delta=12.0, cumulative_score=40.0),
            ArenaMove(round=3, role=ArenaRole.DEFENDER, action="2FA_LOG", argument="PayPal 2FA SMS was sent to buyer's phone and confirmed at time of purchase.", score_delta=10.0, cumulative_score=36.0),
            ArenaMove(round=4, role=ArenaRole.ATTACKER, action="SIM_SWAP_CLAIM", argument="My phone was stolen last week. Filed police report #2024-PD-4891.", score_delta=11.0, cumulative_score=51.0),
            ArenaMove(round=4, role=ArenaRole.DEFENDER, action="SHIPPING_MATCH", argument="Item shipped to buyer's registered address, same as billing address on file.", score_delta=6.0, cumulative_score=42.0),
            ArenaMove(round=5, role=ArenaRole.ATTACKER, action="POLICE_REPORT", argument="Attached police report confirming identity theft investigation opened Oct 12.", score_delta=4.0, cumulative_score=55.0),
            ArenaMove(round=5, role=ArenaRole.DEFENDER, action="TIMELINE_ANALYSIS", argument="Purchase made 3 days before alleged theft date on police report. Timeline inconsistency noted.", score_delta=3.0, cumulative_score=45.0),
        ],
        created_at=_ts(days_ago=1),
        duration_ms=3120,
    ),
    ArenaSimulation(
        id="ARENA-003",
        dispute_type=DisputeReason.SIGNIFICANTLY_NOT_AS_DESCRIBED,
        attacker_strategy="documentation_heavy",
        defender_strategy="quality_assurance",
        attacker_final_score=41.0,
        defender_final_score=59.0,
        winner=ArenaRole.DEFENDER,
        total_rounds=4,
        rounds=[
            ArenaMove(round=1, role=ArenaRole.ATTACKER, action="SHOW_DAMAGE_PHOTOS", argument="Received phone with cracked screen. Attached 5 high-res photos showing damage.", score_delta=16.0, cumulative_score=16.0),
            ArenaMove(round=1, role=ArenaRole.DEFENDER, action="PRE_SHIP_INSPECTION", argument="Pre-shipment QA photos with timestamp show pristine device. Serial #IME1938472 verified.", score_delta=18.0, cumulative_score=18.0),
            ArenaMove(round=2, role=ArenaRole.ATTACKER, action="EXIF_ANALYSIS", argument="My photos EXIF data shows they were taken within 30 min of delivery.", score_delta=12.0, cumulative_score=28.0),
            ArenaMove(round=2, role=ArenaRole.DEFENDER, action="PACKAGING_VIDEO", argument="Unbroken video recording shows device wrapped in 3-layer bubble wrap inside double-wall box.", score_delta=14.0, cumulative_score=32.0),
            ArenaMove(round=3, role=ArenaRole.ATTACKER, action="CARRIER_COMPLAINT", argument="Filed complaint with FedEx. Package showed signs of rough handling on arrival.", score_delta=8.0, cumulative_score=36.0),
            ArenaMove(round=3, role=ArenaRole.DEFENDER, action="INSURANCE_CLAIM", argument="Shipment insured for $600. If carrier damaged, insurance covers buyer. Carrier investigation pending.", score_delta=15.0, cumulative_score=47.0),
            ArenaMove(round=4, role=ArenaRole.ATTACKER, action="DEMAND_REFUND", argument="Regardless of fault, I paid for a new phone and received a damaged one.", score_delta=5.0, cumulative_score=41.0),
            ArenaMove(round=4, role=ArenaRole.DEFENDER, action="RESOLUTION_OFFER", argument="Offering free replacement OR full refund upon return of device for damage verification.", score_delta=12.0, cumulative_score=59.0),
        ],
        created_at=_ts(hours_ago=8),
        duration_ms=1890,
    ),
]

# ── Proof Records ─────────────────────────────────────────────────────────

PROOF_RECORDS: list[ProofRecord] = [
    ProofRecord(
        id="PRF-001",
        evidence_id="EVD-A1B2C3D4",
        filename="usps_tracking_confirmation.pdf",
        original_hash=_sha256("usps_tracking_confirmation_content"),
        current_hash=_sha256("usps_tracking_confirmation_content"),
        status=ProofStatus.VERIFIED,
        verified_at=_ts(days_ago=9),
        file_size_bytes=245_832,
        mime_type="application/pdf",
    ),
    ProofRecord(
        id="PRF-002",
        evidence_id="EVD-E5F6G7H8",
        filename="delivery_photo_front_door.jpg",
        original_hash=_sha256("delivery_photo_content"),
        current_hash=_sha256("delivery_photo_content"),
        status=ProofStatus.VERIFIED,
        verified_at=_ts(days_ago=9),
        file_size_bytes=1_847_293,
        mime_type="image/jpeg",
    ),
    ProofRecord(
        id="PRF-003",
        evidence_id="EVD-I9J0K1L2",
        filename="delivery_signature.png",
        original_hash=_sha256("delivery_signature_content"),
        current_hash=_sha256("delivery_signature_content"),
        status=ProofStatus.VERIFIED,
        verified_at=_ts(days_ago=8),
        file_size_bytes=89_421,
        mime_type="image/png",
    ),
    ProofRecord(
        id="PRF-004",
        evidence_id="EVD-M3N4O5P6",
        filename="pre_shipment_inspection.jpg",
        original_hash=_sha256("pre_shipment_inspection_content"),
        current_hash=_sha256("pre_shipment_inspection_MODIFIED"),
        status=ProofStatus.TAMPERED,
        verified_at=_ts(days_ago=5),
        file_size_bytes=2_103_847,
        mime_type="image/jpeg",
    ),
    ProofRecord(
        id="PRF-005",
        evidence_id="EVD-Q7R8S9T0",
        filename="packaging_video_thumbnail.mp4",
        original_hash=_sha256("packaging_video_content"),
        current_hash=_sha256("packaging_video_content"),
        status=ProofStatus.VERIFIED,
        verified_at=_ts(days_ago=5),
        file_size_bytes=15_294_831,
        mime_type="video/mp4",
    ),
    ProofRecord(
        id="PRF-006",
        evidence_id="EVD-U1V2W3X4",
        filename="login_ip_analysis.pdf",
        original_hash=_sha256("ip_analysis_content"),
        current_hash=_sha256("ip_analysis_content"),
        status=ProofStatus.VERIFIED,
        verified_at=_ts(days_ago=1),
        file_size_bytes=312_456,
        mime_type="application/pdf",
    ),
    ProofRecord(
        id="PRF-007",
        evidence_id="EVD-Y5Z6A7B8",
        filename="buyer_provided_address.pdf",
        original_hash=_sha256("address_proof_content"),
        current_hash=_sha256("address_proof_content"),
        status=ProofStatus.VERIFIED,
        verified_at=_ts(days_ago=14),
        file_size_bytes=178_902,
        mime_type="application/pdf",
    ),
]

# ── Webhook Events ────────────────────────────────────────────────────────

WEBHOOK_EVENTS: list[WebhookEvent] = [
    WebhookEvent(
        id="WH-58293A4B1C",
        event_type=WebhookEventType.PAYMENT_CAPTURE_COMPLETED,
        resource_type="capture",
        resource_id="TXN-0BMS93U2VQ5E",
        summary="Payment of $329.00 captured for order ORD-71940325",
        created_at=_ts(hours_ago=6),
        payload_preview={"amount": {"value": "329.00", "currency_code": "USD"}, "status": "COMPLETED"},
    ),
    WebhookEvent(
        id="WH-72AB1D3E9F",
        event_type=WebhookEventType.CUSTOMER_DISPUTE_CREATED,
        resource_type="dispute",
        resource_id="PP-D-80003",
        summary="New unauthorized transaction dispute opened for $2,199.99",
        created_at=_ts(days_ago=2),
        payload_preview={"dispute_id": "PP-D-80003", "reason": "UNAUTHORIZED_TRANSACTION", "amount": "2199.99"},
    ),
    WebhookEvent(
        id="WH-41FC8E2D5A",
        event_type=WebhookEventType.CUSTOMER_DISPUTE_UPDATED,
        resource_type="dispute",
        resource_id="PP-D-80002",
        summary="Dispute PP-D-80002 status changed to UNDER_REVIEW",
        created_at=_ts(days_ago=2),
        payload_preview={"dispute_id": "PP-D-80002", "new_status": "UNDER_REVIEW"},
    ),
    WebhookEvent(
        id="WH-93DE7F1A4B",
        event_type=WebhookEventType.CUSTOMER_DISPUTE_RESOLVED,
        resource_type="dispute",
        resource_id="PP-D-80004",
        summary="Dispute PP-D-80004 resolved — buyer refunded $34.99",
        created_at=_ts(days_ago=5),
        payload_preview={"dispute_id": "PP-D-80004", "outcome": "BUYER_WINS", "refund_amount": "34.99"},
    ),
    WebhookEvent(
        id="WH-15BA6C8D2E",
        event_type=WebhookEventType.CUSTOMER_DISPUTE_RESOLVED,
        resource_type="dispute",
        resource_id="PP-D-80005",
        summary="Dispute PP-D-80005 resolved — seller wins, no refund issued",
        created_at=_ts(days_ago=14),
        payload_preview={"dispute_id": "PP-D-80005", "outcome": "SELLER_WINS", "refund_amount": "0.00"},
    ),
    WebhookEvent(
        id="WH-67EF3A9B1C",
        event_type=WebhookEventType.PAYMENT_CAPTURE_COMPLETED,
        resource_type="capture",
        resource_id="TXN-2KPF70X1GS9C",
        summary="Payment of $449.00 captured for order ORD-63841207",
        created_at=_ts(days_ago=2),
        payload_preview={"amount": {"value": "449.00", "currency_code": "USD"}, "status": "COMPLETED"},
    ),
    WebhookEvent(
        id="WH-28CD4E7F5A",
        event_type=WebhookEventType.CHECKOUT_ORDER_APPROVED,
        resource_type="order",
        resource_id="ORD-50273841",
        summary="Checkout order ORD-50273841 approved by buyer",
        created_at=_ts(days_ago=1, hours_ago=2),
        payload_preview={"order_id": "ORD-50273841", "status": "APPROVED", "intent": "CAPTURE"},
    ),
    WebhookEvent(
        id="WH-84AB2C6D8E",
        event_type=WebhookEventType.PAYMENT_CAPTURE_DENIED,
        resource_type="capture",
        resource_id="TXN-FAILED-001",
        summary="Payment capture denied — insufficient funds",
        created_at=_ts(days_ago=3),
        status="FAILED",
        payload_preview={"reason": "INSUFFICIENT_FUNDS", "amount": "899.00"},
    ),
]


# ── Service Functions ─────────────────────────────────────────────────────


def get_transactions() -> list[Transaction]:
    return TRANSACTIONS


def get_transaction_by_id(txn_id: str) -> Transaction | None:
    return next((t for t in TRANSACTIONS if t.id == txn_id), None)


def get_disputes() -> list[Dispute]:
    return DISPUTES


def get_dispute_by_id(dispute_id: str) -> Dispute | None:
    return next((d for d in DISPUTES if d.id == dispute_id), None)


def respond_to_dispute(dispute_id: str, response: DisputeResponse) -> DisputeResponseResult | None:
    dispute = get_dispute_by_id(dispute_id)
    if not dispute:
        return None
    return DisputeResponseResult(
        dispute_id=dispute_id,
        status="RESPONSE_SUBMITTED",
        ai_analysis=(
            f"Your response to dispute {dispute_id} has been analyzed. "
            f"The AI found your message compelling with {len(response.evidence_ids)} evidence items referenced. "
            f"Based on dispute type '{dispute.reason.value}' and evidence strength, "
            f"the recommended next step is to await PayPal's review."
        ),
        recommended_action="AWAIT_REVIEW" if dispute.win_probability > 0.5 else "CONSIDER_SETTLEMENT",
        confidence=dispute.win_probability,
        response_submitted=True,
    )


def get_arena_simulations() -> list[ArenaSimulation]:
    return ARENA_SIMULATIONS


def run_arena_simulation(request: ArenaRunRequest) -> ArenaSimulation:
    """Generate a new arena simulation on-the-fly based on request params."""
    sim_id = f"ARENA-{random.randint(100, 999)}"
    rounds: list[ArenaMove] = []
    attacker_score = 0.0
    defender_score = 0.0

    attack_actions = {
        DisputeReason.ITEM_NOT_RECEIVED: [
            ("CLAIM_NO_DELIVERY", "Package was never delivered to my address."),
            ("DENY_SIGNATURE", "The signature on file is not mine."),
            ("NEIGHBOR_DENIAL", "Asked all neighbors — no one received my package."),
            ("DEMAND_REFUND", "I need a full refund immediately."),
            ("ESCALATE_THREAT", "Will file with consumer protection agency."),
        ],
        DisputeReason.UNAUTHORIZED_TRANSACTION: [
            ("DENY_PURCHASE", "I never authorized this transaction."),
            ("CLAIM_HACKED", "My account credentials were compromised."),
            ("FOREIGN_IP", "Transaction came from an unknown IP address."),
            ("BANK_STATEMENT", "My bank confirms I didn't make this purchase."),
            ("IDENTITY_THEFT", "Filed identity theft report with authorities."),
        ],
        DisputeReason.SIGNIFICANTLY_NOT_AS_DESCRIBED: [
            ("SHOW_DEFECTS", "Item has multiple defects not shown in listing."),
            ("COMPARE_LISTING", "Product differs significantly from listing photos."),
            ("EXPERT_OPINION", "Got professional assessment confirming item is defective."),
            ("RETURN_REFUSED", "Seller refused my return request."),
            ("CONSUMER_RIGHTS", "This violates consumer protection laws."),
        ],
    }

    defend_actions = [
        ("PRESENT_EVIDENCE", "Submitted comprehensive evidence package with timestamps."),
        ("TRACKING_PROOF", "Tracking data confirms delivery with GPS coordinates."),
        ("CUSTOMER_HISTORY", "Buyer's account has prior dispute history."),
        ("POLICY_COMPLIANCE", "All seller protection policies were followed."),
        ("RESOLUTION_OFFER", "Offering fair resolution to resolve this quickly."),
    ]

    fallback_attacks = [
        ("GENERAL_CLAIM", "The product/service did not meet expectations."),
        ("DEMAND_ACTION", "Requesting immediate resolution."),
        ("PROVIDE_PROOF", "Attached supporting documentation."),
        ("ESCALATE", "Will escalate if not resolved promptly."),
        ("FINAL_APPEAL", "This is my final attempt before external action."),
    ]

    attacks = attack_actions.get(request.dispute_type, fallback_attacks)

    for i in range(1, request.num_rounds + 1):
        atk_idx = min(i - 1, len(attacks) - 1)
        def_idx = min(i - 1, len(defend_actions) - 1)

        atk_delta = round(random.uniform(5, 18), 1)
        def_delta = round(random.uniform(7, 20), 1)

        # Adjust based on strategy
        if request.attacker_strategy == "aggressive":
            atk_delta *= 1.1
        if request.defender_strategy == "evidence_based":
            def_delta *= 1.15

        atk_delta = round(atk_delta, 1)
        def_delta = round(def_delta, 1)

        attacker_score += atk_delta
        defender_score += def_delta

        rounds.append(ArenaMove(
            round=i, role=ArenaRole.ATTACKER,
            action=attacks[atk_idx][0], argument=attacks[atk_idx][1],
            score_delta=atk_delta, cumulative_score=round(attacker_score, 1),
        ))
        rounds.append(ArenaMove(
            round=i, role=ArenaRole.DEFENDER,
            action=defend_actions[def_idx][0], argument=defend_actions[def_idx][1],
            score_delta=def_delta, cumulative_score=round(defender_score, 1),
        ))

    winner = ArenaRole.DEFENDER if defender_score >= attacker_score else ArenaRole.ATTACKER

    return ArenaSimulation(
        id=sim_id,
        dispute_type=request.dispute_type,
        attacker_strategy=request.attacker_strategy,
        defender_strategy=request.defender_strategy,
        attacker_final_score=round(attacker_score, 1),
        defender_final_score=round(defender_score, 1),
        winner=winner,
        rounds=rounds,
        total_rounds=request.num_rounds,
        created_at=datetime.now(timezone.utc),
        duration_ms=random.randint(800, 4000),
    )


def get_proof_records() -> list[ProofRecord]:
    return PROOF_RECORDS


def verify_proof(proof_id: str) -> ProofVerifyResult | None:
    proof = next((p for p in PROOF_RECORDS if p.id == proof_id), None)
    if not proof:
        return None
    return ProofVerifyResult(
        proof_id=proof.id,
        evidence_id=proof.evidence_id,
        filename=proof.filename,
        original_hash=proof.original_hash,
        computed_hash=proof.current_hash,
        match=proof.original_hash == proof.current_hash,
        status=proof.status,
        verified_at=datetime.now(timezone.utc),
        chain_of_custody=[
            {"timestamp": _ts(days_ago=12).isoformat(), "action": "UPLOADED", "actor": "seller", "hash": proof.original_hash[:16] + "..."},
            {"timestamp": _ts(days_ago=10).isoformat(), "action": "STORED", "actor": "paysentinel", "hash": proof.original_hash[:16] + "..."},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "action": "VERIFIED", "actor": "proof_engine", "hash": proof.current_hash[:16] + "..."},
        ],
    )


def get_cashflow_runway() -> CashFlowRunway:
    open_disputes = [d for d in DISPUTES if d.outcome == DisputeOutcome.PENDING]
    total_disputed = sum(d.amount for d in open_disputes)
    total_revenue = sum(t.amount for t in TRANSACTIONS if t.status == TransactionStatus.COMPLETED)

    monthly_revenue = 28_450.00
    monthly_expenses = 19_200.00
    current_balance = 47_832.50
    total_held = total_disputed * 0.8  # 80% held in reserve

    net_monthly = monthly_revenue - monthly_expenses
    runway_months = current_balance / monthly_expenses if monthly_expenses > 0 else float("inf")
    adjusted_balance = current_balance - total_held
    runway_with_disputes = adjusted_balance / monthly_expenses if monthly_expenses > 0 else float("inf")

    projected: list[CashFlowEntry] = []
    balance = current_balance
    months = ["Nov 2024", "Dec 2024", "Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025"]
    for i, month in enumerate(months):
        rev = monthly_revenue * (1 + random.uniform(-0.05, 0.08))
        exp = monthly_expenses * (1 + random.uniform(-0.03, 0.05))
        disputed = total_disputed * (0.8 ** (i + 1))  # disputes resolve over time
        net = rev - exp
        balance += net
        projected.append(CashFlowEntry(
            month=month,
            revenue=round(rev, 2),
            expenses=round(exp, 2),
            net=round(net, 2),
            disputed_amount=round(disputed, 2),
            available_balance=round(balance - disputed * 0.8, 2),
        ))

    risk = "LOW" if runway_with_disputes > 4 else "MEDIUM" if runway_with_disputes > 2 else "HIGH"

    return CashFlowRunway(
        current_balance=current_balance,
        monthly_burn_rate=monthly_expenses,
        monthly_revenue=monthly_revenue,
        runway_months=round(runway_months, 1),
        runway_with_disputes=round(runway_with_disputes, 1),
        total_disputed=round(total_disputed, 2),
        total_held=round(total_held, 2),
        open_disputes_count=len(open_disputes),
        projected_cash_flow=projected,
        risk_level=risk,
        recommendation=(
            "Your cash runway is healthy at {:.1f} months. However, {} open disputes totaling ${:,.2f} "
            "could reduce effective runway to {:.1f} months. Prioritize resolving PP-D-80003 "
            "(unauthorized transaction, $2,199.99) as it has the highest impact on cash reserves."
        ).format(runway_months, len(open_disputes), total_disputed, runway_with_disputes),
    )


def get_dashboard_stats() -> DashboardStats:
    total_txn = len(TRANSACTIONS)
    total_rev = sum(t.amount for t in TRANSACTIONS if t.status == TransactionStatus.COMPLETED)
    total_disputes = len(DISPUTES)
    open_disputes = len([d for d in DISPUTES if d.outcome == DisputeOutcome.PENDING])
    wins = len([d for d in DISPUTES if d.outcome == DisputeOutcome.SELLER_WINS])
    resolved = len([d for d in DISPUTES if d.outcome != DisputeOutcome.PENDING])
    win_rate = wins / resolved if resolved > 0 else 0.0

    verified = len([p for p in PROOF_RECORDS if p.status == ProofStatus.VERIFIED])
    tampered = len([p for p in PROOF_RECORDS if p.status == ProofStatus.TAMPERED])

    defender_wins = len([s for s in ARENA_SIMULATIONS if s.winner == ArenaRole.DEFENDER])

    runway = get_cashflow_runway()

    return DashboardStats(
        total_transactions=total_txn,
        total_revenue=round(total_rev, 2),
        total_disputes=total_disputes,
        open_disputes=open_disputes,
        dispute_rate=round(total_disputes / total_txn * 100, 1) if total_txn else 0.0,
        win_rate=round(win_rate * 100, 1),
        avg_resolution_days=6.5,
        total_at_risk=round(sum(d.amount for d in DISPUTES if d.outcome == DisputeOutcome.PENDING), 2),
        proofs_verified=verified,
        proofs_tampered=tampered,
        arena_simulations_run=len(ARENA_SIMULATIONS),
        defender_win_rate=round(defender_wins / len(ARENA_SIMULATIONS) * 100, 1) if ARENA_SIMULATIONS else 0.0,
        runway_months=runway.runway_months,
        monthly_revenue=runway.monthly_revenue,
        monthly_expenses=runway.monthly_burn_rate,
        recent_alerts=[
            {"type": "DISPUTE", "severity": "HIGH", "message": "New unauthorized transaction dispute — $2,199.99 at risk", "timestamp": _ts(days_ago=2).isoformat()},
            {"type": "PROOF", "severity": "CRITICAL", "message": "Evidence file 'pre_shipment_inspection.jpg' failed hash verification — possible tampering", "timestamp": _ts(days_ago=5).isoformat()},
            {"type": "ARENA", "severity": "INFO", "message": "Defender won 2 of 3 arena simulations this week", "timestamp": _ts(days_ago=1).isoformat()},
            {"type": "CASHFLOW", "severity": "WARNING", "message": "Open disputes may reduce cash runway by 0.4 months", "timestamp": _ts(hours_ago=12).isoformat()},
        ],
    )


def get_webhook_events() -> list[WebhookEvent]:
    return WEBHOOK_EVENTS
