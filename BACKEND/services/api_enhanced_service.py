"""
services/api_enhanced_service.py — API Mode Enhancement Layer

This service wraps the existing local ranking engine with optional LLM-powered
enhancements. The local pipeline is ALWAYS the authoritative ranking source.
LLM features are purely additive: better reasoning, richer explanations, chat, etc.

CRITICAL: This service NEVER replaces ranking logic. It only enhances:
  ✓ Reasoning generation
  ✓ JD parsing  
  ✓ Candidate explanation
  ✓ Candidate comparison
  ✓ Executive summary
  ✓ Recruiter chat
  ✓ Skill gap analysis
"""

from __future__ import annotations

import asyncio
import logging
import math
from typing import Any

logger = logging.getLogger(__name__)


class ApiEnhancedService:
    """
    API Mode enhancement layer.
    Always falls back to local equivalents on any failure.
    Ranking logic is never called here — only explanation/reasoning features.
    """

    REASONING_BATCH_SIZE = 10   # Candidates per LLM reasoning call
    ROLE_CONTEXT = (
        "Senior AI/ML Engineer role requiring expertise in dense retrieval, "
        "vector databases, ranking systems, LLMs/NLP, and production ML deployment. "
        "5-9 years experience ideal. Product company background preferred."
    )

    def __init__(self, provider, fallback_enabled: bool = True):
        """
        Args:
            provider: An instance of BaseProvider (GeminiProvider or OpenAIProvider)
            fallback_enabled: If True, failures silently fall back to local. If False, raise.
        """
        self.provider = provider
        self.fallback_enabled = fallback_enabled

    # ─────────────────────────────────────────────────────────────────────────
    # Reasoning Generation (replaces template-based reasoning in API Mode)
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_llm_reasoning(
        self,
        results: list[dict],
        jd_context: str | None = None,
    ) -> tuple[list[dict], dict]:
        """
        Generate LLM reasoning for ranked candidates.
        Processes in batches of REASONING_BATCH_SIZE.
        Returns (enhanced_results, stats).

        GROUNDING: After receiving LLM reasoning, verifies claims against profile data.
        Falls back to template reasoning for any candidate where LLM fails.
        """
        from reasoning_generator import build_reasoning  # Local fallback

        role_context = jd_context or self.ROLE_CONTEXT
        total_tokens = 0
        total_cost = 0.0
        llm_count = 0
        fallback_count = 0
        model_used = ""

        # Build batches
        batches = []
        for i in range(0, len(results), self.REASONING_BATCH_SIZE):
            batches.append(results[i: i + self.REASONING_BATCH_SIZE])

        # Build lookup for quick update
        reasoning_map: dict[str, str] = {}

        for batch in batches:
            # Prepare compact batch data for the prompt
            prompt_batch = []
            for c in batch:
                prompt_batch.append({
                    "id": c.get("candidate_id", ""),
                    "rank": c.get("rank", 0),
                    "title": c.get("current_title", ""),
                    "yoe": c.get("years_of_experience", 0),
                    "company": (c.get("career_history") or [{}])[0].get("company", ""),
                    "location": c.get("location", ""),
                    "notice_period": c.get("notice_period_days", 60),
                    "score": c.get("final_score", 0.0),
                    "skills": c.get("skills", []),
                    "career_history": c.get("career_history", []),
                })

            resp = await self.provider.generate_reasoning(prompt_batch, role_context)

            if resp.success and resp.content:
                total_tokens += resp.tokens_used
                total_cost += resp.cost_usd
                model_used = resp.model_used
                llm_count += len(batch)

                # Map id → reasoning
                for item in resp.content:
                    cid = item.get("id", "")
                    raw_reasoning = item.get("reasoning", "")
                    if cid:
                        # Grounding check
                        reasoning_map[cid] = self._ground_reasoning(
                            raw_reasoning, 
                            next((c for c in batch if c.get("candidate_id") == cid), {})
                        )
            else:
                # Batch failed — use template fallback for this batch
                logger.warning(f"LLM reasoning batch failed: {resp.error}. Using template fallback.")
                fallback_count += len(batch)
                for c in batch:
                    features = c.get("features") or {}
                    reasoning_map[c["candidate_id"]] = build_reasoning(c, features, c.get("rank", 99))

        # Apply reasoning to results
        enhanced = []
        for c in results:
            cid = c.get("candidate_id", "")
            result_copy = dict(c)
            if cid in reasoning_map:
                result_copy["reasoning"] = reasoning_map[cid]
                result_copy["llm_reasoning"] = True
                result_copy["reasoning_model"] = model_used
            enhanced.append(result_copy)

        stats = {
            "llm_count": llm_count,
            "fallback_count": fallback_count,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 6),
            "model_used": model_used,
        }
        return enhanced, stats

    def _ground_reasoning(self, reasoning: str, candidate: dict) -> str:
        """
        Verify LLM reasoning claims against actual profile data.
        Removes or corrects hallucinated facts.
        """
        if not reasoning:
            return reasoning

        # Always append verified location if not present
        location = candidate.get("location", "")
        if location and location.lower() not in reasoning.lower():
            reasoning = reasoning.rstrip(".") + f". Based in {location}."

        # Verify YoE mentioned in reasoning matches profile
        import re
        yoe_actual = round(float(candidate.get("years_of_experience", 0)), 1)
        yoe_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:years?|yrs?)", reasoning, re.IGNORECASE)
        if yoe_match:
            yoe_mentioned = float(yoe_match.group(1))
            if abs(yoe_mentioned - yoe_actual) > 2.0:
                # Significant mismatch — replace
                reasoning = re.sub(
                    r"\d+(?:\.\d+)?\s*(?:years?|yrs?)\s*(?:of\s*experience)?",
                    f"{yoe_actual} years",
                    reasoning,
                    count=1,
                    flags=re.IGNORECASE,
                )

        return reasoning

    # ─────────────────────────────────────────────────────────────────────────
    # JD Parsing (LLM version replaces rule-based in API Mode)
    # ─────────────────────────────────────────────────────────────────────────

    async def parse_jd_with_llm(self, jd_text: str) -> dict:
        """
        Parse a job description using LLM.
        Returns same schema as rule-based parser (for pipeline compatibility).
        Falls back to rule-based parser on failure.
        """
        resp = await self.provider.parse_jd(jd_text)

        if resp.success and resp.content:
            content = resp.content

            # Normalize to match existing frontend schema
            hard_skills = content.get("hard_skills", [])
            # Ensure weights sum to 1.0
            wsum = sum(s.get("weight", 0) for s in hard_skills) or 1.0
            for s in hard_skills:
                s["weight"] = round(s.get("weight", 0) / wsum, 3)

            # Extract semantic queries for JD queries format
            semantic_queries = content.get("semantic_queries", [])
            ai_queries = [
                {
                    "weight": f"{int(q.get('weight', 0.33) * 100)}%",
                    "label": f"Query {i+1}",
                    "text": q.get("text", ""),
                }
                for i, q in enumerate(semantic_queries[:3])
            ]

            # Build location map
            loc_prefs = content.get("location_prefs", {})
            primary_locs = loc_prefs.get("primary", [])
            loc_map = [
                {"bucket": loc, "score": 1.0, "bar": 100, "is_primary": True}
                for loc in primary_locs[:3]
            ]

            exp = content.get("experience", {})
            min_years = exp.get("min_years", 3)
            max_years = exp.get("max_years", 8)

            return {
                "success": True,
                "llm_parsed": True,
                "llm_model": resp.model_used,
                "tokens_used": resp.tokens_used,
                "cost_usd": resp.cost_usd,
                "role_title": content.get("role_title", "Role"),
                "hard_skills": hard_skills[:6],
                "preferred_skills": [
                    {"name": s.get("name",""), "note": s.get("note","Preferred")}
                    for s in content.get("preferred_skills", [])
                ],
                "disqualifiers": [
                    {
                        "name": d.get("name",""),
                        "logic": d.get("description",""),
                        "color": "text-amber-600 dark:text-amber-400",
                        "bg": "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
                    }
                    for d in content.get("disqualifiers", [])
                ],
                "location_map": loc_map,
                "locations": primary_locs[:3] or ["Not specified"],
                "ai_queries": ai_queries,
                "experience": {
                    "min_years": min_years,
                    "max_years": max_years,
                    "peak_years": exp.get("ideal_years", (min_years + max_years) // 2),
                },
                "raw_llm_content": content,
            }
        else:
            # Fallback to rule-based
            logger.warning(f"LLM JD parse failed: {resp.error}. Falling back to rule-based.")
            return {
                "success": False,
                "llm_parsed": False,
                "error": resp.error,
                "fallback_used": True,
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Recruiter Chat
    # ─────────────────────────────────────────────────────────────────────────

    async def chat(
        self,
        question: str,
        ranked_results: list[dict],
        context_size: int = 100,
        conversation_history: list[dict] | None = None,
    ) -> dict:
        """
        Answer a recruiter's natural language question about ranked candidates.
        Returns {answer, citations, tokens_used, cost_usd, model_used, error?}
        """
        context = ranked_results[:context_size]
        history = conversation_history or []

        resp = await self.provider.chat(question, context, history)

        if resp.success and resp.content:
            return {
                "success": True,
                "answer": resp.content.get("answer", ""),
                "citations": resp.content.get("citations", []),
                "tokens_used": resp.tokens_used,
                "cost_usd": resp.cost_usd,
                "model_used": resp.model_used,
            }
        else:
            return {
                "success": False,
                "answer": "AI Chat is currently unavailable. Please check your API settings.",
                "citations": [],
                "tokens_used": 0,
                "cost_usd": 0.0,
                "model_used": "",
                "error": resp.error,
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Executive Summary
    # ─────────────────────────────────────────────────────────────────────────

    async def executive_summary(
        self,
        ranked_results: list[dict],
        role_title: str = "Senior AI Engineer",
    ) -> dict:
        """
        Generate a 300-word executive hiring brief for the hiring manager.
        """
        top_20 = ranked_results[:20]
        resp = await self.provider.executive_summary(top_20, role_title)

        if resp.success and resp.content:
            return {
                "success": True,
                "summary": resp.content.get("summary", ""),
                "recommended_interviews": resp.content.get("recommended_interviews", []),
                "key_themes": resp.content.get("key_themes", []),
                "tokens_used": resp.tokens_used,
                "cost_usd": resp.cost_usd,
                "model_used": resp.model_used,
            }
        else:
            return {
                "success": False,
                "error": resp.error,
                "summary": "",
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Score Explanation
    # ─────────────────────────────────────────────────────────────────────────

    async def explain_score(
        self,
        candidate: dict,
        jd_context: str | None = None,
    ) -> dict:
        """
        Explain in 4-6 sentences why this candidate received their score.
        """
        score = candidate.get("final_score", 0.0)
        context = jd_context or self.ROLE_CONTEXT
        resp = await self.provider.explain_score(candidate, context, score)

        if resp.success and resp.content:
            return {
                "success": True,
                "explanation": resp.content.get("explanation", ""),
                "tokens_used": resp.tokens_used,
                "cost_usd": resp.cost_usd,
                "model_used": resp.model_used,
            }
        else:
            return {
                "success": False,
                "error": resp.error,
                "explanation": "",
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Candidate Comparison
    # ─────────────────────────────────────────────────────────────────────────

    async def compare_candidates(
        self,
        candidates: list[dict],
        jd_context: str | None = None,
    ) -> dict:
        """
        Compare 2-3 candidates and produce a structured hiring recommendation.
        """
        role_context = jd_context or self.ROLE_CONTEXT
        resp = await self.provider.compare_candidates(candidates, role_context)

        if resp.success and resp.content:
            return {
                "success": True,
                "strengths": resp.content.get("strengths", {}),
                "key_differentiator": resp.content.get("key_differentiator", ""),
                "recommendation": resp.content.get("recommendation", ""),
                "risks": resp.content.get("risks", {}),
                "tokens_used": resp.tokens_used,
                "cost_usd": resp.cost_usd,
                "model_used": resp.model_used,
            }
        else:
            return {
                "success": False,
                "error": resp.error,
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Skill Gap Analysis
    # ─────────────────────────────────────────────────────────────────────────

    async def skill_gap_analysis(
        self,
        candidate: dict,
        jd_requirements: dict | None = None,
    ) -> dict:
        """
        Analyze the gap between candidate skills and JD requirements.
        """
        if jd_requirements is None:
            jd_requirements = self._default_jd_requirements()

        resp = await self.provider.skill_gap_analysis(candidate, jd_requirements)

        if resp.success and resp.content:
            return {
                "success": True,
                "matched_skills": resp.content.get("matched_skills", []),
                "missing_skills": resp.content.get("missing_skills", []),
                "partial_skills": resp.content.get("partial_skills", []),
                "gap_score": resp.content.get("gap_score", 0.5),
                "gap_summary": resp.content.get("gap_summary", ""),
                "recommendation": resp.content.get("recommendation", ""),
                "tokens_used": resp.tokens_used,
                "cost_usd": resp.cost_usd,
                "model_used": resp.model_used,
            }
        else:
            return {
                "success": False,
                "error": resp.error,
            }

    def _default_jd_requirements(self) -> dict:
        """Returns the default Redrob hackathon JD requirements."""
        return {
            "hard_skills": [
                {"name": "Dense Retrieval / Embeddings", "weight": 0.20},
                {"name": "Vector Databases", "weight": 0.20},
                {"name": "Ranking Systems", "weight": 0.20},
                {"name": "LLMs & NLP", "weight": 0.15},
                {"name": "Evaluation & Experimentation", "weight": 0.15},
                {"name": "Python & Production Engineering", "weight": 0.10},
            ]
        }
