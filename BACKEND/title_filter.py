"""
title_filter.py — Phase C: Title Pre-Filter
Removes obviously irrelevant candidates (non-tech, general-tech).
Keeps ALL AI/ML/Data candidates + tech-adjacent for semantic scoring.
Maintains HIGH RECALL: never drops a real ML candidate.

Filter logic (per Backend Logic Bible):
  title_score < 0.05 → fast-eliminate (near-zero final score * 0.1)
  All others pass through to full scoring pipeline.
"""

from __future__ import annotations

import logging
from typing import Generator, Optional

from career_analyzer import compute_title_relevance_score
from config import TITLE_GATE_THRESHOLD

logger = logging.getLogger(__name__)


# ── Title category bucket sizes (from dataset analysis) ───────────────────────
# Core ML/AI:      ~745 candidates (0.75%)
# Tech-adjacent:   ~30,000 candidates (30%)
# Non-tech:        ~69,000 candidates (69%)
# These pass or fail the filter:

PASS_THRESHOLD = TITLE_GATE_THRESHOLD  # 0.05 — anything >= this gets full scoring


def classify_title(title: str) -> dict:
    """
    Classify a candidate title and return classification metadata.

    Returns:
        dict with:
            score       float [0.02, 1.00]
            tier        str   "core_ml_ai" | "adjacent_high" | "adjacent_low" |
                              "general_tech" | "non_tech"
            keep        bool  True if candidate should proceed to full scoring
            filter_note str   Human-readable reason for filter decision
    """
    from config import (
        CORE_ML_AI_TITLES, ADJACENT_HIGH_TITLES,
        ADJACENT_LOW_TITLES, GENERAL_TECH_TITLES, TITLE_SCORE_MAP,
    )

    title_lower = title.lower().strip()
    score = compute_title_relevance_score(title)

    # Determine tier label for logging
    if any(t in title_lower for t in CORE_ML_AI_TITLES):
        tier = "core_ml_ai"
        filter_note = "Core ML/AI role — full scoring"
    elif any(t in title_lower for t in ADJACENT_HIGH_TITLES):
        tier = "adjacent_high"
        filter_note = "Tech-adjacent (high) — full scoring + semantic"
    elif any(t in title_lower for t in ADJACENT_LOW_TITLES):
        tier = "adjacent_low"
        filter_note = "Tech-adjacent (low) — full scoring + semantic"
    elif any(t in title_lower for t in GENERAL_TECH_TITLES):
        tier = "general_tech"
        filter_note = "General tech — full scoring (low prior)"
    else:
        tier = "non_tech"
        filter_note = "Non-tech role — fast-eliminated"

    keep = score >= PASS_THRESHOLD

    return {
        "score": score,
        "tier": tier,
        "keep": keep,
        "filter_note": filter_note,
    }


def filter_candidates(
    candidates: list[dict],
    log_stats: bool = True,
) -> tuple[list[dict], dict]:
    """
    Apply title pre-filter to a list of candidates.

    Args:
        candidates:  List of normalized candidate dicts (from data_loader).
        log_stats:   Whether to log filter statistics.

    Returns:
        (kept, stats) where:
            kept   list[dict]  Candidates that passed the title filter
            stats  dict        Filter statistics for logging / audit
    """
    total = len(candidates)
    kept = []
    filtered_out = []

    tier_counts: dict[str, int] = {
        "core_ml_ai": 0,
        "adjacent_high": 0,
        "adjacent_low": 0,
        "general_tech": 0,
        "non_tech": 0,
    }

    for c in candidates:
        title = c.get("current_title", "")
        result = classify_title(title)
        tier_counts[result["tier"]] = tier_counts.get(result["tier"], 0) + 1

        # Attach title classification to candidate for downstream use
        c["_title_score"] = result["score"]
        c["_title_tier"] = result["tier"]

        if result["keep"]:
            kept.append(c)
        else:
            filtered_out.append(c)

    recall_estimate = tier_counts.get("core_ml_ai", 0) / max(1, total) * 100

    stats = {
        "total_input": total,
        "kept": len(kept),
        "filtered_out": len(filtered_out),
        "filter_rate_pct": round(len(filtered_out) / max(1, total) * 100, 1),
        "recall_estimate_pct": round(recall_estimate, 2),
        "tier_counts": tier_counts,
    }

    if log_stats:
        logger.info(
            f"Title filter: {total:,} in → {len(kept):,} kept "
            f"({stats['filter_rate_pct']}% filtered)"
        )
        for tier, count in tier_counts.items():
            logger.info(f"  {tier:20s}: {count:6,}")

    return kept, stats


def stream_filtered_candidates(
    candidate_generator: Generator[dict, None, None],
    batch_size: int = 5000,
) -> Generator[tuple[dict, bool, float], None, None]:
    """
    Stream candidates through the title filter.
    Memory-efficient: processes one candidate at a time.

    Yields:
        (candidate, keep, title_score) for each candidate
    """
    passed = 0
    total = 0
    for candidate in candidate_generator:
        total += 1
        title = candidate.get("current_title", "")
        result = classify_title(title)
        candidate["_title_score"] = result["score"]
        candidate["_title_tier"] = result["tier"]

        keep = result["keep"]
        if keep:
            passed += 1

        if total % batch_size == 0:
            logger.debug(
                f"Title filter progress: {total:,} processed, "
                f"{passed:,} kept ({passed/total*100:.1f}%)"
            )

        yield candidate, keep, result["score"]


def get_title_score(candidate: dict) -> float:
    """
    Fast title score lookup for a single candidate.
    Uses cached _title_score if already computed, else computes on the fly.
    """
    if "_title_score" in candidate:
        return candidate["_title_score"]
    return compute_title_relevance_score(candidate.get("current_title", ""))


def should_fast_eliminate(title_score: float) -> bool:
    """
    Return True if a candidate should be fast-eliminated (title_score < threshold).
    Fast-eliminated candidates get score = title_score * 0.1, not full scoring.
    """
    return title_score < PASS_THRESHOLD


def log_filter_stats(stats: dict) -> None:
    """Pretty-print filter statistics to logger."""
    logger.info("=" * 50)
    logger.info("TITLE FILTER STATISTICS")
    logger.info("=" * 50)
    logger.info(f"  Total candidates:  {stats['total_input']:,}")
    logger.info(f"  Kept for scoring:  {stats['kept']:,}")
    logger.info(f"  Fast-eliminated:   {stats['filtered_out']:,}")
    logger.info(f"  Filter rate:       {stats['filter_rate_pct']}%")
    logger.info("  By tier:")
    for tier, count in stats["tier_counts"].items():
        pct = count / max(1, stats["total_input"]) * 100
        logger.info(f"    {tier:20s}: {count:6,}  ({pct:.1f}%)")
    logger.info("=" * 50)


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

    # Quick test
    test_titles = [
        "Senior ML Engineer",
        "Data Scientist",
        "Backend Engineer",
        "HR Manager",
        "Business Analyst",
        "Full Stack Developer",
        "NLP Engineer",
        "AI Engineer",
        "Java Developer",
        "DevOps Engineer",
        "Research Scientist",
        "Software Engineer",
    ]

    print(f"\n{'Title':<35} {'Score':>6}  {'Tier':<20} {'Keep'}")
    print("-" * 75)
    for title in test_titles:
        r = classify_title(title)
        keep_str = "✓" if r["keep"] else "✗ (filtered)"
        print(f"{title:<35} {r['score']:>6.2f}  {r['tier']:<20} {keep_str}")
