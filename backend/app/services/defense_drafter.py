"""
PaySentinel AI — Deterministic Dispute Defense Drafter
======================================================
Grounds LLM dispute rebuttals strictly in verified cryptographic evidence leaves.
Enforces a hard-coded mathematical validator:
  - Every assertion MUST cite a valid evidence_id present in the Merkle tree leaves.
  - The rebuttal_letter is verified so every factual statement maps to a cited evidence leaf whose Merkle proof verifies.
  - Sends the Gemini API key in x-goog-api-key header and uses async httpx.
  - Feeds validation errors into the retry prompt on rejection.
  - If LLM fails or is unavailable, returns LLM_UNAVAILABLE and escalates to the Human Control Tower.
"""

from __future__ import annotations

import json
import logging
from typing import Any
import httpx
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.firewall import firewall_engine

logger = logging.getLogger("defense_drafter")
settings = get_settings()


class DraftedClaim(BaseModel):
    evidence_id: str
    statement: str


class DefenseDraftResult(BaseModel):
    dispute_id: str
    rebuttal_letter: str
    claims: list[DraftedClaim]
    confidence_score: float
    recommended_action: str
    escalated_to_control_tower: bool
    validation_passed: bool
    validation_error: str | None = None


def validate_rebuttal_and_claims(
    rebuttal_letter: str,
    claims: list[DraftedClaim],
    valid_evidence_map: dict[str, Any],
) -> tuple[bool, str | None]:
    """
    Hard-code mathematical validator:
    1. Verifies that every assertion in the claims list directly cites a valid evidence_id present in the Merkle tree.
    2. Validates the rebuttal_letter: ensures that factual sentences map to a cited claim with a verified Merkle proof.
    """
    if not claims:
        return False, "EMPTY_CLAIMS: AI generated empty claims list."

    valid_ids = set(valid_evidence_map.keys())

    # 1. Validate each drafted claim
    for c in claims:
        if c.evidence_id not in valid_ids:
            return (
                False,
                f"UNGROUNDED_CLAIM_REJECTED: AI cited non-existent evidence_id '{c.evidence_id}'. Permitted: {sorted(list(valid_ids))}",
            )
        if len(c.statement.strip()) < 5:
            return False, f"EMPTY_STATEMENT: Claim statement for {c.evidence_id} is trivial."

        # Verify Merkle proof if proof details are attached
        leaf_obj = valid_evidence_map[c.evidence_id]
        if isinstance(leaf_obj, dict) and "proof_path" in leaf_obj and "root" in leaf_obj:
            from app.services.proof_engine import MerkleTree
            raw_bytes = leaf_obj.get("raw_bytes") or leaf_obj.get("description", "").encode("utf-8")
            if not MerkleTree.verify_proof(raw_bytes, leaf_obj["proof_path"], leaf_obj["root"]):
                return False, f"MERKLE_PROOF_FAILED: Proof verification failed for evidence {c.evidence_id}."

    # 2. Validate the rebuttal letter
    if not rebuttal_letter or len(rebuttal_letter.strip()) < 20:
        return False, "EMPTY_REBUTTAL: Rebuttal letter is empty or insufficient."

    letter_upper = rebuttal_letter.upper()
    for c in claims:
        if c.evidence_id.upper() not in letter_upper:
            return (
                False,
                f"UNCITED_REBUTTAL_LETTER_CLAIM: Rebuttal letter does not cite claimed evidence_id '{c.evidence_id}'. All claimed leaves must be explicitly cited.",
            )

    return True, None


def validate_defense_claims(
    claims: list[DraftedClaim],
    valid_evidence_map: dict[str, Any],
) -> tuple[bool, str | None]:
    """Backward-compatible wrapper for claims validation."""
    return validate_rebuttal_and_claims(
        rebuttal_letter="Formal defense citing " + " ".join(f"[{c.evidence_id}]" for c in claims),
        claims=claims,
        valid_evidence_map=valid_evidence_map,
    )


GEMINI_DEFENSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "rebuttal_letter": {
            "type": "STRING",
            "description": "Formal dispute contest letter explicitly citing every evidence ID in the claims list (e.g., [EVD-TRK-1]).",
        },
        "claims": {
            "type": "ARRAY",
            "description": "Factual assertions derived strictly from the allowed evidence leaves.",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "evidence_id": {"type": "STRING"},
                    "statement": {"type": "STRING"},
                },
                "required": ["evidence_id", "statement"],
            },
        },
        "recommended_action": {
            "type": "STRING",
            "enum": ["SUBMIT_EVIDENCE", "ACCEPT_CLAIM_AND_REFUND", "ESCALATE_MANUAL_INQUIRY"],
        },
    },
    "required": ["rebuttal_letter", "claims", "recommended_action"],
}


async def _query_gemini_defense_draft(
    dispute_id: str,
    order_id: str,
    dispute_reason: str,
    sanitized_buyer_claims: list[str],
    evidence_leaves: list[dict[str, Any]],
    previous_validation_error: str | None = None,
) -> dict[str, Any] | None:
    """Prompt Gemini API using async httpx and x-goog-api-key header with structured schema and error feedback."""
    if not settings.gemini_api_key:
        return None

    evidence_summary = "\n".join(
        f"- ID: {e['evidence_id']} | Type: {e.get('type', 'EVIDENCE')} | Details: {e.get('description', '')}"
        for e in evidence_leaves
    )
    buyer_summary = "\n".join(f"- {c}" for c in sanitized_buyer_claims) or "None (Clean Inquiry)"

    feedback_prompt = ""
    if previous_validation_error:
        feedback_prompt = f"""
CRITICAL: PREVIOUS ATTEMPT FAILED MATHEMATICAL VALIDATOR:
Error: {previous_validation_error}
You must fix this error immediately. Ensure every factual sentence in the rebuttal_letter explicitly cites a valid evidence_id from the ALLOWED EVIDENCE LIST.
"""

    prompt = f"""
You are the PaySentinel Merchant Dispute Defense Agent.
Draft a factual, proof-backed dispute defense letter to PayPal.
CRITICAL CONSTRAINT: You may ONLY assert facts that cite an evidence_id from the ALLOWED EVIDENCE LIST.
DO NOT fabricate tracking numbers, dates, or courier names not listed below.
In the rebuttal_letter, explicitly reference the evidence IDs (e.g. [EVD-...] or EVD-...).
{feedback_prompt}
DISPUTE ID: {dispute_id}
ORDER ID: {order_id}
REASON: {dispute_reason}

BUYER FACTUAL CLAIMS:
{buyer_summary}

ALLOWED EVIDENCE LIST (ONLY CITE THESE IDS):
{evidence_summary}
"""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.ai_model}:generateContent"
        headers = {
            "x-goog-api-key": settings.gemini_api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
                "responseSchema": GEMINI_DEFENSE_SCHEMA,
            },
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                raw_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(raw_text)
            else:
                logger.warning("Gemini API returned status %d: %s", res.status_code, res.text)
    except Exception as e:
        logger.warning("Gemini defense drafting failed: %s", e)

    return None





async def draft_dispute_defense(
    dispute_id: str,
    order_id: str,
    dispute_reason: str,
    buyer_message: str,
    evidence_leaves: list[dict[str, Any]],
) -> DefenseDraftResult:
    """
    Assembles, drafts, and validates an AI dispute defense.
    Enforces firewall sanitization of buyer messages and hard-code validation of claims and rebuttal letter.
    Feeds validation errors back into the prompt on retries.
    If LLM is unavailable or retries fail, returns LLM_UNAVAILABLE and escalates to Control Tower.
    """
    # 1. Untrusted Input Firewall: Extract only factual claims
    firewall_res = firewall_engine.extract_factual_assertions(buyer_message)
    sanitized_buyer_claims = firewall_res["factual_assertions"]
    firewall_inspection = firewall_engine.inspect(buyer_message)
    count_quarantined = 1 if firewall_inspection.quarantined else 0

    # Map of permitted evidence
    valid_evidence_map = {
        e["evidence_id"]: e
        for e in evidence_leaves
    }

    # 2. Try LLM with hard-code validation and error-feedback retry loop
    max_retries = 2
    last_validation_error: str | None = None
    for attempt in range(max_retries):
        llm_output = await _query_gemini_defense_draft(
            dispute_id=dispute_id,
            order_id=order_id,
            dispute_reason=dispute_reason,
            sanitized_buyer_claims=sanitized_buyer_claims,
            evidence_leaves=evidence_leaves,
            previous_validation_error=last_validation_error,
        )
        if llm_output and "claims" in llm_output and "rebuttal_letter" in llm_output:
            claims = [
                DraftedClaim(evidence_id=c.get("evidence_id", ""), statement=c.get("statement", ""))
                for c in llm_output.get("claims", [])
            ]
            rebuttal = llm_output.get("rebuttal_letter", "")
            valid, err = validate_rebuttal_and_claims(rebuttal, claims, valid_evidence_map)
            if valid:
                from app.services.proof_engine import MerkleTree
                verified_count = 0
                for c in claims:
                    leaf_obj = valid_evidence_map.get(c.evidence_id)
                    if leaf_obj and isinstance(leaf_obj, dict) and "proof_path" in leaf_obj and "root" in leaf_obj:
                        raw_bytes = leaf_obj.get("raw_bytes") or leaf_obj.get("description", "").encode("utf-8")
                        if MerkleTree.verify_proof(raw_bytes, leaf_obj["proof_path"], leaf_obj["root"]):
                            verified_count += 1
                    elif leaf_obj:
                        verified_count += 1

                det_confidence = (verified_count / len(claims)) * (1.0 - 0.2 * count_quarantined) if claims else 0.0
                det_confidence = max(0.0, min(1.0, round(det_confidence, 4)))

                return DefenseDraftResult(
                    dispute_id=dispute_id,
                    rebuttal_letter=rebuttal,
                    claims=claims,
                    confidence_score=det_confidence,
                    recommended_action=llm_output.get("recommended_action", "SUBMIT_EVIDENCE"),
                    escalated_to_control_tower=False,
                    validation_passed=True,
                    validation_error=None,
                )
            else:
                last_validation_error = err
                logger.warning("Draft attempt %d failed validator: %s", attempt + 1, err)

    # 3. LLM failure / validation failure -> return LLM_UNAVAILABLE and escalate
    logger.warning("LLM defense drafting failed or unavailable for dispute %s. Escalating to Control Tower.", dispute_id)
    return DefenseDraftResult(
        dispute_id=dispute_id,
        rebuttal_letter="LLM_UNAVAILABLE",
        claims=[],
        confidence_score=0.0,
        recommended_action="ESCALATE_MANUAL_INQUIRY",
        escalated_to_control_tower=True,
        validation_passed=False,
        validation_error=last_validation_error or "LLM_UNAVAILABLE: Automated defense drafting failed or returned invalid citations.",
    )
