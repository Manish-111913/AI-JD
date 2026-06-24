"""
reasoning_generator.py — Module 10: Template-Based Reasoning Generator
Builds deterministic reasoning strings from candidate profile data.
Ranks 1-10: Tier 1. Ranks 11-50: Tier 2. Ranks 51-100: Tier 3.
"""

from __future__ import annotations

from config import JD_SKILL_CATEGORIES, PROFICIENCY_WEIGHTS


def _get_top_jd_matched_skill(candidate: dict, features: dict) -> str:
    """Find the highest-trust skill that matches a JD skill category."""
    skills = candidate.get("skills", [])
    best_skill = ""
    best_trust = -1.0

    for sk in skills:
        name = sk.get("name", "")
        prof = sk.get("proficiency", "beginner")
        dur = sk.get("duration_months", 0)

        # Check if it matches any JD category
        for cat_info in JD_SKILL_CATEGORIES.values():
            if any(kw in name.lower() for kw in cat_info["keywords"]):
                trust = PROFICIENCY_WEIGHTS.get(prof, 0.25)
                if trust > best_trust:
                    best_trust = trust
                    best_skill = f"{name} ({prof}, {dur}mo)"
                break

    return best_skill or (skills[0]["name"] if skills else "general ML")


def _get_best_product_company(career_history: list[dict]) -> str:
    """Get the most recent/impressive product company name."""
    from config import CONSULTING_FIRMS
    for role in career_history:
        company = role.get("company", "")
        if not any(firm in company.lower() for firm in CONSULTING_FIRMS):
            return company
    return career_history[0]["company"] if career_history else "current employer"


def _get_top_concern(candidate: dict, features: dict) -> str | None:
    """Return the most significant concern about this candidate, or None."""
    concerns = []

    if not candidate.get("open_to_work_flag"):
        concerns.append("not marked open to work")

    notice = candidate.get("notice_period_days", 60)
    if notice > 60:
        concerns.append(f"{notice}-day notice period")

    if features.get("honeypot_confidence", 0) > 0.30:
        concerns.append("profile consistency flags")

    disq_flags = features.get("disqualifier_flags", [])
    if disq_flags:
        concerns.append(disq_flags[0])

    if features.get("consulting_ratio", 0) > 0.3:
        concerns.append("significant consulting background")

    return concerns[0] if concerns else None


def build_reasoning(candidate: dict, features: dict, rank: int) -> str:
    """
    Build tier-appropriate reasoning string per Module 12.
    6 Stage-4 evaluation checks: specific facts, JD connection, honest concerns,
    no hallucination, variation, rank consistency.
    """
    title = candidate.get("current_title", "Engineer")
    yoe = round(float(candidate.get("years_of_experience", 0)), 1)
    location = candidate.get("location", "India")
    notice = int(candidate.get("notice_period_days", 60))
    avail = "open to work" if candidate.get("open_to_work_flag") else "not marked open to work"
    career_history = candidate.get("career_history", [])

    top_skill = _get_top_jd_matched_skill(candidate, features)
    best_company = _get_best_product_company(career_history)
    concern = _get_top_concern(candidate, features)

    # Score details for context
    skill_score = features.get("skill_score", 0.0)
    career_score = features.get("career_score", 0.0)
    ce_score = features.get("ce_score", 0.0)

    if rank <= 10:
        # Tier 1: Title + YoE + company with signal + top 2 matched JD skills + location/availability
        skills = candidate.get("skills", [])
        top_skills = sorted(
            skills,
            key=lambda s: PROFICIENCY_WEIGHTS.get(s.get("proficiency", "beginner"), 0.25),
            reverse=True
        )[:2]
        skill_str = " & ".join(s["name"] for s in top_skills) if top_skills else top_skill

        s1 = f"{title}, {yoe}yrs; {skill_str} at {best_company}."
        s2 = f"{location}. {notice}-day notice. {avail}."
        if concern:
            s2 += f" Note: {concern}."
        return f"{s1} {s2}"

    elif rank <= 50:
        # Tier 2: Title + YoE + key skill + what makes them fit + specific concern
        s1 = f"{title}, {yoe}yrs; {top_skill} experience at {best_company}."
        prod_score = features.get("production_signal_score", 0.0)
        prod_note = "Strong production signals." if prod_score > 0.6 else "Some production experience."
        s2 = f"{prod_note} {location}, {notice}-day notice."
        if concern:
            s2 += f" Concern: {concern}."
        return f"{s1} {s2}"

    else:
        # Tier 3: Genuine strength + what's missing + why included in top-100
        skills = candidate.get("skills", [])
        top_skill_name = skills[0]["name"] if skills else "technical skills"
        s1 = f"{title}, {yoe}yrs; {top_skill_name} background"
        # Honest about marginal fit
        low_skill = skill_score < 0.5
        s2 = "No explicit retrieval/embedding work — included as adjacent fit." if low_skill else \
             f"Adjacent technical skills relevant. {location}."
        if concern:
            s2 += f" {concern.capitalize()}."
        return f"{s1}. {s2}"
