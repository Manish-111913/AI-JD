"""
ranker.py — Phase F: Candidate Ranker
Scores ALL candidates, sorts descending, generates Top 100 ranked list.

Composite score formula (per Phase E prompt):
    final_score = 0.45 * skill_score
                + 0.30 * career_score
                + 0.15 * experience_score
                + 0.10 * embedding_similarity

All outputs normalized to [0, 1].
Tie-breaking: candidate_id ascending (per submission spec).
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from career_analyzer import (
    compute_career_score,
    compute_experience_score,
    compute_title_relevance_score,
    compute_behavioral_multiplier,
    compute_platform_quality,
    compute_location_score,
    compute_education_score,
)
from honeypot_detector import detect_honeypot
from skill_scorer import compute_skill_score
from config import TITLE_GATE_THRESHOLD

logger = logging.getLogger(__name__)

# ── Composite Score Weights (Phase E — prompt specification) ─────────────────
COMPOSITE_WEIGHTS = {
    "skill_score": 0.45,
    "career_score": 0.30,
    "experience_score": 0.15,
    "embedding_similarity": 0.10,
}


def compute_composite_score(
    candidate: dict,
    embedding_similarity: float = 0.0,
) -> dict:
    """
    Compute the Phase E composite score for a single candidate.

    Formula:
        final_score = 0.45 * skill_score
                    + 0.30 * career_score
                    + 0.15 * experience_score
                    + 0.10 * embedding_similarity

    Additional multipliers applied:
        * title_gate_multiplier  (0.1 if non-tech title, else 1.0)
        * behavioral_multiplier  (0.05 to 1.30)
        * honeypot_penalty       (0.0, 0.15, 0.55, or 1.0)

    Returns:
        dict with composite_score and all component scores.
    """
    cid = candidate.get("candidate_id", "")

    # ── Title gate (fast path for irrelevant titles) ──────────────────────────
    title = candidate.get("current_title", "")
    title_score = candidate.get("_title_score") or compute_title_relevance_score(title)

    if title_score < TITLE_GATE_THRESHOLD:
        return {
            "candidate_id": cid,
            "composite_score": round(title_score * 0.1, 6),
            "final_score": round(title_score * 0.1, 6),
            "skill_score": 0.0,
            "career_score": 0.0,
            "experience_score": 0.0,
            "embedding_similarity": 0.0,
            "title_score": round(title_score, 4),
            "title_gate_multiplier": 0.1,
            "behavioral_multiplier": 1.0,
            "honeypot_penalty": 1.0,
            "honeypot_confidence": 0.0,
            "honeypot_tier": "clean",
            "fast_filtered": True,
        }

    # ── Honeypot detection ────────────────────────────────────────────────────
    hp = detect_honeypot(candidate)
    honeypot_penalty = hp["honeypot_penalty"]

    # ── Skill score ───────────────────────────────────────────────────────────
    skills = candidate.get("skills", [])
    skill_result = compute_skill_score(skills, embedding_similarity)
    skill_score = skill_result["skill_score"]

    # ── Career score ──────────────────────────────────────────────────────────
    career_result = compute_career_score(candidate)
    career_score = career_result["career_score"]

    # ── Experience score ──────────────────────────────────────────────────────
    yoe = float(candidate.get("years_of_experience", 0))
    exp_score = compute_experience_score(yoe)

    # ── Behavioral multiplier ─────────────────────────────────────────────────
    behav_result = compute_behavioral_multiplier(candidate)
    behavioral_mult = behav_result["behavioral_multiplier"]

    # ── Composite score (Phase E formula) ─────────────────────────────────────
    composite = (
        COMPOSITE_WEIGHTS["skill_score"] * skill_score
        + COMPOSITE_WEIGHTS["career_score"] * career_score
        + COMPOSITE_WEIGHTS["experience_score"] * exp_score
        + COMPOSITE_WEIGHTS["embedding_similarity"] * embedding_similarity
    )

    # ── Apply multipliers ─────────────────────────────────────────────────────
    final = composite * behavioral_mult * honeypot_penalty
    final = max(0.0, min(1.0, final))

    return {
        "candidate_id": cid,
        # Core composite
        "composite_score": round(composite, 6),
        "final_score": round(final, 6),
        # Component scores
        "skill_score": skill_result["skill_score"],
        "skill_keyword_component": skill_result["skill_keyword_component"],
        "skill_semantic_component": skill_result["skill_semantic_component"],
        "preferred_bonus": skill_result.get("preferred_bonus", 0.0),
        "career_score": career_score,
        "company_type_score": career_result.get("company_type_score", 0.0),
        "production_signal_score": career_result.get("production_signal_score", 0.0),
        "seniority_score": career_result.get("seniority_score", 0.0),
        "experience_score": exp_score,
        "years_of_experience": yoe,
        "embedding_similarity": round(embedding_similarity, 4),
        # Multipliers
        "title_score": round(title_score, 4),
        "title_gate_multiplier": 1.0,
        "behavioral_multiplier": behavioral_mult,
        "behavioral_breakdown": behav_result.get("behavioral_breakdown", {}),
        "honeypot_penalty": honeypot_penalty,
        "honeypot_confidence": hp["honeypot_confidence"],
        "honeypot_tier": hp["honeypot_tier"],
        "honeypot_flags": hp["honeypot_flags"],
        "disqualifier_penalty": career_result.get("disqualifier_penalty", 1.0),
        "disqualifier_flags": career_result.get("disqualifier_flags", []),
        "fast_filtered": False,
    }


def rank_candidates(
    candidates: list[dict],
    semantic_scores: Optional[dict] = None,
    top_k: int = 100,
    log_every: int = 10000,
) -> list[dict]:
    """
    Score ALL candidates, sort descending, return top_k ranked list.

    Args:
        candidates:      List of normalized candidate dicts.
        semantic_scores: Optional dict {candidate_id: float} of embedding similarities.
        top_k:           Number of top candidates to return (default 100).
        log_every:       Log progress every N candidates.

    Returns:
        List of (candidate, score_dict) tuples sorted by final_score descending.
        Each item is a dict containing both candidate fields and score fields,
        plus 'rank' (1-indexed).
    """
    if semantic_scores is None:
        semantic_scores = {}

    t_start = time.time()
    scored = []
    total = len(candidates)

    logger.info(f"Scoring {total:,} candidates (top_k={top_k})…")

    for i, c in enumerate(candidates):
        cid = c.get("candidate_id", "")
        sem = semantic_scores.get(cid, 0.0)
        score_dict = compute_composite_score(c, embedding_similarity=sem)
        scored.append((c, score_dict))

        if (i + 1) % log_every == 0:
            logger.info(f"  Scored {i + 1:,}/{total:,} candidates…")

    # ── Sort descending by final_score, tie-break by candidate_id ascending ──
    scored.sort(key=lambda x: (-x[1]["final_score"], x[0].get("candidate_id", "")))

    elapsed = time.time() - t_start
    logger.info(f"✓ Scoring complete: {total:,} candidates in {elapsed:.1f}s")

    if scored:
        top_score = scored[0][1]["final_score"]
        p10_score = scored[9][1]["final_score"] if len(scored) >= 10 else 0.0
        logger.info(f"  Top-1 score: {top_score:.4f}  |  Top-10 score: {p10_score:.4f}")

    # ── Take top_k and assign ranks ──────────────────────────────────────────
    top_results = []
    for rank_num, (c, score_dict) in enumerate(scored[:top_k], start=1):
        entry = {**c, **score_dict, "rank": rank_num}
        top_results.append(entry)

    logger.info(f"✓ Top-{top_k} ranked list generated")
    return top_results


def normalize_scores(ranked: list[dict]) -> list[dict]:
    """
    Normalize final_score values so rank-1 = 1.0 and scores are non-increasing.
    Required by submission spec.

    Args:
        ranked: List of ranked candidate dicts (from rank_candidates).

    Returns:
        Same list with 'normalized_score' added.
    """
    if not ranked:
        return ranked

    max_score = max(r["final_score"] for r in ranked)
    max_score = max(max_score, 1e-9)

    for r in ranked:
        r["normalized_score"] = round(r["final_score"] / max_score, 4)

    # Validate non-increasing
    for i in range(len(ranked) - 1):
        s1 = ranked[i]["normalized_score"]
        s2 = ranked[i + 1]["normalized_score"]
        if s1 < s2:
            logger.warning(
                f"Score inversion at ranks {ranked[i]['rank']} ({s1}) and "
                f"{ranked[i+1]['rank']} ({s2}) — fixing"
            )
            ranked[i + 1]["normalized_score"] = s1

    return ranked


def get_ranking_stats(ranked: list[dict]) -> dict:
    """Compute diagnostic statistics over the ranked list."""
    if not ranked:
        return {}

    scores = [r["normalized_score"] for r in ranked]
    skill_scores = [r["skill_score"] for r in ranked]
    career_scores = [r["career_score"] for r in ranked]
    honeypot_flagged = sum(1 for r in ranked if r.get("honeypot_tier") != "clean")
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


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

    # Quick smoke test with a synthetic candidate
    test_candidate = {
        "candidate_id": "CAND_0000001",
        "current_title": "Senior ML Engineer",
        "years_of_experience": 7.0,
        "location": "Bengaluru",
        "open_to_work_flag": True,
        "recruiter_response_rate": 0.8,
        "notice_period_days": 30,
        "last_active_date": None,
        "career_history": [
            {
                "company": "Flipkart",
                "title": "Senior ML Engineer",
                "start_date": None,
                "end_date": None,
                "duration_months": 24,
                "is_current": True,
                "industry": "e-commerce",
                "company_size": "10001+",
                "description": "Built semantic search using FAISS and BERT embeddings. Deployed to production serving 10M+ queries/day.",
            }
        ],
        "skills": [
            {"name": "Python", "proficiency": "expert", "endorsements": 20, "duration_months": 48, "assessment_score": 90},
            {"name": "FAISS", "proficiency": "advanced", "endorsements": 10, "duration_months": 24, "assessment_score": None},
            {"name": "BERT", "proficiency": "advanced", "endorsements": 8, "duration_months": 24, "assessment_score": None},
            {"name": "semantic search", "proficiency": "expert", "endorsements": 15, "duration_months": 30, "assessment_score": 85},
        ],
        "education": [{"institution": "IIT Bombay", "degree": "B.Tech", "field": "Computer Science", "start_year": 2013, "end_year": 2017, "grade": None, "tier": "tier_1"}],
        "github_activity_score": 70,
        "profile_completeness_score": 85,
        "interview_completion_rate": 0.9,
        "offer_acceptance_rate": 0.8,
        "skill_assessment_scores": {"Python": 90, "semantic search": 85},
    }

    result = compute_composite_score(test_candidate, embedding_similarity=0.72)
    print("\nComposite Score Breakdown:")
    for k, v in result.items():
        if not isinstance(v, dict):
            print(f"  {k:<35}: {v}")
