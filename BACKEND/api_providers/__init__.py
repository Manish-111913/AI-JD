"""
api_providers/__init__.py
Exports provider factory for easy access.
"""
from .base_provider import BaseProvider, ProviderResponse
from .gemini_provider import GeminiProvider
from .openai_provider import OpenAIProvider


def get_provider(provider_name: str, api_key: str, model_config: dict | None = None) -> BaseProvider:
    """
    Factory function — returns the appropriate provider instance.
    Raises ValueError for unknown providers.
    """
    name = provider_name.lower().strip()
    cfg = model_config or {}
    if name == "gemini":
        return GeminiProvider(api_key=api_key, model_config=cfg)
    elif name == "openai":
        return OpenAIProvider(api_key=api_key, model_config=cfg)
    else:
        raise ValueError(f"Unknown provider: {provider_name!r}. Supported: gemini, openai")


__all__ = ["BaseProvider", "ProviderResponse", "GeminiProvider", "OpenAIProvider", "get_provider"]
