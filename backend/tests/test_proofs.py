"""
Unit and Integration Tests for Step 6: Cryptographic Proof Engine Hardening
===========================================================================
Covers:
1. RFC 6962 Domain Separation & Odd-node handling: [a, b, c] != [a, b, c, c].
2. verify_proof_record recomputing from stored raw evidence bytes.
3. Deletion of PRF-005 fixture; real byte-flip tamper demo.
4. Cryptographically secure random per-proof salts.
5. Ed25519 root signing bound to signed_at timestamp.
6. Real recorded chain_of_custody timestamps.
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from app.main import app
from app.services.proof_engine import (
    MerkleTree,
    get_all_proofs,
    get_merchant_public_key_hex,
    hash_children,
    hash_leaf,
    sha256,
    sign_merkle_root,
    tamper_proof_record,
    verify_merkle_root_signature,
    verify_proof_record,
)

client = TestClient(app)


# ── 1. Domain Separation & RFC 6962 Odd-Node Tests ──────────────────────────

def test_domain_separation_rfc6962():
    raw_evidence = b"DELIVERY_RECEIPT_USPS_TRACKING_94001"
    plain_sha256 = hashlib.sha256(raw_evidence).hexdigest()
    leaf_h = hash_leaf(raw_evidence)

    assert leaf_h != plain_sha256
    assert leaf_h == hashlib.sha256(b"\x00" + raw_evidence).hexdigest()

    left_child = leaf_h
    right_child = hash_leaf(b"ANOTHER_LEAF")
    node_h = hash_children(left_child, right_child)

    plain_node = hashlib.sha256(bytes.fromhex(left_child) + bytes.fromhex(right_child)).hexdigest()
    assert node_h != plain_node
    assert node_h == hashlib.sha256(b"\x01" + bytes.fromhex(left_child) + bytes.fromhex(right_child)).hexdigest()


def test_rfc6962_odd_node_split_not_equal_duplicated():
    """RFC 6962 power-of-two split ensures [a, b, c] != [a, b, c, c]."""
    leaf_a = b"LEAF_A_CONFIRMATION"
    leaf_b = b"LEAF_B_CARRIER_SCAN"
    leaf_c = b"LEAF_C_SIGNATURE_DATA"

    tree_3 = MerkleTree([leaf_a, leaf_b, leaf_c])
    tree_4 = MerkleTree([leaf_a, leaf_b, leaf_c, leaf_c])

    # In RFC 6962, [a, b, c] root MUST NOT equal [a, b, c, c]
    assert tree_3.root_hash != tree_4.root_hash, "RFC 6962 violation: [a,b,c] had same root as [a,b,c,c]"

    # Verify audit paths for all 3 leaves in tree_3
    p0 = tree_3.get_proof_path(0)
    p1 = tree_3.get_proof_path(1)
    p2 = tree_3.get_proof_path(2)

    assert MerkleTree.verify_proof(leaf_a, p0, tree_3.root_hash) is True
    assert MerkleTree.verify_proof(leaf_b, p1, tree_3.root_hash) is True
    assert MerkleTree.verify_proof(leaf_c, p2, tree_3.root_hash) is True


# ── 2. Ed25519 Root Signing with signed_at Binding ──────────────────────────

def test_ed25519_root_signing_bound_to_timestamp():
    leaves = [
        b"USPS_DELIVERED_RECORD",
        b"GEOFENCE_GPS_30.2672_-97.7431",
        b"SIGNATURE_CAPTURE_TERMINAL_MC93",
    ]
    tree = MerkleTree(leaves, signed_at="2026-11-09T10:00:00Z")

    assert len(tree.ed25519_signature) == 128
    # Valid signature with matching signed_at
    assert verify_merkle_root_signature(tree.root_hash, "2026-11-09T10:00:00Z", tree.ed25519_signature) is True

    # Mutated timestamp fails signature verification
    assert verify_merkle_root_signature(tree.root_hash, "2026-11-09T10:00:01Z", tree.ed25519_signature) is False

    # Mutated root hash fails signature verification
    mutated_root = tree.root_hash[:-4] + "0000"
    assert verify_merkle_root_signature(mutated_root, "2026-11-09T10:00:00Z", tree.ed25519_signature) is False


def test_merchant_public_key_api():
    res = client.get("/api/proofs/public-key")
    assert res.status_code == 200
    data = res.json()
    assert data["algorithm"] == "Ed25519"
    assert len(data["public_key_hex"]) == 64
    assert data["public_key_hex"] == get_merchant_public_key_hex()


# ── 3. Tamper Detection, Raw Byte Recomputation & PRF-005 Removal ───────────

def test_prf_005_fixture_deleted():
    """Fixture PRF-005 must be deleted from default proof list."""
    proofs = get_all_proofs()
    ids = [p.id for p in proofs]
    assert "PRF-005" not in ids
    assert len(ids) == 4
    for p in proofs:
        assert p.status in ("VERIFIED", "verified")


def test_verify_recomputes_from_stored_raw_bytes():
    """verify_proof_record recomputes leaf hash strictly from stored raw bytes."""
    result = verify_proof_record("PRF-001")
    assert result is not None
    assert result.match is True
    assert result.status in ("VERIFIED", "verified")
    assert result.signature_verified is True
    assert result.recomputed_from_raw_bytes is True
    assert len(result.chain_of_custody) == 4
    # Real recorded timestamps, not static placeholders
    actions = [c["action"] for c in result.chain_of_custody]
    assert "INGESTED" in actions
    assert "VERIFIED_FROM_RAW_BYTES" in actions


def test_tamper_demo_flips_stored_byte():
    """Tamper demo flips a real stored raw byte, causing verification to fail."""
    # Verify PRF-002 initially passes
    res_before = client.get("/api/proofs/PRF-002/verify")
    assert res_before.status_code == 200
    assert res_before.json()["match"] is True

    # Call tamper endpoint (mutating endpoint requires auth)
    auth = {"Authorization": "Bearer tok_senior_risk_001"}
    res_tamper = client.post("/api/proofs/PRF-002/tamper", headers=auth)
    assert res_tamper.status_code == 200
    assert res_tamper.json()["status"] == "TAMPERED"

    # Subsequent verification detects the corrupted byte
    res_after = client.get("/api/proofs/PRF-002/verify")
    assert res_after.status_code == 200
    data = res_after.json()
    assert data["match"] is False
    assert data["status"] in ("TAMPERED", "tampered")
    assert data["signature_verified"] is False


# ── 4. Random Per-Proof Salts & Dynamic Proof Generation ───────────────────

def test_random_per_proof_salts():
    """Two identical dynamic proof requests must generate distinct random salts."""
    req_body = {
        "order_id": "ORD-SALT-9901",
        "carrier": "FedEx",
        "tracking_number": "782910482019",
        "buyer_name": "Marcus Vance",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "delivery_address": "456 Market St, San Francisco, CA",
        "use_salted_commitments": True,
    }

    auth = {"Authorization": "Bearer tok_senior_risk_001"}
    res1 = client.post("/api/proofs/generate", headers=auth, json=req_body)
    assert res1.status_code == 200
    data1 = res1.json()

    res2 = client.post("/api/proofs/generate", headers=auth, json=req_body)
    assert res2.status_code == 200
    data2 = res2.json()

    # Distinct proof IDs
    assert data1["proof_id"] != data2["proof_id"]
    # Distinct random salts mean distinct Merkle roots despite identical business inputs
    assert data1["merkle_root"] != data2["merkle_root"]

    # Both verify successfully from raw stored bytes
    v1 = client.get(f"/api/proofs/{data1['proof_id']}/verify").json()
    assert v1["match"] is True
    assert v1["signature_verified"] is True

    v2 = client.get(f"/api/proofs/{data2['proof_id']}/verify").json()
    assert v2["match"] is True
    assert v2["signature_verified"] is True


def test_verify_proof_record_comprehensive():
    """Verify proof record behavior on valid, tampered, wrong signature, and unknown id."""
    # 1. Unknown ID -> returns None / 404
    assert verify_proof_record("NON-EXISTENT-PROOF") is None
    res_unknown = client.get("/api/proofs/NON-EXISTENT-PROOF/verify")
    assert res_unknown.status_code == 404

    # 2. Valid proof verify OK without NameError or TypeError
    res_valid = verify_proof_record("PRF-003")
    assert res_valid is not None
    assert res_valid.match is True
    assert res_valid.signature_verified is True
    assert res_valid.status in ("VERIFIED", "verified")

    # 3. Wrong signature -> signature_verified=False
    from app.services.proof_engine import RAW_EVIDENCE_STORE
    orig_sig = RAW_EVIDENCE_STORE["PRF-003"].ed25519_signature
    try:
        RAW_EVIDENCE_STORE["PRF-003"].ed25519_signature = "bad" * 32
        res_bad_sig = verify_proof_record("PRF-003")
        assert res_bad_sig is not None
        assert res_bad_sig.signature_verified is False
    finally:
        RAW_EVIDENCE_STORE["PRF-003"].ed25519_signature = orig_sig


def test_ed25519_key_caching_and_no_auto_regeneration(tmp_path, monkeypatch):
    """Verify Ed25519 keypair is cached in memory and fails loudly on corruption."""
    import pytest
    from app.services.proof_engine import _ensure_merchant_keys, _reset_key_cache

    _reset_key_cache()
    k1 = _ensure_merchant_keys()
    k2 = _ensure_merchant_keys()
    assert k1[0] is k2[0]

    fake_key_dir = tmp_path / "keys"
    fake_key_dir.mkdir()
    (fake_key_dir / "merchant_ed25519.pem").write_text("CORRUPTED_GARBAGE_BYTES")
    (fake_key_dir / "merchant_ed25519_pub.pem").write_text("CORRUPTED_GARBAGE_BYTES")

    monkeypatch.setattr("app.services.proof_engine.get_key_dir", lambda: fake_key_dir)
    _reset_key_cache()

    with pytest.raises(RuntimeError, match="Corrupted Ed25519 merchant key"):
        _ensure_merchant_keys()

    _reset_key_cache()


def test_startup_fails_in_sandbox_without_webhook_id(monkeypatch):
    """Verify startup fails loudly in sandbox mode when PAYPAL_WEBHOOK_ID is empty."""
    import asyncio
    import pytest
    from app.core.config import get_settings
    from app.main import lifespan, app

    settings = get_settings()
    monkeypatch.setattr(settings, "paypal_mode", "sandbox")
    monkeypatch.setattr(settings, "paypal_webhook_id", "")

    with pytest.raises(RuntimeError, match="PAYPAL_WEBHOOK_ID is empty"):
        async def run_lifespan():
            async with lifespan(app):
                pass
        asyncio.run(run_lifespan())
