import { Cpu, Shield, BarChart2, Zap, GitBranch, Scale, Brain } from "lucide-react";

const PIPELINE = [
  { n: 1, label: "Title Pre-Filter", desc: "Eliminate ~69K irrelevant candidates instantly by title. Business Analysts, HR Managers → near-zero score.", isCE: false },
  { n: 2, label: "Parse Job Description", desc: "Extract 6 skill groups, 6 disqualifier rules, 3 semantic queries, title relevance map, experience curve.", isCE: false },
  { n: 3, label: "Stream & Normalize Candidates", desc: "Load 100K candidates with null-safe field access. Build candidate text for embedding.", isCE: false },
  { n: 4, label: "Detect Honeypot Profiles", desc: "4-category validation. Soft confidence scoring (0–1). ~80 honeypots in dataset get zero or near-zero.", isCE: false },
  { n: 5, label: "Semantic Embedding (Bi-Encoder)", desc: "Pre-computed offline. Three JD query vectors × 100K candidate vectors → 3 similarity scores per candidate.", isCE: false },
  { n: 6, label: "Feature Scoring (6 Components)", desc: "Skill trust, career quality, experience curve, location, education, behavioral multiplier. Composite score.", isCE: false },
  { n: 7, label: "Shortlist Top 300", desc: "Sort all 100K by composite score. Take top 300 for cross-encoder re-ranking phase.", isCE: false },
  { n: 8, label: "Cross-Encoder Re-Ranking", desc: "Local ms-marco-MiniLM-L-6-v2 reads (JD query, candidate summary) pairs. Blends CE + algo score for final rank.", isCE: true },
];

const SCORING = [
  { component: "Skill Match", weight: "35%", breakdown: "60% semantic (bi-encoder) + 40% keyword trust" },
  { component: "Career Quality", weight: "30%", breakdown: "Company classification, production signals, recency" },
  { component: "Experience Years", weight: "10%", breakdown: "Gaussian curve peaking at 6–8 years" },
  { component: "Location", weight: "10%", breakdown: "Tiered map: Pune/Noida 1.0 → outside India 0.15" },
  { component: "Education", weight: "5%", breakdown: "Institution tier, field of study" },
  { component: "Platform Quality", weight: "10%", breakdown: "Profile completeness, verifications" },
  { component: "Behavioral Multiplier", weight: "×", breakdown: "Recency × open_to_work × response_rate × notice" },
  { component: "CE Score (blend)", weight: "60%", breakdown: "40% algo + 60% cross-encoder blending" },
];

const DESIGN = [
  {
    icon: Shield,
    title: "Keyword Stuffer Defense",
    body: "Skill trust formula: proficiency × sigmoid(duration) × log(endorsements) × assessment. Minimum floor 0.05. A 'Marketing Manager' with full AI skills list scores ~0.05/skill — duration=0, endorsements=0, no assessment.",
  },
  {
    icon: Brain,
    title: "Soft Honeypot Detection",
    body: "Evidence accumulation across 4 check categories → sigmoid confidence → soft penalty tiers. Not binary. Robust against false positives from legitimate but unusual profiles.",
  },
  {
    icon: Cpu,
    title: "Cross-Encoder Re-Ranking",
    body: "After algorithmic first-pass selects top 300, local ms-marco-MiniLM-L-6-v2 scores (JD query, candidate summary) pairs. No network required. Fully reproducible. Complies with spec v4 Section 3.",
  },
  {
    icon: Zap,
    title: "Semantic-First Scoring",
    body: "60% of skill score from three-query semantic similarity (bi-encoder). Total semantic weight ~21% of final score. Finds engineers who describe production work in plain language without ML buzzwords.",
  },
  {
    icon: Scale,
    title: "6 Soft Disqualifiers",
    body: "All-consulting career, pure research only, recent LangChain only, non-coding leadership, CV/Speech only, closed-source only. Sigmoid curves, not hard zeros. Graded penalties prevent false disqualification.",
  },
  {
    icon: GitBranch,
    title: "Fully Auditable",
    body: "Every score component is visible in the candidate detail panel. CE evidence shows exact query text and candidate passage. Blend calculation is shown step-by-step with actual values.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
      {/* Header */}
      <div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">About</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System Architecture</h1>
        <p className="text-[14px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          Redrob AI Candidate Ranker — an 8-stage hybrid pipeline built for the Redrob AI Hackathon 2025.
          Ranks 100K candidates for a Senior AI Engineer role using semantic search, multi-signal scoring, and local cross-encoder re-ranking.
        </p>
      </div>

      {/* Pipeline */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          8-Step Pipeline
        </h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {PIPELINE.map(s => (
            <div key={s.n} className={`flex items-start gap-4 px-4 py-3.5 ${s.isCE ? "bg-ai/4" : ""}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${s.isCE ? "bg-ai text-white" : "bg-muted text-foreground"}`}>
                {s.n}
              </div>
              <div>
                <div className={`text-[13px] font-semibold ${s.isCE ? "text-ai" : "text-foreground"} flex items-center gap-2`}>
                  {s.label}
                  {s.isCE && <span className="text-[10px] ai-badge px-1.5 py-0.5 rounded-[4px]">ms-marco-MiniLM-L-6-v2</span>}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
          Scoring Components
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["Component", "Weight", "Breakdown"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCORING.map(s => (
                <tr key={s.component} className="border-b border-border/40">
                  <td className="px-4 py-2.5 font-semibold text-foreground">{s.component}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-ai">{s.weight}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.breakdown}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Design decisions */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
          Key Design Decisions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DESIGN.map(d => {
            const Icon = d.icon;
            return (
              <div key={d.title} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[13px] font-semibold text-foreground">{d.title}</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{d.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Judge formula */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3">Judge Evaluation Formula</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-mono text-[13px] text-foreground mb-3">
            Final Score = <strong>0.50</strong> × NDCG@10 + <strong>0.30</strong> × NDCG@50 + <strong>0.15</strong> × MAP + <strong>0.05</strong> × P@10
          </p>
          <p className="text-[12px] text-muted-foreground">
            Tiebreakers: P@5 first, then P@10, then submission time. System is designed around this formula — NDCG@10 = 50% of total score, so top-10 candidate quality is paramount.
          </p>
        </div>
      </section>

      {/* Stack */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3">Tech Stack</h2>
        <div className="flex flex-wrap gap-2">
          {["Python 3.11", "sentence-transformers", "cross-encoder/ms-marco-MiniLM-L-6-v2", "FAISS", "NumPy", "React + Vite", "Tailwind CSS", "Recharts", "Framer Motion"].map(t => (
            <span key={t} className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground font-mono">{t}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
