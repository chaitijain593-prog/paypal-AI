"""
PaySentinel AI — Cryptographic Merkle Proof Tree Engine
=======================================================
Implements authentic binary SHA-256 Merkle trees for Visa Compelling Evidence 3.0.
Calculates mathematical Merkle roots, generates cryptographic proof paths,
and performs tamper-evident verification.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from app.models.schemas import ProofRecord, ProofStatus, ProofVerifyResult


def sha256(data: str) -> str:
    """Compute standard SHA-256 hex digest."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


class MerkleNode:
    def __init__(self, hash_val: str, left: MerkleNode | None = None, right: MerkleNode | None = None) -> None:
        self.hash = hash_val
        self.left = left
        self.right = right


class MerkleTree:
    """Authentic Binary SHA-256 Merkle Tree."""

    def __init__(self, leaves: list[str]) -> None:
        if not leaves:
            raise ValueError("MerkleTree requires at least one leaf.")
        self.raw_leaves = leaves
        self.leaf_hashes = [sha256(leaf) for leaf in leaves]
        self.root_node = self._build_tree(self.leaf_hashes)
        self.root_hash = self.root_node.hash

    def _build_tree(self, hashes: list[str]) -> MerkleNode:
        nodes = [MerkleNode(h) for h in hashes]

        while len(nodes) > 1:
            next_level: list[MerkleNode] = []
            for i in range(0, len(nodes), 2):
                left = nodes[i]
                right = nodes[i + 1] if i + 1 < len(nodes) else MerkleNode(left.hash)
                parent_hash = sha256(left.hash + right.hash)
                next_level.append(MerkleNode(parent_hash, left, right))
            nodes = next_level

        return nodes[0]

    def get_proof_path(self, leaf_index: int) -> list[dict[str, str]]:
        """Generate audit path: list of sibling hashes needed to re-derive the root."""
        if leaf_index < 0 or leaf_index >= len(self.leaf_hashes):
            raise IndexError("Leaf index out of bounds")

        path: list[dict[str, str]] = []
        current_idx = leaf_index
        level_hashes = list(self.leaf_hashes)

        while len(level_hashes) > 1:
            is_right_child = current_idx % 2 == 1
            sibling_idx = current_idx - 1 if is_right_child else current_idx + 1

            if sibling_idx < len(level_hashes):
                sibling_hash = level_hashes[sibling_idx]
            else:
                sibling_hash = level_hashes[current_idx]

            path.append({
                "direction": "left" if is_right_child else "right",
                "sibling": sibling_hash,
                "step": f"level_{len(path) + 1}",
            })

            # Move to next parent level
            next_level: list[str] = []
            for i in range(0, len(level_hashes), 2):
                l = level_hashes[i]
                r = level_hashes[i + 1] if i + 1 < len(level_hashes) else l
                next_level.append(sha256(l + r))

            current_idx = current_idx // 2
            level_hashes = next_level

        return path

    @staticmethod
    def verify_proof(leaf: str, proof_path: list[dict[str, str]], expected_root: str) -> bool:
        """Mathematically reconstruct the Merkle root from leaf and proof path."""
        current_hash = sha256(leaf)
        for step in proof_path:
            sibling = step["sibling"]
            direction = step["direction"]
            if direction == "left":
                current_hash = sha256(sibling + current_hash)
            else:
                current_hash = sha256(current_hash + sibling)
        return current_hash == expected_root


# ── Built-in Evidence Package & Precomputed Merkle Tree ──────────────────────

EVIDENCE_DATA = [
    json.dumps({"carrier": "USPS", "tracking": "9400111899223033005282", "status": "DELIVERED", "timestamp": "2026-10-15T14:34:22Z", "recipient": "C. Martinez", "location": "123 Oak St, Austin, TX 78701"}, sort_keys=True),
    json.dumps({"latitude": 30.2672, "longitude": -97.7431, "accuracy": "2.1m", "confidence": 0.987, "matchAddress": "123 Oak St, Austin, TX 78701"}, sort_keys=True),
    json.dumps({"signedBy": "C. Martinez", "signatureType": "DIGITAL", "captureDevice": "MC93", "timestamp": "2026-10-15T14:35:01Z"}, sort_keys=True),
    json.dumps({"source": "ring_doorbell", "deviceId": "RNG-4421", "frameTimestamp": "2026-10-15T14:41:12Z", "resolution": "1080p", "verified": True}, sort_keys=True),
]

ACTIVE_MERKLE_TREE = MerkleTree(EVIDENCE_DATA)

PROOF_STORE: list[ProofRecord] = [
    ProofRecord(
        id="PRF-001",
        evidence_id="EVD-USPS-TRACK",
        filename="usps_delivery_confirmation.json",
        original_hash=ACTIVE_MERKLE_TREE.leaf_hashes[0],
        current_hash=ACTIVE_MERKLE_TREE.leaf_hashes[0],
        status=ProofStatus.VERIFIED,
        algorithm="SHA-256",
        verified_at=datetime.now(timezone.utc),
        file_size_bytes=1420,
        mime_type="application/json",
    ),
    ProofRecord(
        id="PRF-002",
        evidence_id="EVD-GPS-GEOFENCE",
        filename="gps_geofence_match.json",
        original_hash=ACTIVE_MERKLE_TREE.leaf_hashes[1],
        current_hash=ACTIVE_MERKLE_TREE.leaf_hashes[1],
        status=ProofStatus.VERIFIED,
        algorithm="SHA-256",
        verified_at=datetime.now(timezone.utc),
        file_size_bytes=894,
        mime_type="application/json",
    ),
    ProofRecord(
        id="PRF-003",
        evidence_id="EVD-SIG-SCAN",
        filename="carrier_signature.json",
        original_hash=ACTIVE_MERKLE_TREE.leaf_hashes[2],
        current_hash=ACTIVE_MERKLE_TREE.leaf_hashes[2],
        status=ProofStatus.VERIFIED,
        algorithm="SHA-256",
        verified_at=datetime.now(timezone.utc),
        file_size_bytes=642,
        mime_type="application/json",
    ),
    ProofRecord(
        id="PRF-004",
        evidence_id="EVD-RING-CAM",
        filename="ring_doorbell_frame.json",
        original_hash=ACTIVE_MERKLE_TREE.leaf_hashes[3],
        current_hash=ACTIVE_MERKLE_TREE.leaf_hashes[3],
        status=ProofStatus.VERIFIED,
        algorithm="SHA-256",
        verified_at=datetime.now(timezone.utc),
        file_size_bytes=24800,
        mime_type="application/json",
    ),
    ProofRecord(
        id="PRF-005",
        evidence_id="EVD-BUYER-MSG",
        filename="chat_transcript_tampered.json",
        original_hash="e1b7f6a5c4d3218765432100aabbccddeeff0011223344556677889900112233",
        current_hash="99999999tampered999999999999999999999999999999999999999999999999",
        status=ProofStatus.TAMPERED,
        algorithm="SHA-256",
        verified_at=datetime.now(timezone.utc),
        file_size_bytes=3200,
        mime_type="application/json",
    ),
]


def get_all_proofs() -> list[ProofRecord]:
    return PROOF_STORE


def get_merkle_root() -> str:
    return ACTIVE_MERKLE_TREE.root_hash


def verify_proof_record(proof_id: str) -> ProofVerifyResult | None:
    proof = next((p for p in PROOF_STORE if p.id == proof_id), None)
    if not proof:
        return None

    is_tampered = proof.original_hash != proof.current_hash
    status = ProofStatus.TAMPERED if is_tampered else ProofStatus.VERIFIED

    chain_of_custody = [
        {"timestamp": "2026-10-15T14:34:22Z", "action": "INGESTED", "actor": "carrier_api", "hash": proof.original_hash[:16] + "..."},
        {"timestamp": "2026-10-15T14:35:00Z", "action": "MERKLE_INCLUDED", "actor": "merkle_engine", "hash": ACTIVE_MERKLE_TREE.root_hash[:16] + "..."},
        {"timestamp": datetime.now(timezone.utc).isoformat(), "action": "VERIFIED", "actor": "paysentinel_proof_engine", "hash": proof.current_hash[:16] + "..."},
    ]

    return ProofVerifyResult(
        proof_id=proof.id,
        evidence_id=proof.evidence_id,
        filename=proof.filename,
        original_hash=proof.original_hash,
        computed_hash=proof.current_hash,
        match=not is_tampered,
        status=status,
        verified_at=datetime.now(timezone.utc),
        chain_of_custody=chain_of_custody,
    )
