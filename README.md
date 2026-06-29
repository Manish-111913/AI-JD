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

## 📊 Scaling Benchmarks & Performance Tuning (10K vs. 1 Lakh Candidates)

Below are the end-to-end pipeline runtimes for **10,000** and **100,000 (1 Lakh)** candidates, depending on your system's hardware configuration (GPU vs. CPU) and caching.

> [!NOTE]
> In real-world tests on a typical 8-thread CPU with a cold cache (where ~30% of candidates pass the title gate), embedding 30,163 candidates can take **~14.3 minutes (859.6s)** because CPU inference is slow and candidate profile strings are long. Optimizing candidate text length and filtering settings can reduce this by **2.5x to 3.5x**.

### ⏱️ Runtime Matrix

| Dataset Size | Hardware | Title Filter Gate | Candidate Text Format | Upload & Validate | Bi-Encoder (Embed) | Cross-Encoder (CE)* | Total End-to-End Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **10K Candidates** | GPU Accelerated | Active (`0.05`) | Standard (~1080 chars) | ~1.0s | ~2.0s | ~0.5s | **~3.5 seconds** |
| | CPU Only | Active (`0.05`) | Standard (~1080 chars) | ~1.0s | ~84.0s | ~8.0s | **~1.5 minutes** |
| **100K Candidates** | GPU Accelerated | Active (`0.05`) | Standard (~1080 chars) | ~15.0s | ~20.0s | ~0.5s | **~35.5 seconds** |
| *(1 Lakh)* | CPU Only | Active (`0.05`) | Standard (~1080 chars) | ~15.0s | ~14.0 mins | ~8.0s | **~14.3 minutes** |
| | CPU Only (Optimized) | Active (`0.30`) | Shortened (<600 chars) | ~15.0s | ~4.5 mins | ~8.0s | **~4.8 minutes** |

*\*Note: Cross-encoder re-ranking is capped dynamically at a maximum of the top 300 candidates (defined by `compute_dynamic_shortlist_size` in `config.py`), which is why the Stage 3 CE time remains constant regardless of the total input size.*

---

## 🚀 Precomputation Workflow (The Secret to Sub-Minute Runtimes)

If you run the pipeline online without precomputation, you will encounter the primary CPU embedding bottleneck. For example, for **100,000 candidates** (with ~30,000 passing the title filter), the pipeline stats show:

```text
[16:44:34] Embedding 30163 candidates with sentence-transformers/all-MiniLM-L6-v2...
...
[16:58:38] Embedding complete
```
* **Total Embedding Time:** **14 minutes 4 seconds (844 seconds)** (approx. 98% of the total pipeline runtime).

### The Solution: Offline Precomputation

The Redrob Candidate Ranker is architected to separate the heavy deep learning inference from the ranking/scoring logic. By precomputing candidate representations, you bypass the 14-minute embedding step completely.

#### Step 1: Precompute Candidate Embeddings (Once Only)
Run `setup.py` offline to download models and pre-calculate all 100K candidate embeddings. This takes ~25–40 minutes on CPU, but only has to be done **once**:
```bash
python setup.py --candidates ./candidates.jsonl
```
This generates two output cache files in your backend folder:
1. `candidate_embeddings.npy` — The raw embedding matrix.
2. `candidate_embeddings.ids.json` — The candidate ID mapping list.

#### Step 2: Run `rank.py` using Precomputed Caches
For all future runs, point the ranker to these files. The engine will load the pre-computed embeddings instantly:
```bash
python rank.py \
  --candidates candidates.jsonl \
  --embeddings candidate_embeddings.npy \
  --features-cache features_cache.pkl \
  --out submission.csv
```

### Expected Runtimes with Precomputation Enabled

When precomputation is enabled, the 14-minute online embedding phase is replaced by a 3–5 second file load:

| Stage | Duration |
| :--- | :--- |
| Load Candidates & Pre-Filter | ~5 – 10 seconds |
| Load Precomputed Embeddings | ~3 – 5 seconds |
| Vectorized Cosine Similarity | ~2 – 5 seconds |
| Composite Feature Scoring | ~5 – 10 seconds |
| Cross-Encoder (Shortlist of 300) | ~15 – 20 seconds |
| CSV Export | < 1 second |
| **Total End-to-End Execution** | **~35 – 60 seconds** |

### 🌐 Web UI Upload Caching & Cloning Behavior

The FastAPI backend ([api.py](file:///d:/HACK2SKILL/BACKEND/api.py)) is equipped with a hybrid embedding caching layer. When a candidate batch is uploaded via the Web UI and ranked, the server checks if `candidate_embeddings.npy` and `candidate_embeddings.ids.json` exist.

* **Cache Hits**: Any candidate matching a precomputed ID has their embedding retrieved instantly.
* **Online Fallback**: Any new or custom candidates are dynamically embedded online on-the-fly and combined with the cached vectors.
* **New JDs**: The system compares the loaded embeddings against the newly uploaded Job Description queries in under a second, ensuring correct matching even when the JD changes.

#### 👥 Cloning the Repository: Will it run fast for a new user?
Yes! The large precomputed binary files (`candidate_embeddings.npy` and `features_cache.pkl`) are tracked using **Git LFS (Large File Storage)** in this repository:
1. **With Git LFS**: When a new user clones this repository with Git LFS installed, the precomputed embedding files will be downloaded automatically. The ranking pipeline will work **instantly (under a minute)** on their first run.
2. **Without Git LFS**: If the user clones without Git LFS (or gets a cold cache), they must run the offline setup script once in their local folder:
   ```powershell
   python BACKEND/setup.py --candidates "./[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --embeddings-out BACKEND/candidate_embeddings.npy
   ```
   This will generate the local caches, enabling sub-minute UI rankings instantly.

---

## ⚡ Troubleshooting & Performance Tuning

If candidate ranking requests take a long time (e.g., several minutes or longer) for large datasets (e.g., 100K candidates), check for these key bottlenecks and optimization opportunities:

### 1️⃣ Lack of Pre-computed Embeddings (Online Embedding Overhead)
* **The Problem:** Running ranking without pre-computed embeddings forces the backend to run online inference on the CPU/GPU for thousands of profiles.
* **The Solution:** Use `setup.py` to generate the `.npy` embeddings once offline:
  ```bash
  cd BACKEND
  python setup.py --candidates <path_to_candidates.jsonl>
  ```
  Then, pass the saved embeddings file to the runner:
  ```bash
  python rank.py --candidates ./candidates.jsonl --embeddings ./candidate_embeddings.npy --out ./submission.csv
  ```

### 2️⃣ CPU-Only Execution vs. GPU Acceleration
* **The Problem:** Standard PyTorch installations run on the CPU, making transformer inference (`all-MiniLM-L6-v2`) extremely slow.
* **The Solution:** If you have an NVIDIA GPU, install PyTorch with CUDA support to achieve a **40x speedup** (reducing embedding time from 14 minutes to ~20 seconds):
  ```bash
  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
  ```

### 3️⃣ Ignored/Truncated Tokens in Candidate Text
* **The Problem:** The bi-encoder model (`all-MiniLM-L6-v2`) has a hard input limit of **256 tokens** (approx. 750–1000 characters). By default, `build_candidate_text` generates representations of ~1,080 characters. The extra tokens are tokenized (wasting CPU cycles) and then immediately discarded.
* **The Solution:** Shorten `build_candidate_text` in `data_loader.py` to keep only the latest 2 roles and shorter descriptions (under 600 characters). This increases throughput from **41 to 106 candidates/sec** (a **2.5x CPU speedup**).

### 4️⃣ Low Title Gate Threshold
* **The Problem:** Setting `TITLE_GATE_THRESHOLD = 0.05` allows General Tech titles (e.g., Java developers or web developers) to pass the pre-filter and get embedded, even though they will not make the final top list.
* **The Solution:** Set `TITLE_GATE_THRESHOLD = 0.30` in `config.py`. This immediately filters out General Tech and Non-Tech roles, reducing the candidate embedding load by **~18%**.

### 5️⃣ CPU Thread Contention (OMP Threading Overhead)
* **The Problem:** On high-core CPUs, PyTorch automatically spawns too many threads, causing logical cores to waste time context-switching.
* **The Solution:** Set OpenMP environment variables to limit thread counts before running the script:
  * **Windows (PowerShell):** `$env:OMP_NUM_THREADS="1"; $env:MKL_NUM_THREADS="1"`
  * **macOS/Linux:** `export OMP_NUM_THREADS=1; export MKL_NUM_THREADS=1`

### 6️⃣ Low RAM & Swap/Pagefile Thrashing
* **The Problem:** Loading candidate profiles alongside embedding and cross-encoder models requires at least **1.5 GB to 2.5 GB of free RAM**. If your system or VM runs out of memory, it starts swapping memory pages to disk, causing a huge performance penalty (up to 100x slowdown).
* **The Solution:** Ensure your machine or container has at least **4 GB of total RAM** allocated, and close other heavy applications.

### 7️⃣ Offline / Proxy Network Timeouts
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