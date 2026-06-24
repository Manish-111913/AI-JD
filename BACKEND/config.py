"""
config.py — All constants, keyword lists, firm lists, scoring parameters.
Based on: RedroBHackathon_Backend_FINAL.pdf + candidate_schema.json
"""

# ── JD Embedding Queries ──────────────────────────────────────────────────────
JD_QUERIES = [
    {
        "text": (
            "Senior AI engineer with production experience in embeddings, dense retrieval, "
            "vector search, semantic similarity, ranking systems, information retrieval, "
            "NDCG evaluation, hybrid search, re-ranking pipelines"
        ),
        "weight": 0.60,
    },
    {
        "text": (
            "shipped to production, deployed at scale, real users, served traffic, "
            "latency optimization, A/B testing, built end-to-end, owned system from "
            "prototype to production, startup engineering"
        ),
        "weight": 0.30,
    },
    {
        "text": (
            "talent intelligence, candidate ranking, job matching, recruiter platform, "
            "hiring technology, people analytics, HR tech, AI for recruiting"
        ),
        "weight": 0.10,
    },
]

# ── Cross-Encoder Query ───────────────────────────────────────────────────────
CE_QUERY = (
    "Senior AI Engineer requiring: production embeddings and vector search experience, "
    "semantic retrieval systems, ranking evaluation (NDCG/MRR), "
    "strong Python, product company background, 5-9 years. "
    "Disqualifiers: consulting-only career, pure research no production, "
    "no coding in 18+ months, CV/speech only background."
)

# ── Cross-Encoder Model ───────────────────────────────────────────────────────
CE_MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"
BI_ENCODER_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CE_BATCH_SIZE = 32
CE_SHORTLIST_SIZE = 300

# ── Component Weights (must sum to ~1.0 before additive platform) ─────────────
WEIGHTS = {
    "skills": 0.35,
    "career": 0.30,
    "experience": 0.10,
    "location": 0.10,
    "education": 0.05,
    # platform_quality is additive (max ~0.25), not in this sum
}

# CE blend: final = (1 - CE_WEIGHT) * algo + CE_WEIGHT * ce_score
CE_WEIGHT = 0.60

# ── Title Relevance Map ───────────────────────────────────────────────────────
CORE_ML_AI_TITLES = [
    "ml engineer", "machine learning engineer", "ai engineer",
    "applied ml engineer", "nlp engineer", "ai research engineer",
    "search engineer", "ranking engineer", "data scientist",
    "applied scientist", "research scientist",
]
ADJACENT_HIGH_TITLES = [
    "software engineer", "backend engineer", "data engineer",
    "analytics engineer", "ml platform engineer", "platform engineer",
    "senior software engineer", "staff engineer", "principal engineer",
]
ADJACENT_LOW_TITLES = [
    "full stack developer", "cloud engineer", "devops engineer",
    "sre", "site reliability engineer", "mobile developer",
    "qa engineer", "frontend engineer", "fullstack",
]
GENERAL_TECH_TITLES = [
    "java developer", ".net developer", "php developer",
    "web developer", "it support", "system admin",
]
# Everything else → 0.02

TITLE_SCORE_MAP = {
    "core_ml_ai": 1.00,
    "adjacent_high": 0.70,
    "adjacent_low": 0.35,
    "general_tech": 0.10,
    "non_tech": 0.02,
}

# ── Consulting Firms (Disqualifier #1) ────────────────────────────────────────
CONSULTING_FIRMS = {
    "tcs", "tata consultancy", "infosys", "wipro", "accenture",
    "cognizant", "capgemini", "hcl", "tech mahindra", "mphasis", "hexaware",
}

# ── Production Keywords (Disqualifier #2) ─────────────────────────────────────
PRODUCTION_KEYWORDS = [
    "deployed", "production", "served users", "launched", "real users",
    "scale", "latency", "monitoring",
]

# ── Pre-LLM AI Keywords (Disqualifier #3) ────────────────────────────────────
PRE_LLM_AI_KEYWORDS = [
    "sklearn", "scikit-learn", "gradient boosting", "xgboost", "lightgbm",
    "matrix factorization", "collaborative filtering", "traditional nlp",
    "tf-idf", "bm25", "random forest", "svd", "als",
]

# ── Leadership Titles (Disqualifier #4) ───────────────────────────────────────
LEADERSHIP_TITLES = ["architect", "tech lead", "vp", "director", "head of"]
CODING_KEYWORDS = ["implemented", "wrote", "built", "coded", "developed", "pr", "commit"]

# ── CV/Robotics Skills (Disqualifier #5) ─────────────────────────────────────
CV_SPEECH_SKILLS = [
    "computer vision", "opencv", "yolo", "object detection", "image segmentation",
    "speech recognition", "asr", "tts", "robotics", "ros", "slam",
]

# ── Production Evidence Keywords (8.2) ───────────────────────────────────────
SCALE_KEYWORDS = [
    "served", "million requests", "production at scale", "real users",
    "live traffic", "sla", "users",
]
DEPLOY_KEYWORDS = [
    "deployed", "shipped", "launched", "rolled out", "went live",
    "a/b tested in production",
]
ENGINEERING_KEYWORDS = [
    "api", "endpoint", "monitoring", "alerting", "ci/cd",
    "code review", "unit tests", "inference",
]

# ── JD Skill Categories (Module 5) ───────────────────────────────────────────
JD_SKILL_CATEGORIES = {
    "embeddings_dense_retrieval": {
        "weight": 0.20,
        "keywords": [
            "sentence-transformers", "sbert", "openai embeddings", "bge", "e5",
            "embedding drift", "bi-encoder", "cross-encoder", "dense retrieval",
            "semantic search", "embeddings", "vector embeddings",
        ],
    },
    "vector_db_ann": {
        "weight": 0.20,
        "keywords": [
            "faiss", "pinecone", "qdrant", "weaviate", "milvus", "elasticsearch",
            "opensearch", "approximate nearest neighbor", "vector store",
            "similarity index", "ann search", "hnsw",
        ],
    },
    "retrieval_ranking": {
        "weight": 0.20,
        "keywords": [
            "bm25", "hybrid search", "re-ranking", "learning to rank", "ltr",
            "lambdamart", "ndcg", "mrr", "map", "retrieval pipeline",
            "ranking model", "relevance scoring", "ranking systems",
        ],
    },
    "llms_nlp": {
        "weight": 0.15,
        "keywords": [
            "fine-tuning", "lora", "qlora", "peft", "transformers", "bert",
            "rag", "llm", "language model", "nlp", "text classification",
            "question answering", "gpt", "llama",
        ],
    },
    "evaluation_experimentation": {
        "weight": 0.15,
        "keywords": [
            "ndcg", "map", "mrr", "a/b testing", "offline evaluation",
            "experiment design", "eval framework", "ranking metrics",
            "precision", "recall", "f1",
        ],
    },
    "python_production": {
        "weight": 0.10,
        "keywords": [
            "python", "fastapi", "production code", "system design",
            "api design", "testing", "ci/cd", "deployment",
            "pytorch", "tensorflow", "numpy", "pandas",
        ],
    },
}

PREFERRED_SKILLS = [
    "faiss", "pinecone", "weaviate", "learning to rank", "ltr",
    "llm fine-tuning", "hr-tech", "hr tech",
]

# ── Location Scoring Map ──────────────────────────────────────────────────────
LOCATION_SCORES = {
    # Tier 1: preferred
    "pune": 1.00,
    "noida": 1.00,
    # Tier 2: india tier-1 cities
    "bengaluru": 0.95,
    "bangalore": 0.95,
    "mumbai": 0.90,
    "hyderabad": 0.90,
    "chennai": 0.85,
    "delhi": 0.85,
    "new delhi": 0.85,
    "gurgaon": 0.85,
    "gurugram": 0.85,
    "kolkata": 0.80,
    "ahmedabad": 0.80,
    "india": 0.75,  # generic India
}
DEFAULT_LOCATION_SCORE = 0.50  # international or unknown

# ── Education Tier Scoring ────────────────────────────────────────────────────
EDUCATION_TIER_SCORES = {
    "tier_1": 0.95,
    "tier_2": 0.80,
    "tier_3": 0.65,
    "tier_4": 0.50,
    "unknown": 0.45,
}

# ── Proficiency Weights (Skill Trust) ─────────────────────────────────────────
PROFICIENCY_WEIGHTS = {
    "expert": 1.00,
    "advanced": 0.80,
    "intermediate": 0.55,
    "beginner": 0.25,
}

# ── Company Type Base Scores (Career Module 6) ────────────────────────────────
KNOWN_PRODUCT_COMPANIES = {
    "amazon", "google", "microsoft", "meta", "apple", "netflix",
    "flipkart", "swiggy", "meesho", "zomato", "razorpay", "phonepe",
    "paytm", "ola", "cred", "dunzo", "udaan", "juspay", "freshworks",
    "zoho", "inmobi", "myntra", "nykaa", "urban company", "sharechat",
    "moengage", "cleartax", "groww", "zerodha", "upstox",
}

COMPANY_TYPE_SCORES = {
    "product_startup": 1.00,
    "large_product": 0.95,
    "funded_startup": 0.95,
    "fintech_edtech": 0.85,
    "large_non_tech": 0.65,
    "it_services": 0.50,
    "consulting": 0.30,
}

# ── Seniority Score Map (Career Module 6) ─────────────────────────────────────
SENIORITY_PATTERNS = [
    (["senior", "staff", "principal"], ["ml engineer", "ai engineer", "data scientist", "nlp engineer", "applied scientist"], 0.95),
    (["ml engineer", "ai engineer", "data scientist", "nlp engineer", "research scientist"], [], 0.85),
    (["senior software engineer", "senior backend", "senior data"], [], 0.80),
    (["lead engineer", "tech lead"], [], 0.80),
    (["software engineer", "backend engineer", "data engineer"], [], 0.65),
    (["junior", "associate", "trainee"], [], 0.50),
    (["manager", "director", "vp", "head of"], [], 0.45),
    (["research scientist"], ["no production"], 0.55),
]

# ── Scoring thresholds ────────────────────────────────────────────────────────
TITLE_GATE_THRESHOLD = 0.05   # titles with score < this get score * 0.1 immediately
EXPERIENCE_PEAK = 7.0
EXPERIENCE_SIGMA = 3.5

# ── Honeypot evidence thresholds ──────────────────────────────────────────────
HONEYPOT_CONFIDENCE_THRESHOLDS = {
    "clean": 0.30,         # < 0.30 → no penalty
    "suspicious": 0.55,    # 0.30-0.55 → 0.55x penalty
    "likely": 0.75,        # 0.55-0.75 → 0.15x penalty
    "impossible": 1.01,    # >= 0.75 → 0.0 (excluded)
}
HONEYPOT_PENALTIES = {
    "clean": 1.00,
    "suspicious": 0.55,
    "likely": 0.15,
    "impossible": 0.00,
}
