"""
career_analyzer.py — Module 6 & 7: Career Analyzer + Behavioral Signal Processor
career_quality_score, disqualifier_penalty, behavioral_multiplier
"""

from __future__ import annotations

import math
import re
from datetime import date
from typing import Optional

from config import (
    CONSULTING_FIRMS,
    PRODUCTION_KEYWORDS,
    PRE_LLM_AI_KEYWORDS,
    LEADERSHIP_TITLES,
    CODING_KEYWORDS,
    CV_SPEECH_SKILLS,
    SCALE_KEYWORDS,
    DEPLOY_KEYWORDS,
    ENGINEERING_KEYWORDS,
    KNOWN_PRODUCT_COMPANIES,
    COMPANY_TYPE_SCORES,
    EDUCATION_TIER_SCORES,
    LOCATION_SCORES,
    DEFAULT_LOCATION_SCORE,
    EXPERIENCE_PEAK,
    EXPERIENCE_SIGMA,
)


# ── Company Classification ────────────────────────────────────────────────────

def _is_consulting(company_name: str) -> bool:
    name_lower = company_name.lower()
    return any(firm in name_lower for firm in CONSULTING_FIRMS)


def _classify_company(role: dict) -> float:
    """Return base score for company type."""
    company = role.get("company", "").lower()
    industry = role.get("industry", "").lower()
    size = role.get("company_size", "")
    description = role.get("description", "").lower()

    if _is_consulting(company):
        return COMPANY_TYPE_SCORES["consulting"]

    if any(known in company for known in KNOWN_PRODUCT_COMPANIES):
        return COMPANY_TYPE_SCORES["large_product"]

    # Funded startup signals
    small_sizes = {"1-10", "11-50", "51-200"}
    if size in small_sizes and any(w in industry for w in ["tech", "saas", "ai", "ml"]):
        return COMPANY_TYPE_SCORES["funded_startup"]

    # FinTech/EdTech/HealthTech product
    digital_industries = ["fintech", "edtech", "healthtech", "insurtech", "proptech"]
    if any(d in industry.lower() for d in digital_industries):
        return COMPANY_TYPE_SCORES["fintech_edtech"]

    # IT Services
    if any(w in company for w in ["services", "solutions", "consulting", "systems", "technology services"]):
        return COMPANY_TYPE_SCORES["it_services"]

    # Large non-tech
    if size == "10001+" and not any(t in industry for t in ["tech", "software"]):
        return COMPANY_TYPE_SCORES["large_non_tech"]

    # Default: product startup
    return COMPANY_TYPE_SCORES["product_startup"]


def _recency_weight(role: dict) -> float:
    today = date.today()
    is_current = role.get("is_current", False)
    end_dt = role.get("end_date") or today

    if is_current:
        return 2.5
    months_ago = max(0, (today.year - end_dt.year) * 12 + (today.month - end_dt.month))
    if months_ago <= 24:
        return 1.8
    return 1.0


def compute_company_type_score(career_history: list[dict]) -> float:
    """Recency-weighted average of company type scores."""
    if not career_history:
        return 0.5
    total_weight = 0.0
    total_score = 0.0
    for role in career_history:
        dur = max(1, role.get("duration_months", 1))
        rw = _recency_weight(role)
        base = _classify_company(role)
        weight = base * rw * dur
        total_score += weight
        total_weight += rw * dur
    return total_score / total_weight if total_weight > 0 else 0.5


# ── Production Evidence Scoring ───────────────────────────────────────────────

def compute_production_signal_score(career_history: list[dict]) -> float:
    """
    raw_production = sum(keyword_points * recency_mult for each keyword)
    production_signal_score = min(1.0, raw_production / 15)
    """
    raw = 0.0
    for i, role in enumerate(career_history):
        desc = role.get("description", "").lower()
        recency_mult = 1.5 if i <= 1 else 1.0

        for kw in SCALE_KEYWORDS:
            if kw in desc:
                raw += 3 * recency_mult

        for kw in DEPLOY_KEYWORDS:
            if kw in desc:
                raw += 2 * recency_mult

        for kw in ENGINEERING_KEYWORDS:
            if kw in desc:
                raw += 1 * recency_mult

    return min(1.0, raw / 15.0)


# ── Seniority Scoring ─────────────────────────────────────────────────────────

def compute_seniority_score(current_title: str) -> float:
    """Return seniority score based on title pattern matching."""
    title = current_title.lower()

    # Senior/Staff/Principal ML/AI Engineer → 0.95
    if any(s in title for s in ["senior", "staff", "principal"]):
        if any(t in title for t in ["ml", "ai", "nlp", "data scientist", "applied scientist", "search"]):
            return 0.95

    # Mid-level ML/AI/DS/NLP → 0.85
    if any(t in title for t in ["ml engineer", "ai engineer", "data scientist",
                                  "nlp engineer", "research scientist", "applied scientist",
                                  "search engineer", "ranking engineer"]):
        return 0.85

    # Senior Software/Backend with ML context → 0.80
    if "senior" in title and any(t in title for t in ["software", "backend", "data"]):
        return 0.80

    # Lead → 0.80
    if any(t in title for t in ["lead engineer", "tech lead"]):
        return 0.80

    # Software / Backend Engineer → 0.65
    if any(t in title for t in ["software engineer", "backend engineer", "data engineer",
                                  "analytics engineer", "ml platform"]):
        return 0.65

    # Junior/Associate → 0.50
    if any(t in title for t in ["junior", "associate", "trainee", "intern"]):
        return 0.50

    # Manager/Director/VP → 0.45
    if any(t in title for t in ["manager", "director", "vp", "head of", "cto", "cpo"]):
        return 0.45

    # Research Scientist → 0.55
    if "research scientist" in title or "researcher" in title:
        return 0.55

    # Principal / Architect general → 0.75
    if any(t in title for t in ["principal", "architect"]):
        return 0.75

    return 0.60  # default


# ── Industry Relevance ────────────────────────────────────────────────────────

def compute_industry_relevance(career_history: list[dict]) -> float:
    """Score how relevant past industries are to AI/ML/Search."""
    relevant_industries = [
        "tech", "ai", "ml", "search", "e-commerce", "fintech", "edtech",
        "hr tech", "recruiting", "analytics", "saas", "software",
    ]
    total_months = 0
    relevant_months = 0
    for role in career_history:
        dur = role.get("duration_months", 0)
        industry = role.get("industry", "").lower()
        total_months += dur
        if any(ri in industry for ri in relevant_industries):
            relevant_months += dur
    if total_months == 0:
        return 0.5
    ratio = relevant_months / total_months
    return 0.40 + 0.60 * ratio


# ── Disqualifier Penalties ────────────────────────────────────────────────────

def compute_disqualifier_penalty(candidate: dict) -> dict:
    """
    Compute all 6 disqualifier soft-curve penalties. Return worst combined penalty.
    """
    career_history = candidate.get("career_history", [])
    skills = candidate.get("skills", [])
    current_title = candidate.get("current_title", "").lower()

    all_descriptions = " ".join(r.get("description", "") for r in career_history).lower()

    penalties = {}
    flags = []

    # ── Disqualifier 1: All-consulting career ─────────────────────────────────
    total_career_months = sum(r.get("duration_months", 1) for r in career_history) or 1
    consulting_months = sum(
        r.get("duration_months", 0) for r in career_history if _is_consulting(r.get("company", ""))
    )
    consulting_ratio = consulting_months / total_career_months
    d1_penalty = 1.0 - (consulting_ratio ** 0.65 * 0.75)
    d1_penalty = max(0.25, min(1.0, d1_penalty))
    penalties["consulting"] = d1_penalty
    if consulting_ratio > 0.5:
        flags.append(f"High consulting ratio: {consulting_ratio:.0%} of career at consulting firms")

    # ── Disqualifier 2: Pure research, no production ──────────────────────────
    prod_count = sum(1 for kw in PRODUCTION_KEYWORDS if kw in all_descriptions)
    d2_penalty = 0.20 + 0.80 * min(1.0, prod_count / 5.0)
    penalties["pure_research"] = d2_penalty
    if prod_count == 0:
        flags.append("No production evidence in career descriptions")

    # ── Disqualifier 3: Recent LangChain/API-wrapper AI (< 12 months pre-LLM) ─
    pre_llm_count = sum(
        1 for role in career_history
        for kw in PRE_LLM_AI_KEYWORDS
        if kw in role.get("description", "").lower() and
        role.get("start_date") and role["start_date"].year < 2022
    )
    d3_penalty = 0.35 + 0.65 * min(1.0, pre_llm_count / 18.0)
    penalties["api_wrapper_only"] = d3_penalty

    # ── Disqualifier 4: Non-coding technical leadership (18+ months) ──────────
    is_leadership = any(lt in current_title for lt in LEADERSHIP_TITLES)
    last_18m_descs = " ".join(
        r.get("description", "") for r in career_history[:2]
    ).lower()
    coding_count = sum(1 for kw in CODING_KEYWORDS if kw in last_18m_descs)
    coding_evidence = min(1.0, coding_count / 3.0)
    d4_penalty = 0.60 + 0.40 * coding_evidence if is_leadership else 1.0
    penalties["non_coding_leadership"] = d4_penalty
    if is_leadership and coding_count < 2:
        flags.append(f"Leadership title '{current_title}' with limited coding evidence")

    # ── Disqualifier 5: CV/Speech/Robotics only ──────────────────────────────
    cv_skill_count = sum(
        1 for sk in skills
        if any(cv in sk["name"].lower() for cv in CV_SPEECH_SKILLS) and
        sk.get("proficiency") in ["advanced", "expert"]
    )
    total_advanced_expert = sum(
        1 for sk in skills if sk.get("proficiency") in ["advanced", "expert"]
    )
    nlp_ir_keywords = ["nlp", "search", "ranking", "retrieval", "embeddings", "bert", "transformer"]
    nlp_skill_score = min(1.0, sum(
        1 for sk in skills
        if any(kw in sk["name"].lower() for kw in nlp_ir_keywords)
    ) / 3.0)

    cv_only = (
        total_advanced_expert > 0 and
        cv_skill_count / max(total_advanced_expert, 1) > 0.5 and
        nlp_skill_score < 0.3
    )
    d5_penalty = 0.40 + 0.60 * max(0, nlp_skill_score)
    if cv_only:
        d5_penalty = min(d5_penalty, 0.55)
        flags.append("Predominantly CV/Speech skills without NLP/IR background")
    penalties["cv_speech_only"] = d5_penalty

    # ── Disqualifier 6: Closed-source proprietary (5+ years, no external) ─────
    all_text = all_descriptions
    validation_signals = [
        "github", "paper", "arxiv", "conference", "open-source", "open source",
        "published", "kaggle", "talk", "blog",
    ]
    validation_count = sum(1 for sig in validation_signals if sig in all_text)
    tenure_years = total_career_months / 12
    d6_penalty = 1.0
    if tenure_years > 5 and validation_count < 2:
        external_score = min(1.0, validation_count / 2.0)
        d6_penalty = 0.55 + 0.45 * external_score
        if validation_count == 0:
            flags.append("5+ years career with no external validation signals (papers/GitHub/talks)")
    penalties["closed_source"] = d6_penalty

    # Combined: take minimum (worst) penalty across all disqualifiers
    combined = min(penalties.values())
    combined = max(0.20, min(1.0, combined))

    return {
        "disqualifier_penalty": round(combined, 4),
        "disqualifier_flags": flags,
        "disqualifier_details": {k: round(v, 4) for k, v in penalties.items()},
    }


# ── Final Career Quality Score ────────────────────────────────────────────────

def compute_career_score(candidate: dict) -> dict:
    """
    career_quality_score = (0.35 * company_type_score
                           + 0.30 * production_signal_score
                           + 0.25 * seniority_score
                           + 0.10 * industry_relevance_score)
                           * disqualifier_penalty
    """
    career_history = candidate.get("career_history", [])
    current_title = candidate.get("current_title", "")

    company_score = compute_company_type_score(career_history)
    production_score = compute_production_signal_score(career_history)
    seniority = compute_seniority_score(current_title)
    industry = compute_industry_relevance(career_history)
    disq_result = compute_disqualifier_penalty(candidate)
    disq_penalty = disq_result["disqualifier_penalty"]

    base = (0.35 * company_score
            + 0.30 * production_score
            + 0.25 * seniority
            + 0.10 * industry)
    career_quality = base * disq_penalty

    return {
        "career_score": round(career_quality, 4),
        "company_type_score": round(company_score, 4),
        "production_signal_score": round(production_score, 4),
        "seniority_score": round(seniority, 4),
        "industry_relevance_score": round(industry, 4),
        **disq_result,
    }


# ── Experience Score ──────────────────────────────────────────────────────────

def compute_experience_score(years_of_experience: float) -> float:
    """
    experience_score = exp(-0.5 * ((YoE - 7.0) / 3.5)^2)
    Gaussian curve peaking at 7 years.
    """
    z = (years_of_experience - EXPERIENCE_PEAK) / EXPERIENCE_SIGMA
    return round(math.exp(-0.5 * z * z), 4)


# ── Location Score ────────────────────────────────────────────────────────────

def compute_location_score(location: str) -> float:
    location_lower = location.lower()
    for city, score in LOCATION_SCORES.items():
        if city in location_lower:
            return score
    return DEFAULT_LOCATION_SCORE


# ── Education Score ───────────────────────────────────────────────────────────

def compute_education_score(education: list[dict]) -> float:
    """Score based on best institution tier."""
    if not education:
        return 0.45
    tier_order = {"tier_1": 5, "tier_2": 4, "tier_3": 3, "tier_4": 2, "unknown": 1}
    best = max(education, key=lambda e: tier_order.get(e.get("tier", "unknown"), 1))
    return EDUCATION_TIER_SCORES.get(best.get("tier", "unknown"), 0.45)


# ── Title Relevance Scoring ───────────────────────────────────────────────────

def compute_title_relevance_score(current_title: str) -> float:
    """
    Fast title lookup for pre-filter gate.
    Returns: 1.0 (core), 0.70 (adjacent high), 0.35 (adjacent low),
             0.10 (general tech), 0.02 (non-tech)
    """
    from config import (
        CORE_ML_AI_TITLES, ADJACENT_HIGH_TITLES,
        ADJACENT_LOW_TITLES, GENERAL_TECH_TITLES, TITLE_SCORE_MAP,
    )
    title_lower = current_title.lower()

    if any(t in title_lower for t in CORE_ML_AI_TITLES):
        return TITLE_SCORE_MAP["core_ml_ai"]
    if any(t in title_lower for t in ADJACENT_HIGH_TITLES):
        return TITLE_SCORE_MAP["adjacent_high"]
    if any(t in title_lower for t in ADJACENT_LOW_TITLES):
        return TITLE_SCORE_MAP["adjacent_low"]
    if any(t in title_lower for t in GENERAL_TECH_TITLES):
        return TITLE_SCORE_MAP["general_tech"]
    return TITLE_SCORE_MAP["non_tech"]


# ── Behavioral Multiplier ─────────────────────────────────────────────────────

def compute_behavioral_multiplier(candidate: dict) -> dict:
    """
    Module 9: Behavioral Signal Processor
    behavioral_multiplier = recency_mult * open_to_work_mult * response_mult * notice_mult
    Clamped to [0.05, 1.30]
    """
    today = date.today()
    last_active = candidate.get("last_active_date", today)
    if isinstance(last_active, str):
        from datetime import datetime
        try:
            last_active = datetime.strptime(last_active[:10], "%Y-%m-%d").date()
        except Exception:
            last_active = today

    days_inactive = max(0, (today - last_active).days)
    recency_mult = max(0.20, math.exp(-days_inactive / 90.0))

    open_to_work = candidate.get("open_to_work_flag", False)
    open_mult = 1.0 if open_to_work else 0.45

    response_rate = candidate.get("recruiter_response_rate", 0.5)
    response_mult = 0.30 + 0.70 * float(response_rate)

    notice = int(candidate.get("notice_period_days", 60))
    notice_mult = math.exp(-max(0, notice - 30) / 80.0)

    behavioral = recency_mult * open_mult * response_mult * notice_mult
    behavioral = max(0.05, min(1.30, behavioral))

    return {
        "behavioral_multiplier": round(behavioral, 4),
        "behavioral_breakdown": {
            "recency": round(recency_mult, 4),
            "days_inactive": days_inactive,
            "open_to_work": round(open_mult, 4),
            "response_rate": round(response_mult, 4),
            "notice": round(notice_mult, 4),
        },
    }


# ── Platform Quality Score ────────────────────────────────────────────────────

def compute_platform_quality(candidate: dict) -> float:
    """
    Module 9.2: Additive platform quality score. Max ~0.25.
    """
    github = candidate.get("github_activity_score")
    github_bonus = 0.0
    if github is not None and github != -1:
        github_bonus = min(0.12, float(github) / 100.0 * 0.12)

    interview_rate = float(candidate.get("interview_completion_rate", 0.5))
    offer_rate = float(candidate.get("offer_acceptance_rate", 0.5))
    if offer_rate < 0:
        offer_rate = 0.5
    interview_q = interview_rate * max(0.5, offer_rate) * 0.08

    completeness = float(candidate.get("profile_completeness_score", 60))
    completeness_score = max(0, (completeness - 60) / 40.0) * 0.05

    total = github_bonus + interview_q + completeness_score
    return round(min(0.30, total), 4)
