"""
setup.py — One-time setup: Download models and pre-compute embeddings.
Run ONCE before competition: python setup.py --candidates ./candidates.jsonl
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def download_models():
    """Download bi-encoder and cross-encoder models from HuggingFace."""
    from config import BI_ENCODER_MODEL, CE_MODEL_NAME

    logger.info(f"Downloading bi-encoder: {BI_ENCODER_MODEL}")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(BI_ENCODER_MODEL)
    logger.info(f"✓ Bi-encoder downloaded ({model.get_sentence_embedding_dimension()} dims)")

    logger.info(f"Downloading cross-encoder: {CE_MODEL_NAME}")
    from sentence_transformers import CrossEncoder
    ce_model = CrossEncoder(CE_MODEL_NAME, max_length=512)
    # Quick test
    score = ce_model.predict([("test query", "test passage")], show_progress_bar=False)
    logger.info(f"✓ Cross-encoder downloaded. Test score: {float(score[0]):.4f}")
    return model, ce_model


def precompute_embeddings(model, candidates_path: Path, output_path: Path):
    """Pre-compute candidate embeddings and save to .npy file."""
    import numpy as np
    from data_loader import stream_candidates, build_candidate_text
    from embedding_engine import compute_semantic_scores_vectorized

    logger.info(f"Pre-computing embeddings from: {candidates_path}")
    logger.info("This takes ~25-40 minutes on CPU for 100K candidates.")

    batch_size = 256
    all_embeddings = []
    texts = []
    candidate_ids = []

    for cand in stream_candidates(candidates_path):
        texts.append(build_candidate_text(cand))
        candidate_ids.append(cand["candidate_id"])

        if len(texts) % 10000 == 0:
            logger.info(f"  Building texts: {len(texts):,} done…")

    total = len(texts)
    logger.info(f"Total candidates: {total:,}. Starting batch embedding…")

    for i in range(0, total, batch_size):
        batch = texts[i:i + batch_size]
        emb = model.encode(batch, normalize_embeddings=True, show_progress_bar=False)
        all_embeddings.append(emb)

        if (i // batch_size) % 100 == 0:
            logger.info(f"  Embedded {min(i + batch_size, total):,}/{total:,} candidates")

    import numpy as np
    all_embeddings_np = np.vstack(all_embeddings)
    np.save(str(output_path), all_embeddings_np)

    # Also save candidate IDs mapping
    ids_path = output_path.with_suffix(".ids.json")
    import json
    with open(ids_path, "w") as f:
        json.dump(candidate_ids, f)

    logger.info(f"✓ Embeddings saved: {output_path} ({all_embeddings_np.shape})")
    logger.info(f"✓ Candidate IDs saved: {ids_path}")
    return all_embeddings_np


def main():
    parser = argparse.ArgumentParser(description="Redrob Setup — Download models & pre-compute embeddings")
    parser.add_argument("--candidates", default=None, help="Path to candidates.jsonl to pre-compute embeddings")
    parser.add_argument("--embeddings-out", default="candidate_embeddings.npy", help="Output path for embeddings")
    parser.add_argument("--skip-models", action="store_true", help="Skip model download (use cached)")
    parser.add_argument("--skip-embeddings", action="store_true", help="Skip embedding pre-computation")
    args = parser.parse_args()

    start = time.time()

    if not args.skip_models:
        logger.info("=== Downloading models ===")
        bi_model, ce_model = download_models()
    else:
        from config import BI_ENCODER_MODEL
        from sentence_transformers import SentenceTransformer
        logger.info("Loading bi-encoder from cache...")
        bi_model = SentenceTransformer(BI_ENCODER_MODEL)

    if not args.skip_embeddings and args.candidates:
        candidates_path = Path(args.candidates)
        if candidates_path.exists():
            logger.info("=== Pre-computing embeddings ===")
            output_path = Path(args.embeddings_out)
            precompute_embeddings(bi_model, candidates_path, output_path)
        else:
            logger.error(f"Candidates file not found: {candidates_path}")
    elif not args.skip_embeddings and not args.candidates:
        logger.info("No --candidates provided. Skipping embedding pre-computation.")

    logger.info(f"✓ Setup complete in {round(time.time() - start, 1)}s")
    logger.info("Ready to run: python rank.py --candidates <path> --out submission.csv")


if __name__ == "__main__":
    main()
