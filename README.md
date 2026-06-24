# AI-JD Candidate Ranking Application

Redrob AI candidate ranking application with a Next.js frontend and a FastAPI backend. This project utilizes LLM embeddings, traditional NLP features, and Cross-Encoder re-ranking to accurately score and rank candidates against a given Job Description.

## 🚀 Complete Project Flow

The system provides a seamless UI to upload candidate data, parse Job Descriptions, adjust scoring weights, and visualize the ranking results.

### Step 1: Upload Candidates
- Navigate to the **Input** page (`http://localhost:3000/input`).
- Upload your candidate data file. Supported formats: `.jsonl`, `.json`, and `.jsonl.gz` (e.g., `candidates.jsonl`).
- The backend validates the schema and loads the candidate profiles into memory.

### Step 2: Upload Job Description (JD)
- Navigate to the **JD Analyzer** page.
- Upload your Job Description file. Supported formats: `.pdf`, `.docx`, and `.txt`.
- The backend parses the document using NLP to extract technical hard skills, preferred skills, location constraints, and disqualifiers.

### Step 3: Configuration & Weights
- Go to the **Configuration** page.
- Review the parsed JD requirements.
- Adjust the scoring weights (e.g., Semantic Matching, Cross-Encoder weight, Title relevance, Experience curve) as needed based on the specific role.

### Step 4: Real-time Ranking
- Navigate to the **Ranking** page.
- Start the ranking process. The backend will process the candidates through its pipeline:
  1. Semantic search (Sentence Transformers)
  2. Rule-based scoring (Experience, Skills, Location)
  3. Title gating & filtering
  4. Cross-Encoder reranking
- Watch the progress in real-time via Server-Sent Events (SSE).

### Step 5: View Results & Export
- Once ranking is complete, go to the **Results** page to view the top candidates along with detailed reasoning and component-level score breakdowns.
- Navigate to the **Export** page to download the final top 100 `submission.csv` for the challenge.

---

## 🛠 What Runs Where

- **Frontend**: Next.js app in the [`FRONTEND`](FRONTEND) directory.
- **Backend**: FastAPI service in the [`BACKEND`](BACKEND) directory.
- **API Base URL**: `http://localhost:8000` by default.

---

## 🏃 Recommended Run Method (Local Dev)

### 1. Start the backend with Docker
From the repository root:
```bash
docker compose up --build
```
This builds the backend image from `BACKEND/Dockerfile` and starts the API on port `8000`.


### Run the backend directly with Docker

If you want to skip Compose and run the backend container directly:

```bash
docker build -t ai-jd-backend ./BACKEND
docker run --rm -p 8000:8000 ai-jd-backend
```

The backend will be available at `http://localhost:8000`.


### 2. Start the frontend in another terminal
```bash
cd FRONTEND
npm install
npm run dev
```
Open the app at `http://localhost:3000`.

*Note: The root `docker-compose.yml` currently starts only the backend service.*

---

## 💻 Local Development Without Docker

### Backend
```bash
cd BACKEND
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```
*Note: The backend uses lazy model loading, so the API can start before the sentence-transformer models are fully downloaded.*

### Frontend
```bash
cd FRONTEND
npm install
npm run dev
```
If you want the frontend to point to a different backend URL, set:
```bash
export NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## ✅ How to Verify the Complete Project

1. **Verify Backend Health:**
   Check if the API is running by visiting `http://localhost:8000/api/status`. It should return a JSON response with the current pipeline state (e.g., `"status": "idle"`).

2. **Verify Frontend Next.js build:**
   ```bash
   cd FRONTEND
   npm run build
   ```
   Ensure the frontend builds without any typescript or linting errors.

3. **Verify Pipeline Functionality (CLI/Competition Mode):**
   To verify the ranking algorithm works deterministically end-to-end without the UI:
   ```bash
   cd BACKEND
   python setup.py
   python rank.py --candidates ./candidates.jsonl --out ./submission.csv
   ```
   Check that `submission.csv` is generated successfully and formatted correctly with candidate IDs and their scores.

4. **Verify UI Flow:**
   - Upload sample candidate and JD files in the running Next.js app.
   - Verify that there are no console errors or HTTP 500 errors during the Ranking process.
   - Confirm that the UI successfully switches to the Results page and exports the CSV accurately.