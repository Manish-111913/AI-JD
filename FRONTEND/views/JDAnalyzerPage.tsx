"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Search, Shield, MapPin, TrendingUp, Brain, Info } from "lucide-react";

const TABS = [
  { id: "hard", label: "Hard Skills", icon: FileText },
  { id: "preferred", label: "Preferred", icon: TrendingUp },
  { id: "disqualifiers", label: "Disqualifiers", icon: Shield },
  { id: "location", label: "Location Map", icon: MapPin },
  { id: "experience", label: "Experience", icon: TrendingUp },
  { id: "queries", label: "AI Queries", icon: Brain },
];

const HARD_SKILLS = [
  { category: "Dense Retrieval / Embeddings", weight: "22%", keywords: ["FAISS", "Weaviate", "Pinecone", "bi-encoder", "vector search", "ANN", "HNSW"] },
  { category: "Vector DBs", weight: "18%", keywords: ["Weaviate", "Qdrant", "Milvus", "Pinecone", "ChromaDB", "pgvector"] },
  { category: "Ranking Systems", weight: "20%", keywords: ["LTR", "cross-encoder", "re-ranking", "BM25", "NDCG", "MRR", "MAP"] },
  { category: "Python / ML Stack", weight: "15%", keywords: ["Python", "PyTorch", "HuggingFace", "sentence-transformers", "NumPy"] },
  { category: "Eval Frameworks", weight: "15%", keywords: ["NDCG", "MRR", "MAP", "P@K", "evaluation harness", "ranx"] },
  { category: "Production ML", weight: "10%", keywords: ["serving", "inference", "latency", "throughput", "A/B testing", "MLOps"] },
];

const PREFERRED = [
  { skill: "LLM Fine-tuning (LoRA/QLoRA)", note: "Bonus — not required" },
  { skill: "Learning-to-Rank", note: "Strong signal" },
  { skill: "HR-Tech Experience", note: "Domain bonus" },
  { skill: "Open Source Contributions", note: "Community signal" },
  { skill: "Startup Experience", note: "Culture fit" },
];

const DISQUALIFIERS = [
  {
    name: "All-consulting career",
    logic: "Career entirely at TCS/Infosys/Wipro/Accenture/IBM pattern",
    curve: [{ x: "0%", y: "0.55×" }, { x: "50%", y: "0.72×" }, { x: "100%", y: "1.00×" }],
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
  },
  {
    name: "Pure research, no production",
    logic: "All roles at universities/research labs, no deployment signals",
    curve: [{ x: "0%", y: "0.80×" }, { x: "50%", y: "0.90×" }, { x: "100%", y: "1.00×" }],
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
  },
  {
    name: "Recent LangChain-only skills",
    logic: "Skills list dominated by LangChain/ChatGPT wrappers with no retrieval fundamentals",
    curve: [{ x: "0%", y: "0.70×" }, { x: "50%", y: "0.85×" }, { x: "100%", y: "1.00×" }],
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50",
  },
  {
    name: "Non-coding leadership only",
    logic: "VP/Director roles with no individual contributor code evidence",
    curve: [{ x: "0%", y: "0.60×" }, { x: "50%", y: "0.80×" }, { x: "100%", y: "1.00×" }],
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/50",
  },
  {
    name: "CV / Speech only, no NLP/IR",
    logic: "All ML experience in Computer Vision or Speech — no NLP/retrieval",
    curve: [{ x: "0%", y: "0.70×" }, { x: "50%", y: "0.85×" }, { x: "100%", y: "1.00×" }],
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50",
  },
  {
    name: "Closed-source only",
    logic: "All ML work on proprietary systems with no open-source evidence",
    curve: [{ x: "0%", y: "0.85×" }, { x: "50%", y: "0.92×" }, { x: "100%", y: "1.00×" }],
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/50",
  },
];

const LOCATION_MAP = [
  { bucket: "Pune / Noida (JD locations)", score: "1.00", bar: 100 },
  { bucket: "Bengaluru", score: "0.92", bar: 92 },
  { bucket: "Mumbai / Chennai", score: "0.88", bar: 88 },
  { bucket: "Hyderabad / Delhi NCR", score: "0.85", bar: 85 },
  { bucket: "Other India Tier-1", score: "0.78", bar: 78 },
  { bucket: "India Tier-2 (willing to relocate)", score: "0.65", bar: 65 },
  { bucket: "Outside India (willing to relocate)", score: "0.40", bar: 40 },
  { bucket: "Outside India (no relocate)", score: "0.15", bar: 15 },
];

const AI_QUERIES = [
  {
    weight: "60%",
    label: "Core Technical Fit",
    text: "Senior ML engineer with expertise in dense retrieval, vector embeddings, semantic similarity, FAISS, Weaviate, Pinecone, reranking pipelines, production-grade search and ranking systems, ANN search",
  },
  {
    weight: "30%",
    label: "Production Mindset",
    text: "Engineering leader with production deployment experience at scale, startup environment, real user systems at millions of users, system design for ML infrastructure, founding team engineer",
  },
  {
    weight: "10%",
    label: "Domain Context",
    text: "HR technology, talent acquisition, recruitment AI, candidate assessment, people analytics, hiring platform, talent intelligence",
  },
];

const TITLE_TIERS = [
  { tier: "Core ML/AI", score: "1.00", examples: "ML Engineer, AI Engineer, NLP Engineer, Data Scientist (ML), Search Engineer, Research Scientist (ML)", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500" },
  { tier: "Adjacent Tech", score: "0.70", examples: "Software Engineer, Backend Engineer, Data Engineer, Analytics Engineer, Platform Engineer", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500" },
  { tier: "General Tech", score: "0.35", examples: "Full Stack Developer, Cloud Engineer, DevOps, Mobile Developer, Frontend Engineer", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500" },
  { tier: "Low Signal Tech", score: "0.10", examples: "Java Developer, .NET Developer, Web Developer, QA Engineer", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-400" },
  { tier: "Non-Tech (Pre-filtered)", score: "0.02", examples: "Business Analyst, HR Manager, Accountant, Operations Manager, Sales Executive", color: "text-red-600 dark:text-red-400", bg: "bg-red-500" },
];

export default function JDAnalyzerPage() {
  const [activeTab, setActiveTab] = useState("hard");

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">S3 · Job Description Analyzer</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Senior AI Engineer — Founding Team</h1>
        <p className="text-muted-foreground text-[14px] mt-1">
          Read-only. Shows exactly how the system interpreted the JD. Every parsed field is used in ranking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: JD Raw + Title Map */}
        <div className="lg:col-span-1 space-y-5">

          {/* Raw JD highlights legend */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-[13px] font-semibold text-foreground">JD Highlight Legend</h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: "Hard requirement", color: "bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700" },
                { label: "Preferred skill", color: "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700" },
                { label: "Disqualifying pattern", color: "bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span className="text-[12px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <div className="rounded-lg bg-muted/50 p-3 text-[12px] text-muted-foreground leading-relaxed font-mono">
                <span className="bg-emerald-100 dark:bg-emerald-900/40 px-0.5">dense retrieval</span>,{" "}
                <span className="bg-emerald-100 dark:bg-emerald-900/40 px-0.5">vector embeddings</span>,{" "}
                <span className="bg-blue-100 dark:bg-blue-900/40 px-0.5">LLM fine-tuning</span>,
                experience with <span className="bg-emerald-100 dark:bg-emerald-900/40 px-0.5">FAISS/Weaviate/Pinecone</span>.
                No <span className="bg-red-100 dark:bg-red-900/40 px-0.5">pure consulting</span> background...
              </div>
            </div>
          </div>

          {/* Title Relevance Map */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-[13px] font-semibold text-foreground">Title Relevance Map</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">5-tier pre-filter classification</p>
            </div>
            <div className="divide-y divide-border">
              {TITLE_TIERS.map(t => (
                <div key={t.tier} className="px-4 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[12px] font-semibold ${t.color}`}>{t.tier}</span>
                    <span className="text-[12px] font-mono font-bold text-foreground">{t.score}</span>
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full ${t.bg}`}
                      style={{ width: `${parseFloat(t.score) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{t.examples}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <div className="flex items-start gap-1.5">
                <Info className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  In the full 100K pool: <strong className="text-foreground">~31% tech</strong> receive full scoring.{" "}
                  <strong className="text-foreground">~69%</strong> receive near-zero title score and are eliminated before semantic scoring runs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Requirements tabs */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-border overflow-x-auto">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium whitespace-nowrap
                      border-b-2 transition-colors
                      ${activeTab === tab.id
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              {activeTab === "hard" && (
                <div className="space-y-3">
                  <p className="text-[12px] text-muted-foreground">6 skill categories extracted from JD. Weight = share of total skill score.</p>
                  {HARD_SKILLS.map(s => (
                    <div key={s.category} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold text-foreground">{s.category}</span>
                        <span className="text-[12px] font-bold text-ai font-mono">{s.weight}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.keywords.map(k => (
                          <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{k}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "preferred" && (
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground mb-3">Lower-weight signals — not required but add score.</p>
                  {PREFERRED.map(p => (
                    <div key={p.skill} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <span className="text-[13px] text-foreground">{p.skill}</span>
                      <span className="text-[11px] text-muted-foreground">{p.note}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "disqualifiers" && (
                <div className="space-y-3">
                  <p className="text-[12px] text-muted-foreground mb-3">6 soft-penalty disqualifiers. Not binary — sigmoid curves, not hard zeros.</p>
                  {DISQUALIFIERS.map((d, i) => (
                    <motion.div
                      key={d.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`rounded-lg border p-3 ${d.bg}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Shield className={`w-3 h-3 ${d.color}`} />
                        <span className={`text-[13px] font-semibold ${d.color}`}>{d.name}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mb-2">{d.logic}</p>
                      <div className="flex gap-3">
                        {d.curve.map(pt => (
                          <div key={pt.x} className="text-center">
                            <div className="text-[10px] font-mono font-bold text-foreground">{pt.y}</div>
                            <div className="text-[10px] text-muted-foreground">{pt.x} affected</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === "location" && (
                <div className="space-y-2">
                  {LOCATION_MAP.map(l => (
                    <div key={l.bucket} className="flex items-center gap-3">
                      <div className="w-48 text-[12px] text-foreground flex-shrink-0">{l.bucket}</div>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-foreground/80 rounded-full" style={{ width: `${l.bar}%` }} />
                      </div>
                      <span className="w-10 text-right text-[12px] font-mono font-bold text-foreground">{l.score}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "experience" && (
                <div>
                  <p className="text-[12px] text-muted-foreground mb-4">Gaussian curve — not a hard cutoff. Peak at 6–8 years.</p>
                  <div className="relative h-20 flex items-end gap-1">
                    {[0,1,2,3,4,5,6,7,8,9,10,11,12,15,20].map((yr) => {
                      const score = yr < 2 ? 0.2 : yr < 4 ? 0.5 : yr < 5 ? 0.75 : yr <= 9 ? 0.95 : yr <= 12 ? 0.75 : 0.5;
                      const isPeak = yr >= 6 && yr <= 8;
                      const isTarget = yr >= 5 && yr <= 9;
                      return (
                        <div key={yr} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-t-sm transition-colors ${isPeak ? "bg-foreground" : isTarget ? "bg-foreground/50" : "bg-muted"}`}
                            style={{ height: `${score * 60}px` }}
                          />
                          {[0,5,10,15,20].includes(yr) && (
                            <span className="text-[9px] text-muted-foreground">{yr}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-4 text-[11px]">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-foreground" /> Peak (6–8 yrs)</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-foreground/50" /> Target (5–9 yrs)</div>
                  </div>
                </div>
              )}

              {activeTab === "queries" && (
                <div className="space-y-4">
                  <p className="text-[12px] text-muted-foreground">3 semantic queries sent to bi-encoder. Weighted 60/30/10.</p>
                  {AI_QUERIES.map((q, i) => (
                    <motion.div
                      key={q.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="rounded-xl border border-ai/25 bg-ai/4 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-3.5 h-3.5 text-ai" />
                        <span className="text-[13px] font-semibold text-foreground">{q.label}</span>
                        <span className="ml-auto text-[12px] font-bold text-ai font-mono">{q.weight}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground leading-relaxed font-mono bg-muted/30 rounded-lg p-3">
                        "{q.text}"
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
