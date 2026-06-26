"""
cross_encoder_reranker.py — Module 9: Cross-Encoder Re-Ranker
Local model, no network required.
cross-encoder/ms-marco-MiniLM-L-6-v2
"""

from __future__ import annotations

import logging
import math
from typing import Optional

import numpy as np

from config import CE_MODEL_NAME, CE_QUERY, CE_BATCH_SIZE, CE_SHORTLIST_SIZE, CE_WEIGHT, ALGO_WEIGHT

logger = logging.getLogger(__name__)

_ce_model = None  # lazy loaded


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _get_ce_model():
    global _ce_model
    if _ce_model is None:
        try:
            from sentence_transformers import CrossEncoder
            logger.info(f"Loading cross-encoder: {CE_MODEL_NAME}")
            _ce_model = CrossEncoder(CE_MODEL_NAME, max_length=512)
            logger.info("Cross-encoder model loaded.")
        except Exception as e:
            logger.warning(f"Failed to load cross-encoder: {e}")
            logger.warning("Will proceed without cross-encoder (bi-encoder only)")
            _ce_model = None
    return _ce_model


def is_ce_available() -> bool:
    """Check if cross-encoder model is available."""
    try:
        model = _get_ce_model()
        return model is not None
    except Exception:
        return False


def rerank_with_cross_encoder(
    shortlisted: list[dict],
    passage_texts: list[str],
    progress_callback=None,
) -> list[dict]:
    """
    Module 11.5: Cross-encoder re-ranking of top-N shortlisted candidates.

    For each candidate:
        raw_logit = ce_model.predict([(query, passage)])
        ce_score = sigmoid(raw_logit)

    Blending:
        normalized_algo = first_pass_score / max(all_first_pass_scores)
        blended_score = 0.40 * normalized_algo + 0.60 * ce_score

    For candidates NOT in shortlist:
        blended_score = first_pass_score * 0.82
    """
    model = _get_ce_model()
    if model is None:
        logger.warning("Cross-encoder unavailable — using bi-encoder only")
        # Fallback: blended_score = normalized_algo
        all_scores = [c.get("first_pass_score", 0.0) for c in shortlisted]
        max_score = max(all_scores) if all_scores else 1.0
        for i, cand in enumerate(shortlisted):
            normalized = cand["first_pass_score"] / max_score if max_score > 0 else 0.0
            shortlisted[i]["ce_score"] = 0.0
            shortlisted[i]["blended_score"] = normalized
            shortlisted[i]["ce_available"] = False
        return shortlisted

    # Prepare (query, passage) pairs
    pairs = [(CE_QUERY, passage) for passage in passage_texts]

    # Batch prediction
    logger.info(f"Running cross-encoder on {len(pairs)} pairs, batch_size={CE_BATCH_SIZE}")
    n_batches = math.ceil(len(pairs) / CE_BATCH_SIZE)

    all_logits = []
    for batch_idx in range(n_batches):
        start = batch_idx * CE_BATCH_SIZE
        end = min(start + CE_BATCH_SIZE, len(pairs))
        batch_pairs = pairs[start:end]

        batch_logits = model.predict(batch_pairs, show_progress_bar=False)
        all_logits.extend(batch_logits.tolist() if hasattr(batch_logits, "tolist") else list(batch_logits))

        if progress_callback:
            progress_callback(batch_idx + 1, n_batches, end)

        logger.debug(f"Batch {batch_idx+1}/{n_batches} done ({end} pairs total)")

    # Convert logits to sigmoid probabilities
    ce_scores = [_sigmoid(float(logit)) for logit in all_logits]

    # Normalize algorithmic scores
    algo_scores = [c.get("first_pass_score", 0.0) for c in shortlisted]
    max_algo = max(algo_scores) if algo_scores else 1.0
    max_algo = max(max_algo, 1e-6)  # prevent divide by zero

    # Apply blending: ALGO_WEIGHT * normalised_algo + CE_WEIGHT * ce  (from config)
    for i, cand in enumerate(shortlisted):
        ce = ce_scores[i]
        normalized_algo = algo_scores[i] / max_algo
        blended = ALGO_WEIGHT * normalized_algo + CE_WEIGHT * ce
        shortlisted[i]["ce_score"] = round(ce, 4)
        shortlisted[i]["blended_score"] = round(blended, 6)
        shortlisted[i]["ce_available"] = True

    logger.info(
        f"Cross-encoder complete. "
        f"CE scores: min={min(ce_scores):.3f}, max={max(ce_scores):.3f}, "
        f"mean={sum(ce_scores)/len(ce_scores):.3f}"
    )
    return shortlisted
