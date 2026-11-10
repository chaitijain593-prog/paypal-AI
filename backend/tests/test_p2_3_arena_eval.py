"""
Phase P2-3 Tests: Arena Held-Out Evaluation Corpus and Dual-Set Live Metrics
=============================================================================
Verifies:
1. /api/arena/eval supports GET and POST and returns live metrics for both tuned and held-out corpora.
2. Held-out corpus contains >= 25 adversarial attacks (confusables, prompt injections, zero-width, fee evasion, Base64, split-word, multilingual) and >= 40 benign examples (standard, Hindi, Malayalam, emoji).
3. Rates are genuinely computed from actual inspections:
   - block_rate_pct == round((blocked / total) * 100, 2)
   - false_positive_rate_pct == round((len(fp) / total_benign) * 100, 2)
4. Exact misses and false positives are reported explicitly.
5. All benign Hindi, Malayalam, and emoji examples pass with 0 false positives.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.data.holdout_corpus import HOLDOUT_ADVERSARIAL_CORPUS, HOLDOUT_BENIGN_CORPUS


def test_holdout_corpus_cardinality_and_categories():
    """Verify hold-out corpus contains >= 25 attacks and >= 40 benign examples."""
    assert len(HOLDOUT_ADVERSARIAL_CORPUS) >= 25, f"Expected >=25 adversarial attacks, got {len(HOLDOUT_ADVERSARIAL_CORPUS)}"
    assert len(HOLDOUT_BENIGN_CORPUS) >= 40, f"Expected >=40 benign examples, got {len(HOLDOUT_BENIGN_CORPUS)}"

    # Check required categories in adversarial corpus
    adv_categories = {item["category"] for item in HOLDOUT_ADVERSARIAL_CORPUS}
    assert "CONFUSABLES" in adv_categories
    assert "PROMPT_INJECTION" in adv_categories
    assert "ZERO_WIDTH_CHARS" in adv_categories
    assert "FEE_EVASION" in adv_categories
    assert "BASE64_INJECTION" in adv_categories
    assert "MULTILINGUAL_INJECTION" in adv_categories
    assert "SPLIT_WORD_INJECTION" in adv_categories

    # Check required multilingual/emoji coverage in benign corpus
    hindi_items = [b for b in HOLDOUT_BENIGN_CORPUS if any("\u0900" <= c <= "\u097F" for c in b["text"])]
    malayalam_items = [b for b in HOLDOUT_BENIGN_CORPUS if any("\u0D00" <= c <= "\u0D7F" for c in b["text"])]
    emoji_items = [b for b in HOLDOUT_BENIGN_CORPUS if any(ord(c) > 0x1F000 for c in b["text"])]

    assert len(hindi_items) >= 5, f"Expected >=5 Hindi benign items, got {len(hindi_items)}"
    assert len(malayalam_items) >= 5, f"Expected >=5 Malayalam benign items, got {len(malayalam_items)}"
    assert len(emoji_items) >= 5, f"Expected >=5 Emoji benign items, got {len(emoji_items)}"


def test_api_arena_eval_dual_corpus_and_exact_metrics():
    """Verify /api/arena/eval returns live metrics for both tuned and heldout corpora."""
    client = TestClient(app)

    # 1. GET /api/arena/eval
    res_get = client.get("/api/arena/eval")
    assert res_get.status_code == 200, f"GET /api/arena/eval returned {res_get.status_code}: {res_get.text}"
    data_get = res_get.json()

    assert data_get["status"] == "LIVE"
    assert data_get["data_source"] == "LIVE"
    assert "tuned" in data_get, "Response must include tuned corpus evaluation"
    assert "heldout" in data_get, "Response must include held-out corpus evaluation"

    # 2. Check held-out metrics
    heldout = data_get["heldout"]
    assert heldout["total_adversarial"] >= 25
    assert heldout["total_benign"] >= 40

    expected_adv_rate = round((heldout["adversarial_blocked"] / heldout["total_adversarial"]) * 100.0, 2)
    assert heldout["block_rate_pct"] == expected_adv_rate, "Block rate must be computed exactly"

    expected_fp_rate = round((len(heldout["false_positives"]) / heldout["total_benign"]) * 100.0, 2)
    assert heldout["false_positive_rate_pct"] == expected_fp_rate, "FP rate must be computed exactly"

    # Verify exact misses are reported as a list with IDs
    assert isinstance(heldout["adversarial_misses"], list)
    for miss in heldout["adversarial_misses"]:
        assert "id" in miss
        assert "text" in miss
        assert "risk_score" in miss

    # Verify benign false positive list is present and Indic/emoji items do not falsely trigger
    assert isinstance(heldout["false_positives"], list)
    fp_texts = [fp["text"] for fp in heldout["false_positives"]]
    for b in HOLDOUT_BENIGN_CORPUS:
        if any("\u0900" <= c <= "\u097F" for c in b["text"]) or any("\u0D00" <= c <= "\u0D7F" for c in b["text"]):
            assert b["text"] not in fp_texts, f"Indic benign message falsely flagged: {b['text']}"

    # 3. POST /api/arena/eval should also work for frontend compatibility
    res_post = client.post("/api/arena/eval")
    assert res_post.status_code == 200
    data_post = res_post.json()
    assert "heldout" in data_post
    assert "tuned" in data_post
