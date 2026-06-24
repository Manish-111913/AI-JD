# Redrob Candidate Ranking Backend

A comprehensive Python FastAPI backend implementing the complete 10-stage candidate ranking pipeline for the Redrob AI Hackathon.

## Architecture

```
BACKEND/
├── api.py                    # FastAPI server with SSE streaming
├── rank.py                   # Competition entry point (no network)
├── setup.py                  # One-time model download + embedding pre-computation
├── config.py                 # All constants, weights, keyword lists
├── data_loader.py            # Module 2: JSONL/GZIP loader + normalizer
├── honeypot_detector.py      # Module 3: Evidence accumulation honeypot detection
├── embedding_engine.py       # Module 4: Bi-encoder semantic scoring
├── skill_scorer.py           # Module 5: Skill trust formula
├── career_analyzer.py        # Module 6+7: Career + behavioral analysis
├── scoring_engine.py         # Module 8: First-pass composite scorer
├── cross_encoder_reranker.py # Module 9: Cross-encoder re-ranking
├── reasoning_generator.py    # Module 10: Template reasoning generator
└── requirements.txt
```

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Download models (one-time setup)
```bash
python setup.py
# For full competition dataset with pre-computed embeddings:
python setup.py --candidates ../[PUB] India_runs_data_and_ai_challenge/.../candidates.jsonl
```

### 3. Run the API server (for frontend)
```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Competition mode (rank.py)
```bash
python rank.py --candidates ./candidates.jsonl --out ./submission.csv
```

## Pipeline Stages

| Stage | Module | Description | Time |
|-------|--------|-------------|------|
| 1 | Data Loader | Parse JSONL/GZ, normalize, null-safe fields | ~5s |
| 2 | Title Pre-filter | Fast lookup, eliminates ~69K irrelevant titles | ~2s |
| 3 | Honeypot Detector | 7-check evidence accumulation | ~5s |
| 4 | Embedding Engine | Bi-encoder: 3-query cosine similarity | ~5-10s |
| 5 | Skill Scorer | Trust formula: proficiency × sigmoid(dur) × log(end) | Incl. |
| 6 | Career Analyzer | Company type, production signals, seniority | Incl. |
| 7 | First-Pass Scorer | Composite score: 35% skills + 30% career + ... | ~15s |
| 8 | CE Re-ranker | cross-encoder/ms-marco-MiniLM-L-6-v2, top-300 | ~30-45s |
| 9 | Final Blend | 40% algo + 60% CE, normalize, take top-100 | ~2s |
| 10 | Output | submission.csv with reasoning | ~3s |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Backend status + model state |
| GET | `/api/jd` | Parsed JD requirements |
| POST | `/api/upload` | Upload candidate JSON/JSONL |
| POST | `/api/rank` | SSE streaming ranking pipeline |
| GET | `/api/results` | Final ranked results |
| GET | `/api/candidate/:id` | Single candidate details |
| POST | `/api/validate` | Validate submission format |
| POST | `/api/export` | Download submission.csv |

## Scoring Formula

```
base_score = 0.35 × skill_score
           + 0.30 × career_quality_score
           + 0.10 × experience_score
           + 0.10 × location_score
           + 0.05 × education_score
           + platform_quality_score   # additive ~0.25 max

first_pass_score = base_score
                 × title_gate_multiplier  # 0.1 if non-tech title
                 × behavioral_multiplier  # 0.05–1.30
                 × disqualifier_penalty   # 0.20–1.00 (6 checks)
                 × honeypot_penalty       # 0.0, 0.15, 0.55, or 1.0

blended_score = 0.40 × normalized_algo + 0.60 × ce_score
```

## Submission Metadata

Set in `submission_metadata.yaml`:
- `uses_gpu_for_inference: false`
- `has_network_during_ranking: false`
- `pre_computation_required: true`
- `reproduce_command: python rank.py --candidates ./candidates.jsonl --out ./submission.csv`
