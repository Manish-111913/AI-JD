"""
feature_cache.py — Advanced Feature Caching Module
Saves and loads candidate features to/from features_cache.pkl.
"""

from __future__ import annotations

import logging
import pickle
from pathlib import Path
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class FeatureCache:
    """
    Advanced Feature Cache.
    Reads and writes candidate scores and metadata to a localized pickle cache.
    """
    def __init__(self, cache_path: Optional[str | Path] = None):
        if cache_path:
            self.cache_path = Path(cache_path)
        else:
            self.cache_path = Path(__file__).parent / "features_cache.pkl"
        self._cache: Dict[str, dict] = {}
        self.load()

    def load(self) -> None:
        """Load cache dictionary from disk."""
        if self.cache_path.exists():
            try:
                with open(self.cache_path, "rb") as f:
                    self._cache = pickle.load(f)
                logger.info(f"Loaded {len(self._cache):,} candidate features from cache: {self.cache_path}")
            except Exception as e:
                logger.warning(f"Failed to load feature cache: {e}. Starting fresh.")
                self._cache = {}
        else:
            logger.info("No feature cache file found. Starting fresh.")
            self._cache = {}

    def save(self) -> None:
        """Save current cache dictionary to disk."""
        try:
            self.cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_path, "wb") as f:
                pickle.dump(self._cache, f)
            logger.info(f"Saved {len(self._cache):,} candidate features to cache: {self.cache_path}")
        except Exception as e:
            logger.error(f"Failed to save feature cache: {e}")

    def get(self, candidate_id: str) -> Optional[dict]:
        """Retrieve features for candidate_id from cache."""
        return self._cache.get(candidate_id)

    def set(self, candidate_id: str, features: dict) -> None:
        """Store features for candidate_id in cache."""
        self._cache[candidate_id] = features

    def has(self, candidate_id: str) -> bool:
        """Check if candidate_id is cached."""
        return candidate_id in self._cache

    def clear(self) -> None:
        """Clear cache state in memory and on disk."""
        self._cache.clear()
        if self.cache_path.exists():
            try:
                self.cache_path.unlink()
                logger.info(f"Cleared feature cache file: {self.cache_path}")
            except Exception as e:
                logger.error(f"Failed to delete feature cache file: {e}")
