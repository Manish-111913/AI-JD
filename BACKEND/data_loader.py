"""
data_loader.py — Module 2: Data Loader & Normalizer
Auto-detects gzip vs plain JSONL. Null-safe field access per schema rules.
Streams 100K candidates with minimal memory overhead.
"""

from __future__ import annotations

import gzip
import json
import logging
from datetime import date, datetime
from pathlib import Path
from typing import Generator, Optional

import re

logger = logging.getLogger(__name__)

CANDIDATE_ID_PATTERN = re.compile(r"^CAND_[0-9]{7}$")


def validate_candidate_schema(raw: dict) -> tuple[bool, Optional[str]]:
    """
    Validate a raw candidate record against the required schema constraints.
    Returns: (is_valid, error_message)
    """
    if not isinstance(raw, dict):
        return False, "Candidate record must be a JSON object (dict)"
    
    # Check top-level required fields
    for field in ["candidate_id", "profile", "career_history", "education", "skills", "redrob_signals"]:
        if field not in raw:
            return False, f"Missing required top-level field: '{field}'"
            
    # Validate candidate_id format
    cid = raw["candidate_id"]
    if not isinstance(cid, str):
        return False, f"candidate_id must be a string, got {type(cid)}"
    if not CANDIDATE_ID_PATTERN.match(cid):
        return False, f"candidate_id '{cid}' does not match pattern '^CAND_[0-9]{{7}}$'"
        
    # Validate profile fields
    profile = raw["profile"]
    if not isinstance(profile, dict):
        return False, "profile field must be a JSON object (dict)"
        
    required_profile_fields = [
        "anonymized_name", "headline", "summary", "location", "country",
        "years_of_experience", "current_title", "current_company",
        "current_company_size", "current_industry"
    ]
    for field in required_profile_fields:
        if field not in profile:
            return False, f"Missing required profile field: '{field}'"
            
    # Validate career_history (must be non-empty array)
    history = raw["career_history"]
    if not isinstance(history, list):
        return False, "career_history field must be an array (list)"
    if len(history) == 0:
        return False, "career_history must contain at least 1 role"
        
    # Validate skills (must be array)
    skills = raw["skills"]
    if not isinstance(skills, list):
        return False, "skills field must be an array (list)"
        
    # Validate education (must be array)
    education = raw["education"]
    if not isinstance(education, list):
        return False, "education field must be an array (list)"
        
    # Validate redrob_signals (must be dict)
    signals = raw["redrob_signals"]
    if not isinstance(signals, dict):
        return False, "redrob_signals field must be a JSON object (dict)"
        
    return True, None


def _open_candidate_file(path: Path):
    """Auto-detect gzip vs plain text JSONL by magic bytes."""
    with open(path, "rb") as f:
        magic = f.read(2)
    if magic == b"\x1f\x8b":
        logger.info("Detected gzip-compressed JSONL")
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    else:
        logger.info("Detected plain-text JSONL")
        return open(path, "r", encoding="utf-8", errors="replace")


def _safe_date(val, fallback: Optional[date] = None) -> Optional[date]:
    """Parse ISO date string safely, returning fallback on failure."""
    if not val:
        return fallback
    try:
        return datetime.strptime(str(val)[:10], "%Y-%m-%d").date()
    except Exception:
        return fallback


def normalize_candidate(raw: dict) -> dict:
    """
    Normalize a raw candidate dict to a flat, null-safe structure.
    Handles all edge cases documented in backend_content.txt Module 4.
    """
    today = date.today()

    profile = raw.get("profile", {})
    signals = raw.get("redrob_signals", {})

    # ── Career history normalization ──────────────────────────────────────────
    career_history = []
    for role in raw.get("career_history", []):
        start_dt = _safe_date(role.get("start_date"))
        end_dt = _safe_date(role.get("end_date"))
        is_current = bool(role.get("is_current", False))

        # Handle null end_date for current roles
        if end_dt is None:
            if is_current:
                end_dt = today
            elif start_dt:
                dur = role.get("duration_months", 0)
                from datetime import timedelta
                end_dt = start_dt + timedelta(days=dur * 30)
            else:
                end_dt = today

        # Classify company type for frontend rendering
        company_lower = str(role.get("company", "")).lower()
        industry_lower = str(role.get("industry", "")).lower()
        size_str = str(role.get("company_size", ""))
        
        company_type = "startup"
        if any(firm in company_lower for firm in ["mckinsey", "boston consulting", "bain", "accenture", "deloitte", "ey", "pwc", "kpmg", "tata consultancy", "tcs", "infosys", "wipro", "cognizant", "capgemini", "hcl", "tech mahindra", "services", "solutions", "consulting", "systems", "technology services"]):
            company_type = "consulting"
        elif any(research in company_lower or research in industry_lower for research in ["research", "lab", "institute", "university", "academy", "science"]):
            company_type = "research"
        elif any(prod in company_lower for prod in ["google", "microsoft", "amazon", "apple", "meta", "netflix", "uber", "airbnb", "spotify", "stripe", "salesforce", "adobe", "oracle", "sap"]):
            company_type = "product"
        elif any(d in industry_lower for d in ["fintech", "edtech", "healthtech", "insurtech", "proptech", "saas", "software", "tech", "ai", "ml"]):
            if size_str in ["1-10", "11-50", "51-200"]:
                company_type = "startup"
            else:
                company_type = "product"
        else:
            if size_str in ["501-1000", "1001-5000", "5001-10000", "10001+"]:
                company_type = "product"
            else:
                company_type = "startup"

        career_history.append({
            "company": str(role.get("company", "")),
            "title": str(role.get("title", "")),
            "start_date": start_dt,
            "end_date": end_dt,
            "duration_months": int(role.get("duration_months", 0)),
            "is_current": is_current,
            "industry": str(role.get("industry", "")),
            "company_size": str(role.get("company_size", "unknown")),
            "description": str(role.get("description", "")),
            "company_type": company_type,
        })

    # Sort by start_date descending (latest first)
    career_history.sort(key=lambda r: r["start_date"] or date.min, reverse=True)

    # ── Skills normalization ──────────────────────────────────────────────────
    skills = []
    assessment_scores = signals.get("skill_assessment_scores", {}) or {}
    for sk in raw.get("skills", []):
        name = str(sk.get("name", ""))
        skills.append({
            "name": name,
            "proficiency": str(sk.get("proficiency", "beginner")),
            "endorsements": int(sk.get("endorsements", 0)),
            "duration_months": int(sk.get("duration_months", 0)),  # safe default 0
            "assessment_score": assessment_scores.get(name, None),
        })

    # ── Education normalization ───────────────────────────────────────────────
    education = []
    for edu in raw.get("education", []):
        education.append({
            "institution": str(edu.get("institution", "")),
            "degree": str(edu.get("degree", "")),
            "field": str(edu.get("field_of_study", edu.get("field", ""))),
            "start_year": int(edu.get("start_year", 0)),
            "end_year": int(edu.get("end_year", 0)),
            "grade": edu.get("grade", None),
            "tier": str(edu.get("tier", "unknown")),
        })

    # ── Redrob signals normalization ──────────────────────────────────────────
    offer_rate = signals.get("offer_acceptance_rate", 0.50)
    if offer_rate == -1 or offer_rate is None:
        offer_rate = 0.50  # neutral

    github_score = signals.get("github_activity_score", -1)
    if github_score == -1 or github_score is None:
        github_score = None  # no github linked → no bonus, no penalty

    # Handle profile_completeness_score: some records have it as 0-1, some 0-100
    completeness = signals.get("profile_completeness_score", 0)
    if isinstance(completeness, float) and completeness <= 1.0:
        completeness = completeness * 100  # normalize to 0-100

    # Format expected salary as a nice string for frontend rendering
    expected_salary = signals.get("expected_salary_range_inr_lpa", {})
    if isinstance(expected_salary, dict):
        min_val = expected_salary.get("min", 0)
        max_val = expected_salary.get("max", 0)
        if min_val or max_val:
            salary_str = f"{min_val} - {max_val} LPA"
        else:
            salary_str = "Not specified"
    else:
        salary_str = str(expected_salary)

    # Re-normalize completeness to 0.0 - 1.0 for frontend rendering (if it is > 1.0)
    completeness_frontend = completeness / 100.0 if completeness > 1.0 else completeness

    redrob_signals = {
        "open_to_work_flag": bool(signals.get("open_to_work_flag", False)),
        "last_active_date": _safe_date(signals.get("last_active_date"), today),
        "recruiter_response_rate": float(signals.get("recruiter_response_rate", 0.5)),
        "avg_response_time_hours": float(signals.get("avg_response_time_hours", 24)),
        "notice_period_days": int(signals.get("notice_period_days", 60)),
        "profile_completeness_score": float(completeness_frontend),
        "github_activity_score": github_score if github_score is not None else -1.0,
        "interview_completion_rate": float(signals.get("interview_completion_rate", 0.5)),
        "offer_acceptance_rate": float(offer_rate),
        "connection_count": int(signals.get("connection_count", 0)),
        "endorsements_received": int(signals.get("endorsements_received", 0)),
        "profile_views_received_30d": int(signals.get("profile_views_received_30d", 0)),
        "saved_by_recruiters_30d": int(signals.get("saved_by_recruiters_30d", 0)),
        "search_appearance_30d": int(signals.get("search_appearance_30d", 0)),
        "applications_submitted_30d": int(signals.get("applications_submitted_30d", 0)),
        "preferred_work_mode": str(signals.get("preferred_work_mode", "flexible")),
        "willing_to_relocate": bool(signals.get("willing_to_relocate", False)),
        "expected_salary_range_inr_lpa": salary_str,
        "verified_email": bool(signals.get("verified_email", False)),
        "verified_phone": bool(signals.get("verified_phone", False)),
        "linkedin_connected": bool(signals.get("linkedin_connected", False)),
        "skill_assessment_scores": assessment_scores,
    }

    return {
        "candidate_id": str(raw.get("candidate_id", "")),
        # Profile fields
        "anonymized_name": str(profile.get("anonymized_name", "")),
        "headline": str(profile.get("headline", "")),
        "summary": str(profile.get("summary", "")),
        "location": str(profile.get("location", "")),
        "country": str(profile.get("country", "")),
        "years_of_experience": float(profile.get("years_of_experience", 0)),
        "current_title": str(profile.get("current_title", "")),
        "current_company": str(profile.get("current_company", "")),
        "current_company_size": str(profile.get("current_company_size", "unknown")),
        "current_industry": str(profile.get("current_industry", "")),
        # Nested
        "career_history": career_history,
        "skills": skills,
        "education": education,
        "certifications": raw.get("certifications", []) or [],
        "languages": raw.get("languages", []) or [],
        # Flat Signals (for Backend Scorer Modules)
        "open_to_work_flag": bool(signals.get("open_to_work_flag", False)),
        "last_active_date": _safe_date(signals.get("last_active_date"), today),
        "recruiter_response_rate": float(signals.get("recruiter_response_rate", 0.5)),
        "avg_response_time_hours": float(signals.get("avg_response_time_hours", 24)),
        "notice_period_days": int(signals.get("notice_period_days", 60)),
        "profile_completeness_score": float(completeness),
        "github_activity_score": github_score,
        "interview_completion_rate": float(signals.get("interview_completion_rate", 0.5)),
        "offer_acceptance_rate": float(offer_rate),
        "connection_count": int(signals.get("connection_count", 0)),
        "endorsements_received": int(signals.get("endorsements_received", 0)),
        "profile_views_received_30d": int(signals.get("profile_views_received_30d", 0)),
        "saved_by_recruiters_30d": int(signals.get("saved_by_recruiters_30d", 0)),
        "search_appearance_30d": int(signals.get("search_appearance_30d", 0)),
        "applications_submitted_30d": int(signals.get("applications_submitted_30d", 0)),
        "preferred_work_mode": str(signals.get("preferred_work_mode", "flexible")),
        "willing_to_relocate": bool(signals.get("willing_to_relocate", False)),
        "expected_salary_range_inr_lpa": signals.get("expected_salary_range_inr_lpa", {"min": 0, "max": 0}),
        "verified_email": bool(signals.get("verified_email", False)),
        "verified_phone": bool(signals.get("verified_phone", False)),
        "linkedin_connected": bool(signals.get("linkedin_connected", False)),
        "skill_assessment_scores": assessment_scores,
        # Re-inject nested signals dict (for Frontend Views)
        "redrob_signals": redrob_signals,
    }


def stream_candidates(path: Path) -> Generator[dict, None, None]:
    """
    Stream normalized candidates from a JSONL or JSONL.GZ file.
    Yields one normalized candidate dict per line.
    Skips invalid JSON lines or schema violations with a warning.
    """
    skipped = 0
    loaded = 0
    fh = _open_candidate_file(path)
    try:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
                is_valid, err_msg = validate_candidate_schema(raw)
                if not is_valid:
                    skipped += 1
                    if skipped <= 10:
                        logger.warning(f"Candidate schema validation failed (skipped): {err_msg}")
                    continue
                yield normalize_candidate(raw)
                loaded += 1
            except json.JSONDecodeError as e:
                skipped += 1
                if skipped <= 5:
                    logger.warning(f"Invalid JSON line (skipped): {e}")
    finally:
        fh.close()
    logger.info(f"Loaded {loaded} candidates, skipped/invalidated {skipped} lines")


def load_all_candidates(path: Path) -> list[dict]:
    """Load all candidates into memory (for smaller files / sample mode)."""
    return list(stream_candidates(path))


def build_candidate_text(candidate: dict, max_summary_chars: int = 300, max_desc_chars: int = 200) -> str:
    """
    Module 4.3: Build unified text per candidate for bi-encoder embedding.
    Order: title, headline, summary, career history (latest 3), top 8 skills.
    """
    parts = []
    parts.append(candidate["current_title"] + ".")
    if candidate["headline"]:
        parts.append(candidate["headline"] + ".")
    if candidate["summary"]:
        parts.append(candidate["summary"][:max_summary_chars] + ".")

    for role in candidate["career_history"][:3]:
        desc = role["description"][:max_desc_chars]
        parts.append(f"{role['title']} at {role['company']} ({role['industry']}): {desc}.")

    # Top 8 skills sorted by proficiency weight
    proficiency_order = {"expert": 4, "advanced": 3, "intermediate": 2, "beginner": 1}
    top_skills = sorted(
        candidate["skills"],
        key=lambda s: proficiency_order.get(s["proficiency"], 0),
        reverse=True
    )[:8]
    if top_skills:
        skill_names = ", ".join(s["name"] for s in top_skills)
        parts.append(f"Skills: {skill_names}.")

    return " ".join(parts)


def build_ce_passage(candidate: dict) -> str:
    """
    Module 11.4: Build compact passage text for cross-encoder.
    Truncated to ~400 tokens worth of content.
    """
    parts = [
        f"{candidate['current_title']}, {round(candidate['years_of_experience'], 1)} years."
    ]

    for role in candidate["career_history"][:3]:
        parts.append(
            f"{role['title']} at {role['company']} ({role['industry']}): {role['description'][:200]}."
        )

    # Top 6 skills by proficiency
    proficiency_order = {"expert": 4, "advanced": 3, "intermediate": 2, "beginner": 1}
    top_skills = sorted(
        candidate["skills"],
        key=lambda s: proficiency_order.get(s["proficiency"], 0),
        reverse=True
    )[:6]
    if top_skills:
        skill_names = ", ".join(s["name"] for s in top_skills)
        parts.append(f"Key skills: {skill_names}.")

    avail = "open to work" if candidate["open_to_work_flag"] else "not marked open to work"
    parts.append(f"Location: {candidate['location']}. Available: {avail}.")

    return " ".join(parts)
