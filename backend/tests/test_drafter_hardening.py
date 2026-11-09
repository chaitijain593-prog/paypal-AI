"""
Unit & Integration Tests for Step 7: Deterministic Defense Drafter Hardening
============================================================================
Covers:
1. Rebuttal letter validation: every factual sentence must cite an existing leaf whose Merkle proof verifies.
2. Rejection of ungrounded sentences and unbacked claims.
3. On LLM failure: returns LLM_UNAVAILABLE and escalates (no hardcoded 0.92 template).
4. Gemini API called with x-goog-api-key header via async httpx.
5. Validation error fed into retry prompt on failure.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from unittest.mock import AsyncMock, patch
import httpx
import pytest

from app.core.config import get_settings
from app.services.defense_drafter import (
    DraftedClaim,
    _query_gemini_defense_draft,
    draft_dispute_defense,
    validate_rebuttal_and_claims,
)
from app.services.proof_engine import MerkleTree


@pytest.fixture
def sample_merkle_evidence():
    raw_1 = b"USPS_DELIVERY_CONFIRMATION_SCAN_94001"
    raw_2 = b"SIGNATURE_CAPTURE_TERMINAL_MC93_MARCUS"
    tree = MerkleTree([raw_1, raw_2])

    return {
        "EVD-CARRIER-01": {
            "evidence_id": "EVD-CARRIER-01",
            "type": "CARRIER_TRACKING",
            "description": "USPS tracking confirmed delivery.",
            "raw_bytes": raw_1,
            "proof_path": tree.get_proof_path(0),
            "root": tree.root_hash,
        },
        "EVD-SIG-02": {
            "evidence_id": "EVD-SIG-02",
            "type": "PROOF_OF_DELIVERY",
            "description": "Recipient signature matches buyer.",
            "raw_bytes": raw_2,
            "proof_path": tree.get_proof_path(1),
            "root": tree.root_hash,
        },
    }


def test_validator_accepts_verified_rebuttal(sample_merkle_evidence):
    """Rebuttal letter citing verified evidence leaves with valid Merkle proofs passes validator."""
    claims = [
        DraftedClaim(evidence_id="EVD-CARRIER-01", statement="USPS delivery confirmed on Oct 15."),
        DraftedClaim(evidence_id="EVD-SIG-02", statement="Signature verified on MC93 terminal."),
    ]
    rebuttal = (
        "Dear PayPal Claims Specialist,\n\n"
        "We are contesting this dispute using cryptographic evidence [EVD-CARRIER-01] and [EVD-SIG-02]. "
        "Fulfillment was completed and verified."
    )

    valid, err = validate_rebuttal_and_claims(rebuttal, claims, sample_merkle_evidence)
    assert valid is True
    assert err is None


def test_validator_rejects_uncited_rebuttal(sample_merkle_evidence):
    """Rebuttal letter with no citation of permitted evidence leaves fails validator."""
    claims = [
        DraftedClaim(evidence_id="EVD-CARRIER-01", statement="USPS delivery confirmed on Oct 15."),
    ]
    rebuttal = (
        "Dear PayPal Claims Specialist,\n\n"
        "Customer says they did not get it but we are sure we shipped it. Please release the funds immediately."
    )

    valid, err = validate_rebuttal_and_claims(rebuttal, claims, sample_merkle_evidence)
    assert valid is False
    assert "UNCITED_REBUTTAL_LETTER" in err


def test_validator_rejects_hallucinated_claim_id(sample_merkle_evidence):
    """Claim citing non-existent evidence ID fails validator."""
    claims = [
        DraftedClaim(evidence_id="EVD-CARRIER-01", statement="USPS delivery confirmed."),
        DraftedClaim(evidence_id="FAKE-EVIDENCE-999", statement="Ring camera saw package."),
    ]
    rebuttal = "Contesting dispute citing [EVD-CARRIER-01] and [FAKE-EVIDENCE-999]."

    valid, err = validate_rebuttal_and_claims(rebuttal, claims, sample_merkle_evidence)
    assert valid is False
    assert "UNGROUNDED_CLAIM_REJECTED" in err


def test_validator_rejects_corrupted_merkle_proof(sample_merkle_evidence):
    """If evidence leaf's Merkle proof does not mathematically verify against root, validator rejects."""
    claims = [
        DraftedClaim(evidence_id="EVD-CARRIER-01", statement="USPS delivery confirmed."),
    ]
    rebuttal = "Contesting dispute citing [EVD-CARRIER-01]."

    # Corrupt the root in the evidence leaf
    corrupted_evidence = dict(sample_merkle_evidence)
    corrupted_evidence["EVD-CARRIER-01"] = dict(corrupted_evidence["EVD-CARRIER-01"])
    corrupted_evidence["EVD-CARRIER-01"]["root"] = "0" * 64

    valid, err = validate_rebuttal_and_claims(rebuttal, claims, corrupted_evidence)
    assert valid is False
    assert "MERKLE_PROOF_FAILED" in err


@pytest.mark.anyio
async def test_llm_failure_returns_llm_unavailable_and_escalates(sample_merkle_evidence):
    """When LLM is unavailable or fails, returns LLM_UNAVAILABLE and escalates (no hardcoded 0.92 template)."""
    with patch("app.services.defense_drafter._query_gemini_defense_draft", new=AsyncMock(return_value=None)):
        res = await draft_dispute_defense(
            dispute_id="PP-D-TEST-FAIL",
            order_id="ORD-FAIL",
            dispute_reason="MERCHANDISE_NOT_RECEIVED",
            buyer_message="Never got it",
            evidence_leaves=list(sample_merkle_evidence.values()),
        )
        assert res.validation_passed is False
        assert res.escalated_to_control_tower is True
        assert res.rebuttal_letter == "LLM_UNAVAILABLE"
        assert res.confidence_score == 0.0
        assert res.recommended_action == "ESCALATE_MANUAL_INQUIRY"
        assert "LLM_UNAVAILABLE" in res.validation_error


@pytest.mark.anyio
async def test_gemini_query_sends_x_goog_api_key_header(monkeypatch):
    """_query_gemini_defense_draft sends x-goog-api-key header and uses async httpx client."""
    settings = get_settings()
    monkeypatch.setattr(settings, "gemini_api_key", "test-gemini-secret-key-12345")
    monkeypatch.setattr(settings, "ai_model", "gemini-2.5-flash")

    captured_headers = {}

    def mock_post(url, headers, json):
        nonlocal captured_headers
        captured_headers = headers
        mock_response = httpx.Response(
            status_code=200,
            json={
                "candidates": [{
                    "content": {
                        "parts": [{
                            "text": '{"rebuttal_letter": "Rebuttal citing [EVD-1]", "claims": [{"evidence_id": "EVD-1", "statement": "Delivered"}], "confidence_score": 0.95, "recommended_action": "SUBMIT_EVIDENCE"}'
                        }]
                    }
                }]
            },
            request=httpx.Request("POST", url),
        )
        return mock_response

    with patch.object(httpx.AsyncClient, "post", new=AsyncMock(side_effect=mock_post)):
        res = await _query_gemini_defense_draft(
            dispute_id="PP-123",
            order_id="ORD-123",
            dispute_reason="INR",
            sanitized_buyer_claims=["Item missing"],
            evidence_leaves=[{"evidence_id": "EVD-1", "description": "Delivered"}],
        )
        assert res is not None
        assert captured_headers.get("x-goog-api-key") == "test-gemini-secret-key-12345"


@pytest.mark.anyio
async def test_validation_error_fed_into_retry_prompt(monkeypatch, sample_merkle_evidence):
    """When attempt 1 fails validation, attempt 2 feeds the validator error into the prompt."""
    settings = get_settings()
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")

    call_count = 0
    prompts_seen = []

    # Attempt 1 returns ungrounded rebuttal (no citation); Attempt 2 returns valid citation
    async def mock_query(*args, **kwargs):
        nonlocal call_count, prompts_seen
        call_count += 1
        prev_err = kwargs.get("previous_validation_error")
        prompts_seen.append(prev_err)
        if call_count == 1:
            return {
                "rebuttal_letter": "Generic rebuttal without citations.",
                "claims": [{"evidence_id": "EVD-CARRIER-01", "statement": "Delivered to address."}],
                "confidence_score": 0.5,
                "recommended_action": "SUBMIT_EVIDENCE",
            }
        else:
            return {
                "rebuttal_letter": "Rebuttal citing verified [EVD-CARRIER-01] proof.",
                "claims": [{"evidence_id": "EVD-CARRIER-01", "statement": "Delivered to address."}],
                "confidence_score": 0.95,
                "recommended_action": "SUBMIT_EVIDENCE",
            }

    with patch("app.services.defense_drafter._query_gemini_defense_draft", new=AsyncMock(side_effect=mock_query)):
        res = await draft_dispute_defense(
            dispute_id="PP-RETRY-01",
            order_id="ORD-RETRY-01",
            dispute_reason="INR",
            buyer_message="Did not receive item",
            evidence_leaves=list(sample_merkle_evidence.values()),
        )
        assert call_count == 2
        # Verify that attempt 2 was fed the error from attempt 1
        assert prompts_seen[0] is None
        assert "UNCITED_REBUTTAL_LETTER" in prompts_seen[1]
        assert res.validation_passed is True
