#!/usr/bin/env python3
"""
rank.py — Competition Entry Point
python rank.py --candidates ./candidates.jsonl --out ./submission.csv

NO NETWORK CALLS. All models loaded locally.
Pre-computation required: python setup.py (runs once to download models + pre-compute embeddings)
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
    parser.add_argument("--top-k", type=int, default=100, help="Number of candidates to include in output")
    parser.add_argument("--shortlist", type=int, default=300, help="Number of candidates for CE re-ranking")
    parser.add_argument("--no-ce", action="store_true", help="Skip cross-encoder (faster, lower quality)")
    parser.add_argument("--embeddings", default=None, help="Path to pre-computed embeddings .npy file")
    args = parser.parse_args()

    candidates_path = Path(args.candidates)
    if not candidates_path.exists():
        logger.error(f"Candidates file not found: {candidates_path}")
        sys.exit(1)

    start_time = time.time()

    # ── STAGE 1: Load & Normalize ─────────────────────────────────────────────
    logger.info("=== Stage 1: Loading & normalizing candidates ===")
    from data_loader import stream_candidates, build_candidate_text, build_ce_passage
    candidates = []
    for cand in stream_candidates(candidates_path):
        candidates.append(cand)
        if len(candidates) % 10000 == 0:
            logger.info(f"  Loaded {len(candidates):,} candidates…")
    logger.info(f"✓ Loaded {len(candidates):,} candidates in {time.time() - start_time:.1f}s")

    # ── STAGE 2: Title Pre-filter (fast) ─────────────────────────────────────
    logger.info("=== Stage 2: Title pre-filter ===")
    t2 = time.time()
    from career_analyzer import compute_title_relevance_score
    from config import TITLE_GATE_THRESHOLD

    title_scores = {}
    for c in candidates:
        title_scores[c["candidate_id"]] = compute_title_relevance_score(c["current_title"])

    fast_filtered = sum(1 for ts in title_scores.values() if ts < TITLE_GATE_THRESHOLD)
    logger.info(f"✓ Title pre-filter: {fast_filtered:,} fast-eliminated in {time.time() - t2:.1f}s")

    # ── STAGE 3: Honeypot Detection ───────────────────────────────────────────
    logger.info("=== Stage 3: Honeypot detection ===")
    t3 = time.time()
    from honeypot_detector import detect_honeypot
    honeypot_results = {c["candidate_id"]: detect_honeypot(c) for c in candidates}
    flagged = sum(1 for hp in honeypot_results.values() if hp["honeypot_confidence"] > 0.55)
    logger.info(f"✓ Honeypot detection: {flagged} flagged in {time.time() - t3:.1f}s")

    # ── STAGE 4: Semantic Embeddings ──────────────────────────────────────────
    logger.info("=== Stage 4: Semantic embedding ===")
    t4 = time.time()
    semantic_scores_map = {}

    if args.embeddings and Path(args.embeddings).exists():
        # Load pre-computed embeddings
        import numpy as np
        from embedding_engine import load_embeddings, compute_semantic_scores_vectorized
        logger.info(f"Loading pre-computed embeddings from {args.embeddings}")
        embeddings = load_embeddings(Path(args.embeddings))
        sem_arr = compute_semantic_scores_vectorized(embeddings)
        for i, c in enumerate(candidates):
            semantic_scores_map[c["candidate_id"]] = float(sem_arr[i])
    else:
        # Embed all candidates
        try:
            import numpy as np
            from embedding_engine import embed_candidates_batch, compute_semantic_scores_vectorized
            logger.info("Embedding all candidates (this takes ~5-10 minutes for 100K)…")

            batch_size = 256
            all_embeddings = []
            texts = [build_candidate_text(c) for c in candidates]

            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                emb = embed_candidates_batch(batch, batch_size=batch_size)
                all_embeddings.append(emb)
                if (i // batch_size) % 50 == 0:
                    logger.info(f"  Embedded {i + len(batch):,}/{len(texts):,} candidates")

            all_embeddings_np = np.vstack(all_embeddings)
            sem_arr = compute_semantic_scores_vectorized(all_embeddings_np)
            for i, c in enumerate(candidates):
                semantic_scores_map[c["candidate_id"]] = float(sem_arr[i])

        except Exception as e:
            logger.warning(f"Embedding failed: {e}. Using zero semantic scores.")
            semantic_scores_map = {c["candidate_id"]: 0.0 for c in candidates}

    logger.info(f"✓ Semantic scoring done in {time.time() - t4:.1f}s")

    # ── STAGES 5-7: First-Pass Composite Scoring ──────────────────────────────
    logger.info("=== Stages 5-7: Skill / Career / Behavioral / First-pass scoring ===")
    t5 = time.time()
    from scoring_engine import compute_first_pass_score

    all_features = []
    for c in candidates:
        sem = semantic_scores_map.get(c["candidate_id"], 0.0)
        feat = compute_first_pass_score(c, semantic_score=sem)
        hp = honeypot_results.get(c["candidate_id"], {})
        feat.update(hp)
        all_features.append((c, feat))
        if len(all_features) % 20000 == 0:
            logger.info(f"  Scored {len(all_features):,} candidates…")

    # Sort by first_pass_score, take top-K for CE re-ranking
    all_features.sort(key=lambda x: x[1]["first_pass_score"], reverse=True)
    shortlisted = all_features[:args.shortlist]
    logger.info(
        f"✓ First-pass scoring done in {time.time() - t5:.1f}s. "
        f"Top {len(shortlisted)} shortlisted."
    )

    # ── STAGE 8: Cross-Encoder Re-Ranking ────────────────────────────────────
    logger.info("=== Stage 8: Cross-encoder re-ranking ===")
    t8 = time.time()

    if not args.no_ce:
        try:
            from cross_encoder_reranker import rerank_with_cross_encoder, is_ce_available
            from config import CE_WEIGHT

            if is_ce_available():
                shortlisted_candidates = [c for c, _ in shortlisted]
                shortlisted_feats = [f for _, f in shortlisted]
                passage_texts = [build_ce_passage(c) for c in shortlisted_candidates]

                # Flat list for CE reranker
                shortlisted_flat = [{**f, "_candidate": c} for c, f in shortlisted]
                reranked = rerank_with_cross_encoder(shortlisted_flat, passage_texts)

                # Apply CE blended scores back
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

    # Apply 0.82 ceiling to non-shortlisted candidates
    shortlist_ids = {c["candidate_id"] for c, _ in shortlisted}
    for c, feat in all_features:
        if c["candidate_id"] not in shortlist_ids:
            feat["ce_score"] = 0.0
            feat["blended_score"] = feat["first_pass_score"] * 0.82

    # ── STAGE 9: Final Ranking ────────────────────────────────────────────────
    logger.info("=== Stage 9: Final ranking ===")

    # Sort by blended_score descending, tie-break by candidate_id ascending
    all_features.sort(key=lambda x: (-x[1].get("blended_score", 0.0), x[0]["candidate_id"]))
    top_k = all_features[:args.top_k]

    # Normalize scores
    max_score = max(f.get("blended_score", 0.0) for _, f in top_k)
    max_score = max(max_score, 1e-6)

    # ── STAGE 10: Output Writer ───────────────────────────────────────────────
    logger.info("=== Stage 10: Writing output CSV ===")
    from reasoning_generator import build_reasoning

    out_path = Path(args.out)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow(["candidate_id", "rank", "score", "reasoning"])
        for rank_num, (c, feat) in enumerate(top_k, start=1):
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
    logger.info(f"✓ Submission written to {out_path} ({args.top_k} rows)")
    logger.info(f"✓ Total runtime: {total_time}s")
    logger.info("Done. Validate with: python validate_submission.py " + str(out_path))


if __name__ == "__main__":
    main()
