"""
embedding_engine.py — Module 4: Semantic Embedding Engine
Bi-encoder for fast first-pass semantic scoring of all candidates.
Pre-computes embeddings, loads them for instant use during ranking.
"""

from __future__ import annotations

import logging
import math
import os
from pathlib import Path
from typing import Optional

import numpy as np

from config import BI_ENCODER_MODEL, JD_QUERIES

logger = logging.getLogger(__name__)

_model = None  # lazy-loaded sentence-transformer model
_jd_embeddings: Optional[np.ndarray] = None  # shape: (3, dim)


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading bi-encoder model: {BI_ENCODER_MODEL}")
            _model = SentenceTransformer(BI_ENCODER_MODEL)
            logger.info("Bi-encoder model loaded.")
        except Exception as e:
            logger.error(f"Failed to load bi-encoder: {e}")
            raise
    return _model


def get_jd_embeddings() -> np.ndarray:
    """
    Get (3, dim) matrix of JD query embeddings.
    Cached in memory after first call.
    """
    global _jd_embeddings
    if _jd_embeddings is None:
        model = _get_model()
        texts = [q["text"] for q in JD_QUERIES]
        logger.info("Embedding JD queries...")
        _jd_embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        logger.info(f"JD embeddings shape: {_jd_embeddings.shape}")
    return _jd_embeddings


def embed_candidates_batch(texts: list[str], batch_size: int = 256) -> np.ndarray:
    """
    Embed a batch of candidate texts. Returns (N, dim) numpy array.
    """
    model = _get_model()
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=batch_size,
        show_progress_bar=False,
    )
    return embeddings


def compute_semantic_scores_vectorized(candidate_embeddings: np.ndarray) -> np.ndarray:
    """
    Vectorized computation of 3-query semantic scores.
    candidate_embeddings: (N, dim)
    Returns: (N,) array of semantic_score values in [0, 1]

    semantic_score = 0.60*cos(Q1,C) + 0.30*cos(Q2,C) + 0.10*cos(Q3,C)
    normalized to [0,1] by: max(0, (raw - 0.05) / 0.75)
    """
    jd_emb = get_jd_embeddings()  # (3, dim)
    
    clean_weights = []
    for q in JD_QUERIES:
        w = q.get("weight", 0.0)
        if isinstance(w, str):
            w = w.replace("%", "").strip()
            try:
                w = float(w) / 100.0 if "%" in q.get("weight", "") else float(w)
            except ValueError:
                w = 0.0
        else:
            try:
                w = float(w)
            except (TypeError, ValueError):
                w = 0.0
        clean_weights.append(w)
    weights = np.array(clean_weights)  # [0.60, 0.30, 0.10]

    # Cosine similarity: since embeddings are L2-normalized, dot product = cosine
    # sim_matrix: (N, 3)
    sim_matrix = candidate_embeddings @ jd_emb.T

    # Weighted sum: (N,)
    raw_semantic = sim_matrix @ weights

    # Normalize to [0,1]
    semantic_scores = np.maximum(0.0, (raw_semantic - 0.05) / 0.75)
    semantic_scores = np.minimum(1.0, semantic_scores)

    return semantic_scores


def save_embeddings(embeddings: np.ndarray, path: Path) -> None:
    """Save candidate embeddings to .npy file for offline pre-computation."""
    np.save(str(path), embeddings)
    logger.info(f"Saved {embeddings.shape[0]} embeddings to {path}")


def load_embeddings(path: Path) -> np.ndarray:
    """Load pre-computed embeddings from .npy file."""
    embeddings = np.load(str(path))
    logger.info(f"Loaded embeddings: {embeddings.shape}")
    return embeddings


def compute_single_semantic_score(candidate_text: str) -> float:
    """
    Compute semantic score for a single candidate text.
    Used for online ranking of newly uploaded candidates.
    """
    model = _get_model()
    emb = model.encode([candidate_text], normalize_embeddings=True, show_progress_bar=False)
    scores = compute_semantic_scores_vectorized(emb)
    return float(scores[0])
