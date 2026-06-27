"""
api_providers/openai_provider.py
OpenAI implementation of BaseProvider.
Uses openai SDK (v1.x).
Models: gpt-4o-mini (reasoning/chat), gpt-4o (JD parsing)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

from .base_provider import BaseProvider, ProviderResponse
from .prompt_builders import (
    REASONING_SYSTEM, build_reasoning_prompt,
    JD_PARSE_SYSTEM, build_jd_parse_prompt,
    build_chat_system, build_chat_prompt,
    EXECUTIVE_SUMMARY_SYSTEM, build_executive_summary_prompt,
    EXPLAIN_SCORE_SYSTEM, build_explain_score_prompt,
    COMPARE_SYSTEM, build_compare_prompt,
    SKILL_GAP_SYSTEM, build_skill_gap_prompt,
)

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseProvider):
    """OpenAI LLM provider."""

    DEFAULT_REASONING_MODEL = "gpt-4o-mini"
    DEFAULT_JD_MODEL = "gpt-4o"
    DEFAULT_CHAT_MODEL = "gpt-4o-mini"

    def __init__(self, api_key: str, model_config: dict):
        super().__init__(api_key, model_config)
        self._client = None
        self._init_error = None
        self._try_init()

    def _try_init(self):
        """Lazily initialize the OpenAI client."""
        try:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=self.api_key)
        except ImportError:
            self._init_error = "openai package not installed. Run: pip install openai"
            logger.warning(self._init_error)
        except Exception as e:
            self._init_error = str(e)
            logger.warning(f"OpenAI init failed: {e}")

    def _extract_json(self, raw_text: str) -> Any:
        """Extract JSON from raw text, handling markdown code blocks."""
        text = raw_text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
        text = text.strip()
        return json.loads(text)

    async def _call_with_retry(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_retries: int = 3,
        response_format: str = "json_object",
    ) -> tuple[str, int]:
        """
        Make an OpenAI API call with exponential backoff retry.
        Returns (response_text, tokens_used).
        """
        if not self._client:
            raise RuntimeError(self._init_error or "OpenAI not initialized")

        last_error = None
        for attempt in range(max_retries):
            try:
                kwargs = {
                    "model": model,
                    "temperature": temperature,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                }
                # JSON mode (available for gpt-4o and gpt-4o-mini)
                if response_format == "json_object":
                    kwargs["response_format"] = {"type": "json_object"}

                response = await self._client.chat.completions.create(**kwargs)
                text = response.choices[0].message.content or ""
                tokens = response.usage.total_tokens if response.usage else 0
                return text, tokens

            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                if "429" in err_str or "rate" in err_str or "quota" in err_str:
                    wait_s = 2 ** attempt
                    logger.warning(f"OpenAI rate limit (attempt {attempt+1}). Waiting {wait_s}s...")
                    await asyncio.sleep(wait_s)
                elif "400" in err_str and attempt == 0:
                    # Bad request — try without JSON mode
                    response_format = "text"
                    await asyncio.sleep(0.3)
                else:
                    raise

        raise RuntimeError(f"OpenAI API failed after {max_retries} attempts: {last_error}")

    # ── Interface implementations ─────────────────────────────────────────────

    async def validate_connection(self) -> ProviderResponse:
        if not self._client:
            return ProviderResponse(
                success=False,
                error=self._init_error or "OpenAI not initialized",
            )
        try:
            text, tokens = await self._call_with_retry(
                model=self.DEFAULT_CHAT_MODEL,
                system_prompt="You are a helpful assistant.",
                user_prompt='Return exactly: {"status": "ok"}',
                temperature=0.0,
                max_retries=2,
            )
            data = self._extract_json(text)
            return ProviderResponse(
                success=data.get("status") == "ok",
                content=data,
                tokens_used=tokens,
                model_used=self.DEFAULT_CHAT_MODEL,
                cost_usd=self._estimate_cost(tokens, self.DEFAULT_CHAT_MODEL),
            )
        except Exception as e:
            return ProviderResponse(success=False, error=str(e))

    async def generate_reasoning(
        self, candidates_batch: list[dict], role_context: str
    ) -> ProviderResponse:
        model = self.model_config.get("reasoning_model", self.DEFAULT_REASONING_MODEL)
        try:
            user_prompt = build_reasoning_prompt(candidates_batch, role_context)
            raw, tokens = await self._call_with_retry(
                model=model,
                system_prompt=REASONING_SYSTEM,
                user_prompt=user_prompt + '\nReturn a JSON object with key "results" containing the array.',
                temperature=0.4,
            )
            parsed = self._extract_json(raw)
            # Handle both direct array and wrapped object
            content = parsed.get("results", parsed) if isinstance(parsed, dict) else parsed
            if not isinstance(content, list):
                raise ValueError("Expected JSON array")
            return ProviderResponse(
                success=True,
                content=content,
                raw_text=raw,
                tokens_used=tokens,
                model_used=model,
                cost_usd=self._estimate_cost(tokens, model),
            )
        except Exception as e:
            logger.error(f"OpenAI reasoning failed: {e}")
            return ProviderResponse(success=False, error=str(e), fallback_used=True)

    async def parse_jd(self, jd_text: str) -> ProviderResponse:
        model = self.model_config.get("jd_parse_model", self.DEFAULT_JD_MODEL)
        try:
            user_prompt = build_jd_parse_prompt(jd_text)
            raw, tokens = await self._call_with_retry(
                model=model,
                system_prompt=JD_PARSE_SYSTEM,
                user_prompt=user_prompt,
                temperature=0.1,
            )
            content = self._extract_json(raw)
            return ProviderResponse(
                success=True,
                content=content,
                raw_text=raw,
                tokens_used=tokens,
                model_used=model,
                cost_usd=self._estimate_cost(tokens, model),
            )
        except Exception as e:
            logger.error(f"OpenAI JD parse failed: {e}")
            return ProviderResponse(success=False, error=str(e), fallback_used=True)

    async def chat(
        self,
        question: str,
        candidates_context: list[dict],
        conversation_history: list[dict],
    ) -> ProviderResponse:
        model = self.model_config.get("chat_model", self.DEFAULT_CHAT_MODEL)
        try:
            system_msg, user_msg = build_chat_prompt(question, candidates_context, conversation_history)
            raw, tokens = await self._call_with_retry(
                model=model,
                system_prompt=system_msg,
                user_prompt=user_msg + '\nReturn JSON: {"answer": "...", "citations": ["CAND_XXXXXXX"]}',
                temperature=0.5,
            )
            content = self._extract_json(raw)
            return ProviderResponse(
                success=True,
                content=content,
                raw_text=raw,
                tokens_used=tokens,
                model_used=model,
                cost_usd=self._estimate_cost(tokens, model),
            )
        except Exception as e:
            logger.error(f"OpenAI chat failed: {e}")
            return ProviderResponse(success=False, error=str(e))

    async def executive_summary(self, top_candidates: list[dict], role_title: str) -> ProviderResponse:
        model = self.model_config.get("reasoning_model", self.DEFAULT_REASONING_MODEL)
        try:
            user_prompt = build_executive_summary_prompt(top_candidates, role_title)
            raw, tokens = await self._call_with_retry(
                model=model,
                system_prompt=EXECUTIVE_SUMMARY_SYSTEM,
                user_prompt=user_prompt,
                temperature=0.6,
            )
            content = self._extract_json(raw)
            return ProviderResponse(
                success=True,
                content=content,
                raw_text=raw,
                tokens_used=tokens,
                model_used=model,
                cost_usd=self._estimate_cost(tokens, model),
            )
        except Exception as e:
            logger.error(f"OpenAI executive summary failed: {e}")
            return ProviderResponse(success=False, error=str(e))

    async def explain_score(
        self, candidate: dict, jd_context: str, score: float
    ) -> ProviderResponse:
        model = self.model_config.get("reasoning_model", self.DEFAULT_REASONING_MODEL)
        try:
            user_prompt = build_explain_score_prompt(candidate, jd_context, score)
            raw, tokens = await self._call_with_retry(
                model=model,
                system_prompt=EXPLAIN_SCORE_SYSTEM,
                user_prompt=user_prompt,
                temperature=0.3,
            )
            content = self._extract_json(raw)
            return ProviderResponse(
                success=True,
                content=content,
                raw_text=raw,
                tokens_used=tokens,
                model_used=model,
                cost_usd=self._estimate_cost(tokens, model),
            )
        except Exception as e:
            logger.error(f"OpenAI explain score failed: {e}")
            return ProviderResponse(success=False, error=str(e))

    async def compare_candidates(
        self, candidates: list[dict], role_context: str
    ) -> ProviderResponse:
        model = self.model_config.get("reasoning_model", self.DEFAULT_REASONING_MODEL)
        try:
            user_prompt = build_compare_prompt(candidates, role_context)
            raw, tokens = await self._call_with_retry(
                model=model,
                system_prompt=COMPARE_SYSTEM,
                user_prompt=user_prompt,
                temperature=0.4,
            )
            content = self._extract_json(raw)
            return ProviderResponse(
                success=True,
                content=content,
                raw_text=raw,
                tokens_used=tokens,
                model_used=model,
                cost_usd=self._estimate_cost(tokens, model),
            )
        except Exception as e:
            logger.error(f"OpenAI compare failed: {e}")
            return ProviderResponse(success=False, error=str(e))

    async def skill_gap_analysis(
        self, candidate: dict, jd_requirements: dict
    ) -> ProviderResponse:
        model = self.model_config.get("reasoning_model", self.DEFAULT_REASONING_MODEL)
        try:
            user_prompt = build_skill_gap_prompt(candidate, jd_requirements)
            raw, tokens = await self._call_with_retry(
                model=model,
                system_prompt=SKILL_GAP_SYSTEM,
                user_prompt=user_prompt,
                temperature=0.2,
            )
            content = self._extract_json(raw)
            return ProviderResponse(
                success=True,
                content=content,
                raw_text=raw,
                tokens_used=tokens,
                model_used=model,
                cost_usd=self._estimate_cost(tokens, model),
            )
        except Exception as e:
            logger.error(f"OpenAI skill gap failed: {e}")
            return ProviderResponse(success=False, error=str(e))
