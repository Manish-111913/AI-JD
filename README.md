# AI-JD

Redrob AI candidate ranking application with a Next.js frontend and a FastAPI backend.

## What Runs Where

- Frontend: Next.js app in [FRONTEND](FRONTEND)
- Backend: FastAPI service in [BACKEND](BACKEND)
- API base URL: `http://localhost:8000` by default

## Recommended Run Method

### 1. Start the backend with Docker

From the repository root:

```bash
docker compose up --build
```

This builds the backend image from [BACKEND/Dockerfile](BACKEND/Dockerfile) and starts the API on port `8000`.

### 2. Start the frontend in another terminal

```bash
cd FRONTEND
npm install
npm run dev
```

Open the app at `http://localhost:3000`.

## Local Development Without Docker

### Backend

```bash
cd BACKEND
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

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

## Useful Commands

### Backend competition mode

```bash
cd BACKEND
python setup.py
python rank.py --candidates ./candidates.jsonl --out ./submission.csv
```

### Frontend build

```bash
cd FRONTEND
npm run build
```

## Notes

- The backend uses lazy model loading, so the API can start before the sentence-transformer models are downloaded.
- The root [docker-compose.yml](docker-compose.yml) currently starts only the backend service.