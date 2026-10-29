"""Proof Engine routes — SHA-256 evidence verification."""

from fastapi import APIRouter, HTTPException

from app.services.proof_engine import (
    get_all_proofs,
    get_merkle_root,
    verify_proof_record,
)

router = APIRouter(prefix="/api/proofs", tags=["Proof Engine"])


@router.get("")
def list_proofs():
    """Return all proof records with calculated Merkle root and verification status."""
    proofs = get_all_proofs()
    return {
        "count": len(proofs),
        "merkle_root": get_merkle_root(),
        "algorithm": "SHA-256 Binary Merkle Tree",
        "proofs": proofs,
    }


@router.get("/{proof_id}/verify")
def verify_proof(proof_id: str):
    """Verify a specific proof record by mathematically re-computing SHA-256 hash."""
    result = verify_proof_record(proof_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Proof {proof_id} not found")
    return result

