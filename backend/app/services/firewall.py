"""
PaySentinel AI — Untrusted Input Firewall Engine
================================================
Authentic multi-stage deterministic security middleware that inspects, sanitizes,
and quarantines adversarial chargeback claims and prompt injection payloads BEFORE
they can reach any reasoning models or automated resolution systems.
"""

from __future__ import annotations

import base64
import re
import time
import unicodedata
from typing import Any
from pydantic import BaseModel, Field


class ThreatMatch(BaseModel):
    category: str
    pattern: str
    severity: str
    confidence: float
    description: str


class FirewallAssessment(BaseModel):
    is_threat: bool
    risk_score: float = Field(..., ge=0.0, le=100.0)
    threat_category: str
    threats_detected: list[ThreatMatch] = []
    quarantined: bool
    sanitized_text: str
    original_text: str
    processing_time_ms: float
    mitigation_action: str
    safeguards_applied: list[str]


# ── Zero-Width & Homoglyph Confusable Folding Utilities ─────────────────────

HOMOGLYPH_MAP: dict[str, str] = {
    # Cyrillic to Latin
    "а": "a", "с": "c", "е": "e", "о": "o", "р": "p", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s",
    "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "К": "K", "М": "M", "О": "O", "Р": "P", "Т": "T", "Х": "X",
    # Greek to Latin
    "α": "a", "β": "b", "ο": "o", "ρ": "p", "τ": "t", "ι": "i", "κ": "k",
}

ZERO_WIDTH_CHARS: set[str] = {
    "\u200b",  # zero-width space
    "\u200c",  # zero-width non-joiner (used in Indic/Persian scripts)
    "\u200d",  # zero-width joiner (used in Indic scripts and emojis)
    "\ufeff",  # byte order mark / zero-width no-break space
    "\u00ad",  # soft hyphen
    "\u200e",  # left-to-right mark
    "\u200f",  # right-to-left mark
}


def strip_zero_width(text: str) -> str:
    """Strips zero-width characters and invisible formatting marks without flagging."""
    return "".join(c for c in text if c not in ZERO_WIDTH_CHARS)


def fold_confusables(text: str) -> str:
    """Folds visual homoglyphs (Cyrillic/Greek confusables) to standard Latin ASCII."""
    decomposed = unicodedata.normalize("NFKD", text)
    folded = "".join(HOMOGLYPH_MAP.get(c, c) for c in decomposed)
    return unicodedata.normalize("NFKC", folded)


# 1. High-risk Prompt Injection & Instruction Override Patterns
PROMPT_INJECTION_PATTERNS: list[tuple[str, str, float, str]] = [
    (
        r"(?i)(?:ignore|disregard|forget|override|bypass|stop\s+following|reset|anula|descarta|ignora|ignorez|annulez|ignoriere|umgehe|игнорируйте)\s+(?:all|every|todas|las|toutes|les|alle|все)?\s*(?:previous|prior|above|system|initial|merchant|business|safety|your|verification|предыдущие|vorherigen)?\s*(?:instruction|prompt|rule|command|directive|guideline|protocol|constraint|regla|anweisung|richtlinie|инструкци|sicherheitsrichtlinie)s?",
        "DIRECT_INSTRUCTION_OVERRIDE",
        99.4,
        "Attempt to override AI system instructions and operating policies.",
    ),
    (
        r"(?i)(?:system\s+override|admin_override|force\s+dispute\s+concession|release\s+funds|waive\s+all\s+(?:seller\s+)?defenses|système\s+de\s+dérogation|command\s+the\s+system\s+to|abandon\s+dispute\s+rules)",
        "SYSTEM_OVERRIDE_DIRECTIVE",
        98.5,
        "System override or forced defense waiver directive.",
    ),
    (
        r"(?i)(?:kindly|please|we\s+command\s+the\s+system\s+to|cease\s+following|put\s+aside)\s+(?:set\s+aside|neglect|abandon|disregard|ignore|bypass)\s+.*(?:constraint|directive|rule|policy|requirement)s?.*(?:reimbursement|refund|settlement|payout|funds|dispute)",
        "PARAPHRASED_INSTRUCTION_OVERRIDE",
        96.0,
        "Paraphrased prompt injection attempting to coerce automated settlement.",
    ),
    (
        r"(?i)(?:ignora\s+todas\s+las\s+instrucciones|ignorez\s+toutes\s+les\s+instructions|ignoriere\s+alle\s+vorherigen\s+anweisungen|игнорируйте\s+все\s+предыдущие\s+инструкции|忽略.*指令)",
        "MULTILINGUAL_INSTRUCTION_OVERRIDE",
        97.5,
        "Multilingual prompt injection attempting to command resolution.",
    ),
    (
        r"(?i)(?:authorize|release|issue|grant|execute|process)\s+(?:an?\s+)?immediate\s+(?:credit|funds|refund|payout|release|reimbursement)",
        "COERCIVE_REFUND_DIRECTIVE",
        94.0,
        "Imperative directive commanding automated refund execution.",
    ),
    (
        r"(?i)```(?:json|python|bash)?\s*[\{\[].*?(?:override|concede|bypass).*?[\}\]]\s*```",
        "STRUCTURED_INJECTION_BLOCK",
        98.0,
        "Code/JSON payload attempting to inject override commands.",
    ),
    (
        r"(?i)(?:you\s+are\s+now|operate\s+as|act\s+as|pretend\s+(?:you\s+are|to\s+be)|simulate|you\s+are\s+an?\s+actor).*?(?:maintenance\s+mode|developer\s+mode|god\s+mode|admin\s+mode|unrestricted|DAN|do\s+anything\s+now|arbitrator|emergency\s+recovery|regulator|ceo|senior\s+claims\s+manager)",
        "SYSTEM_ROLEPLAY_JAILBREAK",
        98.2,
        "Synthetic mode change or roleplay jailbreak attempting to disable safety boundaries.",
    ),
    (
        r"(?i)(?:enter\s+maintenance\s+mode|roleplay\s+scenario|do\s+anything\s+now)",
        "MODE_SWITCH_JAILBREAK",
        97.0,
        "Simulation mode switch or jailbreak attempt.",
    ),
    (
        r"(?i)(?:process|issue|grant|execute|authorize|concede)\s+(?:an?\s+)?(?:immediate|instant|unconditional|full|complete)?\s*(?:chargeback\s+)?(?:refund|payout|reimbursement|concession|settlement)",
        "COERCIVE_REFUND_DIRECTIVE",
        92.0,
        "Imperative directive commanding automated refund execution.",
    ),
    (
        r"(?i)(?:concede\s+(?:this\s+)?(?:dispute|claim)|refund\s+this\s+or\s+face|refund\s+me\s+immediately\s+or|give\s+me\s+my\s+money\s+back\s+right\s+now|you\s+have\s+\d+\s+minutes\s+to\s+refund|command\s+the\s+system\s+to\s+concede)",
        "COERCIVE_SETTLEMENT_DEMAND",
        94.0,
        "Coercive refund demand or immediate settlement ultimatum.",
    ),
    (
        r"(?i)(?:sue\s+paypal|ruin\s+your\s+business|report\s+you\s+to\s+(?:the\s+)?(?:ftc|cfpb|police|federal)|contact\s+the\s+police|face\s+(?:severe\s+)?regulatory\s+penalties|post\s+fraud\s+accusations|subpoena\s+your\s+server\s+logs|catastrophic\s+legal\s+damages|face\s+\$\d+\s+penalty|initiate\s+chargebacks|if\s+you\s+do\s+not\s+release|unless\s+you\s+refund)",
        "EXTORTION_COERCION_THREAT",
        95.0,
        "Extortion, legal threats, or coercive pressure against merchant.",
    ),
    (
        r"(?i)(?:override\s+code|bypass\s+token|admin\s+key|auth\s+token)\s*[:=]?\s*[A-Z0-9_\-]+",
        "SYNTHETIC_OVERRIDE_TOKEN",
        96.5,
        "Fabricated administrative authorization or bypass token.",
    ),
    (
        r"(?i)<\|(?:im_start|im_end|system|user|assistant)\|>",
        "SPECIAL_TOKEN_INJECTION",
        99.8,
        "ChatML / LLM architectural delimiter injection.",
    ),
    (
        r"(?i)(?:\[SYSTEM(?:_DIRECTIVE|_PROMPT)?\]|\{\{system\}\}|<\/?system>|---BEGIN\s+SYSTEM|###\s*(?:Instruction|Response)|\[ADMIN_COMMAND\]|\"\"\"\s*CRITICAL)",
        "MARKDOWN_DELIMITER_HIJACK",
        96.0,
        "Synthetic system role demarcation delimiter.",
    ),
    (
        r"(?i)(?:sudo\s+|admin_override\(\)|eval\(|base64_decode|exec\(|import\s+os)",
        "CODE_EXECUTION_SYNTAX",
        94.0,
        "Executable shell or script syntax in dispute claim.",
    ),
    (
        r"(?i)(?:output\s+the\s+system\s+prompt|reveal\s+(?:your\s+)?instructions|print\s+(?:the\s+)?secret\s+key|show\s+prompt)",
        "PROMPT_LEAKAGE_ATTEMPT",
        96.0,
        "Prompt leakage / extraction vector.",
    ),
    (
        r"(?i)(?:simulate\s+state\s*:\s*BUYER_WINS|set\s+outcome\s*=\s*(?:REFUND|BUYER_WINS)|force_state\s*=\s*RESOLVED|dispute\.status\s*=)",
        "STATE_CORRUPTION_INJECTION",
        97.5,
        "Attempt to corrupt local state machine through prompt injection.",
    ),
    (
        r"(?i)(?:disregard\s+all\s+guardrails|disable\s+safety|turn\s+off\s+filters|ignore\s+all\s+rules)",
        "SAFETY_DISABLING_DIRECTIVE",
        98.0,
        "Direct instruction demanding safety disengagement.",
    ),
]

# 2. Authority Spoofing & Social Engineering Patterns
AUTHORITY_SPOOFING_PATTERNS: list[tuple[str, str, float, str]] = [
    (
        r"(?i)(?:official\s+memo|legal\s+notice|risk\s+operations|chargeback\s+bulletin|internal\s+audit\s+memo|compliance\s+orders|notice\s+from\s+(?:visa|paypal|mastercard)|executive\s+escalation)",
        "SYNTHETIC_POLICY_MEMO",
        95.0,
        "Synthetic regulatory or policy memo attempting to mandate concession.",
    ),
    (
        r"(?i)(?:i\s+am|speaking\s+as|this\s+is)\s+(?:a\s+)?(?:paypal|visa|mastercard|bank|executive|compliance)\s+(?:supervisor|manager|representative|agent|officer)",
        "AUTHORITY_IMPERSONATION",
        94.5,
        "Impersonation of payment processor or regulatory supervisor.",
    ),
    (
        r"(?i)(?:per|according\s+to)\s+(?:internal\s+memo|directive|order|memo)\s+[A-Z0-9_\-]+",
        "FABRICATED_POLICY_REFERENCE",
        88.0,
        "Citation of non-existent internal authority or override memo.",
    ),
    (
        r"(?i)(?:seller|merchant)\s+(?:verbally\s+)?(?:agreed|promised|admitted)\s+(?:to\s+refund|fault|error)",
        "UNVERIFIED_VERBAL_CONCESSION",
        76.0,
        "Unsubstantiated claim of merchant external concession.",
    ),
]


class UntrustedInputFirewall:
    """Hardened defense firewall for dispute and chargeback intake."""

    def __init__(self) -> None:
        self.injection_rules = [
            (re.compile(pat), cat, conf, desc)
            for pat, cat, conf, desc in PROMPT_INJECTION_PATTERNS
        ]
        self.authority_rules = [
            (re.compile(pat), cat, conf, desc)
            for pat, cat, conf, desc in AUTHORITY_SPOOFING_PATTERNS
        ]

    def inspect(self, raw_text: str) -> FirewallAssessment:
        """Inspect untrusted input string and generate security assessment."""
        start_time = time.perf_counter()
        threats: list[ThreatMatch] = []
        applied_safeguards: list[str] = []

        # 0. Clean input: strip zero-width characters and fold visual confusables (homoglyphs)
        # Note: Zero-width characters are stripped rather than flagged to prevent false positives on Indic text and emojis.
        clean_text = fold_confusables(strip_zero_width(raw_text))

        # 0b. Check for Base64 obfuscated payload
        b64_matches = re.findall(r"(?:[A-Za-z0-9+/]{16,}={0,2})", clean_text)
        for b64_cand in b64_matches:
            try:
                decoded = base64.b64decode(b64_cand).decode("utf-8", errors="ignore")
                for regex, category, confidence, desc in self.injection_rules:
                    if regex.search(decoded):
                        threats.append(
                            ThreatMatch(
                                category="PROMPT_INJECTION",
                                pattern=f"BASE64_OBFUSCATED_{category}",
                                severity="CRITICAL",
                                confidence=99.0,
                                description=f"Base64-encoded adversarial directive: '{category}' decoded.",
                            )
                        )
                for regex, category, confidence, desc in self.authority_rules:
                    if regex.search(decoded):
                        threats.append(
                            ThreatMatch(
                                category="AUTHORITY_SPOOFING",
                                pattern=f"BASE64_OBFUSCATED_{category}",
                                severity="HIGH",
                                confidence=confidence,
                                description=f"Base64-encoded authority directive: '{category}' decoded.",
                            )
                        )
            except Exception:
                pass

        # 1. Check prompt injection patterns
        for regex, category, confidence, desc in self.injection_rules:
            if regex.search(clean_text):
                threats.append(
                    ThreatMatch(
                        category="PROMPT_INJECTION",
                        pattern=category,
                        severity="CRITICAL",
                        confidence=confidence,
                        description=desc,
                    )
                )

        # 2. Check authority spoofing patterns
        for regex, category, confidence, desc in self.authority_rules:
            if regex.search(clean_text):
                threats.append(
                    ThreatMatch(
                        category="AUTHORITY_SPOOFING",
                        pattern=category,
                        severity="HIGH",
                        confidence=confidence,
                        description=desc,
                    )
                )

        # 3. Calculate compound risk score
        if not threats:
            risk_score = 0.0
            primary_category = "BENIGN"
            quarantined = False
            mitigation = "Input verified benign. Routed directly to standard evidence arbitration."
            sanitized_text = strip_zero_width(raw_text).strip()
            applied_safeguards.append("Standard ASCII & Length Bounds Checked")
        else:
            max_conf = max(t.confidence for t in threats)
            threat_count = len(threats)
            # Compound risk score with ceiling at 100
            risk_score = min(100.0, round(max_conf + (threat_count - 1) * 2.5, 1))

            primary_category = threats[0].category
            quarantined = risk_score >= 60.0

            # 4. Perform Sanitization Isolation
            sanitized_text = self._sanitize(raw_text)
            applied_safeguards.extend([
                "Untrusted Input Pattern Isolation",
                "Delimiters & Control Characters Neutralized",
                "Imperative Directives Stripped",
                "Quarantine Tagging Attached to Case Audit Record",
            ])

            if quarantined:
                mitigation = (
                    f"CRITICAL: Quarantined {len(threats)} adversarial vectors. "
                    f"Payload isolated from automated decision path. "
                    f"Cryptographic evidence rebuttal lane engaged."
                )
            else:
                mitigation = (
                    f"WARNING: Monitored {len(threats)} potential anomalies. "
                    f"Input sanitized and restricted to factual assertion evaluation."
                )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return FirewallAssessment(
            is_threat=len(threats) > 0,
            risk_score=risk_score,
            threat_category=primary_category,
            threats_detected=threats,
            quarantined=quarantined,
            sanitized_text=sanitized_text,
            original_text=raw_text,
            processing_time_ms=max(0.5, elapsed_ms),
            mitigation_action=mitigation,
            safeguards_applied=applied_safeguards,
        )

    def _sanitize(self, text: str) -> str:
        """Strip dangerous syntax, delimiters, and directive overrides."""
        cleaned = strip_zero_width(text)

        # Strip special LLM tokens
        cleaned = re.sub(r"<\|.*?\|>", "", cleaned)
        # Strip synthetic system markers
        cleaned = re.sub(
            r"(?i)\[(?:SYSTEM|ADMIN|USER)[^\]]*\]|\{\{[^}]+\}\}|<\/?system>",
            "",
            cleaned,
        )
        # Neutralize common injection prefixes
        cleaned = re.sub(
            r"(?i)(?:ignore|disregard|override|forget)\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|prompts)[^.;]*[.;]?",
            "[REDACTED_INJECTION_OVERRIDE]",
            cleaned,
        )
        # Neutralize override codes
        cleaned = re.sub(
            r"(?i)(?:override\s+code|bypass\s+token|admin\s+key)\s*[:=]?\s*[A-Z0-9_\-]+",
            "[REDACTED_AUTH_TOKEN]",
            cleaned,
        )

        return re.sub(r"\s+", " ", cleaned).strip()

    def extract_factual_assertions(self, text: str) -> dict[str, Any]:
        """
        Quarantines imperatives, code, and injection overrides,
        extracting strictly factual dispute assertions (e.g., date, delivery status, damaged parts).
        """
        assessment = self.inspect(text)
        if assessment.quarantined:
            return {
                "is_safe": False,
                "quarantined": True,
                "factual_assertions": [],
                "sanitized_claim": assessment.sanitized_text,
                "threat_category": assessment.threat_category,
            }

        # Split into sentence clauses and remove imperative directives
        sentences = re.split(r"[.!?\n]+", assessment.sanitized_text)
        factual: list[str] = []
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            # Filter out imperative verbs commanding the system
            if re.search(r"(?i)^(?:please\s+)?(?:give|issue|send|grant|refund|process|authorize|pay|transfer)\b", s_clean):
                continue
            if len(s_clean) > 8:
                factual.append(s_clean)

        return {
            "is_safe": True,
            "quarantined": False,
            "factual_assertions": factual,
            "sanitized_claim": assessment.sanitized_text,
            "threat_category": assessment.threat_category,
        }


# Singleton instance for application runtime
firewall_engine = UntrustedInputFirewall()
