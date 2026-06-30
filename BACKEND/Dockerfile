# ── Redrob AI Candidate Ranking — Production Dockerfile ───────────────────────
# Used by Render when "Docker" runtime is chosen instead of "Python native".
# The native Python runtime (render.yaml) is preferred — this file is an
# alternative for teams who want container-level control.
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ── System deps ───────────────────────────────────────────────────────────────
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential gcc curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies (cached layer) ────────────────────────────────────────
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
# Note: candidate_embeddings.npy and *.ids.json are excluded via .dockerignore
# and loaded at runtime from the repo (if present) or generated on first run.
COPY . .

# ── Runtime ───────────────────────────────────────────────────────────────────
EXPOSE 8000

# Render injects $PORT; fall back to 8000 for local docker run
ENV PORT=8000

# workers=1 keeps in-memory state (_state dict) consistent across requests.
# SSE streaming requires keep-alive; 120s covers long ranking pipelines.
CMD uvicorn api:app \
    --host 0.0.0.0 \
    --port "${PORT}" \
    --workers 1 \
    --timeout-keep-alive 120