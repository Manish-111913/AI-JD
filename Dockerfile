# ── Redrob AI Candidate Ranking — Hugging Face Space Dockerfile ────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ── System dependencies ───────────────────────────────────────────────────────
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential gcc curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies (cached layer) ────────────────────────────────────────
COPY BACKEND/requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
# Note: Root .dockerignore excludes FRONTEND and development files,
# but retains the precomputed embeddings (candidate_embeddings.npy, etc.)
# so they are baked directly into the Docker image.
COPY BACKEND/ .

# ── Runtime ───────────────────────────────────────────────────────────────────
# Hugging Face Spaces routes traffic to port 7860
EXPOSE 7860
ENV PORT=7860

# workers=1 keeps in-memory state (_state dict) consistent across requests.
# SSE streaming requires keep-alive; 120s covers long ranking pipelines.
CMD uvicorn api:app \
    --host 0.0.0.0 \
    --port "${PORT}" \
    --workers 1 \
    --timeout-keep-alive 120
