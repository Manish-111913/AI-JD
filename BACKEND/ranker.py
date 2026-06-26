"""
ranker.py — Ranking Utilities (Canonical thin wrappers)

NOTE: This module previously contained a DUPLICATE composite scoring formula
with wrong weights (0.45/0.30/0.15). That standalone implementation has been
REMOVED. All authoritative scoring logic now lives in scoring_engine.py which
uses the weights defined in config.py (0.35/0.30/0.10/0.10/0.05).

This module now provides:
  - rank_candidates()    → convenience wrapper around scoring_engine
  - normalize_scores()   → score normalisation utility
  - get_ranking_stats()  → diagnostic statistics

These are used by tests, the API diagnostics endpoint, and any code that
previously imported from ranker.py.

The ONE authoritative ranking flow is: rank.py (CLI) / api.py (web).
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from scoring_engine import compute_first_pass_score
from honeypot_detector import detect_honeypot
from career_analyzer import compute_title_relevance_score
from config import TITLE_GATE_THRESHOLD, WEIGHTS, CE_WEIGHT, ALGO_WEIGHT, FINAL_TOP_K

logger = logging.getLogger(__name__)


def compute_composite_score(
    candidate: dict,
    embedding_similarity: float = 0.0,
) -> dict:
    """
    Compute the composite score for a single candidate.

    Delegates entirely to scoring_engine.compute_first_pass_score so that
    there is ONE authoritative scoring implementation.

    Formula (from config.WEIGHTS / scoring_engine.py):
        base = 0.35 * skill_score
             + 0.30 * career_score
             + 0.10 * experience_score
             + 0.10 * location_score
             + 0.05 * education_score
             + platform_quality_score   (additive)
        first_pass_score = base * title_gate * behavioral * disq_penalty * honeypot_penalty

    Returns:
        Full feature dict including first_pass_score and all component scores.
    """
    feat = compute_first_pass_score(candidate, semantic_score=embedding_similarity)
    # Expose as composite_score / final_score for backwards-compatibility
    feat.setdefault("composite_score", feat["first_pass_score"])
    feat.setdefault("final_score", feat["first_pass_score"])
    feat.setdefault("embedding_similarity", round(embedding_similarity, 4))
    return feat


def rank_candidates(
    candidates: list[dict],
    semantic_scores: Optional[dict] = None,
    top_k: int = FINAL_TOP_K,
    log_every: int = 10_000,
) -> list[dict]:
    """
    Score ALL candidates, sort descending, return top_k ranked list.

    Args:
        candidates:      List of normalised candidate dicts.
        semantic_scores: Optional dict {candidate_id: float}.
        top_k:           Number of top candidates to return (default FINAL_TOP_K).
        log_every:       Log progress every N candidates.

    Returns:
        List of dicts sorted by final_score descending, with 'rank' (1-indexed).
    """
    if semantic_scores is None:
        semantic_scores = {}

    t_start = time.time()
    scored: list[tuple[dict, dict]] = []
    total = len(candidates)

    logger.info(f"Scoring {total:,} candidates (top_k={top_k})…")

    for i, c in enumerate(candidates):
        cid = c.get("candidate_id", "")
        sem = semantic_scores.get(cid, 0.0)
        score_dict = compute_composite_score(c, embedding_similarity=sem)
        scored.append((c, score_dict))

        if (i + 1) % log_every == 0:
            logger.info(f"  Scored {i + 1:,}/{total:,} candidates…")

    # Sort descending by final_score; tie-break candidate_id ascending
    scored.sort(key=lambda x: (-x[1]["final_score"], x[0].get("candidate_id", "")))

    elapsed = time.time() - t_start
    logger.info(f"✓ Scoring complete: {total:,} candidates in {elapsed:.1f}s")

    if scored:
        top_score = scored[0][1]["final_score"]
        p10_score = scored[9][1]["final_score"] if len(scored) >= 10 else 0.0
        logger.info(f"  Top-1 score: {top_score:.4f}  |  Top-10 score: {p10_score:.4f}")

    top_results: list[dict] = []
    for rank_num, (c, score_dict) in enumerate(scored[:top_k], start=1):
        entry = {**c, **score_dict, "rank": rank_num}
        top_results.append(entry)

    logger.info(f"✓ Top-{top_k} ranked list generated")
    return top_results


def normalize_scores(ranked: list[dict]) -> list[dict]:
    """
    Normalise final_score values so rank-1 = 1.0 and scores are non-increasing.
    Required by submission spec.
    """
    if not ranked:
        return ranked

    max_score = max(r["final_score"] for r in ranked)
    max_score = max(max_score, 1e-9)

    for r in ranked:
        r["normalized_score"] = round(r["final_score"] / max_score, 4)

    # Validate non-increasing and fix inversions
    for i in range(len(ranked) - 1):
        s1 = ranked[i]["normalized_score"]
        s2 = ranked[i + 1]["normalized_score"]
        if s1 < s2:
            logger.warning(
                f"Score inversion at ranks {ranked[i]['rank']} ({s1}) and "
                f"{ranked[i + 1]['rank']} ({s2}) — fixing"
            )
            ranked[i + 1]["normalized_score"] = s1

    return ranked


def get_ranking_stats(ranked: list[dict]) -> dict:
    """Compute diagnostic statistics over the ranked list."""
    if not ranked:
        return {}

    scores = [r.get("normalized_score", r.get("final_score", 0)) for r in ranked]
    skill_scores = [r.get("skill_score", 0) for r in ranked]
    career_scores = [r.get("career_score", 0) for r in ranked]
    honeypot_flagged = sum(1 for r in ranked if r.get("honeypot_tier", "clean") != "clean")
    fast_filtered = sum(1 for r in ranked if r.get("fast_filtered", False))

    tier_counts: dict[str, int] = {}
    for r in ranked:
        tier = r.get("_title_tier", "unknown")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

    return {
        "top_score": round(scores[0], 4),
        "bottom_score": round(scores[-1], 4),
        "mean_score": round(sum(scores) / len(scores), 4),
        "mean_skill_score": round(sum(skill_scores) / len(skill_scores), 4),
        "mean_career_score": round(sum(career_scores) / len(career_scores), 4),
        "honeypot_flagged": honeypot_flagged,
        "honeypot_rate_pct": round(honeypot_flagged / len(ranked) * 100, 1),
        "fast_filtered_in_top_k": fast_filtered,
        "title_tier_counts": tier_counts,
        "total_ranked": len(ranked),
    }
