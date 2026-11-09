"""Proof Engine routes — SHA-256 evidence verification."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import GenerateProofRequest, GenerateProofResponse
from app.services.proof_engine import (
    generate_dynamic_merkle_proof,
    get_all_proofs,
    get_merchant_public_key_hex,
    get_merkle_root,
    tamper_proof_record,
    verify_proof_record,
)

router = APIRouter(prefix="/api/proofs", tags=["Proof Engine"])


@router.get("/public-key")
def get_proof_public_key():
    """Return the merchant's Ed25519 public key for verifying signed Merkle roots."""
    return {
        "algorithm": "Ed25519",
        "public_key_hex": get_merchant_public_key_hex(),
        "key_id": "MERCHANT_ED25519_01",
        "usage": "Merkle Root Signature Verification",
    }


@router.get("")
def list_proofs():
    """Return all proof records with calculated Merkle root and verification status."""
    proofs = get_all_proofs()
    return {
        "count": len(proofs),
        "data_source": "SIMULATED",
        "merkle_root": get_merkle_root(),
        "algorithm": "SHA-256 Binary Merkle Tree",
        "proofs": proofs,
    }


@router.post("/generate", response_model=GenerateProofResponse)
def generate_proof(body: GenerateProofRequest):
    """Dynamically generate a verified Merkle proof tree with salted attribute commitments."""
    return generate_dynamic_merkle_proof(body)


@router.get("/{proof_id}/verify")
def verify_proof(proof_id: str):
    """Verify a specific proof record by mathematically re-computing SHA-256 hash."""
    result = verify_proof_record(proof_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Proof {proof_id} not found")
    return result


@router.post("/{proof_id}/tamper")
def tamper_proof(proof_id: str):
    """Simulates evidence tampering by flipping a stored raw evidence byte."""
    success = tamper_proof_record(proof_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Proof {proof_id} not found")
    return {"status": "TAMPERED", "proof_id": proof_id, "detail": "One byte flipped in raw evidence store."}


