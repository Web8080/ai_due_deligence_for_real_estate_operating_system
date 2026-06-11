# Author: Victor.I
# Phase 9 (Evaluation & testing) step 1: retrieval eval over a fixed dataset.
# Runs fully offline against the local fallback embedder so it is deterministic
# and never depends on Ollama or Azure being reachable.
import json
from pathlib import Path

import pytest

from backend.app.rag import _cosine_similarity, _local_embed, chunk_text

DATASET_PATH = Path(__file__).parent / "eval_dataset.json"


def _load_cases():
    with DATASET_PATH.open() as fh:
        return json.load(fh)["cases"]


CASES = _load_cases()


def _rank_passages(question, passages):
    query_vec = _local_embed(question)
    scored = [
        (_cosine_similarity(query_vec, _local_embed(p["text"])), p["id"])
        for p in passages
    ]
    scored.sort(reverse=True)
    return [pid for _, pid in scored]


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_relevant_passage_ranks_first(case):
    ranking = _rank_passages(case["question"], case["passages"])
    assert ranking[0] == case["expected_passage"], (
        f"Expected {case['expected_passage']} to rank first for question "
        f"{case['question']!r}, got ranking {ranking}"
    )


def test_recall_at_1_meets_threshold():
    hits = sum(
        1
        for case in CASES
        if _rank_passages(case["question"], case["passages"])[0] == case["expected_passage"]
    )
    recall_at_1 = hits / len(CASES)
    assert recall_at_1 >= 0.8, f"recall@1 {recall_at_1:.2f} below 0.80 threshold"


def test_chunking_preserves_all_content():
    text = " ".join(p["text"] for c in CASES for p in c["passages"])
    chunks = chunk_text(text, size=200, overlap=40)
    assert chunks, "chunk_text returned no chunks"
    reassembled = " ".join(chunks)
    # Overlapping chunks duplicate words but must not drop any.
    for token in set(text.split()):
        assert token in reassembled
