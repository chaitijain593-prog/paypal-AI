"""
Unit and Integration Tests for Phase 3: Cryptographic Proof Engine
==================================================================
Covers:
1. RFC 6962 Domain Separation (leaf_hash != sha256 of raw bytes)
2. Raw evidence bytes hashing & tamper detection (byte flip test)
3. Ed25519 root signing and public-key verification
4. Proof API endpoints (/generate, /{id}/verify, /public-key)
"""

from __future__ import annotations

import hashlib
from fastapi.testclient import TestClient

from app.main import app
from app.services.proof_engine import (
    MerkleTree,
    get_merchant_public_key_hex,
    hash_children,
    hash_leaf,
    sha256,
    sign_merkle_root,
    verify_merkle_root_signature,
)

client = TestClient(app)


# ── 1. Domain Separation Tests ───────────────────────────────────────────────

def test_domain_separation_rfc6962():
    raw_evidence = b"DELIVERY_RECEIPT_USPS_TRACKING_94001"

    # Standard raw SHA-256 of bytes
    plain_sha256 = hashlib.sha256(raw_evidence).hexdigest()

    # RFC 6962 domain-separated leaf hash = SHA-256(0x00 || raw_evidence)
    leaf_h = hash_leaf(raw_evidence)

    # Domain separation ensures leaf_hash can NEVER equal plain SHA-256
    assert leaf_h != plain_sha256
    assert leaf_h == hashlib.sha256(b"\x00" + raw_evidence).hexdigest()

    # Internal node domain separation = SHA-256(0x01 || left || right)
    left_child = leaf_h
    right_child = hash_leaf(b"ANOTHER_LEAF")
    node_h = hash_children(left_child, right_child)

    # Node hash cannot equal plain concatenation
    plain_node = hashlib.sha256(bytes.fromhex(left_child) + bytes.fromhex(right_child)).hexdigest()
    assert node_h != plain_node
    assert node_h == hashlib.sha256(b"\x01" + bytes.fromhex(left_child) + bytes.fromhex(right_child)).hexdigest()


# ── 2. Ed25519 Merchant Root Signing Tests ───────────────────────────────────

def test_ed25519_root_signing_and_verification():
    leaves = [
        b"USPS_DELIVERED_RECORD",
        b"GEOFENCE_GPS_30.2672_-97.7431",
        b"SIGNATURE_CAPTURE_TERMINAL_MC93",
    ]
    tree = MerkleTree(leaves)

    # Merkle root was signed with merchant key
    assert len(tree.ed25519_signature) == 128  # 64 bytes = 128 hex chars
    assert verify_merkle_root_signature(tree.root_hash, tree.ed25519_signature) is True

    # Signature verification fails on mutated root
    mutated_root = tree.root_hash[:-4] + "0000"
    assert verify_merkle_root_signature(mutated_root, tree.ed25519_signature) is False


def test_merchant_public_key_api():
    res = client.get("/api/proofs/public-key")
    assert res.status_code == 200
    data = res.json()
    assert data["algorithm"] == "Ed25519"
    assert len(data["public_key_hex"]) == 64  # 32 bytes = 64 hex chars
    assert data["public_key_hex"] == get_merchant_public_key_hex()


# ── 3. Tamper Detection & Byte Flip Test ─────────────────────────────────────

def test_tamper_byte_flip_detection():
    raw_evidence_1 = b"CARRIER_SCAN_TRACKING_12345678"
    raw_evidence_2 = b"SIGNATURE_DIGITAL_SCAN_MARCUS"
    raw_evidence_3 = b"GEOFENCE_37.7749_-122.4194"

    tree = MerkleTree([raw_evidence_1, raw_evidence_2, raw_evidence_3])
    proof_path = tree.get_proof_path(0)

    # 1. Untouched evidence verifies mathematically against original root
    assert MerkleTree.verify_proof(raw_evidence_1, proof_path, tree.root_hash) is True

    # 2. Flip exactly 1 byte in the raw evidence
    # Change first byte 'C' (0x43) to 'D' (0x44)
    mutated_evidence = bytes([raw_evidence_1[0] ^ 0x01]) + raw_evidence_1[1:]
    assert mutated_evidence != raw_evidence_1

    # 3. Mathematical reconstruction fails
    assert MerkleTree.verify_proof(mutated_evidence, proof_path, tree.root_hash) is False

    # 4. If an attacker rebuilds a tree with the tampered leaf, the root changes
    tampered_tree = MerkleTree([mutated_evidence, raw_evidence_2, raw_evidence_3])
    assert tampered_tree.root_hash != tree.root_hash

    # 5. Original merchant signature is invalid for the tampered root
    assert verify_merkle_root_signature(tampered_tree.root_hash, tree.ed25519_signature) is False


# ── 4. Dynamic Proof API Integration ─────────────────────────────────────────

def test_dynamic_proof_generation_and_verification():
    res_gen = client.post(
        "/api/proofs/generate",
        json={
            "order_id": "ORD-LIVE-9041",
            "dispute_id": "PP-D-99014",
            "evidence_type": "Carrier Delivery & Geofence",
            "carrier": "FedEx",
            "tracking_number": "782910482019",
            "buyer_name": "Marcus Vance",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "delivery_address": "456 Market St, San Francisco, CA",
            "use_zero_knowledge_predicates": True,
        },
    )
    assert res_gen.status_code == 200
    data = res_gen.json()

    assert data["proof_id"].startswith("PRF-")
    assert len(data["merkle_root"]) == 64
    assert data["leaf_count"] == 4
    assert len(data["leaf_hashes"]) == 4
    assert len(data["ed25519_signature"]) == 128
    assert len(data["merchant_public_key"]) == 64
    assert len(data["salted_commitments_applied"]) == 2

    # Verify endpoint
    proof_id = data["proof_id"]
    res_ver = client.get(f"/api/proofs/{proof_id}/verify")
    assert res_ver.status_code == 200
    data_ver = res_ver.json()
    assert data_ver["match"] is True
    assert data_ver["status"] == "VERIFIED"
    assert data_ver["signature_verified"] is True
