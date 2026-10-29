"""Proof Engine routes — SHA-256 evidence verification."""

from fastapi import APIRouter, HTTPException

from app.services.mock_data import get_proof_records, verify_proof

router = APIRouter(prefix="/api/proofs", tags=["Proof Engine"])


@router.get("")
def list_proofs():
    """Return all proof records with verification status."""
    proofs = get_proof_records()
    return {"count": len(proofs), "proofs": proofs}


@router.get("/{proof_id}/verify")
def verify_proof_record(proof_id: str):
    """Verify a specific proof record by re-computing SHA-256 hash."""
    result = verify_proof(proof_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Proof {proof_id} not found")
    return result
