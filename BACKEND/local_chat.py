"""
local_chat.py — Rule-based local chat engine for recruiter Q&A.

Answers common recruiter questions about ranked candidates without any LLM.
Used as:
  1. Primary chat when API Mode is OFF
  2. Automatic fallback when the LLM API fails (rate limit, no key, etc.)

Supported question types:
  - "Why is #1 ranked above #2?"
  - "Who has the most Python experience?"
  - "Show candidates from Bangalore"
  - "Who can join immediately / in 30 days?"
  - "Top 5 candidates"
  - "Who has FAISS/RAG/[any skill]?"
  - "Compare candidate X and Y"
  - General keyword search across profiles
"""

from __future__ import annotations

import re
from typing import Any


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def answer_locally(
    question: str,
    ranked_results: list[dict],
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Answer a recruiter question using only the in-memory ranked results.
    Returns the same schema as the LLM chat endpoint:
      { success, answer, citations, tokens_used, cost_usd, model_used }
    """
    if not ranked_results:
        return _fail("No ranked results available. Please run the ranking pipeline first.")

    q = question.strip().lower()

    # Route to the right handler
    answer, citations = _route(q, question, ranked_results)

    return {
        "success": True,
        "answer": answer,
        "citations": citations,
        "tokens_used": 0,
        "cost_usd": 0.0,
        "model_used": "local-rule-engine",
        "local_fallback": True,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

def _route(q: str, original_q: str, results: list[dict]) -> tuple[str, list[str]]:
    # --- Ranking comparison: "why is #1 ranked above #2" / "why rank 1 over 2" ---
    m = re.search(r"(?:why|how).*(?:rank|ranked|above|over|better|higher).*?[#\s]?(\d+).*?[#\s]?(\d+)", q)
    if m:
        r1, r2 = int(m.group(1)), int(m.group(2))
        return _compare_ranks(r1, r2, results)

    # --- "compare candidate X and Y" ---
    m = re.search(r"compare\s+(?:candidate[s]?\s+)?([a-z0-9_]+)\s+(?:and|vs\.?|with)\s+([a-z0-9_]+)", q)
    if not m:
        m = re.search(r"(cand_\d+).*?(cand_\d+)", q)
    if m:
        id1, id2 = m.group(1).upper(), m.group(2).upper()
        return _compare_by_id(id1, id2, results)

    # --- Top N ---
    m = re.search(r"top\s+(\d+)", q)
    if m:
        n = min(int(m.group(1)), 20)
        return _top_n(n, results)

    # --- "who can join in X days / immediately" ---
    if any(x in q for x in ["join immediately", "immediate joiner", "30 day", "15 day", "notice period", "can join"]):
        return _notice_period_filter(q, results)

    # --- Location filter ---
    location_keywords = ["bangalore", "bengaluru", "mumbai", "delhi", "pune", "hyderabad",
                          "chennai", "noida", "gurgaon", "gurugram", "kolkata", "remote"]
    for loc in location_keywords:
        if loc in q:
            return _location_filter(loc, results)

    # --- Experience filter ---
    m = re.search(r"(?:more than|at least|over|minimum|>\s*)?(\d+)\+?\s*years?\s*(?:of)?\s*(?:experience)?", q)
    if m and any(x in q for x in ["experience", "yrs", "year"]):
        yoe = int(m.group(1))
        return _experience_filter(yoe, q, results)

    # --- Skill query ---
    skill_triggers = ["who has", "who know", "who can", "skill", "experience with",
                      "familiar with", "expert in", "proficient in", "background in"]
    if any(t in q for t in skill_triggers):
        return _skill_search(original_q, results)

    # --- Single candidate lookup ---
    m = re.search(r"(cand_\d+)", q)
    if m:
        cid = m.group(1).upper()
        return _candidate_detail(cid, results)

    # --- Rank lookup "#5" or "rank 5" or "candidate 5" ---
    m = re.search(r"(?:rank|#|candidate\s+#?)(\d+)\b", q)
    if m:
        rank = int(m.group(1))
        return _rank_detail(rank, results)

    # --- Generic keyword search across all candidate text ---
    return _keyword_search(original_q, results)


# ─────────────────────────────────────────────────────────────────────────────
# Handlers
# ─────────────────────────────────────────────────────────────────────────────

def _compare_ranks(r1: int, r2: int, results: list[dict]) -> tuple[str, list[str]]:
    c1 = _by_rank(r1, results)
    c2 = _by_rank(r2, results)
    if not c1 or not c2:
        return f"Could not find candidates at rank #{r1} and #{r2} in the results.", []

    id1 = c1.get("candidate_id", "?")
    id2 = c2.get("candidate_id", "?")

    score_diff = c1.get("final_score", 0) - c2.get("final_score", 0)

    lines = [
        f"**#{r1} {id1}** scored **{c1.get('final_score', 0):.4f}** vs "
        f"**#{r2} {id2}** scored **{c2.get('final_score', 0):.4f}** "
        f"(gap: {score_diff:+.4f}).\n"
    ]

    # Score breakdown comparison
    components = [
        ("skill_score", "Skills"),
        ("career_score", "Career Quality"),
        ("semantic_score", "Semantic Match"),
        ("experience_score", "Experience"),
        ("location_score", "Location"),
        ("education_score", "Education"),
    ]
    breakdown_lines = []
    for key, label in components:
        v1 = c1.get(key) or (c1.get("features") or {}).get(key, None)
        v2 = c2.get(key) or (c2.get("features") or {}).get(key, None)
        if v1 is not None and v2 is not None:
            v1, v2 = float(v1), float(v2)
            winner = "↑" if v1 > v2 else ("↓" if v1 < v2 else "=")
            breakdown_lines.append(f"  - {label}: {v1:.3f} {winner} {v2:.3f}")

    if breakdown_lines:
        lines.append("**Score breakdown (#1 vs #2):**\n" + "\n".join(breakdown_lines) + "\n")

    # Title & experience
    lines.append(
        f"\n**{id1}**: {c1.get('current_title','?')}, "
        f"{c1.get('years_of_experience', 0):.1f} yrs experience, "
        f"{c1.get('location', '?')}."
    )
    lines.append(
        f"**{id2}**: {c2.get('current_title','?')}, "
        f"{c2.get('years_of_experience', 0):.1f} yrs experience, "
        f"{c2.get('location', '?')}."
    )

    # Skills comparison
    skills1 = [s.get("name", "") for s in c1.get("skills", [])[:5]]
    skills2 = [s.get("name", "") for s in c2.get("skills", [])[:5]]
    if skills1:
        lines.append(f"\n**{id1} top skills**: {', '.join(skills1)}")
    if skills2:
        lines.append(f"**{id2} top skills**: {', '.join(skills2)}")

    # Reasoning
    r1_text = c1.get("reasoning", "")
    r2_text = c2.get("reasoning", "")
    if r1_text:
        lines.append(f"\n**System reasoning for #{r1}**: {r1_text}")
    if r2_text:
        lines.append(f"**System reasoning for #{r2}**: {r2_text}")

    return "\n".join(lines), [id1, id2]


def _compare_by_id(id1: str, id2: str, results: list[dict]) -> tuple[str, list[str]]:
    c1 = next((r for r in results if r.get("candidate_id", "").upper() == id1), None)
    c2 = next((r for r in results if r.get("candidate_id", "").upper() == id2), None)
    if not c1 or not c2:
        found = [r.get("candidate_id") for r in results if id1 in r.get("candidate_id","") or id2 in r.get("candidate_id","")]
        return f"Could not find both candidates. Found: {found}", []
    return _compare_ranks(c1.get("rank", 0), c2.get("rank", 0), results)


def _top_n(n: int, results: list[dict]) -> tuple[str, list[str]]:
    top = results[:n]
    lines = [f"**Top {n} candidates:**\n"]
    citations = []
    for c in top:
        cid = c.get("candidate_id", "?")
        citations.append(cid)
        skills = [s.get("name", "") for s in c.get("skills", [])[:3]]
        lines.append(
            f"**#{c.get('rank','?')} {cid}** — "
            f"{c.get('current_title','?')}, "
            f"{c.get('years_of_experience', 0):.1f} yrs, "
            f"{c.get('location','?')} | "
            f"Score: {c.get('final_score',0):.4f} | "
            f"Skills: {', '.join(skills)}"
        )
    return "\n".join(lines), citations


def _notice_period_filter(q: str, results: list[dict]) -> tuple[str, list[str]]:
    threshold = 30
    m = re.search(r"(\d+)\s*day", q)
    if m:
        threshold = int(m.group(1))
    elif "immediate" in q or "immediately" in q:
        threshold = 0

    matches = [
        c for c in results
        if (c.get("notice_period_days") or 90) <= threshold
    ]

    if not matches:
        sorted_by_notice = sorted(
            results, key=lambda c: c.get("notice_period_days") or 90
        )[:5]
        lines = [f"No candidates have notice period <= {threshold} days. Closest options:"]
        citations = []
        for c in sorted_by_notice:
            cid = c.get("candidate_id", "?")
            citations.append(cid)
            lines.append(
                f"  - **#{c.get('rank','?')} {cid}**: "
                f"{c.get('notice_period_days', '?')} days notice, "
                f"{c.get('current_title','?')}"
            )
        return "\n".join(lines), citations

    lines = [f"**{len(matches)} candidates with notice period <= {threshold} days:**\n"]
    citations = []
    for c in matches[:15]:
        cid = c.get("candidate_id", "?")
        citations.append(cid)
        lines.append(
            f"  - **#{c.get('rank','?')} {cid}**: "
            f"{c.get('notice_period_days', '?')} days notice | "
            f"{c.get('current_title','?')}, {c.get('years_of_experience', 0):.1f} yrs | "
            f"Score: {c.get('final_score',0):.4f}"
        )
    return "\n".join(lines), citations


def _location_filter(loc_keyword: str, results: list[dict]) -> tuple[str, list[str]]:
    city_map = {
        "bangalore": ["bangalore", "bengaluru"],
        "bengaluru": ["bangalore", "bengaluru"],
        "mumbai": ["mumbai"],
        "delhi": ["delhi", "new delhi"],
        "pune": ["pune"],
        "hyderabad": ["hyderabad"],
        "chennai": ["chennai"],
        "noida": ["noida"],
        "gurgaon": ["gurgaon", "gurugram"],
        "gurugram": ["gurgaon", "gurugram"],
        "kolkata": ["kolkata"],
        "remote": ["remote"],
    }
    search_terms = city_map.get(loc_keyword, [loc_keyword])

    matches = [
        c for c in results
        if any(t in (c.get("location") or "").lower() for t in search_terms)
    ]

    city_display = search_terms[0].title()
    if not matches:
        return f"No candidates found located in {city_display}.", []

    lines = [f"**{len(matches)} candidates in {city_display}** (ranked order):\n"]
    citations = []
    for c in matches[:15]:
        cid = c.get("candidate_id", "?")
        citations.append(cid)
        lines.append(
            f"  - **#{c.get('rank','?')} {cid}**: "
            f"{c.get('current_title','?')}, "
            f"{c.get('years_of_experience', 0):.1f} yrs | "
            f"Score: {c.get('final_score',0):.4f} | "
            f"{c.get('location','?')}"
        )
    return "\n".join(lines), citations


def _experience_filter(yoe: int, q: str, results: list[dict]) -> tuple[str, list[str]]:
    if any(x in q for x in ["less than", "under", "fewer", "below", "junior", "< "]):
        matches = [c for c in results if (c.get("years_of_experience") or 0) < yoe]
        label = f"< {yoe} years experience"
    else:
        matches = [c for c in results if (c.get("years_of_experience") or 0) >= yoe]
        label = f">= {yoe} years experience"

    if not matches:
        return f"No candidates found with {label}.", []

    lines = [f"**{len(matches)} candidates with {label}:**\n"]
    citations = []
    for c in matches[:15]:
        cid = c.get("candidate_id", "?")
        citations.append(cid)
        lines.append(
            f"  - **#{c.get('rank','?')} {cid}**: "
            f"{c.get('years_of_experience', 0):.1f} yrs | "
            f"{c.get('current_title','?')} | "
            f"Score: {c.get('final_score',0):.4f}"
        )
    return "\n".join(lines), citations


def _skill_search(original_q: str, results: list[dict]) -> tuple[str, list[str]]:
    stop = {"who", "has", "have", "the", "a", "an", "and", "or", "with", "in",
            "for", "can", "know", "knows", "experience", "background", "skill",
            "skills", "expert", "experts", "familiar", "proficient", "any",
            "show", "list", "find", "what", "which", "candidates", "candidate",
            "me", "is", "are", "do", "does", "i", "you", "their"}
    words = re.findall(r"[a-z0-9\.\-\+#]+", original_q.lower())
    skill_tokens = [w for w in words if len(w) > 2 and w not in stop]

    if not skill_tokens:
        return "Could not identify a skill to search for. Try: 'Who has Python experience?' or 'Show me RAG experts'", []

    matches_with_score: list[tuple[int, int, dict]] = []
    for c in results:
        candidate_text = _build_candidate_search_text(c)
        score = sum(1 for t in skill_tokens if t in candidate_text)
        if score > 0:
            matches_with_score.append((score, -c.get("rank", 999), c))

    matches_with_score.sort(key=lambda x: (x[0], x[1]), reverse=True)
    matches = [x[2] for x in matches_with_score[:15]]

    skill_display = " + ".join(skill_tokens[:3])
    if not matches:
        return f"No candidates found with skills matching: **{skill_display}**", []

    lines = [f"**{len(matches)} candidates matching '{skill_display}'** (best matches first):\n"]
    citations = []
    for c in matches:
        cid = c.get("candidate_id", "?")
        citations.append(cid)
        skills = [s.get("name", "") for s in c.get("skills", [])[:4]]
        lines.append(
            f"  - **#{c.get('rank','?')} {cid}**: "
            f"{c.get('current_title','?')}, "
            f"{c.get('years_of_experience', 0):.1f} yrs | "
            f"Skills: {', '.join(skills)} | "
            f"Score: {c.get('final_score',0):.4f}"
        )
    return "\n".join(lines), citations


def _candidate_detail(cid: str, results: list[dict]) -> tuple[str, list[str]]:
    c = next((r for r in results if r.get("candidate_id", "").upper() == cid.upper()), None)
    if not c:
        partial = [r for r in results if cid in r.get("candidate_id", "").upper()]
        if partial:
            c = partial[0]
        else:
            return f"Candidate {cid} not found in the ranked results.", []

    cid = c.get("candidate_id", "?")
    skills = [s.get("name", "") for s in c.get("skills", [])[:8]]
    career = c.get("career_history", [])
    career_lines = []
    for role in career[:3]:
        career_lines.append(
            f"  - {role.get('title','?')} at {role.get('company','?')} "
            f"({role.get('duration_months', '?')} months)"
        )

    lines = [
        f"**{cid} — Rank #{c.get('rank','?')}**\n",
        f"**Title**: {c.get('current_title','?')}",
        f"**Experience**: {c.get('years_of_experience', 0):.1f} years",
        f"**Location**: {c.get('location','?')}",
        f"**Notice Period**: {c.get('notice_period_days','?')} days",
        f"**Score**: {c.get('final_score',0):.4f}",
        f"**Top Skills**: {', '.join(skills)}",
    ]
    if career_lines:
        lines.append("\n**Career History**:")
        lines.extend(career_lines)
    reasoning = c.get("reasoning", "")
    if reasoning:
        lines.append(f"\n**System Assessment**: {reasoning}")

    return "\n".join(lines), [cid]


def _rank_detail(rank: int, results: list[dict]) -> tuple[str, list[str]]:
    c = _by_rank(rank, results)
    if not c:
        return f"No candidate found at rank #{rank}.", []
    return _candidate_detail(c.get("candidate_id", ""), results)


def _keyword_search(original_q: str, results: list[dict]) -> tuple[str, list[str]]:
    """Generic fallback: search across all text fields."""
    tokens = re.findall(r"[a-z0-9\.\-\+#]{3,}", original_q.lower())
    stop = {"who", "has", "have", "the", "and", "with", "for", "can", "show",
            "list", "find", "what", "which", "candidate", "candidates", "about",
            "tell", "give", "are", "them", "their", "that", "this"}
    tokens = [t for t in tokens if t not in stop]

    if not tokens:
        total = len(results)
        top3 = results[:3]
        lines = [f"I have **{total} ranked candidates** loaded. Here are the top 3:\n"]
        citations = []
        for c in top3:
            cid = c.get("candidate_id", "?")
            citations.append(cid)
            skills = [s.get("name", "") for s in c.get("skills", [])[:3]]
            lines.append(
                f"  **#{c.get('rank','?')} {cid}** - "
                f"{c.get('current_title','?')}, "
                f"{c.get('years_of_experience',0):.1f}yrs, "
                f"Score {c.get('final_score',0):.4f}, "
                f"Skills: {', '.join(skills)}"
            )
        lines.append("\nYou can ask: 'top 10 candidates', 'who has Python experience?', "
                     "'candidates from Bangalore', 'who can join in 30 days?', "
                     "'why is #1 ranked above #2?'")
        return "\n".join(lines), citations

    matches_with_score: list[tuple[int, dict]] = []
    for c in results:
        text = _build_candidate_search_text(c)
        score = sum(1 for t in tokens if t in text)
        if score > 0:
            matches_with_score.append((score, c))

    matches_with_score.sort(key=lambda x: x[0], reverse=True)
    matches = [x[1] for x in matches_with_score[:10]]

    if not matches:
        return (
            "No candidates matched your query. Try asking:\n"
            "- 'top 10 candidates'\n"
            "- 'who has Python / FAISS / RAG experience?'\n"
            "- 'candidates from Bangalore'\n"
            "- 'who can join in 30 days?'\n"
            "- 'why is candidate #1 ranked above #2?'",
            []
        )

    lines = [f"**{len(matches)} candidates matching your query:**\n"]
    citations = []
    for c in matches:
        cid = c.get("candidate_id", "?")
        citations.append(cid)
        lines.append(
            f"  - **#{c.get('rank','?')} {cid}**: "
            f"{c.get('current_title','?')}, "
            f"{c.get('years_of_experience', 0):.1f} yrs | "
            f"Score: {c.get('final_score',0):.4f}"
        )
    return "\n".join(lines), citations


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _by_rank(rank: int, results: list[dict]) -> dict | None:
    return next((c for c in results if c.get("rank") == rank), None)


def _build_candidate_search_text(c: dict) -> str:
    """Build a searchable lowercase text blob from all candidate fields."""
    parts = [
        str(c.get("candidate_id", "")),
        str(c.get("current_title", "")),
        str(c.get("location", "")),
        str(c.get("headline", "")),
        " ".join(s.get("name", "") for s in c.get("skills", [])),
        " ".join(
            f"{r.get('title','')} {r.get('company','')} {r.get('description','')}"
            for r in c.get("career_history", [])
        ),
        str(c.get("reasoning", "")),
    ]
    return " ".join(parts).lower()


def _fail(msg: str) -> dict:
    return {
        "success": False,
        "answer": msg,
        "citations": [],
        "tokens_used": 0,
        "cost_usd": 0.0,
        "model_used": "local-rule-engine",
    }
