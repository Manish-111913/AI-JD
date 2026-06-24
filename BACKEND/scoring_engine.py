"""
scoring_engine.py — Module 8 & 9: Full First-Pass Composite Scorer
Combines all feature modules into a single first_pass_score per candidate.
"""

from __future__ import annotations

import logging
from typing import Optional

from career_analyzer import (
    compute_career_score,
    compute_experience_score,
    compute_location_score,
    compute_education_score,
    compute_title_relevance_score,
    compute_behavioral_multiplier,
    compute_platform_quality,
)
from honeypot_detector import detect_honeypot
from skill_scorer import compute_skill_score

from config import TITLE_GATE_THRESHOLD, WEIGHTS

logger = logging.getLogger(__name__)


def compute_first_pass_score(
    candidate: dict,
    semantic_score: float = 0.0,
) -> dict:
    """
    Complete first-pass scoring for a single candidate.

    Formula (Module 10.2):
    base_score = 0.35 * skill_score
               + 0.30 * career_quality_score
               + 0.10 * experience_score
               + 0.10 * location_score
               + 0.05 * education_score
               + platform_quality_score

    first_pass_score = base_score
                     * title_gate_multiplier  (0.1 if irrelevant title, else 1.0)
                     * behavioral_multiplier  (0.05 to 1.30)
                     * disqualifier_penalty   (soft curve 0.20 to 1.00)
                     * honeypot_penalty       (0.0, 0.15, 0.55, or 1.0)
    """
    cid = candidate.get("candidate_id", "")

    # ── Stage 5: Title Pre-filter ─────────────────────────────────────────────
    title = candidate.get("current_title", "")
    title_score = compute_title_relevance_score(title)

    # If title is near-zero, short circuit
    if title_score < TITLE_GATE_THRESHOLD:
        return {
            "candidate_id": cid,
            "title_score": title_score,
            "title_gate_multiplier": 0.1,
            "first_pass_score": round(title_score * 0.1, 6),
            "fast_filtered": True,
            # Zeros for all other components
            "skill_score": 0.0,
            "skill_keyword_component": 0.0,
            "skill_semantic_component": 0.0,
            "career_score": 0.0,
            "experience_score": 0.0,
            "location_score": 0.0,
            "education_score": 0.0,
            "platform_quality_score": 0.0,
            "behavioral_multiplier": 1.0,
            "behavioral_breakdown": {},
            "disqualifier_penalty": 1.0,
            "disqualifier_flags": [],
            "disqualifier_details": {},
            "honeypot_confidence": 0.0,
            "honeypot_evidence_points": 0,
            "honeypot_flags": [],
            "honeypot_penalty": 1.0,
            "honeypot_tier": "clean",
            "semantic_score": 0.0,
        }

    # ── Honeypot Detection ─────────────────────────────────────────────────────
    honeypot_result = detect_honeypot(candidate)

    # ── Skill Score ───────────────────────────────────────────────────────────
    skills = candidate.get("skills", [])
    skill_result = compute_skill_score(skills, semantic_score)

    # ── Career Score ──────────────────────────────────────────────────────────
    career_result = compute_career_score(candidate)

    # ── Experience Score ──────────────────────────────────────────────────────
    yoe = float(candidate.get("years_of_experience", 0))
    experience_score = compute_experience_score(yoe)

    # ── Location Score ────────────────────────────────────────────────────────
    location = candidate.get("location", "")
    location_score = compute_location_score(location)

    # ── Education Score ───────────────────────────────────────────────────────
    education = candidate.get("education", [])
    education_score = compute_education_score(education)

    # ── Platform Quality (additive) ───────────────────────────────────────────
    platform_quality = compute_platform_quality(candidate)

    # ── Behavioral Multiplier ─────────────────────────────────────────────────
    behavioral_result = compute_behavioral_multiplier(candidate)
    behavioral_mult = behavioral_result["behavioral_multiplier"]

    # ── Base Score ─────────────────────────────────────────────────────────────
    base_score = (
        WEIGHTS["skills"] * skill_result["skill_score"]
        + WEIGHTS["career"] * career_result["career_score"]
        + WEIGHTS["experience"] * experience_score
        + WEIGHTS["location"] * location_score
        + WEIGHTS["education"] * education_score
        + platform_quality
    )

    # ── Apply multipliers ─────────────────────────────────────────────────────
    title_gate = 1.0  # title_score >= threshold, so gate = 1.0
    disq_penalty = career_result["disqualifier_penalty"]
    honeypot_penalty = honeypot_result["honeypot_penalty"]

    first_pass_score = (
        base_score
        * title_gate
        * behavioral_mult
        * disq_penalty
        * honeypot_penalty
    )

    first_pass_score = max(0.0, min(1.0, first_pass_score))

    return {
        "candidate_id": cid,
        "title_score": round(title_score, 4),
        "title_gate_multiplier": title_gate,
        "first_pass_score": round(first_pass_score, 6),
        "fast_filtered": False,
        # Component scores
        "skill_score": skill_result["skill_score"],
        "skill_keyword_component": skill_result["skill_keyword_component"],
        "skill_semantic_component": skill_result["skill_semantic_component"],
        "keyword_trust_score": skill_result["keyword_trust_score"],
        "preferred_bonus": skill_result["preferred_bonus"],
        "career_score": career_result["career_score"],
        "company_type_score": career_result["company_type_score"],
        "production_signal_score": career_result["production_signal_score"],
        "seniority_score": career_result["seniority_score"],
        "experience_score": experience_score,
        "location_score": location_score,
        "education_score": education_score,
        "platform_quality_score": platform_quality,
        # Multipliers
        "behavioral_multiplier": behavioral_mult,
        "behavioral_breakdown": behavioral_result["behavioral_breakdown"],
        "disqualifier_penalty": disq_penalty,
        "disqualifier_flags": career_result["disqualifier_flags"],
        "disqualifier_details": career_result.get("disqualifier_details", {}),
        # Honeypot
        "honeypot_confidence": honeypot_result["honeypot_confidence"],
        "honeypot_evidence_points": honeypot_result["honeypot_evidence_points"],
        "honeypot_flags": honeypot_result["honeypot_flags"],
        "honeypot_penalty": honeypot_result["honeypot_penalty"],
        "honeypot_tier": honeypot_result["honeypot_tier"],
        # Semantic
        "semantic_score": round(semantic_score, 4),
    }
