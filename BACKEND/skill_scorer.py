"""
skill_scorer.py — Module 5: Skill Scorer
skill_score = 0.40 * keyword_trust_score + 0.60 * semantic_score
"""

from __future__ import annotations

import math
from typing import Optional

from config import (
    JD_SKILL_CATEGORIES,
    PREFERRED_SKILLS,
    PROFICIENCY_WEIGHTS,
)


def _duration_factor(duration_months: int) -> float:
    """
    Soft sigmoid: 0 months -> 0.20 (floor). 12 months -> 0.61. 36+ -> 0.93
    duration_factor = 0.20 + 0.80 * (1 - exp(-duration_months / 15))
    """
    return 0.20 + 0.80 * (1.0 - math.exp(-duration_months / 15.0))


def _endorsement_factor(endorsements: int) -> float:
    """
    endorsement_factor = min(0.30, log(1 + endorsements) / log(51) * 0.30)
    0 endorsements -> 0.0. 5 -> 0.14. 20 -> 0.22. 50 -> 0.30
    """
    return min(0.30, math.log(1 + endorsements) / math.log(51) * 0.30)


def _assessment_factor(assessment_score: Optional[float]) -> float:
    """
    assessment_factor = score/100 * 0.25
    No assessment -> 0.0. Score=80 -> 0.20. Score=100 -> 0.25
    """
    if assessment_score is None:
        return 0.0
    return (float(assessment_score) / 100.0) * 0.25


def skill_trust(skill: dict) -> float:
    """
    Compute per-skill trust score:
    trust = max(0.05, min(1.0, proficiency_weight * duration_factor + endorsement_factor + assessment_factor))
    """
    proficiency = skill.get("proficiency", "beginner")
    prof_weight = PROFICIENCY_WEIGHTS.get(proficiency, 0.25)
    dur = _duration_factor(int(skill.get("duration_months", 0)))
    end = _endorsement_factor(int(skill.get("endorsements", 0)))
    asmt = _assessment_factor(skill.get("assessment_score"))

    trust = prof_weight * dur + end + asmt
    return max(0.05, min(1.0, trust))


def _skill_matches_category(skill_name: str, keywords: list[str]) -> bool:
    """Case-insensitive partial match."""
    name_lower = skill_name.lower()
    for kw in keywords:
        if kw in name_lower or name_lower in kw:
            return True
    return False


def compute_keyword_trust_score(skills: list[dict]) -> dict:
    """
    Compute keyword trust score using JD skill categories.
    Returns per-category scores and the weighted total.
    """
    category_scores = {}

    for cat_key, cat_info in JD_SKILL_CATEGORIES.items():
        keywords = cat_info["keywords"]
        weight = cat_info["weight"]
        max_trust = 0.0

        for skill in skills:
            if _skill_matches_category(skill["name"], keywords):
                t = skill_trust(skill)
                max_trust = max(max_trust, t)

        category_scores[cat_key] = {
            "score": max_trust,
            "weight": weight,
            "contribution": weight * max_trust,
        }

    total = sum(v["contribution"] for v in category_scores.values())
    return {
        "keyword_trust_score": round(total, 4),
        "category_breakdown": category_scores,
    }


def count_preferred_skills(skills: list[dict]) -> int:
    """Count how many JD preferred skills a candidate has."""
    count = 0
    for skill in skills:
        name_lower = skill["name"].lower()
        for pref in PREFERRED_SKILLS:
            if pref in name_lower or name_lower in pref:
                count += 1
                break
    return count


def compute_skill_score(
    skills: list[dict],
    semantic_score: float,
) -> dict:
    """
    Full skill score:
    skill_score = 0.40 * keyword_trust_score + 0.60 * semantic_score
    preferred_bonus = min(0.08, count_preferred * 0.02)
    final_skill_score = min(1.0, skill_score + preferred_bonus)
    """
    kw_result = compute_keyword_trust_score(skills)
    keyword_trust = kw_result["keyword_trust_score"]

    base = 0.40 * keyword_trust + 0.60 * semantic_score
    preferred_count = count_preferred_skills(skills)
    preferred_bonus = min(0.08, preferred_count * 0.02)
    final = min(1.0, base + preferred_bonus)

    return {
        "skill_score": round(final, 4),
        "skill_keyword_component": round(0.40 * keyword_trust, 4),
        "skill_semantic_component": round(0.60 * semantic_score, 4),
        "keyword_trust_score": keyword_trust,
        "semantic_score": round(semantic_score, 4),
        "preferred_bonus": round(preferred_bonus, 4),
        "preferred_skills_count": preferred_count,
        "category_breakdown": kw_result["category_breakdown"],
    }
