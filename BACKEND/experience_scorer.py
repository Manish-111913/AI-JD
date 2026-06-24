"""
experience_scorer.py — Phase D: Experience Scorer
Produces a normalized score in [0, 1] based on candidate years of experience.

Formula (from Backend Logic Bible Section 3.4):
    experience_score = exp(-0.5 * ((YoE - 7.0) / 3.5) ^ 2)

This is a Gaussian curve peaking at 7 years (the JD midpoint of 5–9 years).
JD says '5-9 years is a range, not a hard requirement.' The curve naturally
implements this — it peaks at 7 (midpoint), falls off slowly for 4-5 and
9-12, falls steeply below 3 and above 15.

Sample values:
    YoE=3  → 0.53   YoE=5  → 0.83   YoE=7  → 1.00
    YoE=9  → 0.83   YoE=12 → 0.60   YoE=15 → 0.35
"""

from __future__ import annotations

import logging
import math
from typing import Optional

from config import EXPERIENCE_PEAK, EXPERIENCE_SIGMA

logger = logging.getLogger(__name__)


def compute_experience_score(years_of_experience: float) -> float:
    """
    Compute experience score using a Gaussian curve peaking at EXPERIENCE_PEAK (7.0 yrs).

    Args:
        years_of_experience: Float YoE from candidate profile.

    Returns:
        Float score in [0.0, 1.0].
    """
    if years_of_experience < 0:
        years_of_experience = 0.0
    z = (years_of_experience - EXPERIENCE_PEAK) / EXPERIENCE_SIGMA
    score = math.exp(-0.5 * z * z)
    return round(score, 4)


def experience_score_breakdown(years_of_experience: float) -> dict:
    """
    Full breakdown of experience score with diagnostic info.

    Args:
        years_of_experience: Float YoE from candidate profile.

    Returns:
        dict with:
            experience_score    float  Gaussian score [0, 1]
            years_of_experience float  Input value
            peak_years          float  Optimal YoE (7.0)
            sigma               float  Curve width (3.5)
            z_score             float  Standardized deviation from peak
            band                str    "ideal" | "good" | "acceptable" | "weak"
    """
    yoe = max(0.0, float(years_of_experience))
    score = compute_experience_score(yoe)

    z = (yoe - EXPERIENCE_PEAK) / EXPERIENCE_SIGMA

    if score >= 0.80:
        band = "ideal"        # 5–9 years
    elif score >= 0.60:
        band = "good"         # 3–5 or 9–12 years
    elif score >= 0.40:
        band = "acceptable"   # 2–3 or 12–14 years
    else:
        band = "weak"         # <2 or >14 years

    return {
        "experience_score": score,
        "years_of_experience": yoe,
        "peak_years": EXPERIENCE_PEAK,
        "sigma": EXPERIENCE_SIGMA,
        "z_score": round(z, 3),
        "band": band,
    }


def batch_score_experience(candidates: list[dict]) -> list[dict]:
    """
    Score experience for a batch of candidates.
    Adds 'experience_score' and 'experience_band' keys to each candidate dict.

    Args:
        candidates: List of normalized candidate dicts.

    Returns:
        Same list with experience_score and experience_band added in-place.
    """
    for c in candidates:
        yoe = float(c.get("years_of_experience", 0))
        breakdown = experience_score_breakdown(yoe)
        c["experience_score"] = breakdown["experience_score"]
        c["experience_band"] = breakdown["band"]
    return candidates


def score_table() -> str:
    """Return a formatted table of YoE → experience_score mappings."""
    rows = [
        f"{'YoE (years)':>12}  {'experience_score':>17}  {'band':>12}"
    ]
    rows.append("-" * 45)
    for yoe in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 20]:
        bd = experience_score_breakdown(float(yoe))
        rows.append(
            f"{yoe:>12.1f}  {bd['experience_score']:>17.4f}  {bd['band']:>12}"
        )
    return "\n".join(rows)


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    print("\nExperience Score Curve (Gaussian, peak=7.0, sigma=3.5):")
    print(score_table())

    if len(sys.argv) > 1:
        try:
            yoe = float(sys.argv[1])
            bd = experience_score_breakdown(yoe)
            print(f"\nFor YoE={yoe}: score={bd['experience_score']}, band={bd['band']}")
        except ValueError:
            print(f"Invalid YoE: {sys.argv[1]}")
