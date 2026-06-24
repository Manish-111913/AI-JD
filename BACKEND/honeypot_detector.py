"""
honeypot_detector.py — Module 3: Honeypot Detection
Evidence accumulation model with sigmoid confidence score.
~80 of 100K candidates have subtly impossible profiles.
"""

from __future__ import annotations

import math
from datetime import date
from typing import Optional


def _months_overlap(start1: date, end1: date, start2: date, end2: date) -> int:
    """Calculate overlap in months between two date ranges."""
    overlap_start = max(start1, start2)
    overlap_end = min(end1, end2)
    if overlap_start >= overlap_end:
        return 0
    delta = overlap_end - overlap_start
    return int(delta.days / 30)


def detect_honeypot(candidate: dict) -> dict:
    """
    Run all 8 honeypot evidence checks.
    Returns: {confidence: float, evidence_points: int, flags: list[str], penalty: float}
    """
    evidence_points = 0
    flags = []
    today = date.today()

    yoe = candidate.get("years_of_experience", 0)
    career_history = candidate.get("career_history", [])
    skills = candidate.get("skills", [])
    education = candidate.get("education", [])
    assessment_scores = candidate.get("skill_assessment_scores", {})

    # ── Check 1: Career Timeline Gaps ────────────────────────────────────────
    # duration_months field vs actual computed (end_date - start_date) gap > 8 months
    for role in career_history:
        stated_dur = role.get("duration_months", 0)
        start_dt = role.get("start_date")
        end_dt = role.get("end_date") or today
        if start_dt:
            computed_months = max(0, (end_dt.year - start_dt.year) * 12 +
                                  (end_dt.month - start_dt.month))
            if abs(stated_dur - computed_months) > 8 and stated_dur > 0:
                evidence_points += 30
                flags.append(
                    f"Timeline gap: stated {stated_dur}mo vs computed {computed_months}mo "
                    f"at {role['company']}"
                )

    # ── Check 2: Impossible Experience Start ─────────────────────────────────
    # career start before (current_year - yoe - 25): no one starts working at age 0
    current_year = today.year
    earliest_reasonable_start = current_year - int(yoe) - 25
    if career_history:
        earliest_start = min(
            (r["start_date"].year for r in career_history if r.get("start_date")),
            default=current_year
        )
        if earliest_start < earliest_reasonable_start:
            evidence_points += 40
            flags.append(
                f"Impossible start year {earliest_start} for {yoe}yrs experience "
                f"(earliest reasonable: {earliest_reasonable_start})"
            )

    # ── Check 3: Overlapping Roles ────────────────────────────────────────────
    for i, r1 in enumerate(career_history):
        for j, r2 in enumerate(career_history):
            if j <= i:
                continue
            s1, e1 = r1.get("start_date"), r1.get("end_date") or today
            s2, e2 = r2.get("start_date"), r2.get("end_date") or today
            if s1 and s2:
                overlap = _months_overlap(s1, e1, s2, e2)
                if overlap > 3:
                    evidence_points += 25
                    flags.append(
                        f"Overlapping roles: {r1['company']} & {r2['company']} "
                        f"overlap by ~{overlap}mo"
                    )

    # ── Check 4: Expert Zero Duration ────────────────────────────────────────
    for sk in skills:
        proficiency = sk.get("proficiency", "")
        dur = sk.get("duration_months", 0)
        endorsements = sk.get("endorsements", 0)
        skill_name = sk.get("name", "")
        has_assessment = skill_name in assessment_scores

        if proficiency == "expert" and dur == 0 and endorsements == 0 and not has_assessment:
            evidence_points += 35
            flags.append(f"Expert zero-duration: '{skill_name}' expert with 0mo duration, 0 endorsements")
        elif proficiency == "advanced" and dur == 0:
            evidence_points += 15
            flags.append(f"Advanced zero-duration: '{skill_name}' advanced with 0mo")

    # ── Check 5: Education Impossible ────────────────────────────────────────
    for edu in education:
        start_y = edu.get("start_year", 0)
        end_y = edu.get("end_year", 0)
        if start_y and end_y:
            if end_y < start_y:
                evidence_points += 30
                flags.append(
                    f"Education end {end_y} before start {start_y} at {edu['institution']}"
                )
            elif (end_y - start_y) < 1 and end_y != start_y:
                evidence_points += 30
                flags.append(
                    f"Education too short: {end_y - start_y}yr at {edu['institution']}"
                )

    # ── Check 6: YoE vs Career Sum ────────────────────────────────────────────
    career_months_sum = sum(r.get("duration_months", 0) for r in career_history)
    career_years_from_sum = career_months_sum / 12
    if yoe > career_years_from_sum + 4:
        evidence_points += 25
        flags.append(
            f"YoE ({yoe}yr) exceeds career sum ({career_years_from_sum:.1f}yr) by >4yrs"
        )

    # ── Check 7: Expert Overload ──────────────────────────────────────────────
    expert_count = sum(1 for sk in skills if sk.get("proficiency") == "expert")
    if expert_count >= 9:
        evidence_points += 20
        flags.append(f"Expert overload: claims expert in {expert_count} skills")

    # ── Compute confidence score ──────────────────────────────────────────────
    # honeypot_confidence = 1 - exp(-evidence_points / 60)
    confidence = 1.0 - math.exp(-evidence_points / 60.0)

    # ── Compute penalty ───────────────────────────────────────────────────────
    if confidence < 0.30:
        penalty = 1.00
        tier = "clean"
    elif confidence < 0.55:
        penalty = 0.55
        tier = "suspicious"
    elif confidence < 0.75:
        penalty = 0.15
        tier = "likely"
    else:
        penalty = 0.00
        tier = "impossible"

    return {
        "honeypot_confidence": round(confidence, 4),
        "honeypot_evidence_points": evidence_points,
        "honeypot_flags": flags,
        "honeypot_penalty": penalty,
        "honeypot_tier": tier,
    }
