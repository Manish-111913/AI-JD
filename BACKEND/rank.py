#!/usr/bin/env python3
"""
rank.py — Competition Entry Point
python rank.py --candidates ./candidates.jsonl --out ./submission.csv

Pipeline (PDF Section 2.1 — correct order):
  Stage 1:  Load, validate & normalise candidates
  Stage 2:  Title pre-filter  (lookup table, ~2s, skip if < SMALL_DATASET_THRESHOLD)
  Stage 3:  Bi-encoder semantic similarity (vectorised cosine, 3 JD queries)
  Stage 4:  Feature extraction on ALL eligible candidates
              (skill, career, experience, location, education, behavioral, platform)
  Stage 5:  Honeypot detection on ALL eligible candidates
  Stage 6:  Composite scoring on ALL eligible candidates
  Stage 7:  Sort ALL by composite score (descending)
  Stage 8:  Dynamic shortlist  (compute_dynamic_shortlist_size — no magic numbers)
  Stage 9:  Cross-encoder re-ranking (ms-marco-MiniLM-L-6-v2, batch=32)
  Stage 10: Final Top-100, reasoning, export submission.csv

CRITICAL RULE: cross-encoder NEVER runs before shortlisting.
NO NETWORK CALLS. All models loaded locally.
Pre-computation: python setup.py (runs once to download models + pre-compute embeddings)
"""

from __future__ import annotations

import argparse
import csv
import logging
import sys
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Redrob Candidate Ranker — Competition Mode")
    parser.add_argument("--candidates", required=True, help="Path to candidates.jsonl or candidates.jsonl.gz")
    parser.add_argument("--out", required=True, help="Output CSV path (e.g. submission.csv)")
    parser.add_argument("--top-k", type=int, default=None,
                        help=f"Number of candidates in output (default: FINAL_TOP_K from config)")
    parser.add_argument("--shortlist", type=int, default=None,
                        help="Override CE shortlist cap (default: dynamic from compute_dynamic_shortlist_size)")
    parser.add_argument("--no-ce", action="store_true", help="Skip cross-encoder (faster, lower quality)")
    parser.add_argument("--embeddings", default=None, help="Path to pre-computed embeddings .npy file")
    parser.add_argument("--features-cache", default=None, help="Path to features cache pickle file (optional)")
    args = parser.parse_args()

    # ── Import all config values — no magic numbers in business logic ─────────
    from config import (
        TITLE_GATE_THRESHOLD,
        SMALL_DATASET_THRESHOLD,
        FINAL_TOP_K,
        EMBEDDING_BATCH_SIZE,
        CE_WEIGHT,
        ALGO_WEIGHT,
        compute_dynamic_shortlist_size,
    )

    top_k = args.top_k if args.top_k is not None else FINAL_TOP_K

    candidates_path = Path(args.candidates)
    if not candidates_path.exists():
        logger.error(f"Candidates file not found: {candidates_path}")
        sys.exit(1)

    start_time = time.time()

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 1 — Load, Validate & Normalise
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info("=== Stage 1: Loading, validating & normalising candidates ===")
    from data_loader import stream_candidates, build_candidate_text, build_ce_passage
    candidates = []
    for cand in stream_candidates(candidates_path):
        candidates.append(cand)
        if len(candidates) % 10_000 == 0:
            logger.info(f"  Loaded {len(candidates):,} candidates…")
    logger.info(f"✓ Loaded {len(candidates):,} validated candidates in {time.time() - start_time:.1f}s")

    if not candidates:
        logger.error("No valid candidates loaded. Exiting.")
        sys.exit(1)

    n_total = len(candidates)

    # Initialise feature cache
    from feature_cache import FeatureCache
    cache = FeatureCache(args.features_cache)

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 2 — Title Pre-Filter  (fast lookup, skip if n < SMALL_DATASET_THRESHOLD)
    # PDF Section 2.3: skip title filter for small inputs — rank everything.
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info("=== Stage 2: Title pre-filter ===")
    t2 = time.time()
    from career_analyzer import compute_title_relevance_score

    skip_title_filter = n_total < SMALL_DATASET_THRESHOLD

    for c in candidates:
        if skip_title_filter:
            c["_title_score"] = 0.50  # neutral — all pass
        else:
            c["_title_score"] = compute_title_relevance_score(c["current_title"])

    if skip_title_filter:
        eligible_candidates = list(candidates)
        logger.info(
            f"✓ Title filter SKIPPED (n={n_total} < threshold={SMALL_DATASET_THRESHOLD}). "
            f"All {n_total} candidates eligible. {time.time() - t2:.1f}s"
        )
    else:
        fast_filtered = sum(1 for c in candidates if c["_title_score"] < TITLE_GATE_THRESHOLD)
        eligible_candidates = [c for c in candidates if c["_title_score"] >= TITLE_GATE_THRESHOLD]
        logger.info(
            f"✓ Title pre-filter: {fast_filtered:,} eliminated, "
            f"{len(eligible_candidates):,} eligible. {time.time() - t2:.1f}s"
        )

    if not eligible_candidates:
        logger.warning("No candidates passed title filter. Using all candidates.")
        eligible_candidates = list(candidates)

    n_eligible = len(eligible_candidates)

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 3 — Bi-Encoder Semantic Similarity
    # Vectorised cosine: 3 JD query vectors × ALL eligible candidates.
    # PDF Section 2.2: fast first-pass — scores ALL title-passing candidates.
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info("=== Stage 3: Bi-encoder semantic similarity ===")
    t3 = time.time()
    semantic_scores_map: dict[str, float] = {}

    if args.embeddings and Path(args.embeddings).exists():
        # Load pre-computed embeddings (setup.py path)
        import numpy as np
        from embedding_engine import load_embeddings, compute_semantic_scores_vectorized
        logger.info(f"Loading pre-computed embeddings from {args.embeddings}")
        embeddings = load_embeddings(Path(args.embeddings))

        # If embeddings cover all candidates (not just eligible), index correctly
        if embeddings.shape[0] == n_total:
            eligible_indices = [
                i for i, c in enumerate(candidates)
                if c["_title_score"] >= TITLE_GATE_THRESHOLD or skip_title_filter
            ]
            eligible_emb = embeddings[eligible_indices]
        else:
            eligible_emb = embeddings

        sem_arr = compute_semantic_scores_vectorized(eligible_emb)
        for i, c in enumerate(eligible_candidates):
            semantic_scores_map[c["candidate_id"]] = float(sem_arr[i])

    else:
        # Online embedding — encode only eligible candidates for efficiency
        try:
            import numpy as np
            from embedding_engine import embed_candidates_batch, compute_semantic_scores_vectorized
            logger.info(
                f"Embedding {n_eligible:,} eligible candidates "
                f"(batch_size={EMBEDDING_BATCH_SIZE})…"
            )
            texts = [build_candidate_text(c) for c in eligible_candidates]
            all_embeddings = []

            for i in range(0, len(texts), EMBEDDING_BATCH_SIZE):
                batch = texts[i : i + EMBEDDING_BATCH_SIZE]
                emb = embed_candidates_batch(batch, batch_size=EMBEDDING_BATCH_SIZE)
                all_embeddings.append(emb)
                if (i // EMBEDDING_BATCH_SIZE) % 50 == 0:
                    logger.info(f"  Embedded {i + len(batch):,}/{len(texts):,} candidates")

            all_embeddings_np = np.vstack(all_embeddings)
            sem_arr = compute_semantic_scores_vectorized(all_embeddings_np)
            for i, c in enumerate(eligible_candidates):
                semantic_scores_map[c["candidate_id"]] = float(sem_arr[i])

        except Exception as e:
            logger.warning(f"Embedding failed: {e}. Using zero semantic scores.")
            semantic_scores_map = {c["candidate_id"]: 0.0 for c in eligible_candidates}

    logger.info(f"✓ Semantic scoring done in {time.time() - t3:.1f}s")

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 4 — Honeypot Detection on ALL eligible candidates
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info(f"=== Stage 4: Honeypot detection ({n_eligible:,} candidates) ===")
    t4 = time.time()
    from honeypot_detector import detect_honeypot
    from config import HONEYPOT_CONFIDENCE_THRESHOLDS

    honeypot_results: dict[str, dict] = {}
    for c in eligible_candidates:
        cid = c["candidate_id"]
        cached_feat = cache.get(cid)
        if cached_feat and "honeypot_confidence" in cached_feat:
            honeypot_results[cid] = {
                "honeypot_confidence":     cached_feat["honeypot_confidence"],
                "honeypot_evidence_points": cached_feat.get("honeypot_evidence_points", 0),
                "honeypot_flags":          cached_feat.get("honeypot_flags", []),
                "honeypot_penalty":        cached_feat.get("honeypot_penalty", 1.0),
                "honeypot_tier":           cached_feat.get("honeypot_tier", "clean"),
                "risk_score":              cached_feat.get("risk_score", cached_feat["honeypot_confidence"]),
                "triggered_rules":         cached_feat.get("triggered_rules", []),
                "explanation":             cached_feat.get("explanation", ""),
            }
        else:
            honeypot_results[cid] = detect_honeypot(c)

    suspicious_thresh = HONEYPOT_CONFIDENCE_THRESHOLDS["suspicious"]
    flagged = sum(
        1 for hp in honeypot_results.values()
        if hp["honeypot_confidence"] > suspicious_thresh
    )
    logger.info(f"✓ Honeypot detection: {flagged} flagged in {time.time() - t4:.3f}s")

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 5 — Feature Extraction + Composite Scoring on ALL eligible candidates
    # PDF Section 2.2 / Module 10.2:
    #   Every candidate that passes title filter gets FULL scoring before any sort.
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info(f"=== Stage 5: Feature extraction + composite scoring ({n_eligible:,} candidates) ===")
    t5 = time.time()
    from scoring_engine import compute_first_pass_score

    all_features: list[tuple[dict, dict]] = []
    cache_updated = False

    for c in eligible_candidates:
        cid = c["candidate_id"]
        sem = semantic_scores_map.get(cid, 0.0)

        feat = cache.get(cid)
        if feat is None:
            feat = compute_first_pass_score(c, semantic_score=sem)
            hp = honeypot_results.get(cid, {})
            feat.update(hp)
            cache.set(cid, feat)
            cache_updated = True

        all_features.append((c, feat))

    if cache_updated:
        cache.save()

    logger.info(f"✓ Composite scoring done in {time.time() - t5:.3f}s ({n_eligible:,} candidates scored)")

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 6 — Sort ALL eligible candidates by composite score (descending)
    # PDF Section 2.2 Stage 2C: sort AFTER scoring, not before.
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info("=== Stage 6: Sorting all candidates by composite score ===")
    t6 = time.time()
    all_features.sort(key=lambda x: x[1]["first_pass_score"], reverse=True)
    logger.info(f"✓ Sort done in {time.time() - t6:.3f}s")

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 7 — Dynamic Shortlist Selection
    # PDF Section 2.4: shortlist size adapts to input — no magic numbers.
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info("=== Stage 7: Dynamic shortlist selection ===")
    t7 = time.time()

    if args.shortlist is not None:
        # User-provided override cap — still respect it but don't exceed input size
        shortlist_n = min(args.shortlist, n_eligible)
        logger.info(f"  Using user-specified shortlist cap: {shortlist_n}")
    else:
        shortlist_n = compute_dynamic_shortlist_size(n_eligible)
        logger.info(
            f"  Dynamic shortlist: n_eligible={n_eligible} → shortlist_n={shortlist_n} "
            f"(compute_dynamic_shortlist_size)"
        )

    shortlisted = all_features[:shortlist_n]
    logger.info(
        f"✓ Shortlisted top {len(shortlisted)} candidates for CE re-ranking "
        f"in {time.time() - t7:.3f}s"
    )

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 8 — Cross-Encoder Re-Ranking (top-N shortlist only)
    # PDF Section 2.2 Stage 3 / Section 2.5:
    #   Local ms-marco-MiniLM-L-6-v2, batch_size=32.
    #   NEVER runs before shortlisting.
    #   Blend: ALGO_WEIGHT * composite + CE_WEIGHT * ce_score
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info(f"=== Stage 8: Cross-encoder re-ranking ({len(shortlisted)} pairs) ===")
    t8 = time.time()

    if not args.no_ce:
        try:
            from cross_encoder_reranker import rerank_with_cross_encoder, is_ce_available

            if is_ce_available():
                shortlisted_candidates = [c for c, _ in shortlisted]
                passage_texts = [build_ce_passage(c) for c in shortlisted_candidates]
                shortlisted_flat = [{**f, "_candidate": c} for c, f in shortlisted]

                reranked = rerank_with_cross_encoder(shortlisted_flat, passage_texts)

                for i, (c, feat) in enumerate(shortlisted):
                    feat["ce_score"] = reranked[i].get("ce_score", 0.0)
                    feat["blended_score"] = reranked[i].get("blended_score", feat["first_pass_score"])

                logger.info(f"✓ CE re-ranking done in {time.time() - t8:.1f}s")
            else:
                logger.warning("CE model not available. Using algorithmic scores only.")
                for c, feat in shortlisted:
                    feat["ce_score"] = 0.0
                    feat["blended_score"] = feat["first_pass_score"]

        except Exception as e:
            logger.warning(f"CE re-ranking failed: {e}. Using algorithmic scores.")
            for c, feat in shortlisted:
                feat["ce_score"] = 0.0
                feat["blended_score"] = feat["first_pass_score"]
    else:
        logger.info("Skipping cross-encoder (--no-ce flag set)")
        for c, feat in shortlisted:
            feat["ce_score"] = 0.0
            feat["blended_score"] = feat["first_pass_score"]

    # Candidates outside the shortlist get a ceiling penalty (PDF rule)
    shortlist_ids = {c["candidate_id"] for c, _ in shortlisted}
    for c, feat in all_features:
        cid = c["candidate_id"]
        if cid not in shortlist_ids:
            feat["ce_score"] = 0.0
            feat["blended_score"] = feat["first_pass_score"] * ALGO_WEIGHT  # ceiling

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 9 — Final Ranking: sort by blended score, take top_k
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info("=== Stage 9: Final ranking & tie-break ===")

    # Sort by blended_score descending; tie-break by candidate_id ascending
    all_features.sort(key=lambda x: (-x[1].get("blended_score", 0.0), x[0]["candidate_id"]))
    top_k_results = all_features[:top_k]

    # Normalise so rank-1 = 1.0000
    max_score = max(f.get("blended_score", 0.0) for _, f in top_k_results) if top_k_results else 1.0
    max_score = max(max_score, 1e-6)

    # ═══════════════════════════════════════════════════════════════════════════
    # STAGE 10 — Generate Reasoning & Export submission.csv
    # ═══════════════════════════════════════════════════════════════════════════
    logger.info("=== Stage 10: Generating reasoning & writing submission.csv ===")
    from reasoning_generator import build_reasoning

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow(["candidate_id", "rank", "score", "reasoning"])
        for rank_num, (c, feat) in enumerate(top_k_results, start=1):
            blended = feat.get("blended_score", 0.0)
            normalized = blended / max_score
            reasoning = build_reasoning(c, feat, rank_num)
            writer.writerow([
                c["candidate_id"],
                rank_num,
                f"{normalized:.4f}",
                reasoning,
            ])

    total_time = round(time.time() - start_time, 1)
    logger.info(f"✓ Submission written to {out_path} ({len(top_k_results)} rows)")
    logger.info(
        f"✓ Pipeline stats: input={n_total} | eligible={n_eligible} | "
        f"shortlisted={len(shortlisted)} | final={len(top_k_results)}"
    )
    logger.info(f"✓ Total runtime: {total_time}s")
    logger.info("Done. Validate with: python validate_submission.py " + str(out_path))


if __name__ == "__main__":
    main()
