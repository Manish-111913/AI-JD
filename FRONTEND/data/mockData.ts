export interface Candidate {
  candidate_id: string;
  anonymized_name: string;
  current_title: string;
  current_company: string;
  location: string;
  country: string;
  years_of_experience: number;
  headline: string;
  summary: string;
  skills: Array<{
    name: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    duration_months: number;
    endorsement_count: number;
    assessment_score?: number;
  }>;
  career_history: Array<{
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    duration_months: number;
    company_size: string;
    industry: string;
    description: string;
    company_type: 'product' | 'consulting' | 'research' | 'startup';
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number;
    end_year: number;
    grade: string;
    institution_tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'unknown';
  }>;
  redrob_signals: {
    open_to_work_flag: boolean;
    last_active_date: string;
    recruiter_response_rate: number;
    avg_response_time_hours: number;
    notice_period_days: number;
    profile_completeness_score: number;
    github_activity_score: number;
    interview_completion_rate: number;
    offer_acceptance_rate: number;
    connection_count: number;
    endorsements_received: number;
    profile_views_received_30d: number;
    saved_by_recruiters_30d: number;
    search_appearance_30d: number;
    applications_submitted_30d: number;
    preferred_work_mode: 'remote' | 'hybrid' | 'onsite';
    willing_to_relocate: boolean;
    expected_salary_range_inr_lpa: string;
    verified_email: boolean;
    verified_phone: boolean;
    linkedin_connected: boolean;
  };
}

export interface RankedCandidate extends Candidate {
  rank: number;
  algo_rank: number;
  final_score: number;
  skill_score: number;
  skill_semantic_component: number;
  skill_keyword_component: number;
  career_score: number;
  experience_score: number;
  location_score: number;
  education_score: number;
  behavioral_multiplier: number;
  disqualifier_penalty: number;
  platform_quality_score: number;
  honeypot_confidence: number;
  honeypot_flags: string[];
  ce_score: number;
  ce_reasoning: string;
  llm_concern: string;
  rank_delta: number;
  reasoning: string;
  candidate_summary_sent_to_llm: string;
  jd_context_sent_to_llm: string;
  blend_calculation: string;
}

const jdContext = `Role: Senior AI Engineer - Founding Team at Redrob AI. Requirements: 5-9 years experience. Hard skills: Dense retrieval, vector databases (FAISS/Weaviate/Pinecone), ranking systems, Python, evaluation frameworks (NDCG/MRR). Preferred: LLM fine-tuning, learning-to-rank, HR-tech. Disqualifiers: All-consulting career, pure research no production, Computer Vision only.`;

export const MOCK_RANKED_CANDIDATES: RankedCandidate[] = [
  {
    candidate_id: "CAND_0000001",
    anonymized_name: "Arjun M.",
    current_title: "Senior ML Engineer",
    current_company: "Swiggy",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 7,
    headline: "Senior ML Engineer | Search & Ranking | FAISS · Weaviate · Dense Retrieval | Ex-Flipkart",
    summary: "Machine Learning Engineer with 7 years building production search and recommendation systems at scale. Led the re-architecture of Swiggy's food search ranking pipeline, reducing P95 latency by 40% while improving click-through rate by 18%. Deep expertise in FAISS-based ANN search, sentence transformers, and online learning systems.",
    skills: [
      { name: "FAISS", proficiency: "expert", duration_months: 48, endorsement_count: 32, assessment_score: 91 },
      { name: "Weaviate", proficiency: "advanced", duration_months: 24, endorsement_count: 15 },
      { name: "Python", proficiency: "expert", duration_months: 84, endorsement_count: 55, assessment_score: 95 },
      { name: "Transformers / HuggingFace", proficiency: "advanced", duration_months: 36, endorsement_count: 22 },
      { name: "Ranking Systems", proficiency: "expert", duration_months: 60, endorsement_count: 40 },
      { name: "NDCG / MRR Evaluation", proficiency: "advanced", duration_months: 30, endorsement_count: 18 },
      { name: "Vector Embeddings", proficiency: "expert", duration_months: 42, endorsement_count: 28 },
      { name: "Spark / PySpark", proficiency: "intermediate", duration_months: 24, endorsement_count: 10 },
    ],
    career_history: [
      {
        title: "Senior ML Engineer",
        company: "Swiggy",
        start_date: "2021-06",
        end_date: "Present",
        duration_months: 34,
        company_size: "5001-10000",
        industry: "Food Tech / E-commerce",
        description: "Led search ranking team of 4 engineers. Built production recommendation system serving 40M users using dense retrieval and FAISS-based ANN search. Implemented two-tower model for query-item matching, reducing irrelevant search results by 32%. Deployed real-time feature store using Redis and Kafka.",
        company_type: "product"
      },
      {
        title: "ML Engineer",
        company: "Flipkart",
        start_date: "2019-07",
        end_date: "2021-05",
        duration_months: 22,
        company_size: "10001+",
        industry: "E-commerce",
        description: "Worked on product search relevance and catalog ranking. Built BERT-based query understanding pipeline processing 50M queries/day. Contributed to Flipkart's semantic search infrastructure.",
        company_type: "product"
      },
      {
        title: "Software Engineer - ML",
        company: "Naukri.com (Info Edge)",
        start_date: "2017-07",
        end_date: "2019-06",
        duration_months: 23,
        company_size: "1001-5000",
        industry: "HR Tech / Job Portals",
        description: "Built candidate-job matching algorithms. Developed skill extraction pipeline using NLP and implemented resume ranking for recruiter search. First exposure to HR-tech ranking systems.",
        company_type: "product"
      }
    ],
    education: [
      {
        institution: "IIT Madras",
        degree: "B.Tech",
        field: "Computer Science",
        start_year: 2013,
        end_year: 2017,
        grade: "8.5 / 10",
        institution_tier: "tier_1"
      }
    ],
    redrob_signals: {
      open_to_work_flag: true,
      last_active_date: "2024-06-10T10:00:00Z",
      recruiter_response_rate: 0.85,
      avg_response_time_hours: 12,
      notice_period_days: 60,
      profile_completeness_score: 0.95,
      github_activity_score: 0.88,
      interview_completion_rate: 0.90,
      offer_acceptance_rate: 0.80,
      connection_count: 847,
      endorsements_received: 120,
      profile_views_received_30d: 45,
      saved_by_recruiters_30d: 12,
      search_appearance_30d: 85,
      applications_submitted_30d: 2,
      preferred_work_mode: "hybrid",
      willing_to_relocate: true,
      expected_salary_range_inr_lpa: "45-60",
      verified_email: true,
      verified_phone: true,
      linkedin_connected: true
    },
    rank: 1, algo_rank: 4, final_score: 0.921,
    skill_score: 0.95, skill_semantic_component: 0.57, skill_keyword_component: 0.38,
    career_score: 0.90, experience_score: 0.88, location_score: 0.95, education_score: 0.95,
    behavioral_multiplier: 1.08, disqualifier_penalty: 1.0, platform_quality_score: 0.22,
    honeypot_confidence: 0.04, honeypot_flags: [],
    ce_score: 91, ce_reasoning: "Built production recommendation system serving 40M users using dense retrieval and FAISS-based ANN search — direct match for this role's core technical requirements. Prior HR-tech experience at Naukri.com directly relevant.", llm_concern: "",
    rank_delta: -3,
    reasoning: "Exceptional match. Production FAISS + dense retrieval at scale. HR-tech background. IIT Madras pedigree. Open to work. LLM recognized plain-language description of retrieval architecture that keyword scoring partially missed.",
    candidate_summary_sent_to_llm: "Arjun M., Senior ML Engineer at Swiggy (product company), 7 years. Built recommendation system for 40M users using dense retrieval and FAISS. Worked on job-candidate matching at Naukri. Skills: FAISS (expert, 48mo), Weaviate (advanced, 24mo), Python (expert, 84mo), Ranking Systems (expert, 60mo), NDCG/MRR (advanced). IIT Madras B.Tech CS. Currently open to work.",
    jd_context_sent_to_llm: jdContext,
    blend_calculation: "Final = 0.40 × 0.935 + 0.60 × (91/100) = 0.374 + 0.546 = 0.921"
  },
  {
    candidate_id: "CAND_0000002",
    anonymized_name: "Priya K.",
    current_title: "Lead AI Engineer",
    current_company: "Meesho",
    location: "Pune, India",
    country: "India",
    years_of_experience: 6,
    headline: "Lead AI Engineer | Semantic Search · Vector DBs · LLM Fine-tuning | Building hiring intelligence at Meesho",
    summary: "6 years of experience in NLP and search systems. Currently leading Meesho's AI-powered product discovery team. Pioneered adoption of vector embeddings for catalog search, achieving 28% improvement in search precision. Strong background in fine-tuning large language models for domain-specific tasks.",
    skills: [
      { name: "Vector Embeddings", proficiency: "expert", duration_months: 42, endorsement_count: 35, assessment_score: 88 },
      { name: "Pinecone", proficiency: "expert", duration_months: 18, endorsement_count: 20 },
      { name: "Ranking Systems", proficiency: "advanced", duration_months: 36, endorsement_count: 24 },
      { name: "LLM Fine-tuning (LoRA)", proficiency: "advanced", duration_months: 20, endorsement_count: 16 },
      { name: "Python", proficiency: "expert", duration_months: 72, endorsement_count: 48, assessment_score: 92 },
      { name: "NDCG / MAP Metrics", proficiency: "advanced", duration_months: 30, endorsement_count: 14 },
      { name: "PyTorch", proficiency: "advanced", duration_months: 36, endorsement_count: 20 },
    ],
    career_history: [
      {
        title: "Lead AI Engineer",
        company: "Meesho",
        start_date: "2022-01",
        end_date: "Present",
        duration_months: 29,
        company_size: "1001-5000",
        industry: "Social Commerce",
        description: "Leading team building AI-powered product discovery. Deployed Pinecone-based vector search replacing keyword search for 140M SKUs. Fine-tuned sentence-BERT on commerce data for domain-specific embeddings. Reduced search latency by 35%.",
        company_type: "product"
      },
      {
        title: "Senior ML Engineer",
        company: "Nykaa",
        start_date: "2020-03",
        end_date: "2021-12",
        duration_months: 21,
        company_size: "1001-5000",
        industry: "Beauty / E-commerce",
        description: "Built personalized recommendation engine using collaborative filtering and content-based signals. Implemented A/B testing framework for ranking experiments.",
        company_type: "product"
      },
      {
        title: "ML Engineer",
        company: "Belongs.co",
        start_date: "2018-07",
        end_date: "2020-02",
        duration_months: 19,
        company_size: "51-200",
        industry: "HR Tech",
        description: "Developed candidate ranking algorithms for a talent intelligence platform. Built NLP pipeline for resume parsing and skill extraction. Direct experience with candidate-job matching and talent intelligence.",
        company_type: "startup"
      }
    ],
    education: [
      {
        institution: "IIT Bombay",
        degree: "M.Tech",
        field: "Artificial Intelligence",
        start_year: 2016,
        end_year: 2018,
        grade: "8.8 / 10",
        institution_tier: "tier_1"
      }
    ],
    redrob_signals: {
      open_to_work_flag: true,
      last_active_date: "2024-06-08T14:30:00Z",
      recruiter_response_rate: 0.90,
      avg_response_time_hours: 8,
      notice_period_days: 45,
      profile_completeness_score: 0.97,
      github_activity_score: 0.82,
      interview_completion_rate: 0.92,
      offer_acceptance_rate: 0.85,
      connection_count: 623,
      endorsements_received: 98,
      profile_views_received_30d: 52,
      saved_by_recruiters_30d: 15,
      search_appearance_30d: 92,
      applications_submitted_30d: 3,
      preferred_work_mode: "hybrid",
      willing_to_relocate: true,
      expected_salary_range_inr_lpa: "42-55",
      verified_email: true,
      verified_phone: true,
      linkedin_connected: true
    },
    rank: 2, algo_rank: 7, final_score: 0.905,
    skill_score: 0.92, skill_semantic_component: 0.55, skill_keyword_component: 0.37,
    career_score: 0.88, experience_score: 0.82, location_score: 1.0, education_score: 0.97,
    behavioral_multiplier: 1.10, disqualifier_penalty: 1.0, platform_quality_score: 0.21,
    honeypot_confidence: 0.03, honeypot_flags: [],
    ce_score: 88, ce_reasoning: "Direct HR-tech experience at Belongs.co combined with production vector search expertise makes this candidate uniquely suited. LLM fine-tuning capability is a bonus for a founding team role.", llm_concern: "",
    rank_delta: -5,
    reasoning: "Strong fit. Pinecone + vector embeddings production experience. HR-tech background exactly relevant. IIT Bombay M.Tech AI. LLM promoted due to HR-tech experience that keyword scoring underweighted.",
    candidate_summary_sent_to_llm: "Priya K., Lead AI Engineer at Meesho (product), 6 years. Built Pinecone vector search for 140M SKUs. Fine-tuned sentence-BERT. Prior: talent intelligence at Belongs.co (HR-tech startup). Skills: Vector Embeddings (expert), Pinecone (expert), LLM Fine-tuning LoRA (advanced). IIT Bombay M.Tech AI.",
    jd_context_sent_to_llm: jdContext,
    blend_calculation: "Final = 0.40 × 0.872 + 0.60 × (88/100) = 0.349 + 0.528 = 0.905"
  },
  {
    candidate_id: "CAND_0000003",
    anonymized_name: "Rohan S.",
    current_title: "ML Platform Engineer",
    current_company: "Razorpay",
    location: "Noida, India",
    country: "India",
    years_of_experience: 8,
    headline: "ML Platform Engineer | Search Infrastructure · Evaluation Frameworks · Production ML | Razorpay",
    summary: "8 years building ML infrastructure and search systems. At Razorpay, architected the ML platform serving 200+ models in production. Deep expertise in offline evaluation frameworks (NDCG, MRR, precision@k) and online A/B testing for ranking systems. Strong Python and systems engineering background.",
    skills: [
      { name: "Python", proficiency: "expert", duration_months: 96, endorsement_count: 62, assessment_score: 97 },
      { name: "NDCG / MRR / MAP Evaluation", proficiency: "expert", duration_months: 48, endorsement_count: 30, assessment_score: 85 },
      { name: "Dense Retrieval", proficiency: "advanced", duration_months: 30, endorsement_count: 18 },
      { name: "Elasticsearch + Vector Search", proficiency: "expert", duration_months: 42, endorsement_count: 25 },
      { name: "Kubernetes / MLOps", proficiency: "advanced", duration_months: 36, endorsement_count: 20 },
      { name: "Ranking Systems", proficiency: "advanced", duration_months: 48, endorsement_count: 22 },
      { name: "A/B Testing Frameworks", proficiency: "expert", duration_months: 60, endorsement_count: 35 },
    ],
    career_history: [
      {
        title: "ML Platform Engineer",
        company: "Razorpay",
        start_date: "2020-09",
        end_date: "Present",
        duration_months: 44,
        company_size: "1001-5000",
        industry: "FinTech",
        description: "Architected ML platform serving 200+ production models. Built offline evaluation framework computing NDCG, MRR, and precision@k metrics for ranking systems. Implemented feature store and model registry.",
        company_type: "product"
      },
      {
        title: "Senior Software Engineer - ML",
        company: "Ola",
        start_date: "2018-06",
        end_date: "2020-08",
        duration_months: 26,
        company_size: "5001-10000",
        industry: "Ride-hailing",
        description: "Built driver-rider matching algorithms and supply prediction models. Developed real-time ranking system for driver allocation using bandit algorithms and contextual features.",
        company_type: "product"
      },
      {
        title: "Software Engineer",
        company: "Paytm",
        start_date: "2016-07",
        end_date: "2018-05",
        duration_months: 22,
        company_size: "10001+",
        industry: "FinTech",
        description: "Backend engineering and data pipelines. Contributed to fraud detection ML system and merchant ranking algorithms.",
        company_type: "product"
      }
    ],
    education: [
      {
        institution: "NIT Trichy",
        degree: "B.Tech",
        field: "Computer Science",
        start_year: 2012,
        end_year: 2016,
        grade: "8.9 / 10",
        institution_tier: "tier_2"
      }
    ],
    redrob_signals: {
      open_to_work_flag: false,
      last_active_date: "2024-05-28T09:00:00Z",
      recruiter_response_rate: 0.74,
      avg_response_time_hours: 18,
      notice_period_days: 90,
      profile_completeness_score: 0.88,
      github_activity_score: 0.75,
      interview_completion_rate: 0.85,
      offer_acceptance_rate: 0.70,
      connection_count: 512,
      endorsements_received: 87,
      profile_views_received_30d: 28,
      saved_by_recruiters_30d: 7,
      search_appearance_30d: 55,
      applications_submitted_30d: 0,
      preferred_work_mode: "onsite",
      willing_to_relocate: false,
      expected_salary_range_inr_lpa: "50-65",
      verified_email: true,
      verified_phone: true,
      linkedin_connected: true
    },
    rank: 3, algo_rank: 5, final_score: 0.883,
    skill_score: 0.88, skill_semantic_component: 0.51, skill_keyword_component: 0.37,
    career_score: 0.87, experience_score: 0.92, location_score: 1.0, education_score: 0.88,
    behavioral_multiplier: 0.97, disqualifier_penalty: 1.0, platform_quality_score: 0.18,
    honeypot_confidence: 0.05, honeypot_flags: [],
    ce_score: 85, ce_reasoning: "Strong evaluation framework expertise is critical for this role — most candidates lack it. Production MLOps depth at Razorpay signals engineering maturity needed for founding team.", llm_concern: "Not open to work — may need convincing. 90-day notice period.",
    rank_delta: -2,
    reasoning: "High evaluation expertise (NDCG/MRR/MAP). MLOps maturity. NIT Trichy. Not open to work is a flag but LLM recognized depth of evaluation skill that few candidates matched.",
    candidate_summary_sent_to_llm: "Rohan S., ML Platform Engineer at Razorpay, 8 years. Expert in NDCG/MRR/MAP evaluation frameworks. Built ML platform for 200+ production models. Dense retrieval and vector search experience. Not currently open to work. 90-day notice.",
    jd_context_sent_to_llm: jdContext,
    blend_calculation: "Final = 0.40 × 0.881 + 0.60 × (85/100) = 0.352 + 0.510 = 0.883"
  },
  {
    candidate_id: "CAND_0000004",
    anonymized_name: "Kavya N.",
    current_title: "AI Research Engineer",
    current_company: "Flipkart",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 7,
    headline: "AI Research Engineer | Semantic Search · Pinecone · Learning-to-Rank | Flipkart AI Lab",
    summary: "AI Research Engineer with 7 years specializing in semantic search and neural ranking. At Flipkart AI Lab, built the semantic product search system that serves 400M customers. Expert in learning-to-rank algorithms and vector database deployment.",
    skills: [
      { name: "Semantic Search", proficiency: "expert", duration_months: 48, endorsement_count: 38, assessment_score: 93 },
      { name: "Pinecone", proficiency: "expert", duration_months: 20, endorsement_count: 22 },
      { name: "Learning-to-Rank (LTR)", proficiency: "expert", duration_months: 36, endorsement_count: 28 },
      { name: "NDCG / MRR", proficiency: "advanced", duration_months: 36, endorsement_count: 18 },
      { name: "Python", proficiency: "expert", duration_months: 84, endorsement_count: 50, assessment_score: 94 },
      { name: "TensorFlow", proficiency: "advanced", duration_months: 42, endorsement_count: 20 },
      { name: "Dense Retrieval", proficiency: "advanced", duration_months: 30, endorsement_count: 16 },
    ],
    career_history: [
      {
        title: "AI Research Engineer",
        company: "Flipkart",
        start_date: "2020-08",
        end_date: "Present",
        duration_months: 46,
        company_size: "10001+",
        industry: "E-commerce",
        description: "Building semantic product search serving 400M customers. Implemented learning-to-rank models (LambdaMART, XGBoost ranker) with offline NDCG evaluation. Deployed Pinecone for product embeddings at 140M scale.",
        company_type: "product"
      },
      {
        title: "ML Engineer",
        company: "Amazon (India)",
        start_date: "2018-07",
        end_date: "2020-07",
        duration_months: 24,
        company_size: "10001+",
        industry: "E-commerce",
        description: "Search relevance team. Built query rewriting and ranking models for Amazon.in. Experience with large-scale distributed ML systems.",
        company_type: "product"
      },
      {
        title: "Junior Data Scientist",
        company: "Mu Sigma",
        start_date: "2017-06",
        end_date: "2018-06",
        duration_months: 12,
        company_size: "5001-10000",
        industry: "Analytics",
        description: "Statistical modeling and data analysis for retail clients.",
        company_type: "consulting"
      }
    ],
    education: [
      {
        institution: "IIT Delhi",
        degree: "B.Tech",
        field: "Mathematics and Computing",
        start_year: 2013,
        end_year: 2017,
        grade: "9.1 / 10",
        institution_tier: "tier_1"
      }
    ],
    redrob_signals: {
      open_to_work_flag: true,
      last_active_date: "2024-06-12T11:00:00Z",
      recruiter_response_rate: 0.92,
      avg_response_time_hours: 6,
      notice_period_days: 60,
      profile_completeness_score: 0.93,
      github_activity_score: 0.79,
      interview_completion_rate: 0.88,
      offer_acceptance_rate: 0.75,
      connection_count: 678,
      endorsements_received: 105,
      profile_views_received_30d: 38,
      saved_by_recruiters_30d: 10,
      search_appearance_30d: 72,
      applications_submitted_30d: 4,
      preferred_work_mode: "hybrid",
      willing_to_relocate: true,
      expected_salary_range_inr_lpa: "48-62",
      verified_email: true,
      verified_phone: true,
      linkedin_connected: true
    },
    rank: 4, algo_rank: 3, final_score: 0.878,
    skill_score: 0.93, skill_semantic_component: 0.56, skill_keyword_component: 0.37,
    career_score: 0.85, experience_score: 0.88, location_score: 0.95, education_score: 0.97,
    behavioral_multiplier: 1.05, disqualifier_penalty: 1.0, platform_quality_score: 0.19,
    honeypot_confidence: 0.06, honeypot_flags: [],
    ce_score: 89, ce_reasoning: "Learning-to-rank expertise is explicitly listed in JD preferred skills. Semantic search at Flipkart scale plus Pinecone deployment makes this a very strong technical fit.", llm_concern: "One year at Mu Sigma (consulting) early career — minor concern, well outweighed by product experience.",
    rank_delta: 1,
    reasoning: "Excellent fit. Learning-to-rank expertise is JD-specific preferred skill. IIT Delhi. Algorithmic score was slightly higher but LLM slightly tempered due to early consulting stint.",
    candidate_summary_sent_to_llm: "Kavya N., AI Research Engineer at Flipkart, 7 years. LTR expert, Pinecone at 140M scale, NDCG/MRR. One early year at Mu Sigma consulting. IIT Delhi MTCs. Open to work.",
    jd_context_sent_to_llm: jdContext,
    blend_calculation: "Final = 0.40 × 0.912 + 0.60 × (89/100) = 0.365 + 0.534 = 0.878"
  },
  {
    candidate_id: "CAND_0000005",
    anonymized_name: "Aditya P.",
    current_title: "Senior NLP Engineer",
    current_company: "PhonePe",
    location: "Pune, India",
    country: "India",
    years_of_experience: 6,
    headline: "Senior NLP Engineer | Transformers · Embeddings · Search Ranking | PhonePe",
    summary: "NLP and search engineer with 6 years experience. At PhonePe, built the natural language query understanding system for payment search. Expertise in transformer-based models, embeddings, and query-document matching. Contributed to open-source sentence-transformers library.",
    skills: [
      { name: "NLP / Transformers", proficiency: "expert", duration_months: 48, endorsement_count: 34, assessment_score: 90 },
      { name: "Sentence Transformers", proficiency: "expert", duration_months: 36, endorsement_count: 28 },
      { name: "Python", proficiency: "expert", duration_months: 72, endorsement_count: 45 },
      { name: "Dense Retrieval", proficiency: "advanced", duration_months: 30, endorsement_count: 20 },
      { name: "Vector Databases", proficiency: "advanced", duration_months: 24, endorsement_count: 15 },
      { name: "Ranking Systems", proficiency: "advanced", duration_months: 36, endorsement_count: 18 },
    ],
    career_history: [
      {
        title: "Senior NLP Engineer",
        company: "PhonePe",
        start_date: "2021-03",
        end_date: "Present",
        duration_months: 39,
        company_size: "1001-5000",
        industry: "FinTech",
        description: "Built query understanding for payment search handling 10M daily transactions. Implemented BiEncoder-based semantic search replacing keyword search. Open-source contributor to sentence-transformers.",
        company_type: "product"
      },
      {
        title: "NLP Engineer",
        company: "Sharechat",
        start_date: "2019-08",
        end_date: "2021-02",
        duration_months: 18,
        company_size: "501-1000",
        industry: "Social Media",
        description: "Content ranking and recommendation for 160M users. Built multilingual NLP models for Hindi and regional language understanding.",
        company_type: "product"
      },
      {
        title: "Software Engineer",
        company: "Persistent Systems",
        start_date: "2018-07",
        end_date: "2019-07",
        duration_months: 12,
        company_size: "10001+",
        industry: "IT Services",
        description: "Backend development for enterprise software products.",
        company_type: "consulting"
      }
    ],
    education: [
      {
        institution: "BITS Pilani",
        degree: "B.E.",
        field: "Computer Science",
        start_year: 2014,
        end_year: 2018,
        grade: "8.4 / 10",
        institution_tier: "tier_1"
      }
    ],
    redrob_signals: {
      open_to_work_flag: true,
      last_active_date: "2024-06-15T08:00:00Z",
      recruiter_response_rate: 0.88,
      avg_response_time_hours: 10,
      notice_period_days: 45,
      profile_completeness_score: 0.91,
      github_activity_score: 0.92,
      interview_completion_rate: 0.85,
      offer_acceptance_rate: 0.80,
      connection_count: 432,
      endorsements_received: 76,
      profile_views_received_30d: 35,
      saved_by_recruiters_30d: 9,
      search_appearance_30d: 68,
      applications_submitted_30d: 2,
      preferred_work_mode: "remote",
      willing_to_relocate: false,
      expected_salary_range_inr_lpa: "40-52",
      verified_email: true,
      verified_phone: true,
      linkedin_connected: true
    },
    rank: 5, algo_rank: 6, final_score: 0.862,
    skill_score: 0.88, skill_semantic_component: 0.53, skill_keyword_component: 0.35,
    career_score: 0.86, experience_score: 0.80, location_score: 1.0, education_score: 0.90,
    behavioral_multiplier: 1.05, disqualifier_penalty: 1.0, platform_quality_score: 0.23,
    honeypot_confidence: 0.05, honeypot_flags: [],
    ce_score: 83, ce_reasoning: "Open-source contributor to sentence-transformers signals genuine expertise beyond job duties. Strong NLP-to-ranking pipeline experience directly applicable.", llm_concern: "",
    rank_delta: -1,
    reasoning: "Strong NLP + embedding expertise. Open source contributions verified. BITS Pilani. High GitHub score (0.92) reflects genuine technical depth.",
    candidate_summary_sent_to_llm: "Aditya P., Senior NLP Engineer at PhonePe, 6 years. Built semantic search for 10M daily payment queries. Open-source contributor to sentence-transformers. Dense retrieval, vector DBs. BITS Pilani CS.",
    jd_context_sent_to_llm: jdContext,
    blend_calculation: "Final = 0.40 × 0.873 + 0.60 × (83/100) = 0.349 + 0.498 = 0.862"
  },
  {
    candidate_id: "CAND_0000006",
    anonymized_name: "Vikram R.",
    current_title: "ML Engineer",
    current_company: "Zomato",
    location: "Noida, India",
    country: "India",
    years_of_experience: 5,
    headline: "ML Engineer | Search & Recommendation | Zomato",
    summary: "5 years in ML with focus on search and recommendation at consumer internet companies. At Zomato, built restaurant ranking algorithm that improved order conversion by 22%.",
    skills: [
      { name: "Python", proficiency: "expert", duration_months: 60, endorsement_count: 32 },
      { name: "Recommendation Systems", proficiency: "advanced", duration_months: 36, endorsement_count: 20 },
      { name: "Elasticsearch", proficiency: "advanced", duration_months: 30, endorsement_count: 15 },
      { name: "TensorFlow", proficiency: "advanced", duration_months: 30, endorsement_count: 14 },
      { name: "Vector Embeddings", proficiency: "intermediate", duration_months: 18, endorsement_count: 8 },
    ],
    career_history: [
      { title: "ML Engineer", company: "Zomato", start_date: "2021-04", end_date: "Present", duration_months: 38, company_size: "5001-10000", industry: "Food Tech", description: "Restaurant ranking and recommendation. Built contextual bandit for restaurant ordering. Improved order conversion by 22% using personalized ranking.", company_type: "product" },
      { title: "Data Scientist", company: "Urban Company", start_date: "2019-07", end_date: "2021-03", duration_months: 20, company_size: "501-1000", industry: "Services", description: "Demand forecasting and service provider ranking.", company_type: "product" }
    ],
    education: [{ institution: "IIIT Hyderabad", degree: "B.Tech", field: "CSE", start_year: 2015, end_year: 2019, grade: "8.2/10", institution_tier: "tier_1" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-05T10:00:00Z", recruiter_response_rate: 0.80, avg_response_time_hours: 14, notice_period_days: 60, profile_completeness_score: 0.85, github_activity_score: 0.65, interview_completion_rate: 0.82, offer_acceptance_rate: 0.78, connection_count: 312, endorsements_received: 54, profile_views_received_30d: 22, saved_by_recruiters_30d: 6, search_appearance_30d: 48, applications_submitted_30d: 3, preferred_work_mode: "hybrid", willing_to_relocate: true, expected_salary_range_inr_lpa: "32-42", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 6, algo_rank: 8, final_score: 0.831,
    skill_score: 0.78, skill_semantic_component: 0.47, skill_keyword_component: 0.31, career_score: 0.83, experience_score: 0.78, location_score: 1.0, education_score: 0.90, behavioral_multiplier: 1.0, disqualifier_penalty: 1.0, platform_quality_score: 0.15,
    honeypot_confidence: 0.06, honeypot_flags: [],
    ce_score: 79, ce_reasoning: "Good ranking systems experience at product companies. Vector embedding knowledge emerging but not yet expert. Solid overall profile.", llm_concern: "Vector embedding depth is intermediate — may need ramp-up time.",
    rank_delta: -2, reasoning: "Good ranking experience at product companies. IIIT-H pedigree. Vector DB knowledge emerging.",
    candidate_summary_sent_to_llm: "Vikram R., ML Engineer at Zomato, 5 years. Restaurant ranking + recommendation. Elasticsearch, vector embeddings (intermediate). IIIT Hyderabad.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.849 + 0.60 × (79/100) = 0.340 + 0.474 = 0.831"
  },
  {
    candidate_id: "CAND_0000007",
    anonymized_name: "Sneha G.",
    current_title: "Senior Data Scientist",
    current_company: "Udaan",
    location: "Hyderabad, India",
    country: "India",
    years_of_experience: 7,
    headline: "Senior Data Scientist | B2B Search Ranking | NLP | Udaan",
    summary: "7 years in data science and ML. Led Udaan's B2B product search ranking system, managing a team of 3. Strong Python and statistical modeling background with growing expertise in vector search.",
    skills: [
      { name: "Python", proficiency: "expert", duration_months: 84, endorsement_count: 40 },
      { name: "NLP", proficiency: "advanced", duration_months: 48, endorsement_count: 22 },
      { name: "Ranking Systems", proficiency: "advanced", duration_months: 42, endorsement_count: 20 },
      { name: "Statistical Modeling", proficiency: "expert", duration_months: 60, endorsement_count: 28 },
      { name: "FAISS", proficiency: "intermediate", duration_months: 12, endorsement_count: 6 },
    ],
    career_history: [
      { title: "Senior Data Scientist", company: "Udaan", start_date: "2020-02", end_date: "Present", duration_months: 52, company_size: "1001-5000", industry: "B2B Commerce", description: "Led B2B search ranking team. Built query-product matching using gradient boosted trees with 80+ features. Introduced semantic matching layer improving recall by 18%.", company_type: "product" },
      { title: "Data Scientist", company: "MakeMyTrip", start_date: "2017-07", end_date: "2020-01", duration_months: 30, company_size: "1001-5000", industry: "Travel", description: "Hotel and flight ranking algorithms. A/B testing framework.", company_type: "product" }
    ],
    education: [{ institution: "IIT Kharagpur", degree: "B.Tech", field: "Mathematics", start_year: 2013, end_year: 2017, grade: "8.0/10", institution_tier: "tier_1" }],
    redrob_signals: { open_to_work_flag: false, last_active_date: "2024-05-20T09:00:00Z", recruiter_response_rate: 0.65, avg_response_time_hours: 24, notice_period_days: 90, profile_completeness_score: 0.82, github_activity_score: 0.55, interview_completion_rate: 0.80, offer_acceptance_rate: 0.72, connection_count: 445, endorsements_received: 68, profile_views_received_30d: 15, saved_by_recruiters_30d: 4, search_appearance_30d: 35, applications_submitted_30d: 0, preferred_work_mode: "onsite", willing_to_relocate: false, expected_salary_range_inr_lpa: "40-52", verified_email: true, verified_phone: false, linkedin_connected: true },
    rank: 7, algo_rank: 9, final_score: 0.814,
    skill_score: 0.75, skill_semantic_component: 0.44, skill_keyword_component: 0.31, career_score: 0.84, experience_score: 0.90, location_score: 0.90, education_score: 0.92, behavioral_multiplier: 0.88, disqualifier_penalty: 1.0, platform_quality_score: 0.13,
    honeypot_confidence: 0.05, honeypot_flags: [],
    ce_score: 76, ce_reasoning: "Strong ranking systems experience and IIT background. FAISS knowledge is basic which is a gap. Not open to work may complicate hiring.", llm_concern: "Not open to work. 90-day notice. FAISS/vector DB depth is limited.",
    rank_delta: -2, reasoning: "Solid ranking experience at product companies. IIT Kharagpur. Behavioral multiplier reduced by inactivity and low response rate.",
    candidate_summary_sent_to_llm: "Sneha G., Senior Data Scientist at Udaan, 7 years. B2B search ranking. FAISS (intermediate, 12 months). Not open to work, 90-day notice. IIT Kharagpur Maths.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.841 + 0.60 × (76/100) = 0.336 + 0.456 = 0.814"
  },
  {
    candidate_id: "CAND_0000008",
    anonymized_name: "Rahul V.",
    current_title: "Applied Scientist",
    current_company: "Microsoft (India)",
    location: "Hyderabad, India",
    country: "India",
    years_of_experience: 6,
    headline: "Applied Scientist | Information Retrieval · Bing Search | Microsoft India",
    summary: "Applied Scientist at Microsoft working on Bing search ranking. 6 years in information retrieval and ranking. Deep understanding of query-document relevance and large-scale search systems.",
    skills: [
      { name: "Information Retrieval", proficiency: "expert", duration_months: 48, endorsement_count: 35 },
      { name: "Python", proficiency: "expert", duration_months: 72, endorsement_count: 40 },
      { name: "Dense Retrieval", proficiency: "advanced", duration_months: 30, endorsement_count: 20 },
      { name: "C#/.NET", proficiency: "advanced", duration_months: 48, endorsement_count: 18 },
      { name: "NDCG Evaluation", proficiency: "expert", duration_months: 48, endorsement_count: 25 },
    ],
    career_history: [
      { title: "Applied Scientist", company: "Microsoft (India)", start_date: "2020-06", end_date: "Present", duration_months: 48, company_size: "10001+", industry: "Technology", description: "Bing search ranking improvements. NDCG-based offline evaluation pipeline. Dense retrieval experiments with bi-encoder models.", company_type: "product" },
      { title: "Research Engineer", company: "Samsung Research India", start_date: "2018-07", end_date: "2020-05", duration_months: 22, company_size: "10001+", industry: "Consumer Electronics", description: "NLP research for voice assistant. Query understanding and entity recognition.", company_type: "product" }
    ],
    education: [{ institution: "IIT Bombay", degree: "M.Tech", field: "Computer Science", start_year: 2016, end_year: 2018, grade: "9.0/10", institution_tier: "tier_1" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-01T12:00:00Z", recruiter_response_rate: 0.70, avg_response_time_hours: 20, notice_period_days: 90, profile_completeness_score: 0.88, github_activity_score: 0.60, interview_completion_rate: 0.88, offer_acceptance_rate: 0.65, connection_count: 380, endorsements_received: 72, profile_views_received_30d: 18, saved_by_recruiters_30d: 5, search_appearance_30d: 42, applications_submitted_30d: 1, preferred_work_mode: "hybrid", willing_to_relocate: true, expected_salary_range_inr_lpa: "48-65", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 8, algo_rank: 10, final_score: 0.803,
    skill_score: 0.82, skill_semantic_component: 0.50, skill_keyword_component: 0.32, career_score: 0.82, experience_score: 0.82, location_score: 0.90, education_score: 0.97, behavioral_multiplier: 0.95, disqualifier_penalty: 1.0, platform_quality_score: 0.15,
    honeypot_confidence: 0.04, honeypot_flags: [],
    ce_score: 81, ce_reasoning: "Bing search experience directly transferable. Strong NDCG evaluation depth. IIT Bombay M.Tech is strong pedigree. Vector DB deployment experience is limited.", llm_concern: "Limited startup experience — may struggle with founding team pace and ambiguity.",
    rank_delta: -2, reasoning: "Strong IR + evaluation expertise from Bing. IIT Bombay M.Tech. Some concern about startup readiness.",
    candidate_summary_sent_to_llm: "Rahul V., Applied Scientist at Microsoft, 6 years. Bing search ranking. NDCG expert, dense retrieval. IIT Bombay M.Tech CS. Open to work.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.822 + 0.60 × (81/100) = 0.329 + 0.486 = 0.803"
  },
  {
    candidate_id: "CAND_0000009",
    anonymized_name: "Deepika M.",
    current_title: "ML Engineer - Search",
    current_company: "Myntra",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 5,
    headline: "ML Engineer | Fashion Search & Ranking | Myntra",
    summary: "5 years building fashion search and ranking at Myntra. Led adoption of vector search for visual + text hybrid retrieval. Strong in multimodal embeddings and ranking.",
    skills: [
      { name: "Python", proficiency: "expert", duration_months: 60, endorsement_count: 30 },
      { name: "Vector Search (CLIP + FAISS)", proficiency: "advanced", duration_months: 24, endorsement_count: 18 },
      { name: "Ranking Systems", proficiency: "advanced", duration_months: 36, endorsement_count: 16 },
      { name: "PyTorch", proficiency: "advanced", duration_months: 36, endorsement_count: 15 },
    ],
    career_history: [
      { title: "ML Engineer - Search", company: "Myntra", start_date: "2021-07", end_date: "Present", duration_months: 35, company_size: "5001-10000", industry: "Fashion E-commerce", description: "Fashion search with CLIP-based multimodal embeddings and FAISS. Hybrid text+visual retrieval.", company_type: "product" },
      { title: "Data Scientist", company: "Lenskart", start_date: "2019-07", end_date: "2021-06", duration_months: 23, company_size: "501-1000", industry: "E-commerce", description: "Product recommendation and personalization.", company_type: "product" }
    ],
    education: [{ institution: "NSIT Delhi", degree: "B.Tech", field: "IT", start_year: 2015, end_year: 2019, grade: "8.5/10", institution_tier: "tier_2" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-11T09:00:00Z", recruiter_response_rate: 0.85, avg_response_time_hours: 12, notice_period_days: 30, profile_completeness_score: 0.87, github_activity_score: 0.70, interview_completion_rate: 0.85, offer_acceptance_rate: 0.80, connection_count: 278, endorsements_received: 45, profile_views_received_30d: 25, saved_by_recruiters_30d: 7, search_appearance_30d: 52, applications_submitted_30d: 4, preferred_work_mode: "hybrid", willing_to_relocate: true, expected_salary_range_inr_lpa: "30-40", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 9, algo_rank: 11, final_score: 0.784,
    skill_score: 0.76, skill_semantic_component: 0.46, skill_keyword_component: 0.30, career_score: 0.80, experience_score: 0.75, location_score: 0.95, education_score: 0.82, behavioral_multiplier: 1.05, disqualifier_penalty: 1.0, platform_quality_score: 0.16,
    honeypot_confidence: 0.05, honeypot_flags: [],
    ce_score: 74, ce_reasoning: "Multimodal FAISS experience is transferable to text-only dense retrieval. Fashion-domain might be a stretch for HR-tech, but ranking fundamentals are solid.", llm_concern: "Fashion-focused experience may not directly map to HR-tech talent intelligence domain.",
    rank_delta: -2, reasoning: "FAISS + vector search experience strong. Domain gap from fashion to HR-tech is minor. Low notice period (30 days) is attractive.",
    candidate_summary_sent_to_llm: "Deepika M., ML Engineer at Myntra, 5 years. CLIP+FAISS multimodal search. Ranking systems. NSIT Delhi IT.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.809 + 0.60 × (74/100) = 0.324 + 0.444 = 0.784"
  },
  {
    candidate_id: "CAND_0000010",
    anonymized_name: "Karan J.",
    current_title: "Principal Engineer - AI",
    current_company: "InMobi",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 9,
    headline: "Principal AI Engineer | Ad Ranking · CTR Prediction · Embeddings | InMobi",
    summary: "9 years in ML with principal-level experience in ad ranking and embedding-based retrieval. At InMobi, leading team of 8 engineers building real-time ad ranking at billion-impression scale.",
    skills: [
      { name: "Python", proficiency: "expert", duration_months: 108, endorsement_count: 58 },
      { name: "Ranking Systems", proficiency: "expert", duration_months: 72, endorsement_count: 45 },
      { name: "Embeddings / Dense Retrieval", proficiency: "advanced", duration_months: 36, endorsement_count: 22 },
      { name: "Distributed ML Systems", proficiency: "expert", duration_months: 60, endorsement_count: 30 },
      { name: "Leadership / Team Management", proficiency: "expert", duration_months: 48, endorsement_count: 35 },
    ],
    career_history: [
      { title: "Principal Engineer - AI", company: "InMobi", start_date: "2018-08", end_date: "Present", duration_months: 70, company_size: "1001-5000", industry: "AdTech", description: "Leading ad ranking team of 8. Real-time bidding and ad ranking at 1B+ impressions/day. Embedding-based advertiser targeting.", company_type: "product" },
      { title: "Senior ML Engineer", company: "Yahoo! India", start_date: "2016-06", end_date: "2018-07", duration_months: 25, company_size: "10001+", industry: "Internet", description: "Ad relevance and ranking.", company_type: "product" },
      { title: "Software Engineer", company: "Oracle", start_date: "2015-07", end_date: "2016-05", duration_months: 10, company_size: "10001+", industry: "Enterprise Software", description: "Database engineering.", company_type: "product" }
    ],
    education: [{ institution: "IISc Bangalore", degree: "M.Tech", field: "AI/ML", start_year: 2013, end_year: 2015, grade: "8.7/10", institution_tier: "tier_1" }],
    redrob_signals: { open_to_work_flag: false, last_active_date: "2024-04-15T10:00:00Z", recruiter_response_rate: 0.55, avg_response_time_hours: 36, notice_period_days: 90, profile_completeness_score: 0.80, github_activity_score: 0.45, interview_completion_rate: 0.75, offer_acceptance_rate: 0.60, connection_count: 720, endorsements_received: 140, profile_views_received_30d: 8, saved_by_recruiters_30d: 3, search_appearance_30d: 25, applications_submitted_30d: 0, preferred_work_mode: "onsite", willing_to_relocate: false, expected_salary_range_inr_lpa: "70-90", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 10, algo_rank: 12, final_score: 0.771,
    skill_score: 0.79, skill_semantic_component: 0.47, skill_keyword_component: 0.32, career_score: 0.90, experience_score: 0.95, location_score: 0.95, education_score: 0.95, behavioral_multiplier: 0.82, disqualifier_penalty: 1.0, platform_quality_score: 0.12,
    honeypot_confidence: 0.05, honeypot_flags: [],
    ce_score: 72, ce_reasoning: "Strong at-scale ranking experience. However, salary expectations (70-90L) may be beyond founding-team budget. Not open to work reduces urgency.", llm_concern: "High salary expectations and not open to work. Behavioral signals suggest passive candidate.",
    rank_delta: -2, reasoning: "Very senior profile, slight over-qualification. Behavioral multiplier penalized due to inactivity and low response rate. Salary expectations high.",
    candidate_summary_sent_to_llm: "Karan J., Principal AI Engineer at InMobi, 9 years. Ad ranking at 1B+ impressions. Embedding-based retrieval. Not open to work. 70-90L salary ask. IISc M.Tech.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.845 + 0.60 × (72/100) = 0.338 + 0.432 = 0.771"
  },
  // Ranks 11-17: Decent candidates
  {
    candidate_id: "CAND_0000011",
    anonymized_name: "Ananya S.",
    current_title: "ML Engineer",
    current_company: "Paytm",
    location: "Noida, India",
    country: "India",
    years_of_experience: 5,
    headline: "ML Engineer | NLP · Search | Paytm",
    summary: "5 years in NLP and search. Built payment search and query suggestion at Paytm.",
    skills: [{ name: "Python", proficiency: "expert", duration_months: 60, endorsement_count: 28 }, { name: "NLP", proficiency: "advanced", duration_months: 36, endorsement_count: 18 }, { name: "Elasticsearch", proficiency: "advanced", duration_months: 30, endorsement_count: 12 }],
    career_history: [{ title: "ML Engineer", company: "Paytm", start_date: "2021-01", end_date: "Present", duration_months: 41, company_size: "10001+", industry: "FinTech", description: "Payment search and NLP query understanding. Elasticsearch-based search with NLP filters.", company_type: "product" }, { title: "Software Engineer", company: "Wipro", start_date: "2019-07", end_date: "2020-12", duration_months: 17, company_size: "10001+", industry: "IT Services", description: "Backend development.", company_type: "consulting" }],
    education: [{ institution: "VIT Vellore", degree: "B.Tech", field: "CS", start_year: 2015, end_year: 2019, grade: "8.8/10", institution_tier: "tier_3" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-09T10:00:00Z", recruiter_response_rate: 0.82, avg_response_time_hours: 14, notice_period_days: 60, profile_completeness_score: 0.83, github_activity_score: 0.60, interview_completion_rate: 0.80, offer_acceptance_rate: 0.75, connection_count: 220, endorsements_received: 38, profile_views_received_30d: 18, saved_by_recruiters_30d: 4, search_appearance_30d: 40, applications_submitted_30d: 3, preferred_work_mode: "hybrid", willing_to_relocate: true, expected_salary_range_inr_lpa: "28-38", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 11, algo_rank: 13, final_score: 0.748, skill_score: 0.72, skill_semantic_component: 0.43, skill_keyword_component: 0.29, career_score: 0.75, experience_score: 0.75, location_score: 1.0, education_score: 0.72, behavioral_multiplier: 1.02, disqualifier_penalty: 1.0, platform_quality_score: 0.14,
    honeypot_confidence: 0.07, honeypot_flags: [], ce_score: 70, ce_reasoning: "Solid NLP and search experience at Paytm. No vector DB exposure yet. Early Wipro stint is minor consulting flag.", llm_concern: "", rank_delta: -2,
    reasoning: "Good NLP + search profile. Limited vector DB experience. Location (Noida) is ideal.", candidate_summary_sent_to_llm: "Ananya S., ML Engineer at Paytm, 5 years. Payment search NLP. No vector DB. VIT Vellore.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.760 + 0.60 × (70/100) = 0.304 + 0.420 = 0.748"
  },
  {
    candidate_id: "CAND_0000012",
    anonymized_name: "Siddharth A.",
    current_title: "Senior Data Scientist",
    current_company: "Byju's",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 6,
    headline: "Senior Data Scientist | EdTech AI | Learning Recommendations",
    summary: "6 years in ML with focus on educational content recommendation and adaptive learning systems. Strong in collaborative filtering and embedding-based recommendations.",
    skills: [{ name: "Python", proficiency: "expert", duration_months: 72, endorsement_count: 35 }, { name: "Recommendation Systems", proficiency: "expert", duration_months: 48, endorsement_count: 28 }, { name: "Embeddings", proficiency: "intermediate", duration_months: 18, endorsement_count: 10 }, { name: "A/B Testing", proficiency: "advanced", duration_months: 36, endorsement_count: 16 }],
    career_history: [{ title: "Senior Data Scientist", company: "Byju's", start_date: "2020-03", end_date: "Present", duration_months: 50, company_size: "10001+", industry: "EdTech", description: "Content recommendation for 100M students. Collaborative filtering + matrix factorization. Adaptive learning path optimization.", company_type: "product" }, { title: "Data Scientist", company: "Practo", start_date: "2018-07", end_date: "2020-02", duration_months: 19, company_size: "501-1000", industry: "HealthTech", description: "Doctor ranking and appointment recommendation.", company_type: "product" }],
    education: [{ institution: "IIIT Bangalore", degree: "M.Tech", field: "Data Science", start_year: 2016, end_year: 2018, grade: "8.4/10", institution_tier: "tier_2" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-07T10:00:00Z", recruiter_response_rate: 0.78, avg_response_time_hours: 16, notice_period_days: 60, profile_completeness_score: 0.85, github_activity_score: 0.55, interview_completion_rate: 0.82, offer_acceptance_rate: 0.72, connection_count: 320, endorsements_received: 55, profile_views_received_30d: 20, saved_by_recruiters_30d: 5, search_appearance_30d: 45, applications_submitted_30d: 2, preferred_work_mode: "hybrid", willing_to_relocate: false, expected_salary_range_inr_lpa: "35-46", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 12, algo_rank: 14, final_score: 0.732, skill_score: 0.68, skill_semantic_component: 0.41, skill_keyword_component: 0.27, career_score: 0.78, experience_score: 0.82, location_score: 0.95, education_score: 0.88, behavioral_multiplier: 0.98, disqualifier_penalty: 1.0, platform_quality_score: 0.13,
    honeypot_confidence: 0.06, honeypot_flags: [], ce_score: 67, ce_reasoning: "Recommendation systems experience is transferable but embeddings knowledge is intermediate. EdTech domain is a stretch from HR-tech.", llm_concern: "No vector database experience. Embeddings are intermediate level.",
    rank_delta: -2, reasoning: "Good recommendation background. Limited vector DB / dense retrieval. EdTech domain gap.", candidate_summary_sent_to_llm: "Siddharth A., Senior Data Scientist at Byju's, 6 years. Collaborative filtering, embeddings (intermediate). IIIT Bangalore M.Tech DS.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.752 + 0.60 × (67/100) = 0.301 + 0.402 = 0.732"
  },
  // THE BIG LLM PROMOTION STORY - algo rank 35, LLM promotes to rank 13
  {
    candidate_id: "CAND_0000013",
    anonymized_name: "Harish K.",
    current_title: "Backend Engineer - Platform",
    current_company: "Groww",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 6,
    headline: "Backend Engineer | Platform & Data | Groww",
    summary: "6 years in platform engineering and data systems. At Groww, built the content matching system that connects investors with relevant financial content and investment opportunities based on their portfolio and behavior history. Also worked on real-time data pipelines and distributed systems.",
    skills: [{ name: "Python", proficiency: "expert", duration_months: 72, endorsement_count: 30 }, { name: "Distributed Systems", proficiency: "advanced", duration_months: 48, endorsement_count: 18 }, { name: "Kafka / Flink", proficiency: "advanced", duration_months: 36, endorsement_count: 14 }, { name: "Data Pipelines", proficiency: "expert", duration_months: 60, endorsement_count: 22 }, { name: "PostgreSQL", proficiency: "advanced", duration_months: 48, endorsement_count: 16 }],
    career_history: [
      { title: "Backend Engineer - Platform", company: "Groww", start_date: "2021-01", end_date: "Present", duration_months: 41, company_size: "1001-5000", industry: "FinTech", description: "Built system to match users with relevant investment content and opportunities based on their portfolio history, behavioral signals, and preferences. Uses collaborative filtering and content-based approaches. Also built real-time feature store for personalization. System serves 40M+ users.", company_type: "product" },
      { title: "Software Engineer", company: "Cleartax", start_date: "2018-07", end_date: "2020-12", duration_months: 29, company_size: "501-1000", industry: "FinTech", description: "Tax calculation engine and data pipelines. Built recommendation engine for tax-saving investment products.", company_type: "startup" }
    ],
    education: [{ institution: "NIT Calicut", degree: "B.Tech", field: "CS", start_year: 2014, end_year: 2018, grade: "8.3/10", institution_tier: "tier_2" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-13T10:00:00Z", recruiter_response_rate: 0.88, avg_response_time_hours: 10, notice_period_days: 30, profile_completeness_score: 0.82, github_activity_score: 0.72, interview_completion_rate: 0.85, offer_acceptance_rate: 0.82, connection_count: 245, endorsements_received: 42, profile_views_received_30d: 20, saved_by_recruiters_30d: 5, search_appearance_30d: 38, applications_submitted_30d: 2, preferred_work_mode: "hybrid", willing_to_relocate: true, expected_salary_range_inr_lpa: "32-42", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 13, algo_rank: 30, final_score: 0.718,
    skill_score: 0.45, skill_semantic_component: 0.27, skill_keyword_component: 0.18, career_score: 0.72, experience_score: 0.80, location_score: 0.95, education_score: 0.85, behavioral_multiplier: 1.05, disqualifier_penalty: 1.0, platform_quality_score: 0.17,
    honeypot_confidence: 0.05, honeypot_flags: [],
    ce_score: 82, ce_reasoning: "Built a system to match users with relevant content based on their history and behavioral signals — this IS candidate-job matching at a conceptual level, even without using the exact keywords FAISS or embeddings. The production scale (40M users) and systems depth are compelling for a founding team role.", llm_concern: "No explicit vector DB / FAISS keywords. May need onboarding on ML-specific retrieval libraries.",
    rank_delta: -17,
    reasoning: "KEY LLM PROMOTION: Algorithmic scoring missed this because the system used plain-language description of a user-content matching system. LLM recognized the conceptual equivalence to candidate-job ranking. Promoted 17 ranks.",
    candidate_summary_sent_to_llm: "Harish K., Backend Engineer at Groww, 6 years. Built system to match users with relevant investment content based on portfolio history and behavioral signals (40M users). Real-time feature store. Collaborative filtering. No explicit vector DB/FAISS keywords in profile. Strong systems engineer. Open to work, 30-day notice.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.634 + 0.60 × (82/100) = 0.254 + 0.492 = 0.718"
  },
  {
    candidate_id: "CAND_0000014",
    anonymized_name: "Pooja B.",
    current_title: "ML Engineer",
    current_company: "Dream11",
    location: "Mumbai, India",
    country: "India",
    years_of_experience: 5,
    headline: "ML Engineer | Fantasy Sports Ranking | Dream11",
    summary: "5 years in ML. At Dream11, built player performance prediction and team ranking systems for fantasy sports. Strong in gradient boosted trees and feature engineering.",
    skills: [{ name: "Python", proficiency: "expert", duration_months: 60, endorsement_count: 25 }, { name: "Gradient Boosting / XGBoost", proficiency: "expert", duration_months: 48, endorsement_count: 22 }, { name: "Feature Engineering", proficiency: "expert", duration_months: 48, endorsement_count: 18 }, { name: "Embeddings", proficiency: "beginner", duration_months: 6, endorsement_count: 3 }],
    career_history: [
      { title: "ML Engineer", company: "Dream11", start_date: "2021-05", end_date: "Present", duration_months: 37, company_size: "1001-5000", industry: "Fantasy Sports", description: "Player ranking and team optimization. XGBoost-based player performance prediction. Fantasy team recommendation.", company_type: "product" },
      { title: "Junior Data Scientist", company: "Mu Sigma", start_date: "2019-07", end_date: "2021-04", duration_months: 21, company_size: "5001-10000", industry: "Analytics", description: "Statistical modeling for retail clients.", company_type: "consulting" }
    ],
    education: [{ institution: "Mumbai University", degree: "B.E.", field: "CS", start_year: 2015, end_year: 2019, grade: "7.8/10", institution_tier: "tier_3" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-08T10:00:00Z", recruiter_response_rate: 0.75, avg_response_time_hours: 18, notice_period_days: 60, profile_completeness_score: 0.80, github_activity_score: 0.55, interview_completion_rate: 0.78, offer_acceptance_rate: 0.72, connection_count: 185, endorsements_received: 30, profile_views_received_30d: 15, saved_by_recruiters_30d: 3, search_appearance_30d: 30, applications_submitted_30d: 5, preferred_work_mode: "hybrid", willing_to_relocate: false, expected_salary_range_inr_lpa: "28-36", verified_email: true, verified_phone: true, linkedin_connected: false },
    rank: 14, algo_rank: 15, final_score: 0.701, skill_score: 0.58, skill_semantic_component: 0.35, skill_keyword_component: 0.23, career_score: 0.72, experience_score: 0.75, location_score: 0.85, education_score: 0.72, behavioral_multiplier: 0.97, disqualifier_penalty: 1.0, platform_quality_score: 0.13,
    honeypot_confidence: 0.08, honeypot_flags: [], ce_score: 65, ce_reasoning: "Strong ML fundamentals but fantasy sports domain is far from HR-tech. Consulting stint and limited embedding knowledge are gaps.", llm_concern: "Domain gap (fantasy sports to HR-tech) is significant. Embeddings experience is minimal.",
    rank_delta: -1, reasoning: "Decent ML profile but domain gap and limited embedding experience.", candidate_summary_sent_to_llm: "Pooja B., ML Engineer at Dream11, 5 years. Fantasy sports ranking. XGBoost expert. Embeddings beginner. Mu Sigma consulting background.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.729 + 0.60 × (65/100) = 0.292 + 0.390 = 0.701"
  },
  {
    candidate_id: "CAND_0000015",
    anonymized_name: "Nikhil T.",
    current_title: "AI Engineer",
    current_company: "CRED",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 4,
    headline: "AI Engineer | Personalization & Recommendations | CRED",
    summary: "4 years in AI with focus on financial product personalization at CRED. Strong in embedding models and recommendation systems. Working on vector-based user-offer matching.",
    skills: [{ name: "Python", proficiency: "expert", duration_months: 48, endorsement_count: 22 }, { name: "Embeddings", proficiency: "advanced", duration_months: 24, endorsement_count: 15 }, { name: "Recommendation Systems", proficiency: "advanced", duration_months: 30, endorsement_count: 14 }, { name: "Vector Search", proficiency: "intermediate", duration_months: 12, endorsement_count: 7 }],
    career_history: [
      { title: "AI Engineer", company: "CRED", start_date: "2022-02", end_date: "Present", duration_months: 28, company_size: "501-1000", industry: "FinTech", description: "Financial offer personalization using user embeddings. Built vector-based user-offer matching serving 35M users.", company_type: "startup" },
      { title: "ML Engineer", company: "Razorpay", start_date: "2020-07", end_date: "2022-01", duration_months: 18, company_size: "1001-5000", industry: "FinTech", description: "Fraud detection ML systems and payment recommendation.", company_type: "product" }
    ],
    education: [{ institution: "Bits Pilani", degree: "B.E.", field: "CS", start_year: 2016, end_year: 2020, grade: "8.1/10", institution_tier: "tier_1" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-14T10:00:00Z", recruiter_response_rate: 0.90, avg_response_time_hours: 8, notice_period_days: 30, profile_completeness_score: 0.88, github_activity_score: 0.75, interview_completion_rate: 0.90, offer_acceptance_rate: 0.85, connection_count: 210, endorsements_received: 38, profile_views_received_30d: 22, saved_by_recruiters_30d: 6, search_appearance_30d: 45, applications_submitted_30d: 3, preferred_work_mode: "hybrid", willing_to_relocate: true, expected_salary_range_inr_lpa: "25-35", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 15, algo_rank: 16, final_score: 0.688, skill_score: 0.68, skill_semantic_component: 0.41, skill_keyword_component: 0.27, career_score: 0.72, experience_score: 0.60, location_score: 0.95, education_score: 0.88, behavioral_multiplier: 1.08, disqualifier_penalty: 1.0, platform_quality_score: 0.18,
    honeypot_confidence: 0.05, honeypot_flags: [], ce_score: 71, ce_reasoning: "Good embedding + vector search foundation. 4 years is at the lower end of the 5-9 JD range but CRED + Razorpay startup experience shows growth trajectory.", llm_concern: "Only 4 years experience — below the 5-9 year JD target range.",
    rank_delta: -1, reasoning: "Good emerging vector DB skills. BITS Pilani + startup experience. Slightly under-experienced for the role.", candidate_summary_sent_to_llm: "Nikhil T., AI Engineer at CRED, 4 years. User-offer matching with embeddings and vector search. Razorpay background. BITS Pilani. Open to work.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.718 + 0.60 × (71/100) = 0.287 + 0.426 = 0.688"
  },
  // Ranks 16-35: Middle candidates with various issues
  ...Array.from({ length: 20 }, (_, i) => {
    const rank = 16 + i;
    const isConsulting = i >= 10 && i < 15;
    const isMixed = i >= 15;
    const locations = ["Delhi NCR, India", "Chennai, India", "Pune, India", "Hyderabad, India", "Bengaluru, India", "Mumbai, India", "Kolkata, India", "Jaipur, India"];
    const companies = ["Infosys BPM", "Accenture AI", "TechMahindra", "HCL AI Lab", "Cognizant AI", "Capgemini", "Wipro AI", "IBM India", "Deloitte AI", "EY AI Practice"];
    const productCompanies = ["Nykaa", "Healthify", "KhataBook", "Spinny", "Delhivery", "Slice", "BankBazaar", "PolicyBazaar", "Quikr", "NoBroker"];
    const titles = ["Data Scientist", "ML Engineer", "AI Engineer", "NLP Engineer", "Research Scientist", "Analytics Engineer", "Data Engineer", "Senior Analyst - AI"];
    const names = ["Prateek R.", "Divya L.", "Amit C.", "Sunita V.", "Manish P.", "Kritika S.", "Rohit D.", "Ashwini G.", "Varun K.", "Pallavi N.", "Suresh M.", "Archana T.", "Gaurav J.", "Priyanka A.", "Saurabh B.", "Neha P.", "Rishabh K.", "Tanvi S.", "Ajay W.", "Shipra L."];
    const llmScore = isConsulting ? 35 + Math.floor(Math.random() * 20) : 45 + Math.floor(Math.random() * 25);
    const finalScore = 0.68 - (i * 0.018) + (Math.random() * 0.01);
    const algoRank = rank + Math.floor(Math.random() * 5) - 2;
    const company = isConsulting ? companies[i - 10] : productCompanies[i % productCompanies.length];
    const companyType: 'product' | 'consulting' = isConsulting ? 'consulting' : 'product';
    const yoe = 3 + Math.floor(Math.random() * 8);
    const disqPenalty = isConsulting ? 0.45 : 1.0;

    return {
      candidate_id: `CAND_${String(rank).padStart(7, '0')}`,
      anonymized_name: names[i],
      current_title: titles[i % titles.length],
      current_company: company,
      location: locations[i % locations.length],
      country: "India",
      years_of_experience: yoe,
      headline: `${titles[i % titles.length]} at ${company}`,
      summary: `${yoe} years of experience in data science and ML. ${isConsulting ? "Worked across multiple client engagements in AI and analytics." : "Worked on ML systems at product companies."}`,
      skills: [
        { name: "Python", proficiency: "advanced" as const, duration_months: yoe * 10, endorsement_count: 15 + i },
        { name: "Machine Learning", proficiency: "advanced" as const, duration_months: yoe * 8, endorsement_count: 12 + i },
        { name: "SQL", proficiency: "expert" as const, duration_months: yoe * 12, endorsement_count: 20 + i },
      ],
      career_history: [{
        title: titles[i % titles.length],
        company,
        start_date: `${2020 - Math.floor(i / 4)}-0${(i % 9) + 1}`,
        end_date: "Present",
        duration_months: 24 + i * 3,
        company_size: isConsulting ? "10001+" : "501-5000",
        industry: isConsulting ? "IT Consulting" : "Technology",
        description: isConsulting ? `Delivered AI/ML solutions for ${2 + i} enterprise clients. Worked on demand forecasting, churn prediction, and basic NLP tasks.` : `Built ML models for ${company}. ${i % 3 === 0 ? "Some experience with ranking and recommendation." : "Data engineering and model training."}`,
        company_type: companyType
      }],
      education: [{ institution: `${["BITS", "PES University", "SRM University", "Manipal University", "DTU", "NSIT"][i % 6]} ${["Pilani", "Bengaluru", "Chennai", "Manipal", "Delhi", "Delhi"][i % 6]}`, degree: "B.Tech", field: "CS", start_year: 2014 + Math.floor(i / 4), end_year: 2018 + Math.floor(i / 4), grade: `${7 + (i % 3) * 0.5}/10`, institution_tier: (["tier_2", "tier_3", "tier_3", "tier_2"][i % 4]) as 'tier_2' | 'tier_3' }],
      redrob_signals: {
        open_to_work_flag: i % 3 !== 0, last_active_date: `2024-0${3 + (i % 4)}-${10 + i}T10:00:00Z`,
        recruiter_response_rate: 0.5 + (i % 5) * 0.08, avg_response_time_hours: 18 + i * 2, notice_period_days: 30 + (i % 4) * 15,
        profile_completeness_score: 0.7 - i * 0.01, github_activity_score: 0.4 - i * 0.01, interview_completion_rate: 0.75, offer_acceptance_rate: 0.70,
        connection_count: 150 + i * 15, endorsements_received: 20 + i * 2, profile_views_received_30d: 8 + i, saved_by_recruiters_30d: 2 + (i % 4),
        search_appearance_30d: 20 + i, applications_submitted_30d: i % 5, preferred_work_mode: (["hybrid", "remote", "onsite"][i % 3]) as 'hybrid' | 'remote' | 'onsite',
        willing_to_relocate: i % 2 === 0, expected_salary_range_inr_lpa: `${18 + i * 2}-${28 + i * 2}`, verified_email: true, verified_phone: i % 3 !== 0, linkedin_connected: i % 4 !== 0
      },
      rank, algo_rank: algoRank, final_score: Math.round(finalScore * 1000) / 1000,
      skill_score: 0.45 - i * 0.01, skill_semantic_component: 0.27 - i * 0.006, skill_keyword_component: 0.18 - i * 0.004,
      career_score: isConsulting ? 0.35 : 0.60 - i * 0.01, experience_score: 0.6 - i * 0.01, location_score: 0.8 - (i % 4) * 0.1,
      education_score: 0.65 - i * 0.01, behavioral_multiplier: 0.92 - i * 0.005, disqualifier_penalty: disqPenalty, platform_quality_score: 0.10 - i * 0.002,
      honeypot_confidence: 0.05 + (i % 5) * 0.02, honeypot_flags: [],
      ce_score: llmScore, ce_reasoning: isConsulting ? `All career experience at consulting firms. No evidence of owning production ML systems end-to-end.` : `Moderate ML experience at product company. Skills are generic without deep retrieval or ranking specialization.`,
      llm_concern: isConsulting ? "All consulting background — no product ownership or production ML system experience." : "",
      rank_delta: rank - algoRank, reasoning: `${isConsulting ? "Consulting disqualifier penalty applied. " : ""}Mid-tier candidate with general ML skills but no specialized retrieval/ranking expertise.`,
      candidate_summary_sent_to_llm: `${names[i]} at ${company}, ${yoe} years. General ML/DS experience. ${isConsulting ? "All consulting." : "Product company background."}`,
      jd_context_sent_to_llm: jdContext, blend_calculation: `Final = 0.40 × ${(finalScore / 0.8).toFixed(3)} + 0.60 × (${llmScore}/100) = ${((finalScore / 0.8) * 0.4).toFixed(3)} + ${(llmScore / 100 * 0.6).toFixed(3)} = ${finalScore.toFixed(3)}`
    } as RankedCandidate;
  }),
  // THE BIG LLM DEMOTION STORY - algo rank 17, LLM demotes to rank 36
  {
    candidate_id: "CAND_0000036",
    anonymized_name: "Rahul A.",
    current_title: "AI Researcher",
    current_company: "Independent",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 7,
    headline: "AI Researcher | Semantic Search Expert | Published Author | 5 Patents",
    summary: "7 years of AI research with 12 published papers on semantic search, vector databases, and ranking systems. Expert in FAISS, Weaviate, and dense retrieval. Multiple patents in AI-based search. Well-versed in all relevant technologies.",
    skills: [
      { name: "FAISS", proficiency: "expert", duration_months: 48, endorsement_count: 45 },
      { name: "Weaviate", proficiency: "expert", duration_months: 30, endorsement_count: 38 },
      { name: "Dense Retrieval", proficiency: "expert", duration_months: 54, endorsement_count: 42 },
      { name: "Python", proficiency: "expert", duration_months: 84, endorsement_count: 55 },
      { name: "NDCG / MRR", proficiency: "expert", duration_months: 48, endorsement_count: 35 },
    ],
    career_history: [
      { title: "Independent AI Researcher", company: "Self-employed", start_date: "2020-01", end_date: "Present", duration_months: 53, company_size: "1", industry: "Research", description: "Published 12 papers on semantic search and ranking. No production deployments. Academic research and consulting on AI topics. All work is theoretical / paper-based.", company_type: "research" },
      { title: "Research Scientist", company: "IISc", start_date: "2017-07", end_date: "2019-12", duration_months: 29, company_size: "501-1000", industry: "Academia", description: "PhD research on information retrieval. Pure academic research environment with no production ML systems.", company_type: "research" }
    ],
    education: [{ institution: "IISc Bangalore", degree: "PhD (incomplete)", field: "CS - Information Retrieval", start_year: 2017, end_year: 2022, grade: "Incomplete", institution_tier: "tier_1" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-01T10:00:00Z", recruiter_response_rate: 0.88, avg_response_time_hours: 12, notice_period_days: 0, profile_completeness_score: 0.95, github_activity_score: 0.25, interview_completion_rate: 0.70, offer_acceptance_rate: 0.50, connection_count: 320, endorsements_received: 85, profile_views_received_30d: 30, saved_by_recruiters_30d: 8, search_appearance_30d: 55, applications_submitted_30d: 8, preferred_work_mode: "remote", willing_to_relocate: false, expected_salary_range_inr_lpa: "40-55", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 36, algo_rank: 17, final_score: 0.498,
    skill_score: 0.91, skill_semantic_component: 0.55, skill_keyword_component: 0.36, career_score: 0.15, experience_score: 0.72, location_score: 0.95, education_score: 0.92, behavioral_multiplier: 0.85, disqualifier_penalty: 0.20, platform_quality_score: 0.08,
    honeypot_confidence: 0.10, honeypot_flags: ["Pure research with no production deployment history"],
    ce_score: 28, ce_reasoning: "Despite impressive keyword match, career descriptions confirm exclusively research/paper-based work with zero production deployments. JD explicitly requires production experience. This is a direct disqualifier case.",
    llm_concern: "All claimed AI work is from academic research and papers, no production deployment evidence whatsoever in 7 years. Low GitHub activity (0.25) confirms limited engineering output.",
    rank_delta: 19,
    reasoning: "KEY LLM DEMOTION: Algorithmic keyword scoring ranked this highly due to FAISS/Weaviate/NDCG keyword matches. LLM read the career descriptions and identified pure academic research with zero production deployments. JD disqualifier 'Pure research with no production deployment' applies directly. Demoted 19 ranks.",
    candidate_summary_sent_to_llm: "Rahul A., Independent AI Researcher, 7 years. 12 papers on semantic search. BUT: all work is independent research/papers, self-employed since 2020, no production ML systems ever deployed. GitHub activity score 0.25. Career at IISc and self-employed only. PhD incomplete.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = 0.40 × 0.712 + 0.60 × (28/100) = 0.285 + 0.168 = 0.498"
  },
  // More poor fit candidates 37-45
  ...Array.from({ length: 9 }, (_, i) => {
    const rank = 37 + i;
    const cvDomains = ["Computer Vision", "Computer Vision", "Robotics", "NLP (Academic)", "Generative AI", "Reinforcement Learning", "Audio ML", "Computer Vision", "Time Series"];
    const cvCompanies = ["Ather Energy", "Mad Street Den", "Addverb Technologies", "IIMA", "Adobe India", "Siemens AI", "Dolby India", "Bosch AI India", "EXL Analytics"];
    const cvTitles = ["CV Engineer", "Senior CV Researcher", "Robotics ML Engineer", "Research Associate", "ML Engineer - GenAI", "RL Engineer", "Audio ML Scientist", "CV Engineer", "Senior Analyst"];
    const names2 = ["Karthik M.", "Meera S.", "Abhinav P.", "Prof. Santosh K.", "Shruti T.", "Sanjay V.", "Ravi N.", "Lalitha B.", "Amit G."];
    const yoe = 3 + i + Math.floor(Math.random() * 3);
    const llmScore = 18 + Math.floor(Math.random() * 20);
    const finalScore = 0.46 - i * 0.025;

    return {
      candidate_id: `CAND_${String(rank).padStart(7, '0')}`,
      anonymized_name: names2[i],
      current_title: cvTitles[i],
      current_company: cvCompanies[i],
      location: ["Chennai, India", "Bengaluru, India", "Pune, India", "Ahmedabad, India", "Noida, India", "Mumbai, India", "Bengaluru, India", "Bengaluru, India", "Gurgaon, India"][i],
      country: "India",
      years_of_experience: yoe,
      headline: `${cvTitles[i]} | ${cvDomains[i]} Specialist`,
      summary: `${yoe} years specializing in ${cvDomains[i]}. Strong in deep learning but focused on non-NLP/IR domains.`,
      skills: [
        { name: "Python", proficiency: "expert" as const, duration_months: yoe * 10, endorsement_count: 20 },
        { name: cvDomains[i], proficiency: "expert" as const, duration_months: yoe * 12, endorsement_count: 25 },
        { name: "PyTorch", proficiency: "advanced" as const, duration_months: yoe * 10, endorsement_count: 18 },
      ],
      career_history: [{
        title: cvTitles[i], company: cvCompanies[i], start_date: `${2020 - i}-01`, end_date: "Present",
        duration_months: 36 + i * 6, company_size: "201-1000", industry: cvDomains[i],
        description: `Deep learning research and engineering in ${cvDomains[i]}. No experience with text retrieval, ranking systems, or NLP-based search.`,
        company_type: i === 3 ? "research" as const : "product" as const
      }],
      education: [{ institution: ["IIT Madras", "IIIT Hyderabad", "IIT Bombay", "IIM Ahmedabad", "IIT Delhi", "IIT Kanpur", "BITS Pilani", "NTU Singapore", "IIT Delhi"][i], degree: "M.Tech", field: cvDomains[i], start_year: 2016, end_year: 2018, grade: "8.5/10", institution_tier: "tier_1" as const }],
      redrob_signals: { open_to_work_flag: i % 2 === 0, last_active_date: `2024-0${2 + i}-10T10:00:00Z`, recruiter_response_rate: 0.60, avg_response_time_hours: 24, notice_period_days: 60, profile_completeness_score: 0.82, github_activity_score: 0.55, interview_completion_rate: 0.75, offer_acceptance_rate: 0.65, connection_count: 180, endorsements_received: 35, profile_views_received_30d: 12, saved_by_recruiters_30d: 3, search_appearance_30d: 28, applications_submitted_30d: 2, preferred_work_mode: "hybrid" as const, willing_to_relocate: i % 3 === 0, expected_salary_range_inr_lpa: "30-45", verified_email: true, verified_phone: i % 2 === 0, linkedin_connected: true },
      rank, algo_rank: rank + Math.floor(Math.random() * 3) - 1, final_score: Math.max(0.1, Math.round(finalScore * 1000) / 1000),
      skill_score: 0.20 - i * 0.01, skill_semantic_component: 0.12, skill_keyword_component: 0.08, career_score: 0.45, experience_score: 0.6, location_score: 0.85, education_score: 0.88,
      behavioral_multiplier: 0.90, disqualifier_penalty: i === 3 ? 0.20 : 1.0, platform_quality_score: 0.12,
      honeypot_confidence: 0.08 + i * 0.02, honeypot_flags: i === 3 ? ["Pure research background — no production deployment"] : [],
      ce_score: llmScore, ce_reasoning: `${cvDomains[i]} specialist with no NLP/IR experience. Domain expertise is orthogonal to this role.`,
      llm_concern: `Zero experience in text retrieval, ranking systems, or vector databases. ${cvDomains[i]} skills do not transfer.`,
      rank_delta: rank - (rank + Math.floor(Math.random() * 3) - 1),
      reasoning: `Wrong domain. ${cvDomains[i]} expertise doesn't map to dense retrieval and text ranking.`,
      candidate_summary_sent_to_llm: `${names2[i]}, ${cvTitles[i]}, ${yoe} years. Specialized in ${cvDomains[i]} only. No text search or ranking experience.`, jd_context_sent_to_llm: jdContext,
      blend_calculation: `Final = 0.40 × ${(finalScore * 1.2).toFixed(3)} + 0.60 × (${llmScore}/100) = ${(finalScore * 1.2 * 0.4).toFixed(3)} + ${(llmScore / 100 * 0.6).toFixed(3)} = ${Math.max(0.1, finalScore).toFixed(3)}`
    } as RankedCandidate;
  }),
  // Honeypot candidates 46-50
  {
    candidate_id: "CAND_0000046",
    anonymized_name: "Alex K.",
    current_title: "Full Stack AI Developer",
    current_company: "Freelance",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 25,
    headline: "Expert AI Engineer | 15+ Years FAISS | 15+ Years Weaviate | Published 50 Papers",
    summary: "25 years of experience across all AI domains. Expert in every technology listed in any job description.",
    skills: [
      { name: "FAISS", proficiency: "expert", duration_months: 0, endorsement_count: 0 },
      { name: "Weaviate", proficiency: "expert", duration_months: 0, endorsement_count: 0 },
      { name: "Dense Retrieval", proficiency: "expert", duration_months: 0, endorsement_count: 0 },
      { name: "Python", proficiency: "expert", duration_months: 0, endorsement_count: 0 },
      { name: "NDCG / MRR", proficiency: "expert", duration_months: 0, endorsement_count: 0 },
      { name: "LLM Fine-tuning", proficiency: "expert", duration_months: 0, endorsement_count: 0 },
    ],
    career_history: [{ title: "Expert AI Everything", company: "Freelance", start_date: "1999-01", end_date: "Present", duration_months: 300, company_size: "1", industry: "Freelance", description: "All domains, all technologies, all platforms.", company_type: "consulting" }],
    education: [{ institution: "Top Global University", degree: "PhD", field: "AI", start_year: 2000, end_year: 2003, grade: "Perfect", institution_tier: "unknown" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-15T10:00:00Z", recruiter_response_rate: 0.99, avg_response_time_hours: 1, notice_period_days: 0, profile_completeness_score: 0.99, github_activity_score: 0.02, interview_completion_rate: 0.20, offer_acceptance_rate: 0.10, connection_count: 1, endorsements_received: 0, profile_views_received_30d: 200, saved_by_recruiters_30d: 0, search_appearance_30d: 300, applications_submitted_30d: 50, preferred_work_mode: "remote", willing_to_relocate: true, expected_salary_range_inr_lpa: "5-200", verified_email: false, verified_phone: false, linkedin_connected: false },
    rank: 46, algo_rank: 48, final_score: 0.05,
    skill_score: 0.95, skill_semantic_component: 0.57, skill_keyword_component: 0.38, career_score: 0.10, experience_score: 0.50, location_score: 0.95, education_score: 0.50,
    behavioral_multiplier: 0.40, disqualifier_penalty: 0.05, platform_quality_score: 0.02,
    honeypot_confidence: 0.97, honeypot_flags: ["Expert proficiency claimed for 6 skills with 0 months duration each", "Zero endorsements across all 6 expert skills", "25 years experience contradicts FAISS/Weaviate age (< 10 years old)", "No verified contact info", "50 applications in 30 days (mass applying)"],
    ce_score: 5, ce_reasoning: "Profile is clearly fabricated. FAISS launched in 2019, Weaviate in 2018 — claiming 15+ years expertise is impossible. Zero endorsements across 6 'expert' skills is a definitive honeypot signal.",
    llm_concern: "Honeypot detected with 97% confidence. Multiple impossible claims. Do not contact.",
    rank_delta: 2, reasoning: "HONEYPOT: Expert skills with 0 duration, 0 endorsements. Timeline impossible. Final score zeroed.",
    candidate_summary_sent_to_llm: "Alex K., Freelance, 25 years. Claims expert in FAISS/Weaviate with 0 months experience each. Zero endorsements. No verified contacts. 50 applications in 30 days.", jd_context_sent_to_llm: jdContext, blend_calculation: "HONEYPOT: Score zeroed. Confidence 0.97."
  },
  {
    candidate_id: "CAND_0000047",
    anonymized_name: "SuperML Bot",
    current_title: "AI Expert",
    current_company: "Global AI Corp",
    location: "Pune, India",
    country: "India",
    years_of_experience: 3,
    headline: "Expert Across All ML Domains | Perfect Scores All Assessments",
    summary: "Perfect candidate for every role. Expert in everything. Available immediately. Will work for any salary.",
    skills: [
      { name: "Python", proficiency: "expert", duration_months: 1, endorsement_count: 0, assessment_score: 100 },
      { name: "FAISS", proficiency: "expert", duration_months: 1, endorsement_count: 0, assessment_score: 100 },
      { name: "TensorFlow", proficiency: "expert", duration_months: 1, endorsement_count: 0, assessment_score: 100 },
      { name: "PyTorch", proficiency: "expert", duration_months: 1, endorsement_count: 0, assessment_score: 100 },
      { name: "Kubernetes", proficiency: "expert", duration_months: 1, endorsement_count: 0 },
    ],
    career_history: [{ title: "AI Expert", company: "Global AI Corp", start_date: "2021-01", end_date: "Present", duration_months: 41, company_size: "10001+", industry: "AI", description: "Expert in all AI technologies. Led all projects.", company_type: "consulting" }],
    education: [{ institution: "Top University", degree: "B.Tech", field: "CS", start_year: 2017, end_year: 2021, grade: "10/10", institution_tier: "tier_1" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-15T23:59:00Z", recruiter_response_rate: 1.0, avg_response_time_hours: 0.1, notice_period_days: 0, profile_completeness_score: 1.0, github_activity_score: 0.01, interview_completion_rate: 0.05, offer_acceptance_rate: 0.02, connection_count: 0, endorsements_received: 0, profile_views_received_30d: 500, saved_by_recruiters_30d: 0, search_appearance_30d: 500, applications_submitted_30d: 100, preferred_work_mode: "remote", willing_to_relocate: true, expected_salary_range_inr_lpa: "1-1000", verified_email: false, verified_phone: false, linkedin_connected: false },
    rank: 47, algo_rank: 50, final_score: 0.03,
    skill_score: 0.90, skill_semantic_component: 0.54, skill_keyword_component: 0.36, career_score: 0.05, experience_score: 0.30, location_score: 1.0, education_score: 0.50,
    behavioral_multiplier: 0.30, disqualifier_penalty: 0.03, platform_quality_score: 0.01,
    honeypot_confidence: 0.99, honeypot_flags: ["5 expert skills with 1 month duration each and 0 endorsements", "Perfect assessment scores (100/100) across all skills — statistically impossible", "100 applications in 30 days", "Interview completion rate 5% — accepts invitations then ghosts", "No verified contact info", "0 connections, 0 endorsements despite expert claims"],
    ce_score: 2, ce_reasoning: "Almost certainly an automated bot or fabricated profile. 100 applications/month, 5% interview completion, 0 connections, 0 endorsements — every signal points to mass-applying bot.",
    llm_concern: "Bot/honeypot with 99% confidence. Report to platform trust team.",
    rank_delta: 3, reasoning: "HONEYPOT (0.99 confidence): Bot-like behavior. Perfect assessment scores implausible. Score zeroed.",
    candidate_summary_sent_to_llm: "SuperML Bot. 3 years. Claims 100/100 assessment scores on 5 expert skills each with 1 month experience. 100 applications in 30 days. 5% interview completion. Zero endorsements. Honeypot pattern.", jd_context_sent_to_llm: jdContext, blend_calculation: "HONEYPOT: Score zeroed. Confidence 0.99."
  },
  {
    candidate_id: "CAND_0000048",
    anonymized_name: "Timeline Impossible",
    current_title: "Senior Data Scientist",
    current_company: "StartupXYZ",
    location: "Noida, India",
    country: "India",
    years_of_experience: 22,
    headline: "22 Years Experience | Fresh Graduate 2022 | Youngest Expert in Industry",
    summary: "Fresh graduate from 2022 with 22 years of professional experience in AI and ML.",
    skills: [{ name: "Python", proficiency: "expert", duration_months: 264, endorsement_count: 5 }, { name: "ML", proficiency: "expert", duration_months: 264, endorsement_count: 3 }],
    career_history: [{ title: "Senior Data Scientist", company: "StartupXYZ", start_date: "2002-01", end_date: "Present", duration_months: 268, company_size: "51-200", industry: "AI", description: "22 years of data science.", company_type: "startup" }, { title: "Junior Developer", company: "ABC Corp", start_date: "1998-01", end_date: "2002-01", duration_months: 48, company_size: "51-200", industry: "Tech", description: "Development.", company_type: "product" }],
    education: [{ institution: "Delhi University", degree: "B.Tech", field: "CS", start_year: 2018, end_year: 2022, grade: "7.2/10", institution_tier: "tier_3" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-05-01T10:00:00Z", recruiter_response_rate: 0.60, avg_response_time_hours: 24, notice_period_days: 30, profile_completeness_score: 0.75, github_activity_score: 0.20, interview_completion_rate: 0.60, offer_acceptance_rate: 0.55, connection_count: 45, endorsements_received: 8, profile_views_received_30d: 5, saved_by_recruiters_30d: 1, search_appearance_30d: 10, applications_submitted_30d: 10, preferred_work_mode: "remote", willing_to_relocate: false, expected_salary_range_inr_lpa: "40-60", verified_email: true, verified_phone: false, linkedin_connected: false },
    rank: 48, algo_rank: 46, final_score: 0.04,
    skill_score: 0.40, skill_semantic_component: 0.24, skill_keyword_component: 0.16, career_score: 0.30, experience_score: 0.50, location_score: 1.0, education_score: 0.65,
    behavioral_multiplier: 0.70, disqualifier_penalty: 0.05, platform_quality_score: 0.06,
    honeypot_confidence: 0.93, honeypot_flags: ["Timeline impossibility: Graduated 2022, but claims work history from 1998 (24 years before graduation)", "22 years experience in Python — Python 1.0 released 1994, timeline still implausible for claimed education"],
    ce_score: 12, ce_reasoning: "Graduate year (2022) and career start (2002) make this mathematically impossible — career predates graduation by 20 years.", llm_concern: "Timeline impossibility — honeypot profile detected with high confidence.",
    rank_delta: -2, reasoning: "HONEYPOT: Timeline impossibility — 22 years experience but graduated 2022. Career predates graduation.",
    candidate_summary_sent_to_llm: "Timeline Impossible. Claims 22 years experience. Education shows graduation in 2022. Career history starts 2002 — 20 years before graduation. Clear honeypot.", jd_context_sent_to_llm: jdContext, blend_calculation: "HONEYPOT: Confidence 0.93. Score zeroed."
  },
  {
    candidate_id: "CAND_0000049",
    anonymized_name: "All Consulting Career",
    current_title: "AI Consultant",
    current_company: "Infosys",
    location: "Pune, India",
    country: "India",
    years_of_experience: 9,
    headline: "AI Consultant | Delivered 50+ AI Projects for Clients | TCS · Infosys · Wipro",
    summary: "9 years as an AI consultant at Infosys, TCS, and Wipro. Delivered AI solutions for banking, manufacturing, and retail clients.",
    skills: [{ name: "Python", proficiency: "advanced", duration_months: 108, endorsement_count: 25 }, { name: "ML Models", proficiency: "advanced", duration_months: 96, endorsement_count: 18 }, { name: "PowerPoint", proficiency: "expert", duration_months: 108, endorsement_count: 30 }],
    career_history: [
      { title: "AI Consultant", company: "Infosys", start_date: "2021-01", end_date: "Present", duration_months: 41, company_size: "10001+", industry: "IT Services", description: "Delivered AI consulting projects for banking and insurance clients. No production ownership.", company_type: "consulting" },
      { title: "ML Consultant", company: "TCS", start_date: "2018-07", end_date: "2020-12", duration_months: 29, company_size: "10001+", industry: "IT Services", description: "AI project delivery for manufacturing clients.", company_type: "consulting" },
      { title: "Analyst", company: "Wipro", start_date: "2015-07", end_date: "2018-06", duration_months: 36, company_size: "10001+", industry: "IT Services", description: "Analytics and reporting.", company_type: "consulting" }
    ],
    education: [{ institution: "Anna University", degree: "B.E.", field: "CS", start_year: 2011, end_year: 2015, grade: "7.5/10", institution_tier: "tier_3" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-03T10:00:00Z", recruiter_response_rate: 0.75, avg_response_time_hours: 20, notice_period_days: 90, profile_completeness_score: 0.88, github_activity_score: 0.15, interview_completion_rate: 0.75, offer_acceptance_rate: 0.68, connection_count: 380, endorsements_received: 55, profile_views_received_30d: 18, saved_by_recruiters_30d: 4, search_appearance_30d: 35, applications_submitted_30d: 5, preferred_work_mode: "onsite", willing_to_relocate: false, expected_salary_range_inr_lpa: "25-35", verified_email: true, verified_phone: true, linkedin_connected: true },
    rank: 49, algo_rank: 44, final_score: 0.08,
    skill_score: 0.42, skill_semantic_component: 0.25, skill_keyword_component: 0.17, career_score: 0.18, experience_score: 0.72, location_score: 1.0, education_score: 0.62,
    behavioral_multiplier: 0.80, disqualifier_penalty: 0.10, platform_quality_score: 0.05,
    honeypot_confidence: 0.45, honeypot_flags: ["All-consulting career: TCS, Infosys, Wipro — zero product company experience"],
    ce_score: 18, ce_reasoning: "Entire 9-year career is TCS → Wipro → Infosys consulting. JD explicitly disqualifies 'entire career at consulting only (TCS/Infosys/Wipro)'.",
    llm_concern: "Disqualifier applies directly: all career at major IT consulting firms with no product company or startup experience.",
    rank_delta: -5, reasoning: "All-consulting disqualifier penalty (0.10×). Career entirely at TCS/Infosys/Wipro. No production ML ownership.",
    candidate_summary_sent_to_llm: "All Consulting Career. 9 years: Wipro → TCS → Infosys. All consulting. No product company experience. JD explicit disqualifier.", jd_context_sent_to_llm: jdContext, blend_calculation: "Final = consulting penalty 0.10× applied. Final = 0.08."
  },
  {
    candidate_id: "CAND_0000050",
    anonymized_name: "Duplicate Profile",
    current_title: "Senior ML Engineer",
    current_company: "Flipkart",
    location: "Bengaluru, India",
    country: "India",
    years_of_experience: 7,
    headline: "Senior ML Engineer | Semantic Search | Exactly Like Another Candidate",
    summary: "Identical profile to CAND_0000001 with minor changes. Profile completeness inconsistencies detected.",
    skills: [
      { name: "FAISS", proficiency: "expert", duration_months: 48, endorsement_count: 32 },
      { name: "Python", proficiency: "expert", duration_months: 84, endorsement_count: 55 },
    ],
    career_history: [{ title: "Senior ML Engineer", company: "Flipkart", start_date: "2021-06", end_date: "Present", duration_months: 34, company_size: "5001-10000", industry: "E-commerce", description: "Duplicate profile. Career descriptions match another candidate profile with 87% text similarity.", company_type: "product" }],
    education: [{ institution: "IIT Madras", degree: "B.Tech", field: "CS", start_year: 2013, end_year: 2017, grade: "8.5/10", institution_tier: "tier_1" }],
    redrob_signals: { open_to_work_flag: true, last_active_date: "2024-06-10T10:00:00Z", recruiter_response_rate: 0.85, avg_response_time_hours: 12, notice_period_days: 60, profile_completeness_score: 0.88, github_activity_score: 0.30, interview_completion_rate: 0.45, offer_acceptance_rate: 0.30, connection_count: 3, endorsements_received: 1, profile_views_received_30d: 2, saved_by_recruiters_30d: 0, search_appearance_30d: 5, applications_submitted_30d: 30, preferred_work_mode: "hybrid", willing_to_relocate: true, expected_salary_range_inr_lpa: "45-60", verified_email: false, verified_phone: false, linkedin_connected: false },
    rank: 50, algo_rank: 47, final_score: 0.06,
    skill_score: 0.90, skill_semantic_component: 0.54, skill_keyword_component: 0.36, career_score: 0.85, experience_score: 0.85, location_score: 0.95, education_score: 0.95,
    behavioral_multiplier: 0.50, disqualifier_penalty: 0.08, platform_quality_score: 0.05,
    honeypot_confidence: 0.88, honeypot_flags: ["Profile text similarity >87% to another candidate — potential duplicate", "No verified contact information", "30 applications in 30 days", "Interview completion rate 45% — inconsistent with stated openness to work", "0 profile views despite being open to work"],
    ce_score: 10, ce_reasoning: "Strong keyword match but profile shows duplicate-of-another-profile signals. Contact info unverified. Behavior pattern inconsistent.", llm_concern: "Potential duplicate/scraped profile. High text similarity to CAND_0000001.",
    rank_delta: -3, reasoning: "HONEYPOT: Profile duplication detected (87% text similarity). No verified contacts. Final score penalized.",
    candidate_summary_sent_to_llm: "Duplicate Profile. 7 years. High keyword match but 87% text similarity to another candidate. No verified contacts. 30 applications/month. Interview completion only 45%.", jd_context_sent_to_llm: jdContext, blend_calculation: "HONEYPOT: Confidence 0.88. Score penalized."
  }
];

export const generateMockData = (): RankedCandidate[] => {
  return MOCK_RANKED_CANDIDATES;
};

export const JD_QUERIES = {
  query1: {
    text: "Senior ML engineer with expertise in dense retrieval, vector embeddings, semantic similarity, FAISS, Weaviate, Pinecone, reranking pipelines, production-grade search and ranking systems, ANN search",
    weight: 0.60,
    label: "Core Technical Fit"
  },
  query2: {
    text: "Engineering leader with production deployment experience at scale, startup environment, real user systems at millions of users, system design for ML infrastructure, founding team engineer",
    weight: 0.30,
    label: "Production Mindset"
  },
  query3: {
    text: "HR tech, talent intelligence, job matching, candidate ranking, recruitment platform, hiring optimization, talent acquisition AI, resume parsing, skill extraction",
    weight: 0.10,
    label: "Domain Context"
  }
};

export const SCORE_WEIGHTS = {
  skillMatch: 0.35,
  careerQuality: 0.30,
  experience: 0.10,
  location: 0.10,
  education: 0.05,
  llmWeight: 0.60,
  llmShortlistSize: 50,
  llmModel: "Gemini 1.5 Flash"
};
