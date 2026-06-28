<div align="center">

# 🤖 Redrob AI — Candidate Ranking System

**Stop scrolling through hundreds of resumes. Let AI find the best candidates for you — instantly.**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://docker.com/)

</div>

---

## What is this?

Redrob AI is an intelligent **candidate ranking engine** built for the India Runs Data & AI Challenge. You give it a pool of candidate profiles and a Job Description — it automatically reads, scores, and ranks every candidate so you always see the best matches at the top.

No manual shortlisting. No gut-feel guesswork. Just data-driven rankings powered by real AI.

---

## The Problem It Solves

When hiring for a technical role, recruiters and hiring managers often receive **hundreds of applications**. Reading each resume takes time, introduces bias, and is easy to get wrong. Important candidates get buried. Weak candidates slip through.

Redrob AI solves this by:
- **Reading every candidate's profile automatically** and extracting what matters
- **Understanding the Job Description** — not just keyword-matching, but semantically understanding the role
- **Scoring each candidate** across multiple dimensions: skills, experience, location, career trajectory, and education
- **Surfacing the top 100 candidates** ranked by fit, with clear score breakdowns

---

## How It Works — A 5-Step Flow

```
Upload Candidates  →  Parse Job Description  →  Configure  →  Rank  →  Export Results
```

### 1️⃣ Upload Candidates
Drop in your candidate data file (`.jsonl`, `.json`, or `.jsonl.gz`). The system parses and loads every profile into memory — could be 50 candidates or 5,000.

### 2️⃣ Parse the Job Description
Upload any JD document (`.pdf`, `.docx`, or `.txt`). The system reads it and automatically extracts:
- Required technical skills
- Preferred/bonus skills
- Experience expectations
- Location requirements
- Disqualifiers (e.g., consulting-only backgrounds, no production experience)

### 3️⃣ Configure Weights
Optionally tweak how much each factor matters for this specific role. Heavy on technical skills? Bump that weight up. Location-flexible? Lower it. The defaults work great out of the box.

### 4️⃣ Rank in Real-Time
Hit "Start Ranking" and watch the pipeline work — live, in real-time. Under the hood it runs:

| Stage | What it does |
|-------|-------------|
| Title Filter | Removes candidates whose job titles are clearly irrelevant |
| Semantic Search | Uses AI embeddings to find candidates who *understand* the role |
| Skill Scoring | Matches candidate skills against JD requirements (weighted by category) |
| Career Analysis | Evaluates company types, seniority, and career progression |
| Experience Scoring | Gaussian curve centered at the ideal experience range |
| Cross-Encoder Re-rank | A second, more powerful AI model re-evaluates the top shortlist |
| Fraud Detection | Flags suspiciously inflated profiles (honeypot detection) |

### 5️⃣ View & Export
See the **Top 100 candidates** ranked by score, with a detailed breakdown of *why* each candidate ranked where they did. Export to `submission.csv` in one click.

---

## Two Modes

### 🏆 Competition Mode *(Default — works offline, no API keys needed)*
The full ranking pipeline runs entirely on your machine using local AI models. Fast, deterministic, and free. This is the default mode.

### 🤖 API Mode *(Optional — requires a free API key)*
Layer on LLM-powered superpowers:
- **AI Reasoning Summaries** — for each candidate, the AI explains in plain English why they ranked where they did
- **Smarter JD Parsing** — GPT-4o or Gemini Pro reads the JD with deeper comprehension
- **Interactive Chat** — ask questions like *"Does this candidate have production deployment experience?"* and get an AI answer

Toggle this on/off from the UI anytime. If the API call fails, it silently falls back to Competition Mode.

---

## Getting Started

### The Fast Way (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/AI-JD.git
cd AI-JD

# 2. Start the backend
docker compose up --build

# 3. In a new terminal, start the frontend
cd FRONTEND && npm install && npm run dev
```

Open **`http://localhost:3000`** and you're live. 🚀

> First run downloads the AI models (~90MB). Subsequent starts are instant.

---

### The Manual Way (No Docker)

**Backend:**
```bash
cd BACKEND
pip install -r requirements.txt
python setup.py          # download models once
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend (separate terminal):**
```bash
cd FRONTEND
npm install
npm run dev
```

---

## Setting Up Your Environment

Copy the template and fill in your keys (only needed for API Mode):

```bash
cd BACKEND
copy .env.example .env    # Windows
cp .env.example .env      # macOS / Linux
```

Then open `.env` and fill in your values:

```env
# Which AI provider to use (gemini is free to start)
API_MODE_PROVIDER=gemini

# Get a free Gemini key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_key_here

# OR use OpenAI — https://platform.openai.com/api-keys
OPENAI_API_KEY=your_key_here

# Everything else has sensible defaults — no need to change unless you want to
```

> ✅ **No keys? No problem.** Leave `.env` empty and the app runs fully in Competition Mode.

---

## Key URLs

| URL | What it is |
|-----|-----------|
| `http://localhost:3000` | The full web application |
| `http://localhost:8000` | Backend API |
| `http://localhost:8000/docs` | Interactive API documentation (Swagger) |
| `http://localhost:8000/api/status` | Backend health check |

---

## Project Layout

```
AI-JD/
├── BACKEND/          → Python (FastAPI) ranking engine
├── FRONTEND/         → Next.js web interface
├── docker-compose.yml
└── README.md
```

The `BACKEND/` folder has its own [`README.md`](BACKEND/README.md) with deeper technical details if you need them.

---

## ⚡ Troubleshooting & Performance Tuning

If candidate ranking requests take a long time (e.g. several minutes or longer) for large datasets (e.g. 10,000+ candidates), check for these top 5 common performance bottlenecks:

### 1️⃣ Lack of Pre-computed Embeddings (Online Embedding Overhead)
* **The Problem:** Running ranking without pre-computed embeddings forces the backend to run online inference on the CPU/GPU for thousands of profiles.
* **The Solution:** Use `setup.py` to generate the `.npy` embeddings once off-line.
  ```bash
  cd BACKEND
  python setup.py --candidates <path_to_candidates.jsonl>
  ```
  Then, pass the saved embeddings file to the runner:
  ```bash
  python rank.py --candidates ./candidates.jsonl --embeddings ./candidate_embeddings.npy --out ./submission.csv
  ```

### 2️⃣ CPU-Only Execution vs. GPU Acceleration
* **The Problem:** Standard installation installs the CPU-only version of PyTorch. Running transformers on CPU is 10x-50x slower than on a GPU.
* **The Solution:** If you have an NVIDIA GPU, install PyTorch with CUDA support:
  ```bash
  pip install torch --select-index https://download.pytorch.org/whl/cu121
  ```

### 3️⃣ CPU Thread Contention (OMP Threading Overhead)
* **The Problem:** On high-core CPUs, PyTorch automatically spawns too many threads, causing logical cores to waste time context-switching.
* **The Solution:** Set OpenMP environment variables to limit thread counts before running the script:
  * **Windows (PowerShell):** `$env:OMP_NUM_THREADS="1"; $env:MKL_NUM_THREADS="1"`
  * **macOS/Linux:** `export OMP_NUM_THREADS=1; export MKL_NUM_THREADS=1`

### 4️⃣ Low RAM & Swap/Pagefile Thrashing
* **The Problem:** Loading candidate profiles alongside embedding and cross-encoder models requires at least **1.5 GB to 2.5 GB of free RAM**. If your system or VM runs out of memory, it starts swapping memory pages to the disk, causing a huge performance penalty (up to 100x slowdown).
* **The Solution:** Ensure your machine or container has at least **4 GB of total RAM** allocated, and close other heavy applications.

### 5️⃣ Offline / Proxy Network Timeouts
* **The Problem:** By default, Hugging Face `transformers` attempts to contact its server to check for updates every time a model is loaded, leading to 30–60 second connection timeouts if you are offline or behind a strict proxy/firewall.
* **The Solution:** Force Hugging Face into offline mode using environment variables:
  * **Windows (PowerShell):** `$env:TRANSFORMERS_OFFLINE="1"; $env:HF_HUB_OFFLINE="1"`
  * **macOS/Linux:** `export TRANSFORMERS_OFFLINE=1; export HF_HUB_OFFLINE=1`

---

## Built With

- **Sentence Transformers** (`all-MiniLM-L6-v2`) — semantic candidate search
- **Cross-Encoder** (`ms-marco-MiniLM-L-6-v2`) — precision re-ranking
- **FastAPI** — high-performance backend API with live SSE streaming
- **Next.js 15 + React 19** — modern, reactive frontend
- **Google Gemini / OpenAI** — optional LLM-powered enhancements

---

<div align="center">

Built for the **India Runs Data & AI Challenge** 🇮🇳

</div>