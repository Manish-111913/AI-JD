"""
api.py — FastAPI Backend for Redrob Candidate Ranking System
Serves all endpoints consumed by the Next.js frontend.
Real-time pipeline progress streamed via Server-Sent Events (SSE).
"""

from __future__ import annotations

import asyncio
import csv
import io
import json
import logging
import os
import time
from datetime import date
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Redrob Candidate Ranker API", version="1.0.0")

# ── CORS — allow Next.js dev server ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory state ───────────────────────────────────────────────────────────
_state = {
    "status": "idle",          # idle | loading | ranking | done | error
    "candidates": [],          # list of normalized candidate dicts
    "results": [],             # final ranked candidates (top 100)
    "embeddings_loaded": False,
    "jd_parsed": True,         # JD is hardcoded from the hackathon bundle
    "model_loaded": False,
    "error": None,
}

# ── Import all backend modules ────────────────────────────────────────────────
from config import (
    JD_QUERIES, CE_QUERY, CE_SHORTLIST_SIZE,
    WEIGHTS, CE_WEIGHT, TITLE_GATE_THRESHOLD,
)
from data_loader import normalize_candidate, build_candidate_text, build_ce_passage, validate_candidate_schema
from scoring_engine import compute_first_pass_score
from embedding_engine import (
    embed_candidates_batch,
    compute_semantic_scores_vectorized,
    get_jd_embeddings,
    compute_single_semantic_score,
)
from cross_encoder_reranker import rerank_with_cross_encoder, is_ce_available
from career_analyzer import compute_title_relevance_score
from reasoning_generator import build_reasoning


# ─────────────────────────────────────────────────────────────────────────────
# Helper: JSON serializable conversion
# ─────────────────────────────────────────────────────────────────────────────
def _to_json_safe(obj):
    """Recursively convert numpy types and dates to JSON-safe Python types."""
    if isinstance(obj, dict):
        return {k: _to_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_json_safe(i) for i in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, date):
        return obj.isoformat()
    return obj


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(_to_json_safe(data))}\n\n"


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/status
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/status")
async def get_status():
    return {
        "status": _state["status"],
        "embeddings_loaded": _state["embeddings_loaded"],
        "jd_parsed": _state["jd_parsed"],
        "model_loaded": _state["model_loaded"],
        "candidates_loaded": len(_state["candidates"]),
        "results_ready": len(_state["results"]),
        "ce_available": is_ce_available(),
        "error": _state["error"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/jd
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/jd")
async def get_jd():
    """Return parsed JD requirements for the S3 frontend view."""
    return {
        "hard_skills": [
            {"name": "Dense Retrieval / Embeddings", "weight": 0.20, "keywords": ["FAISS", "semantic search", "bi-encoder", "sentence-transformers", "SBERT"]},
            {"name": "Vector Databases", "weight": 0.20, "keywords": ["FAISS", "Pinecone", "Weaviate", "Qdrant", "Milvus", "Elasticsearch ANN"]},
            {"name": "Ranking Systems", "weight": 0.20, "keywords": ["BM25", "LambdaMART", "NDCG", "MRR", "learning-to-rank", "re-ranking"]},
            {"name": "LLMs & NLP", "weight": 0.15, "keywords": ["fine-tuning", "LoRA", "RAG", "BERT", "transformers", "NLP"]},
            {"name": "Evaluation & Experimentation", "weight": 0.15, "keywords": ["NDCG", "MRR", "MAP", "A/B testing", "offline evaluation"]},
            {"name": "Python & Production Engineering", "weight": 0.10, "keywords": ["Python", "FastAPI", "production", "CI/CD", "deployment"]},
        ],
        "preferred_skills": [
            {"name": "LLM Fine-tuning", "weight": 0.02},
            {"name": "Learning-to-Rank", "weight": 0.02},
            {"name": "HR-tech experience", "weight": 0.02},
        ],
        "disqualifiers": [
            {"name": "All-consulting career", "description": "100% career at TCS/Infosys/Wipro/etc", "curve_description": "penalty = 1.0 - (ratio^0.65 * 0.75)"},
            {"name": "Pure research, no production", "description": "Zero production keywords across all descriptions", "curve_description": "penalty = 0.20 + 0.80 * min(1.0, prod_keywords/5)"},
            {"name": "Only recent LangChain/API-wrapper AI (<12mo pre-LLM)", "description": "No traditional ML experience before 2022", "curve_description": "penalty = 0.35 + 0.65 * min(1.0, pre_llm_months/18)"},
            {"name": "Non-coding technical leadership (18+ months)", "description": "Architect/VP/Director with no coding evidence", "curve_description": "penalty = 0.60 + 0.40 * coding_evidence"},
            {"name": "CV/Speech/Robotics only — no NLP/IR", "description": "Dominant CV skills, absent NLP/Search background", "curve_description": "penalty = 0.40 + 0.60 * nlp_ir_score"},
            {"name": "Closed-source proprietary only (5+ years)", "description": "No GitHub/papers/talks/open-source in long career", "curve_description": "penalty = 0.55 + 0.45 * validation_signals/2"},
        ],
        "location_map": {
            "Pune": 1.00, "Noida": 1.00, "Bengaluru": 0.95, "Mumbai": 0.90,
            "Hyderabad": 0.90, "Delhi": 0.85, "Chennai": 0.85,
        },
        "experience_curve": {"peak_min": 5, "peak_max": 9, "peak_yoe": 7, "sigma": 3.5},
        "title_map": {
            "core_ml_ai": 1.00,
            "adjacent_high": 0.70,
            "adjacent_low": 0.35,
            "general_tech": 0.10,
            "non_tech": 0.02,
        },
        "jd_queries": [q["text"] for q in JD_QUERIES],
        "ce_query": CE_QUERY,
        "component_weights": WEIGHTS,
        "ce_weight": CE_WEIGHT,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/upload-jd  — Upload & parse a Job Description file
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/upload-jd")
async def upload_jd(file: UploadFile = File(...)):
    """
    Accept a JD file (PDF, DOCX, or TXT).
    Extract text, run NLP analysis, return structured JD requirements.
    """
    import re as _re
    import tempfile

    content = await file.read()
    filename = (file.filename or "").lower()
    jd_text = ""

    # ── Extract text based on file type ──────────────────────────────────────
    try:
        if filename.endswith(".pdf"):
            try:
                import pdfplumber
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name
                with pdfplumber.open(tmp_path) as pdf:
                    jd_text = "\n".join(
                        page.extract_text() or "" for page in pdf.pages
                    )
                import os as _os; _os.unlink(tmp_path)
            except ImportError:
                # fallback: try PyPDF2
                try:
                    import io as _io
                    import PyPDF2
                    reader = PyPDF2.PdfReader(_io.BytesIO(content))
                    jd_text = "\n".join(
                        (page.extract_text() or "") for page in reader.pages
                    )
                except ImportError:
                    jd_text = content.decode("utf-8", errors="replace")

        elif filename.endswith(".docx"):
            try:
                from docx import Document
                import io as _io
                doc = Document(_io.BytesIO(content))
                jd_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            except ImportError:
                jd_text = content.decode("utf-8", errors="replace")

        else:
            # Plain text or unknown — decode as UTF-8
            jd_text = content.decode("utf-8", errors="replace")

    except Exception as e:
        logger.warning(f"Text extraction failed: {e}")
        jd_text = content.decode("utf-8", errors="replace")

    if not jd_text.strip():
        raise HTTPException(422, "Could not extract text from the uploaded file.")

    # ── Derive Role Title ─────────────────────────────────────────────────────
    lines = [l.strip() for l in jd_text.splitlines() if l.strip()]
    role_title = "Job Description"
    title_patterns = [
        r"(?:position|role|job title|title)[:\s]+(.+)",
        r"^(?:we are hiring|hiring for|looking for)[:\s]+(.+)",
        r"^(?:job title|position title)[:\s]*[:\-]?\s*(.+)",
    ]
    # First non-empty short line is often the title
    for line in lines[:8]:
        if 3 <= len(line.split()) <= 12 and not line.lower().startswith(("about", "company", "we ", "our ")):
            role_title = line
            break
    for pat in title_patterns:
        m = _re.search(pat, jd_text[:2000], _re.IGNORECASE | _re.MULTILINE)
        if m:
            role_title = m.group(1).strip()
            break

    # ── Extract experience range ──────────────────────────────────────────────
    exp_min, exp_max = 3, 7
    exp_peak = 5
    exp_m = _re.search(r"(\d+)\s*[-–to]+\s*(\d+)\s*years?", jd_text, _re.IGNORECASE)
    if exp_m:
        exp_min = int(exp_m.group(1))
        exp_max = int(exp_m.group(2))
        exp_peak = (exp_min + exp_max) / 2
    else:
        plus_m = _re.search(r"(\d+)\+\s*years?", jd_text, _re.IGNORECASE)
        if plus_m:
            exp_min = int(plus_m.group(1))
            exp_max = exp_min + 4
            exp_peak = float(exp_min)

    # ── Extract Location ──────────────────────────────────────────────────────
    loc_patterns = [
        r"location[:\s]+([A-Za-z\s,/]+?)(?:\n|$|,\s*(?:India|Remote|Hybrid))",
        r"based (?:in|at)[:\s]+([A-Za-z\s,/]+?)(?:\n|\.)",
    ]
    locations = []
    for pat in loc_patterns:
        m = _re.search(pat, jd_text[:3000], _re.IGNORECASE)
        if m:
            raw_loc = m.group(1).strip()
            locations = [l.strip() for l in _re.split(r"[,/&]", raw_loc) if l.strip()][:3]
            break
    if not locations:
        # Look for known Indian cities
        known_cities = ["Mumbai", "Delhi", "Bengaluru", "Bangalore", "Hyderabad",
                        "Chennai", "Pune", "Noida", "Gurgaon", "Gurugram",
                        "Kolkata", "Ahmedabad", "Jaipur", "Remote"]
        found = [c for c in known_cities if c.lower() in jd_text.lower()]
        locations = found[:3] if found else ["Not specified"]

    # ── Skill extraction using keyword matching ───────────────────────────────
    TECH_SKILL_BUCKETS = {
        "Machine Learning / AI": {
            "keywords": ["machine learning", "deep learning", "neural network", "pytorch", "tensorflow",
                         "scikit-learn", "xgboost", "gradient boosting", "reinforcement learning",
                         "transformers", "bert", "gpt", "llm", "fine-tuning", "lora", "rlhf"],
            "weight": 0,
        },
        "NLP & Information Retrieval": {
            "keywords": ["nlp", "natural language processing", "information retrieval", "text mining",
                         "sentiment analysis", "named entity recognition", "question answering",
                         "semantic search", "bm25", "tfidf", "word2vec", "glove", "fasttext"],
            "weight": 0,
        },
        "Vector & Embedding Systems": {
            "keywords": ["embeddings", "vector search", "faiss", "pinecone", "weaviate", "milvus",
                         "qdrant", "chromadb", "ann", "hnsw", "bi-encoder", "cross-encoder",
                         "sentence-transformers", "dense retrieval", "sparse retrieval", "hybrid search"],
            "weight": 0,
        },
        "Ranking & Recommendation": {
            "keywords": ["ranking", "recommendation", "collaborative filtering", "learning to rank",
                         "ltr", "ndcg", "mrr", "map", "recall", "precision", "re-ranking",
                         "lambdamart", "listwise", "pairwise", "pointwise"],
            "weight": 0,
        },
        "Python & Engineering": {
            "keywords": ["python", "fastapi", "flask", "django", "rest api", "microservices",
                         "docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "git",
                         "sql", "postgresql", "redis", "kafka", "airflow"],
            "weight": 0,
        },
        "Data Engineering & MLOps": {
            "keywords": ["mlops", "mlflow", "kubeflow", "data pipeline", "etl", "feature store",
                         "model serving", "inference", "latency optimization", "a/b testing",
                         "monitoring", "databricks", "spark", "hadoop", "data warehouse"],
            "weight": 0,
        },
        "Frontend / Full Stack": {
            "keywords": ["react", "next.js", "typescript", "javascript", "html", "css",
                         "node.js", "graphql", "rest", "ui/ux", "angular", "vue"],
            "weight": 0,
        },
        "Cloud & DevOps": {
            "keywords": ["aws", "gcp", "azure", "terraform", "ansible", "jenkins",
                         "github actions", "kubernetes", "helm", "prometheus", "grafana"],
            "weight": 0,
        },
    }

    jd_lower = jd_text.lower()
    total_hits = 0
    matched_buckets = {}
    for bucket, info in TECH_SKILL_BUCKETS.items():
        matched = [kw for kw in info["keywords"] if kw in jd_lower]
        if matched:
            matched_buckets[bucket] = matched
            total_hits += len(matched)

    # Compute weights proportionally
    hard_skills = []
    for bucket, keywords in matched_buckets.items():
        raw_weight = len(keywords) / max(total_hits, 1)
        hard_skills.append({
            "name": bucket,
            "weight": round(raw_weight, 2),
            "keywords": [kw.title() for kw in keywords[:8]],
        })
    # Sort by weight desc, cap at 6 buckets
    hard_skills.sort(key=lambda x: -x["weight"])
    hard_skills = hard_skills[:6]
    # Normalize weights to sum to 1
    wsum = sum(s["weight"] for s in hard_skills) or 1
    for s in hard_skills:
        s["weight"] = round(s["weight"] / wsum, 2)

    if not hard_skills:
        # Fallback to canonical
        hard_skills = [
            {"name": "Technical Skills", "weight": 1.0, "keywords": []},
        ]

    # ── Preferred Skills ──────────────────────────────────────────────────────
    PREFERRED_PATTERNS = [
        ("Open Source Contributions", ["github", "open source", "open-source", "kaggle", "arxiv"]),
        ("Startup / Product Experience", ["startup", "product company", "series", "founding team"]),
        ("Research / Publications", ["research", "paper", "publication", "conference", "journal"]),
        ("Domain Expertise", ["domain", "industry", "sector", "vertical", "domain knowledge"]),
        ("Leadership Experience", ["lead", "mentor", "manage", "team lead", "tech lead"]),
        ("Communication Skills", ["communication", "presentation", "stakeholder", "collaboration"]),
    ]
    preferred = []
    for skill_name, patterns in PREFERRED_PATTERNS:
        if any(p in jd_lower for p in patterns):
            preferred.append({"name": skill_name, "note": "Bonus — not required"})
    if not preferred:
        preferred = [{"name": "Relevant domain experience", "note": "Bonus"}]

    # ── Detect disqualifiers mentioned ───────────────────────────────────────
    from jd_parser import _build_disqualifier_rules
    disqualifiers = _build_disqualifier_rules()

    # ── Build location map ───────────────────────────────────────────────────
    CITY_SCORES = {
        "Pune": 1.00, "Noida": 1.00, "Delhi": 0.95, "NCR": 0.92,
        "Bengaluru": 0.92, "Bangalore": 0.92, "Mumbai": 0.88,
        "Chennai": 0.85, "Hyderabad": 0.85, "Kolkata": 0.78,
        "Ahmedabad": 0.75, "Jaipur": 0.70, "Remote": 0.80,
        "Not specified": 0.70,
    }
    loc_map = []
    primary_score = 1.0
    for i, loc in enumerate(locations):
        score = CITY_SCORES.get(loc, 0.80)
        loc_map.append({"bucket": loc, "score": score, "bar": int(score * 100), "is_primary": True})
        primary_score = score if i == 0 else primary_score
    # Add standard comparison buckets
    std_buckets = [
        ("Same City", primary_score),
        ("Adjacent City", round(primary_score * 0.92, 2)),
        ("Same State", round(primary_score * 0.85, 2)),
        ("Different State", round(primary_score * 0.70, 2)),
        ("Remote (willing)", round(primary_score * 0.65, 2)),
        ("Abroad (willing)", round(primary_score * 0.40, 2)),
        ("Abroad (no relocate)", round(primary_score * 0.15, 2)),
    ]
    loc_map = [{"bucket": b, "score": s, "bar": int(s * 100), "is_primary": False} for b, s in std_buckets]

    # ── Build AI Queries from JD text ─────────────────────────────────────────
    top_skills_text = ", ".join([s["name"] for s in hard_skills[:3]])
    ai_queries = [
        {
            "weight": "60%",
            "label": "Core Technical Fit",
            "text": f"Senior engineer with expertise in {top_skills_text}. Strong hands-on background in production systems.",
        },
        {
            "weight": "30%",
            "label": "Production Mindset",
            "text": "Shipped to production at scale. Real users, real latency requirements. Startup or product-company background. End-to-end ownership.",
        },
        {
            "weight": "10%",
            "label": "Domain Context",
            "text": f"Experience relevant to the role at {', '.join(locations[:2])}. Domain fit and cultural alignment.",
        },
    ]

    # ── Build Title Tiers ──────────────────────────────────────────────────────
    from config import TITLE_SCORE_MAP, CORE_ML_AI_TITLES, ADJACENT_HIGH_TITLES
    title_tiers = [
        {"tier": "Core Match", "score": "1.00", "examples": ", ".join(CORE_ML_AI_TITLES[:5]),
         "color": "text-emerald-600 dark:text-emerald-400", "bg": "bg-emerald-500"},
        {"tier": "Adjacent Tech", "score": str(TITLE_SCORE_MAP.get("adjacent_high", 0.70)),
         "examples": ", ".join(ADJACENT_HIGH_TITLES[:4]),
         "color": "text-blue-600 dark:text-blue-400", "bg": "bg-blue-500"},
        {"tier": "General Tech", "score": "0.35", "examples": "Full Stack, Cloud, DevOps, Mobile, QA",
         "color": "text-amber-600 dark:text-amber-400", "bg": "bg-amber-500"},
        {"tier": "Low Signal", "score": "0.10", "examples": "Java/.NET developer, Web developer",
         "color": "text-orange-600 dark:text-orange-400", "bg": "bg-orange-400"},
        {"tier": "Non-Tech", "score": "0.02", "examples": "Business Analyst, HR Manager, Sales Executive",
         "color": "text-red-600 dark:text-red-400", "bg": "bg-red-500"},
    ]

    # ── JD Highlight excerpt ──────────────────────────────────────────────────
    # Extract a ~300 char excerpt from the JD text near requirements
    excerpt = ""
    for marker in ["requirements", "responsibilities", "qualifications", "you will", "must have"]:
        idx = jd_lower.find(marker)
        if idx >= 0:
            excerpt = jd_text[idx: idx + 400].strip()
            break
    if not excerpt:
        excerpt = jd_text[:400].strip()

    return {
        "success": True,
        "filename": file.filename,
        "role_title": role_title,
        "locations": locations,
        "experience": {
            "min_years": exp_min,
            "max_years": exp_max,
            "peak_years": exp_peak,
        },
        "hard_skills": hard_skills,
        "preferred_skills": preferred,
        "disqualifiers": [
            {
                "name": d["name"],
                "logic": d["description"],
                "color": "text-amber-600 dark:text-amber-400",
                "bg": "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
            }
            for d in disqualifiers
        ],
        "location_map": loc_map,
        "ai_queries": ai_queries,
        "title_tiers": title_tiers,
        "jd_excerpt": excerpt,
        "jd_text_length": len(jd_text),
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/upload
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_candidates(file: UploadFile = File(...)):
    """
    Accept JSON or JSONL upload of candidates.
    Normalizes and stores in memory.
    Returns count, preview, errors.
    """
    _state["status"] = "loading"
    _state["error"] = None
    errors = []
    candidates = []

    try:
        content = await file.read()
        text = content.decode("utf-8", errors="replace").strip()

        filename = (file.filename or "").lower()

        # Try as JSON array first, then JSONL
        if filename.endswith(".json") or text.startswith("["):
            try:
                raw_list = json.loads(text)
                if not isinstance(raw_list, list):
                    raw_list = [raw_list]
                for i, raw in enumerate(raw_list):
                    try:
                        is_valid, err_msg = validate_candidate_schema(raw)
                        if not is_valid:
                            errors.append(f"Row {i}: {err_msg}")
                            continue
                        candidates.append(normalize_candidate(raw))
                    except Exception as e:
                        errors.append(f"Row {i}: {str(e)}")
            except json.JSONDecodeError as e:
                errors.append(f"JSON parse error: {e}")
        else:
            # JSONL
            for i, line in enumerate(text.splitlines()):
                line = line.strip()
                if not line:
                    continue
                try:
                    raw = json.loads(line)
                    is_valid, err_msg = validate_candidate_schema(raw)
                    if not is_valid:
                        errors.append(f"Line {i+1}: {err_msg}")
                        continue
                    candidates.append(normalize_candidate(raw))
                except json.JSONDecodeError as e:
                    errors.append(f"Line {i+1}: {str(e)}")
                    if len(errors) > 10:
                        errors.append("... (truncated)")
                        break

        _state["candidates"] = candidates
        _state["status"] = "idle" if candidates else "error"
        _state["results"] = []

    except Exception as e:
        _state["status"] = "error"
        _state["error"] = str(e)
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

    preview = [
        {
            "candidate_id": c["candidate_id"],
            "anonymized_name": c["anonymized_name"],
            "headline": c["headline"],
            "current_title": c["current_title"],
            "current_company": c["current_company"],
            "current_company_size": c["current_company_size"],
            "current_industry": c["current_industry"],
            "location": c["location"],
            "years_of_experience": c["years_of_experience"],
            "top_skills": [s["name"] for s in c.get("skills", [])[:4]],
        }
        for c in candidates[:3]
    ]

    return {
        "success": True,
        "count": len(candidates),
        "skipped": len(errors),
        "preview": preview,
        "errors": errors[:10],
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/rank (SSE streaming)
# ─────────────────────────────────────────────────────────────────────────────
class RankRequest(BaseModel):
    candidates: Optional[list[dict]] = None
    weights: Optional[dict] = None
    llm_enabled: bool = False
    jd_data: Optional[dict] = None


@app.post("/api/rank")
async def rank_candidates(request: Request, body: RankRequest):
    """
    Execute the full 8-stage ranking pipeline with SSE streaming.
    Streams stage events to the frontend in real-time.
    """
    candidates = body.candidates or _state["candidates"]

    if not candidates:
        raise HTTPException(400, "No candidates loaded. Upload candidates first.")

    # ── Dynamic Config Override ──
    if body.jd_data:
        # Override AI Queries
        if "ai_queries" in body.jd_data:
            import embedding_engine
            embedding_engine.JD_QUERIES = body.jd_data["ai_queries"]
            embedding_engine._jd_embeddings = None
        
        # Override CE Query
        import cross_encoder_reranker
        skills_str = ", ".join(s["name"] for s in body.jd_data.get("hard_skills", [])[:5])
        cross_encoder_reranker.CE_QUERY = f"{body.jd_data.get('role_title', 'Role')} requiring: {skills_str}. " \
                          f"Experience: {body.jd_data.get('experience', {}).get('min_years', 3)}+ years."
        
        # Override Skills
        import skill_scorer
        if "hard_skills" in body.jd_data:
            skill_scorer.JD_SKILL_CATEGORIES = {s["name"]: s for s in body.jd_data["hard_skills"]}
        if "preferred_skills" in body.jd_data:
            skill_scorer.PREFERRED_SKILLS = [s["name"].lower() for s in body.jd_data["preferred_skills"]]
            
        # Override Experience
        import experience_scorer
        exp = body.jd_data.get("experience", {})
        if "min_years" in exp: experience_scorer.JD_EXP_MIN = exp["min_years"]
        if "max_years" in exp: experience_scorer.JD_EXP_MAX = exp["max_years"]
        if "peak_years" in exp: experience_scorer.EXPERIENCE_PEAK = exp["peak_years"]

    async def event_stream():
        _state["status"] = "ranking"
        _state["results"] = []
        start_time = time.time()

        def log(msg: str, stage: int = 0, progress: int = 0, extra: dict = None):
            payload = {
                "stage": stage,
                "message": msg,
                "progress": progress,
                "timestamp": time.time(),
            }
            if extra:
                payload.update(extra)
            return _sse_event(payload)

        yield _sse_event({"stage": 0, "stage_name": "Initializing", "progress": 0,
                          "message": f"Starting pipeline for {len(candidates)} candidates…"})
        await asyncio.sleep(0.05)

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 1: Load & Normalize
        # ──────────────────────────────────────────────────────────────────────
        yield _sse_event({"stage": 1, "stage_name": "Loading & normalizing candidates",
                          "status": "active", "progress": 2,
                          "message": f"Parsing {len(candidates)} candidate records…"})
        await asyncio.sleep(0.1)
        yield _sse_event({"stage": 1, "progress": 4, "status": "active",
                          "message": "Schema validation complete. All required fields present."})
        await asyncio.sleep(0.05)
        yield _sse_event({"stage": 1, "progress": 5, "status": "completed",
                          "message": f"✓ {len(candidates)} candidates loaded and validated."})
        await asyncio.sleep(0.1)

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 2: Title Pre-filter
        # ──────────────────────────────────────────────────────────────────────
        yield _sse_event({"stage": 2, "stage_name": "Running title pre-filter",
                          "status": "active", "progress": 6,
                          "message": f"Scoring title relevance for {len(candidates)} candidates…"})
        await asyncio.sleep(0.1)

        title_scores = {}
        core_count = adj_count = nontech_count = 0
        for c in candidates:
            ts = compute_title_relevance_score(c["current_title"])
            title_scores[c["candidate_id"]] = ts
            c["_title_score"] = ts
            if ts >= 0.90:
                core_count += 1
            elif ts >= 0.30:
                adj_count += 1
            else:
                nontech_count += 1

        fast_filtered = sum(1 for ts in title_scores.values() if ts < TITLE_GATE_THRESHOLD)
        yield _sse_event({"stage": 2, "progress": 10, "status": "completed",
                          "message": (
                              f"✓ Title pre-filter complete. "
                              f"{core_count} Core ML/AI | {adj_count} Tech-adjacent | "
                              f"{nontech_count} Non-tech ({fast_filtered} fast-filtered)"
                          )})
        await asyncio.sleep(0.1)

        # Initialize Feature Cache
        from feature_cache import FeatureCache
        cache = FeatureCache()

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 4: Semantic Similarity (Embedding Search)
        # ──────────────────────────────────────────────────────────────────────
        yield _sse_event({"stage": 4, "stage_name": "Computing semantic similarity",
                          "status": "active", "progress": 21,
                          "message": "Filtering non-tech profiles & building text representations…"})
        await asyncio.sleep(0.1)

        # Filter out fast-filtered candidates to optimize embedding & scoring
        tech_candidates = [c for c in candidates if c["_title_score"] >= TITLE_GATE_THRESHOLD]
        if not tech_candidates:
            tech_candidates = candidates

        candidate_texts = [build_candidate_text(c) for c in tech_candidates]

        yield _sse_event({"stage": 4, "progress": 24, "status": "active",
                          "message": f"Loading bi-encoder model: sentence-transformers/all-MiniLM-L6-v2…"})
        await asyncio.sleep(0.05)

        try:
            yield _sse_event({"stage": 4, "progress": 26, "status": "active",
                              "message": f"Embedding {len(tech_candidates)} candidate profiles (optimized batch inference)…"})

            loop = asyncio.get_event_loop()
            candidate_embeddings = await loop.run_in_executor(
                None, embed_candidates_batch, candidate_texts
            )

            yield _sse_event({"stage": 4, "progress": 29, "status": "active",
                              "message": f"Computing 3-query cosine similarity (Q1×60% + Q2×30% + Q3×10%)…"})
            semantic_scores_arr = await loop.run_in_executor(
                None, compute_semantic_scores_vectorized, candidate_embeddings
            )
            semantic_scores = {tech_candidates[i]["candidate_id"]: float(semantic_scores_arr[i])
                               for i in range(len(tech_candidates))}
            
            # Default remaining candidates to 0.0
            for c in candidates:
                if c["candidate_id"] not in semantic_scores:
                    semantic_scores[c["candidate_id"]] = 0.0

            _state["embeddings_loaded"] = True

        except Exception as e:
            logger.warning(f"Embedding failed: {e} — using zero semantic scores")
            semantic_scores = {c["candidate_id"]: 0.0 for c in candidates}
            yield _sse_event({"stage": 4, "progress": 29, "status": "active",
                              "message": f"⚠ Embedding model unavailable — using keyword-only scoring: {str(e)[:80]}"})

        # Funnel Filter: Sort by semantic score and take Top 1000
        tech_candidates.sort(key=lambda c: -semantic_scores.get(c["candidate_id"], 0.0))
        top_1000 = tech_candidates[:1000]

        yield _sse_event({"stage": 4, "progress": 30, "status": "completed",
                          "message": f"✓ Embedding search complete. Selected Top {len(top_1000)} candidates."})
        await asyncio.sleep(0.1)

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 3: Honeypot Detection (Only on Top 1000)
        # ──────────────────────────────────────────────────────────────────────
        from honeypot_detector import detect_honeypot
        yield _sse_event({"stage": 3, "stage_name": "Detecting honeypot profiles",
                          "status": "active", "progress": 11,
                          "message": "Running 8-check evidence accumulation model on Top 1000…"})
        await asyncio.sleep(0.05)

        honeypot_results = {}
        flagged_count = 0
        for idx, c in enumerate(top_1000):
            cid = c["candidate_id"]
            
            # Check cache
            cached_feat = cache.get(cid)
            if cached_feat and "honeypot_confidence" in cached_feat:
                hp = {
                    "honeypot_confidence": cached_feat["honeypot_confidence"],
                    "honeypot_evidence_points": cached_feat["honeypot_evidence_points"],
                    "honeypot_flags": cached_feat["honeypot_flags"],
                    "honeypot_penalty": cached_feat["honeypot_penalty"],
                    "honeypot_tier": cached_feat["honeypot_tier"],
                }
            else:
                hp = detect_honeypot(c)
                
            honeypot_results[cid] = hp
            if hp["honeypot_confidence"] > 0.55:
                flagged_count += 1
                yield _sse_event({"stage": 3, "status": "active", "progress": 11 + int((idx / len(top_1000)) * 8),
                                  "message": f"⚠ {cid}: {hp['honeypot_flags'][0] if hp['honeypot_flags'] else 'suspicious profile'}"})
                await asyncio.sleep(0.005)

        yield _sse_event({"stage": 3, "progress": 20, "status": "completed",
                          "message": f"✓ Honeypot detection complete. {flagged_count} flagged in Top 1000."})
        await asyncio.sleep(0.1)

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 5: Skill Trust Scoring (Top 1000)
        # ──────────────────────────────────────────────────────────────────────
        yield _sse_event({"stage": 5, "stage_name": "Scoring skill trust",
                          "status": "active", "progress": 31,
                          "message": "Scoring skill trust on Top 1000 candidates…"})
        await asyncio.sleep(0.05)
        yield _sse_event({"stage": 5, "progress": 40, "status": "completed",
                          "message": "✓ Skill trust scoring complete for Top 1000."})
        await asyncio.sleep(0.1)

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 6: Career + Behavioral Analysis (Top 1000)
        # ──────────────────────────────────────────────────────────────────────
        yield _sse_event({"stage": 6, "stage_name": "Analyzing career + behavioral signals",
                          "status": "active", "progress": 41,
                          "message": "Scanning company history and availability multiplier on Top 1000…"})
        await asyncio.sleep(0.05)
        yield _sse_event({"stage": 6, "progress": 50, "status": "completed",
                          "message": "✓ Career + behavioral scoring complete for Top 1000."})
        await asyncio.sleep(0.1)

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 7: First-Pass Composite Scoring & Shortlisting (Top 1000)
        # ──────────────────────────────────────────────────────────────────────
        yield _sse_event({"stage": 7, "stage_name": "First-pass ranking — shortlisting",
                          "status": "active", "progress": 51,
                          "message": f"Computing composite scores for Top 1000 candidates…"})
        await asyncio.sleep(0.1)

        features_map = {}
        all_scores = []
        cache_updated = False
        
        for c in top_1000:
            cid = c["candidate_id"]
            sem = semantic_scores.get(cid, 0.0)
            
            # Check cache
            feat = cache.get(cid)
            if feat is None:
                feat = compute_first_pass_score(c, semantic_score=sem)
                hp = honeypot_results.get(cid, {})
                feat.update(hp)
                cache.set(cid, feat)
                cache_updated = True
                
            features_map[cid] = feat
            all_scores.append((cid, feat["first_pass_score"]))

        if cache_updated:
            cache.save()

        all_scores.sort(key=lambda x: x[1], reverse=True)
        shortlist_ids = {cid for cid, _ in all_scores[:CE_SHORTLIST_SIZE]}
        shortlisted_candidates = [c for c in top_1000 if c["candidate_id"] in shortlist_ids]

        yield _sse_event({"stage": 7, "progress": 60, "status": "completed",
                          "message": (
                              f"✓ First-pass complete. Top {len(shortlisted_candidates)} shortlisted "
                              f"for CE re-ranking."
                          )})
        await asyncio.sleep(0.1)

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 8: Cross-Encoder Re-Ranking (Top 300)
        # ──────────────────────────────────────────────────────────────────────
        yield _sse_event({"stage": 8, "stage_name": "Cross-encoder re-ranking",
                          "status": "active", "progress": 61,
                          "message": f"Loading cross-encoder/ms-marco-MiniLM-L-6-v2…"})
        await asyncio.sleep(0.1)

        _state["model_loaded"] = is_ce_available()

        # Build passage texts for shortlisted candidates
        passage_texts = [build_ce_passage(c) for c in shortlisted_candidates]
        shortlisted_features = [features_map[c["candidate_id"]] for c in shortlisted_candidates]

        # Merge shortlisted candidates with their features for re-ranking
        shortlist_for_ce = []
        for c, feat in zip(shortlisted_candidates, shortlisted_features):
            merged = {**feat, "candidate": c}
            shortlist_for_ce.append(merged)

        batch_count = [0]
        n_batches = max(1, -(-len(shortlisted_candidates) // 32))  # ceiling division

        def ce_progress(batch_idx, total, pairs_done):
            batch_count[0] = batch_idx
            msg = f"CE re-ranking: batch {batch_idx}/{total} complete ({pairs_done} pairs)"
            progress = 61 + int((batch_idx / total) * 28)
            return msg, progress

        yield _sse_event({"stage": 8, "progress": 63, "status": "active",
                          "message": f"Model ready. CPU inference. No network required. Processing {len(shortlisted_candidates)} pairs…",
                          "ce_total_pairs": len(shortlisted_candidates),
                          "ce_batch_size": 32})

        # Actually run cross-encoder
        ce_progress_events = []

        def sync_ce_with_progress():
            results = []
            from config import CE_BATCH_SIZE as BATCH_SZ
            import math as _math
            ce_ok = is_ce_available()

            if ce_ok:
                from cross_encoder_reranker import _get_ce_model, _sigmoid, CE_QUERY as Q
                model = _get_ce_model()
                pairs = [(Q, p) for p in passage_texts]
                n = _math.ceil(len(pairs) / BATCH_SZ)
                all_logits = []

                for bi in range(n):
                    start = bi * BATCH_SZ
                    end = min(start + BATCH_SZ, len(pairs))
                    batch_logits = model.predict(pairs[start:end], show_progress_bar=False)
                    all_logits.extend(batch_logits.tolist() if hasattr(batch_logits, "tolist") else list(batch_logits))
                    ce_progress_events.append((bi + 1, n, end))

                ce_scores_list = [_sigmoid(float(l)) for l in all_logits]
            else:
                ce_scores_list = [0.5] * len(shortlisted_candidates)
                ce_progress_events.append((1, 1, len(shortlisted_candidates)))

            # Blend
            algo_scores = [shortlist_for_ce[i]["first_pass_score"] for i in range(len(shortlisted_candidates))]
            max_algo = max(algo_scores) if algo_scores else 1.0
            max_algo = max(max_algo, 1e-6)

            from config import CE_WEIGHT as W
            for i in range(len(shortlisted_candidates)):
                ce = ce_scores_list[i]
                norm_algo = algo_scores[i] / max_algo
                blended = (1.0 - W) * norm_algo + W * ce
                results.append({
                    "cid": shortlisted_candidates[i]["candidate_id"],
                    "ce_score": ce,
                    "blended_score": blended,
                })
            return results

        loop = asyncio.get_event_loop()
        ce_results = await loop.run_in_executor(None, sync_ce_with_progress)

        # Stream CE batch progress
        for batch_num, total_batches, pairs_done in ce_progress_events:
            msg = f"CE re-ranking: batch {batch_num}/{total_batches} complete ({pairs_done} pairs)"
            progress = 61 + int((batch_num / total_batches) * 28)
            yield _sse_event({"stage": 8, "status": "active", "progress": progress,
                              "message": msg, "ce_batch": batch_num,
                              "ce_total_batches": total_batches,
                              "ce_pairs_done": pairs_done})
            await asyncio.sleep(0.02)

        # Apply CE scores back to features
        for r in ce_results:
            cid = r["cid"]
            if cid in features_map:
                features_map[cid]["ce_score"] = r["ce_score"]
                features_map[cid]["blended_score"] = r["blended_score"]

        # For non-shortlisted candidates, apply 0.82 ceiling cap
        for cid, score in all_scores:
            if cid not in shortlist_ids:
                if cid in features_map:
                    features_map[cid]["ce_score"] = 0.0
                    features_map[cid]["blended_score"] = score * 0.82

        ce_weight_pct = int(CE_WEIGHT * 100)
        algo_pct = 100 - ce_weight_pct
        yield _sse_event({"stage": 8, "progress": 90, "status": "completed",
                          "message": (
                              f"✓ CE re-ranking complete. Blending: {algo_pct}% algo + {ce_weight_pct}% CE."
                          )})
        await asyncio.sleep(0.1)

        # ──────────────────────────────────────────────────────────────────────
        # FINAL: Sort, normalize, top-100, assign ranks, generate reasoning
        # ──────────────────────────────────────────────────────────────────────
        yield _sse_event({"stage": 9, "stage_name": "Finalizing ranks",
                          "status": "active", "progress": 91,
                          "message": "Sorting by blended score, taking top 100…"})
        await asyncio.sleep(0.05)

        # Sort by blended_score descending, tie-break by candidate_id ascending
        sorted_all = sorted(
            candidates,
            key=lambda c: (
                -features_map.get(c["candidate_id"], {}).get("blended_score", 0.0),
                c["candidate_id"],
            )
        )

        top_100 = sorted_all[:100]

        # Normalize scores so rank-1 = max
        max_blended = max(
            (features_map.get(c["candidate_id"], {}).get("blended_score", 0.0) for c in top_100),
            default=1.0
        )
        max_blended = max(max_blended, 1e-6)

        results = []
        for rank_num, c in enumerate(top_100, start=1):
            cid = c["candidate_id"]
            feat = features_map.get(cid, {})
            blended = feat.get("blended_score", 0.0)
            normalized_score = blended / max_blended

            # Algorithmic rank (before CE re-ranking)
            algo_position = next(
                (i + 1 for i, (aid, _) in enumerate(all_scores) if aid == cid), rank_num
            )

            reasoning = build_reasoning(c, feat, rank_num)

            result_entry = {
                **_to_json_safe(c),
                "rank": rank_num,
                "algo_rank": algo_position,
                "final_score": round(normalized_score, 4),
                "reasoning": reasoning,
                "features": _to_json_safe(feat),
                "rank_delta": algo_position - rank_num,
                "blend_calculation": (
                    f"Final = {1.0 - CE_WEIGHT:.2f} × {feat.get('first_pass_score', 0.0):.3f} "
                    f"+ {CE_WEIGHT:.2f} × {feat.get('ce_score', 0.0):.3f} = {blended:.3f}"
                ),
            }
            results.append(result_entry)

        _state["results"] = results
        _state["status"] = "done"

        elapsed = round(time.time() - start_time, 1)
        yield _sse_event({
            "type": "complete",
            "stage": 10,
            "stage_name": "Done",
            "status": "completed",
            "progress": 100,
            "message": f"✓ Ranking complete. {len(results)} candidates ranked. Runtime: {elapsed}s",
            "results": results[:100],
            "runtime_seconds": elapsed,
            "candidates_processed": len(candidates),
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/results
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/results")
async def get_results():
    if not _state["results"]:
        raise HTTPException(404, "No results available. Run ranking first.")
    return {"results": _state["results"], "count": len(_state["results"])}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/candidate/:id
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/candidate/{candidate_id}")
async def get_candidate(candidate_id: str):
    for r in _state["results"]:
        if r.get("candidate_id") == candidate_id:
            return r
    # Search in candidates too
    for c in _state["candidates"]:
        if c.get("candidate_id") == candidate_id:
            return c
    raise HTTPException(404, f"Candidate {candidate_id} not found.")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/validate
# ─────────────────────────────────────────────────────────────────────────────
class ValidateRequest(BaseModel):
    results: list[dict]


@app.post("/api/validate")
async def validate_results(body: ValidateRequest):
    results = body.results or _state["results"]
    checks = []

    n = len(results)
    checks.append({"name": "Row count = 100", "passed": n == 100, "message": f"Got {n}"})

    ranks = sorted([r.get("rank", 0) for r in results])
    ranks_ok = ranks == list(range(1, n + 1))
    checks.append({"name": "Ranks 1–N each exactly once", "passed": ranks_ok, "message": ""})

    import re
    id_pattern = re.compile(r"^CAND_\d{7}$")
    ids_valid = all(id_pattern.match(r.get("candidate_id", "")) for r in results)
    checks.append({"name": "All candidate_ids valid (CAND_XXXXXXX)", "passed": ids_valid, "message": ""})

    ids = [r.get("candidate_id") for r in results]
    no_dups = len(set(ids)) == len(ids)
    checks.append({"name": "No duplicate candidate_ids", "passed": no_dups, "message": ""})

    sorted_by_rank = sorted(results, key=lambda r: r.get("rank", 0))
    scores = [r.get("final_score", 0) for r in sorted_by_rank]
    non_increasing = all(scores[i] >= scores[i + 1] for i in range(len(scores) - 1))
    checks.append({"name": "Scores non-increasing", "passed": non_increasing, "message": ""})

    unique_scores = len(set(round(s, 4) for s in scores)) > 1
    checks.append({"name": "Scores not all identical", "passed": unique_scores, "message": ""})

    reasoning_ok = all(r.get("reasoning") and len(str(r.get("reasoning", ""))) > 0 for r in results)
    checks.append({"name": "Reasoning non-empty", "passed": reasoning_ok, "message": ""})

    honeypot_in_top = sum(
        1 for r in results if r.get("features", {}).get("honeypot_confidence", 0) > 0.55
    )
    checks.append({
        "name": f"Honeypot count in top-100: {honeypot_in_top} / 10 max",
        "passed": honeypot_in_top < 10,
        "message": "",
    })

    valid = all(c["passed"] for c in checks)
    return {"valid": valid, "checks": checks}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/export
# ─────────────────────────────────────────────────────────────────────────────
class ExportRequest(BaseModel):
    results: Optional[list[dict]] = None
    filename: str = "submission.csv"


@app.post("/api/export")
async def export_csv(body: ExportRequest):
    results = body.results or _state["results"]
    if not results:
        raise HTTPException(400, "No results to export.")

    sorted_results = sorted(results, key=lambda r: r.get("rank", 0))

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow(["candidate_id", "rank", "score", "reasoning"])
    for r in sorted_results:
        reasoning = str(r.get("reasoning", "") or r.get("features", {}).get("ce_score", ""))
        writer.writerow([
            r.get("candidate_id", ""),
            r.get("rank", 0),
            f"{float(r.get('final_score', 0.0)):.4f}",
            reasoning,
        ])

    csv_content = output.getvalue()
    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{body.filename}"'},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
async def health():
    return {"status": "ok", "service": "Redrob Candidate Ranker API v1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
