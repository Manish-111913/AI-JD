"""
jd_parser.py — Phase A: Job Description Parser
Reads job_description.docx and extracts:
  - hard_skills (required / JD skill categories)
  - preferred_skills
  - experience_requirements
  - disqualifier rules
  - title_relevance_map
  - location_map
  - embedding queries
Produces a normalized requirements object (dict).
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Static JD Requirements (Ground-truth from Backend FINAL spec) ─────────────
# These are embedded in the code as the JD spec is fixed for this competition.
# The docx is parsed to validate / augment, but the canonical requirements
# come from the Backend Logic Bible which was manually extracted into config.py.

from config import (
    JD_SKILL_CATEGORIES,
    PREFERRED_SKILLS,
    EXPERIENCE_PEAK,
    EXPERIENCE_SIGMA,
    LOCATION_SCORES,
    DEFAULT_LOCATION_SCORE,
    TITLE_SCORE_MAP,
    CORE_ML_AI_TITLES,
    ADJACENT_HIGH_TITLES,
    ADJACENT_LOW_TITLES,
    GENERAL_TECH_TITLES,
    JD_QUERIES,
    CE_QUERY,
    CONSULTING_FIRMS,
)


def _try_parse_docx(docx_path: Path) -> Optional[str]:
    """
    Attempt to extract raw text from a .docx file.
    Returns None if python-docx is unavailable or the file is unreadable.
    """
    try:
        from docx import Document  # type: ignore
        doc = Document(str(docx_path))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except ImportError:
        logger.warning("python-docx not installed — JD text extraction skipped.")
        return None
    except Exception as e:
        logger.warning(f"Failed to read {docx_path}: {e}")
        return None


def _extract_experience_range(text: str) -> dict:
    """
    Parse experience requirements from raw JD text.
    Falls back to spec-defined defaults if regex fails.
    """
    # Pattern: "5-9 years", "5 to 9 years", "5+ years"
    range_match = re.search(r"(\d+)\s*[-–to]+\s*(\d+)\s*years?", text, re.IGNORECASE)
    if range_match:
        min_yoe = int(range_match.group(1))
        max_yoe = int(range_match.group(2))
        return {"min_years": min_yoe, "max_years": max_yoe,
                "peak_years": (min_yoe + max_yoe) / 2.0,
                "sigma": EXPERIENCE_SIGMA}

    plus_match = re.search(r"(\d+)\+\s*years?", text, re.IGNORECASE)
    if plus_match:
        min_yoe = int(plus_match.group(1))
        return {"min_years": min_yoe, "max_years": min_yoe + 4,
                "peak_years": float(min_yoe),
                "sigma": EXPERIENCE_SIGMA}

    # Default from spec
    return {
        "min_years": 5,
        "max_years": 9,
        "peak_years": EXPERIENCE_PEAK,   # 7.0
        "sigma": EXPERIENCE_SIGMA,        # 3.5
        "note": "Defaults from Backend Logic Bible (5-9 yrs per JD)"
    }


def _build_hard_skills() -> list[dict]:
    """Build hard skills list from JD skill categories config."""
    hard_skills = []
    for cat_key, cat_info in JD_SKILL_CATEGORIES.items():
        hard_skills.append({
            "category": cat_key,
            "weight": cat_info["weight"],
            "keywords": cat_info["keywords"],
            "description": _category_description(cat_key),
        })
    return hard_skills


def _category_description(cat_key: str) -> str:
    descriptions = {
        "embeddings_dense_retrieval": "Sentence-transformers, bi-encoders, dense retrieval, semantic search",
        "vector_db_ann": "FAISS, Pinecone, Qdrant, Weaviate, approximate nearest neighbor search",
        "retrieval_ranking": "BM25, hybrid search, learning to rank, NDCG, MRR, ranking pipelines",
        "llms_nlp": "Fine-tuning, LoRA, PEFT, transformers, BERT, RAG, LLMs, NLP",
        "evaluation_experimentation": "NDCG, MAP, MRR, A/B testing, offline evaluation, eval frameworks",
        "python_production": "Python, FastAPI, production systems, CI/CD, deployment, system design",
    }
    return descriptions.get(cat_key, cat_key.replace("_", " ").title())


def _build_disqualifier_rules() -> list[dict]:
    """Build disqualifier rules list from spec."""
    return [
        {
            "id": "all_consulting",
            "name": "All-consulting career",
            "description": (
                "Candidate spent majority of career at big IT consulting firms "
                "(TCS, Infosys, Wipro, Accenture, Cognizant, Capgemini, HCL, "
                "Tech Mahindra, Mphasis, Hexaware)"
            ),
            "curve": "penalty = 1.0 - (consulting_ratio ^ 0.65 * 0.75). Range: [0.25, 1.0]",
            "consulting_firms": sorted(CONSULTING_FIRMS),
        },
        {
            "id": "pure_research",
            "name": "Pure research, no production",
            "description": (
                "Career descriptions lack production evidence keywords: "
                "deployed, production, served users, launched, real users, scale, latency, monitoring"
            ),
            "curve": "penalty = 0.20 + 0.80 * min(1.0, production_score / 5). Range: [0.20, 1.0]",
        },
        {
            "id": "api_wrapper_only",
            "name": "Only recent LangChain/API-wrapper AI (<12 months)",
            "description": (
                "Only recent AI experience through APIs with no real ML depth. "
                "Pre-2022 career lacks traditional ML signals (sklearn, gradient boosting, etc.)"
            ),
            "curve": "penalty = 0.35 + 0.65 * min(1.0, pre_llm_months / 18). Range: [0.35, 1.0]",
        },
        {
            "id": "non_coding_leadership",
            "name": "Non-coding technical leadership (18+ months)",
            "description": (
                "Holds 'architect', 'tech lead', 'VP', 'director', or 'head of' title "
                "with insufficient coding evidence in last 18 months"
            ),
            "curve": "penalty = 0.60 + 0.40 * coding_evidence. Range: [0.60, 1.0]",
        },
        {
            "id": "cv_speech_only",
            "name": "Computer Vision / Speech / Robotics only — no NLP/IR",
            "description": (
                "Dominant skills are CV/Speech/Robotics (>50% of advanced/expert skills) "
                "without NLP/IR/Search background"
            ),
            "curve": "penalty = 0.40 + 0.60 * nlp_ir_score. Range: [0.40, 1.0]",
        },
        {
            "id": "closed_source_only",
            "name": "Closed-source proprietary only (5+ years, no external validation)",
            "description": (
                "5+ year career entirely on closed-source proprietary systems "
                "without external validation (papers, GitHub, talks, open-source contributions)"
            ),
            "curve": "penalty = 0.55 + 0.45 * external_score. Range: [0.55, 1.0]",
        },
    ]


def _build_title_relevance_map() -> dict:
    """Build title relevance map from config."""
    return {
        "core_ml_ai": {
            "score": TITLE_SCORE_MAP["core_ml_ai"],
            "examples": CORE_ML_AI_TITLES,
            "description": "ML/AI Engineers, NLP Engineers, Applied Scientists, Search Engineers",
        },
        "adjacent_high": {
            "score": TITLE_SCORE_MAP["adjacent_high"],
            "examples": ADJACENT_HIGH_TITLES,
            "description": "Software Engineers, Backend Engineers, Data Engineers with potential ML",
        },
        "adjacent_low": {
            "score": TITLE_SCORE_MAP["adjacent_low"],
            "examples": ADJACENT_LOW_TITLES,
            "description": "Full Stack, Cloud, DevOps, SRE, Mobile, QA Engineers",
        },
        "general_tech": {
            "score": TITLE_SCORE_MAP["general_tech"],
            "examples": GENERAL_TECH_TITLES,
            "description": "Java/.NET/PHP/Web developers, IT Support, System Admins",
        },
        "non_tech": {
            "score": TITLE_SCORE_MAP["non_tech"],
            "examples": [
                "Business Analyst", "HR Manager", "Accountant", "Project Manager",
                "Operations Manager", "Marketing Manager", "Sales Executive",
                "Graphic Designer", "Civil Engineer", "Mechanical Engineer",
                "Customer Support", "Content Writer",
            ],
            "description": "Non-technical roles — fast-eliminated with near-zero score",
        },
    }


def parse_jd(jd_path: Optional[Path] = None) -> dict[str, Any]:
    """
    Parse a job description .docx file and return a normalized requirements object.

    Args:
        jd_path: Optional path to job_description.docx. If None or unreadable,
                 falls back to canonical requirements from the Backend Logic Bible.

    Returns:
        dict with keys:
            hard_skills, preferred_skills, experience_requirements,
            disqualifier_rules, title_relevance_map, location_map,
            jd_embedding_queries, ce_query, source
    """
    jd_text = ""
    source = "canonical (Backend Logic Bible)"

    if jd_path is not None:
        if not jd_path.exists():
            logger.warning(f"JD file not found: {jd_path}. Using canonical requirements.")
        else:
            raw_text = _try_parse_docx(jd_path)
            if raw_text:
                jd_text = raw_text
                source = f"parsed from {jd_path.name}"
                logger.info(f"JD parsed from {jd_path} — {len(jd_text)} chars extracted")
            else:
                logger.warning(f"Could not extract text from {jd_path}. Using canonical requirements.")

    # Experience requirements — parsed from docx if available, else defaults
    experience_req = _extract_experience_range(jd_text) if jd_text else {
        "min_years": 5,
        "max_years": 9,
        "peak_years": EXPERIENCE_PEAK,
        "sigma": EXPERIENCE_SIGMA,
        "note": "From Backend Logic Bible spec",
    }

    requirements = {
        # Source metadata
        "source": source,
        "jd_text_length": len(jd_text),

        # Core skill requirements
        "hard_skills": _build_hard_skills(),

        # Preferred / bonus skills
        "preferred_skills": [
            {"name": skill, "bonus_per_match": 0.02, "max_bonus": 0.08}
            for skill in PREFERRED_SKILLS
        ],

        # Experience curve parameters
        "experience_requirements": experience_req,

        # Disqualifier rules (6 checks)
        "disqualifier_rules": _build_disqualifier_rules(),

        # Title relevance map for pre-filter
        "title_relevance_map": _build_title_relevance_map(),
        "title_gate_threshold": 0.05,

        # Location scoring
        "location_map": dict(LOCATION_SCORES),
        "default_location_score": DEFAULT_LOCATION_SCORE,

        # Embedding queries for bi-encoder
        "jd_embedding_queries": [
            {"text": q["text"], "weight": q["weight"]}
            for q in JD_QUERIES
        ],

        # Cross-encoder query
        "ce_query": CE_QUERY,

        # Scoring formula weights
        "scoring_weights": {
            "skill_score": 0.45,        # per prompt requirement
            "career_score": 0.30,
            "experience_score": 0.15,   # per prompt requirement
            "embedding_similarity": 0.10,
            # Note: scoring_engine.py uses slightly different weights
            # (includes location/education). The prompt's formula is
            # the simplified composite shown in Phase E.
        },

        # Role metadata
        "role": {
            "title": "Senior AI Engineer",
            "company": "Redrob",
            "location_preference": ["Pune", "Noida"],
            "work_mode": "hybrid",
            "employment_type": "full-time",
        },
    }

    logger.info(
        f"JD requirements built: "
        f"{len(requirements['hard_skills'])} skill categories, "
        f"{len(requirements['preferred_skills'])} preferred skills, "
        f"{len(requirements['disqualifier_rules'])} disqualifiers"
    )
    return requirements


def get_jd_summary(requirements: dict) -> str:
    """Return a human-readable summary of parsed JD requirements."""
    lines = [
        f"Role: {requirements['role']['title']}",
        f"Experience: {requirements['experience_requirements']['min_years']}"
        f"–{requirements['experience_requirements']['max_years']} years",
        f"Hard skill categories: {len(requirements['hard_skills'])}",
        f"Preferred skills: {len(requirements['preferred_skills'])}",
        f"Disqualifiers: {len(requirements['disqualifier_rules'])}",
        f"Source: {requirements['source']}",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    req = parse_jd(path)
    print(get_jd_summary(req))
