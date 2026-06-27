"""
api_providers/base_provider.py
Abstract base class that all LLM providers must implement.
Adding a new provider = subclass this + register in __init__.py.
Business logic in services/ never touches provider internals directly.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ProviderResponse:
    """Standardized response envelope from any provider call."""
    success: bool
    content: Any = None          # Parsed result (dict / list / str)
    raw_text: str = ""           # Raw LLM output for debugging
    tokens_used: int = 0         # Input + output tokens
    model_used: str = ""         # Actual model name that responded
    cost_usd: float = 0.0        # Estimated cost
    error: str = ""              # Error message if success=False
    fallback_used: bool = False  # True if we silently fell back to local


class BaseProvider(ABC):
    """
    Abstract provider interface.
    All methods are async. Each method documents its expected return shape.
    """

    def __init__(self, api_key: str, model_config: dict):
        self.api_key = api_key
        self.model_config = model_config
        self.logger = logging.getLogger(self.__class__.__name__)

    # ── Abstract methods ─────────────────────────────────────────────────────

    @abstractmethod
    async def validate_connection(self) -> ProviderResponse:
        """
        Make a minimal API call to verify the key works.
        Returns success=True with a short test response, or success=False with error.
        """

    @abstractmethod
    async def generate_reasoning(
        self,
        candidates_batch: list[dict],
        role_context: str,
    ) -> ProviderResponse:
        """
        Generate recruiter-friendly reasoning for a batch of candidates.
        Input:  List of dicts with keys: id, rank, title, yoe, company, skills,
                location, notice_period, score, career_descriptions
        Output: ProviderResponse where content = list[{id, reasoning}]
        """

    @abstractmethod
    async def parse_jd(self, jd_text: str) -> ProviderResponse:
        """
        Parse any job description text into structured requirements JSON.
        Output: ProviderResponse where content = {
            hard_skills, preferred_skills, disqualifiers,
            location_prefs, experience, semantic_queries
        }
        """

    @abstractmethod
    async def chat(
        self,
        question: str,
        candidates_context: list[dict],
        conversation_history: list[dict],
    ) -> ProviderResponse:
        """
        Answer a natural language question about the ranked candidates.
        Output: ProviderResponse where content = {answer: str, citations: list[str]}
        """

    @abstractmethod
    async def executive_summary(self, top_candidates: list[dict], role_title: str) -> ProviderResponse:
        """
        Generate a 300-word executive hiring brief for the top candidates.
        Output: ProviderResponse where content = {summary: str, key_points: list[str]}
        """

    @abstractmethod
    async def explain_score(
        self,
        candidate: dict,
        jd_context: str,
        score: float,
    ) -> ProviderResponse:
        """
        Explain in 4-6 sentences why this candidate received this score.
        Output: ProviderResponse where content = {explanation: str}
        """

    @abstractmethod
    async def compare_candidates(
        self,
        candidates: list[dict],
        role_context: str,
    ) -> ProviderResponse:
        """
        Compare 2-3 candidates and produce a structured comparison.
        Output: ProviderResponse where content = {
            strengths: dict[id, str],
            key_differentiator: str,
            recommendation: str,
            risks: dict[id, str]
        }
        """

    @abstractmethod
    async def skill_gap_analysis(
        self,
        candidate: dict,
        jd_requirements: dict,
    ) -> ProviderResponse:
        """
        Analyze the gap between a candidate's skills and JD requirements.
        Output: ProviderResponse where content = {
            matched_skills: list, missing_skills: list,
            gap_summary: str, recommendation: str
        }
        """

    # ── Shared utilities ─────────────────────────────────────────────────────

    def _estimate_cost(self, tokens: int, model: str) -> float:
        """
        Rough cost estimate per token for known models.
        Uses conservative (higher) estimates for safety.
        """
        COST_PER_1K = {
            # Gemini
            "gemini-1.5-flash": 0.000075,
            "gemini-1.5-pro": 0.00125,
            "gemini-2.0-flash": 0.0001,
            # OpenAI
            "gpt-4o-mini": 0.000150,
            "gpt-4o": 0.005,
            "gpt-3.5-turbo": 0.0005,
        }
        per_1k = COST_PER_1K.get(model, 0.001)
        return round((tokens / 1000) * per_1k, 6)
