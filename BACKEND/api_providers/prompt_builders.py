"""
api_providers/prompt_builders.py
All LLM prompts live here. Changing a prompt = change this file only.
No business logic — purely string construction.
"""

from __future__ import annotations

import json


# ─────────────────────────────────────────────────────────────────────────────
# Reasoning Generation Prompts
# ─────────────────────────────────────────────────────────────────────────────

REASONING_SYSTEM = """You are writing recruiter notes for a hiring manager evaluating candidates for a technical role.
Be specific, honest, and concise. Reference EXACT data from the candidate profile provided.
Write 1-2 sentences maximum per candidate. Do NOT hallucinate company names, skills, or experience that isn't in the data.
Return ONLY valid JSON. No preamble, no markdown, no explanation."""

def build_reasoning_prompt(candidates_batch: list[dict], role_context: str) -> str:
    """
    Builds the user message for batch reasoning generation.
    Processes up to 10 candidates per call.
    """
    cand_strs = []
    for c in candidates_batch:
        career_snippets = []
        for role in (c.get("career_history") or [])[:3]:
            desc = str(role.get("description", ""))[:150]
            career_snippets.append(f"  - {role.get('title','?')} at {role.get('company','?')}: {desc}")
        
        top_skills = [s.get("name", "") for s in (c.get("skills") or [])[:6]]
        
        cand_strs.append(
            f"Candidate {c['id']} (Rank #{c['rank']}, Score {c['score']:.3f}):\n"
            f"  Title: {c.get('title','?')}\n"
            f"  YoE: {c.get('yoe', 0):.1f} years\n"
            f"  Location: {c.get('location','?')}\n"
            f"  Notice: {c.get('notice_period', 60)} days\n"
            f"  Top Skills: {', '.join(top_skills)}\n"
            f"  Career:\n" + "\n".join(career_snippets)
        )
    
    candidates_text = "\n\n".join(cand_strs)
    
    return (
        f"Role Context: {role_context}\n\n"
        f"For each candidate below, write a 1-2 sentence recruiter note explaining why they ranked where they did. "
        f"If they have concerns (long notice, consulting-heavy, weak skills), mention them honestly.\n\n"
        f"{candidates_text}\n\n"
        f"Return JSON array: [{{\"id\": \"CAND_XXXXXXX\", \"reasoning\": \"...\"}}]\n"
        f"Include exactly {len(candidates_batch)} objects. No markdown."
    )


# ─────────────────────────────────────────────────────────────────────────────
# JD Parsing Prompts
# ─────────────────────────────────────────────────────────────────────────────

JD_PARSE_SYSTEM = """You are a technical recruiter parsing job descriptions.
Extract requirements precisely and completely. Return ONLY valid JSON matching the exact schema requested.
Do not add commentary, markdown, or extra fields."""

def build_jd_parse_prompt(jd_text: str) -> str:
    """Builds the prompt for LLM-powered JD parsing."""
    schema = {
        "role_title": "string",
        "hard_skills": [
            {"name": "string", "weight": "float (weights must sum to 1.0)", "keywords": ["string"]}
        ],
        "preferred_skills": [
            {"name": "string", "note": "string"}
        ],
        "disqualifiers": [
            {"name": "string", "description": "string"}
        ],
        "location_prefs": {
            "primary": ["string"],
            "acceptable": ["string"],
            "remote_ok": "boolean"
        },
        "experience": {
            "min_years": "int",
            "max_years": "int",
            "ideal_years": "int"
        },
        "semantic_queries": [
            {"text": "string - natural language query to find ideal candidates", "weight": "float"}
        ]
    }
    
    return (
        f"Parse this job description and extract all requirements:\n\n"
        f"---JOB DESCRIPTION START---\n{jd_text[:8000]}\n---JOB DESCRIPTION END---\n\n"
        f"Return JSON matching EXACTLY this schema:\n{json.dumps(schema, indent=2)}\n\n"
        f"Rules:\n"
        f"- hard_skills weights must sum to exactly 1.0\n"
        f"- Include 3 semantic_queries with weights summing to 1.0 (e.g. 0.6, 0.3, 0.1)\n"
        f"- Extract ALL mentioned technical skills, not just the first few\n"
        f"- Disqualifiers are explicit or implicit deal-breakers from the JD\n"
        f"- No markdown, no extra text, return ONLY the JSON object"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Chat / Q&A Prompts
# ─────────────────────────────────────────────────────────────────────────────

def build_chat_system(context_size: int) -> str:
    return (
        f"You are an AI recruiting assistant helping a recruiter understand ranked candidates. "
        f"You have access to data for {context_size} ranked candidates. "
        f"Answer questions specifically, citing candidate IDs and exact data from their profiles. "
        f"When referencing a candidate, always include their rank and ID. "
        f"If asked to filter or compare, do so based on the actual data provided. "
        f"Be concise but thorough. Format lists clearly."
    )

def build_chat_prompt(
    question: str,
    candidates_context: list[dict],
    conversation_history: list[dict],
) -> tuple[str, str]:
    """
    Returns (system_message, user_message) for the chat call.
    Candidate context is compressed to fit within token budgets.
    """
    # Build compact candidate summaries
    cand_lines = []
    for c in candidates_context:
        top_skills = [s.get("name","") for s in (c.get("skills") or [])[:5]]
        cand_lines.append(
            f"#{c.get('rank','?')} {c.get('candidate_id','?')} | "
            f"{c.get('current_title','?')} | "
            f"{c.get('years_of_experience','?')}yrs | "
            f"{c.get('location','?')} | "
            f"Score:{c.get('final_score',0):.3f} | "
            f"Notice:{c.get('notice_period_days','?')}d | "
            f"Skills:{', '.join(top_skills[:4])}"
        )
    
    context_block = "\n".join(cand_lines)
    system_msg = build_chat_system(len(candidates_context))
    
    # Build conversation history string
    history_lines = []
    for msg in (conversation_history or [])[-6:]:  # Last 6 turns
        role = "Recruiter" if msg.get("role") == "user" else "Assistant"
        history_lines.append(f"{role}: {msg.get('content','')}")
    
    history_block = "\n".join(history_lines) if history_lines else ""
    
    user_msg = (
        f"CANDIDATE DATA ({len(candidates_context)} candidates):\n{context_block}\n\n"
        + (f"CONVERSATION SO FAR:\n{history_block}\n\n" if history_block else "")
        + f"RECRUITER QUESTION: {question}\n\n"
        f"Answer the question using the candidate data above. "
        f"Cite specific candidate IDs and data points. Be factual and precise."
    )
    
    return system_msg, user_msg


# ─────────────────────────────────────────────────────────────────────────────
# Executive Summary Prompts
# ─────────────────────────────────────────────────────────────────────────────

EXECUTIVE_SUMMARY_SYSTEM = """You are a senior talent acquisition partner writing a hiring brief for a C-level executive.
Be concise, specific, and insightful. Reference actual candidates by rank and specific achievements.
Format: professional prose, ~300 words total. No bullet points for the main text."""

def build_executive_summary_prompt(top_candidates: list[dict], role_title: str) -> str:
    """Builds the prompt for executive summary generation."""
    summaries = []
    for c in top_candidates[:20]:
        top_skills = [s.get("name","") for s in (c.get("skills") or [])[:4]]
        career = (c.get("career_history") or [{}])[0]
        summaries.append(
            f"#{c.get('rank','?')} {c.get('candidate_id','?')}: "
            f"{c.get('current_title','?')}, {c.get('years_of_experience','?')}yrs, "
            f"{c.get('location','?')}, "
            f"{career.get('company','?')}, "
            f"Skills: {', '.join(top_skills)}, "
            f"Score: {c.get('final_score',0):.3f}"
        )
    
    candidates_text = "\n".join(summaries)
    
    return (
        f"Role: {role_title}\n"
        f"Total candidates ranked: {len(top_candidates)} shown of 100\n\n"
        f"TOP CANDIDATES:\n{candidates_text}\n\n"
        f"Write a ~300-word executive hiring brief covering:\n"
        f"1. Introduction (role and talent pool quality)\n"
        f"2. Top 3 Highlights (specific candidates #1, #2, #3 with concrete evidence)\n"
        f"3. Key themes across top candidates (patterns in background, skills, gaps)\n"
        f"4. Recommended first interviews (specific candidates and why)\n"
        f"5. Any risks or concerns the hiring manager should know\n\n"
        f"Return JSON: {{\"summary\": \"full 300-word text\", \"recommended_interviews\": [\"CAND_XXXXXXX\", ...], "
        f"\"key_themes\": [\"theme1\", \"theme2\", \"theme3\"]}}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Score Explanation Prompts
# ─────────────────────────────────────────────────────────────────────────────

EXPLAIN_SCORE_SYSTEM = """You are explaining a technical AI hiring score to a recruiter.
Be specific, grounded, and honest. Reference only actual data from the profile provided.
Do NOT hallucinate or invent details. 4-6 sentences. Professional tone."""

def build_explain_score_prompt(candidate: dict, jd_context: str, score: float) -> str:
    """Builds the prompt for detailed score explanation."""
    career_history = []
    for role in (candidate.get("career_history") or [])[:5]:
        career_history.append(
            f"  - {role.get('title','?')} at {role.get('company','?')} "
            f"({role.get('duration_months','?')}mo): {str(role.get('description',''))[:200]}"
        )
    
    top_skills = []
    for s in (candidate.get("skills") or [])[:8]:
        top_skills.append(f"{s.get('name','?')} ({s.get('proficiency','?')}, {s.get('duration_months','?')}mo)")
    
    return (
        f"Candidate: {candidate.get('candidate_id','?')}\n"
        f"Title: {candidate.get('current_title','?')}\n"
        f"YoE: {candidate.get('years_of_experience','?')} years\n"
        f"Location: {candidate.get('location','?')}\n"
        f"Notice: {candidate.get('notice_period_days','?')} days\n"
        f"Score: {score:.3f} / 1.000\n\n"
        f"Career History:\n" + "\n".join(career_history) + "\n\n"
        f"Top Skills:\n" + "\n".join(f"  - {s}" for s in top_skills) + "\n\n"
        f"JD Requirements:\n{jd_context}\n\n"
        f"Explain in exactly 4-6 sentences why this candidate received a score of {score:.3f}. "
        f"Reference specific evidence from their profile. Be honest about both strengths and gaps.\n\n"
        f"Return JSON: {{\"explanation\": \"your 4-6 sentence explanation here\"}}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Candidate Comparison Prompts
# ─────────────────────────────────────────────────────────────────────────────

COMPARE_SYSTEM = """You are a senior technical recruiter comparing candidates for a hiring decision.
Be objective, specific, and actionable. Reference exact data. Make a clear recommendation."""

def build_compare_prompt(candidates: list[dict], role_context: str) -> str:
    """Builds the prompt for candidate comparison."""
    cand_blocks = []
    for c in candidates:
        career = []
        for role in (c.get("career_history") or [])[:3]:
            career.append(f"    {role.get('title','?')} @ {role.get('company','?')}: {str(role.get('description',''))[:120]}")
        
        top_skills = [s.get("name","") for s in (c.get("skills") or [])[:6]]
        
        cand_blocks.append(
            f"=== {c.get('candidate_id','?')} (Rank #{c.get('rank','?')}, Score {c.get('final_score',0):.3f}) ===\n"
            f"Title: {c.get('current_title','?')} | YoE: {c.get('years_of_experience','?')}yrs | "
            f"Location: {c.get('location','?')} | Notice: {c.get('notice_period_days','?')}d\n"
            f"Skills: {', '.join(top_skills)}\n"
            f"Career:\n" + "\n".join(career)
        )
    
    cands_text = "\n\n".join(cand_blocks)
    ids = [c.get("candidate_id","?") for c in candidates]
    
    return (
        f"Role: {role_context}\n\n"
        f"Compare these {len(candidates)} candidates:\n\n{cands_text}\n\n"
        f"Return JSON:\n"
        f"{{\n"
        f"  \"strengths\": {{{', '.join(f'\"{id}\": \"strength text\"' for id in ids)}}},\n"
        f"  \"key_differentiator\": \"one factor that separates the top candidate\",\n"
        f"  \"recommendation\": \"which candidate to interview first and why\",\n"
        f"  \"risks\": {{{', '.join(f'\"{id}\": \"specific risk or concern\"' for id in ids)}}}\n"
        f"}}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Skill Gap Analysis Prompts  
# ─────────────────────────────────────────────────────────────────────────────

SKILL_GAP_SYSTEM = """You are a technical skills assessor analyzing candidate fit for a role.
Be specific and actionable. Compare skills to requirements precisely."""

def build_skill_gap_prompt(candidate: dict, jd_requirements: dict) -> str:
    """Builds the prompt for skill gap analysis."""
    candidate_skills = [
        f"{s.get('name','?')} ({s.get('proficiency','?')}, {s.get('duration_months','?')}mo)"
        for s in (candidate.get("skills") or [])
    ]
    
    required_skills = [
        f"{s.get('name','?')} (weight: {s.get('weight',0):.0%})"
        for s in (jd_requirements.get("hard_skills") or [])
    ]
    
    return (
        f"Candidate: {candidate.get('candidate_id','?')}\n"
        f"Title: {candidate.get('current_title','?')} | YoE: {candidate.get('years_of_experience','?')}yrs\n\n"
        f"Candidate Skills:\n" + "\n".join(f"  - {s}" for s in candidate_skills) + "\n\n"
        f"Required Skills (from JD):\n" + "\n".join(f"  - {s}" for s in required_skills) + "\n\n"
        f"Analyze the skill gap and return JSON:\n"
        f"{{\n"
        f"  \"matched_skills\": [\"skill1\", \"skill2\"],\n"
        f"  \"missing_skills\": [\"skill1\", \"skill2\"],\n"
        f"  \"partial_skills\": [\"skill with some but not enough experience\"],\n"
        f"  \"gap_score\": 0.0_to_1.0_where_1.0_is_perfect_match,\n"
        f"  \"gap_summary\": \"2-3 sentences summarizing the gap\",\n"
        f"  \"recommendation\": \"hire/maybe/no and specific reason\"\n"
        f"}}"
    )
