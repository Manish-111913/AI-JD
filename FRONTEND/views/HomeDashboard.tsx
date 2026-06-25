"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight, Trophy, Zap, Shield, Search,
  GitBranch, BarChart3, FileText, Cpu, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SCORING_FORMULA = [
  { metric: "NDCG@10", weight: "50%", desc: "Top-10 ranking quality — most important metric" },
  { metric: "NDCG@50", weight: "30%", desc: "Top-50 ranking quality" },
  { metric: "MAP", weight: "15%", desc: "Mean Average Precision across all relevant candidates" },
  { metric: "P@10", weight: "5%", desc: "Precision of top-10 (tiebreaker: P@5 first, then P@10, then submission time)" },
];

const PIPELINE = [
  { n: 1, label: "Title Pre-Filter", desc: "Eliminate ~69K irrelevant candidates instantly by title. Business Analysts, HR Managers → near-zero score." },
  { n: 2, label: "Parse Job Description", desc: "Extract 6 skill groups, 6 disqualifier rules, 3 semantic queries, title relevance map, experience curve." },
  { n: 3, label: "Stream & Normalize", desc: "Load 100K candidates with null-safe field access. Build candidate text for embedding." },
  { n: 4, label: "Detect Honeypot Profiles", desc: "4-category validation. Soft confidence scoring (0–1). ~80 honeypots in dataset." },
  { n: 5, label: "Semantic Embedding", desc: "Pre-computed offline. Three JD query vectors × 100K candidate vectors → 3 similarity scores per candidate." },
  { n: 6, label: "Feature Scoring", desc: "Skill trust, career quality, experience curve, location, education, behavioral multiplier. Composite score." },
  { n: 7, label: "Shortlist Top 300", desc: "Sort all 100K by composite score. Take top 300 for cross-encoder re-ranking phase." },
  { n: 8, label: "Cross-Encoder Re-Ranking", desc: "Local ms-marco-MiniLM-L-6-v2 reads (JD query, candidate summary) pairs. Blends CE + algo score.", isCE: true },
];

const DECISIONS = [
  {
    icon: Shield,
    title: "Keyword Stuffer Trap",
    what: "Skill trust formula: proficiency × sigmoid(duration) × log(endorsements) × assessment. Minimum floor 0.05.",
    why: "A 'Marketing Manager' with full AI skills list has trust ~0.05/skill because duration=0, endorsements=0, no assessment."
  },
  {
    icon: Search,
    title: "Honeypot Detection",
    what: "Evidence accumulation across 4 check categories → sigmoid confidence score → soft penalty tiers.",
    why: "Binary flags create false positives from legitimate but unusual profiles. Soft scoring is robust."
  },
  {
    icon: Cpu,
    title: "Cross-Encoder Re-Ranking (Local)",
    what: "After algorithmic first-pass selects top 300, local cross-encoder scores (JD, candidate) pairs. No network required.",
    why: "Submission spec bans network calls. Cross-encoder is standard IR re-ranking — more accurate than bi-encoder, fully local."
  },
  {
    icon: GitBranch,
    title: "Semantic-First Scoring",
    what: "60% of skill score from three-query semantic similarity (bi-encoder), 40% from keyword trust. Total semantic ~21% of final.",
    why: "Plain-language fits describe production work without buzzwords. Semantic scoring finds them."
  },
];

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" as const } }),
};

export default function HomeDashboard() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-3">
          <Trophy className="w-3.5 h-3.5" />
          Redrob AI Hackathon 2025
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Candidate Ranking System</h1>
        <p className="text-muted-foreground text-[15px] max-w-2xl leading-relaxed">
          Rank 100K candidates for the Senior AI Engineer role at Redrob AI.
          Built with an 8-stage hybrid pipeline combining semantic search, multi-signal scoring, and local cross-encoder re-ranking.
        </p>
        <div className="flex gap-3 pt-4">
          <Button
            size="sm"
            className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            onClick={() => router.push("/input")}
          >
            Run Ranking
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => router.push("/results")}
          >
            Explore Results
          </Button>
        </div>
      </div>

      {/* Scoring Formula */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
          Judge Evaluation Formula
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <p className="font-mono text-[13px] text-foreground">
              Final Score = <span className="font-bold">0.50</span> × NDCG@10 + <span className="font-bold">0.30</span> × NDCG@50 + <span className="font-bold">0.15</span> × MAP + <span className="font-bold">0.05</span> × P@10
            </p>
          </div>
          <div className="divide-y divide-border">
            {SCORING_FORMULA.map((f, i) => (
              <motion.div
                key={f.metric}
                custom={i}
                initial="hidden"
                animate="show"
                variants={fade}
                className="flex items-center gap-4 px-4 py-3"
              >
                <span className="w-16 text-[13px] font-mono font-semibold text-foreground">{f.metric}</span>
                <span className="w-10 text-[12px] font-bold text-ai">{f.weight}</span>
                <span className="text-[13px] text-muted-foreground">{f.desc}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 8-Step Architecture */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          8-Step Pipeline Architecture
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {PIPELINE.map((step, i) => (
            <motion.div
              key={step.n}
              custom={i}
              initial="hidden"
              animate="show"
              variants={fade}
              className={`flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30 ${step.isCE ? "bg-ai/4" : ""}`}
            >
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5
                ${step.isCE ? "bg-ai text-white" : "bg-muted text-foreground"}
              `}>
                {step.n}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-semibold ${step.isCE ? "text-ai" : "text-foreground"}`}>
                    {step.label}
                  </span>
                  {step.isCE && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] ai-badge font-medium">
                      ms-marco-MiniLM-L-6-v2
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Key Design Decisions */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          Key Design Decisions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DECISIONS.map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.div
                key={d.title}
                custom={i}
                initial="hidden"
                animate="show"
                variants={fade}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[13px] font-semibold text-foreground">{d.title}</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{d.what}</p>
                <div className="pt-1 border-t border-border">
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                    <span className="font-semibold text-foreground/60">Why: </span>{d.why}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          Explore the System
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "JD Analysis", icon: FileText, href: "/jd", desc: "Parsed skills & queries" },
            { label: "Results Table", icon: ListOrdered2, href: "/results", desc: "Top-100 ranked candidates" },
            { label: "CE Inspector", icon: Cpu, href: "/ce-inspector", desc: "Cross-encoder deep-dive" },
            { label: "Export", icon: BarChart3, href: "/export", desc: "Download & validate CSV" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="
                  rounded-xl border border-border bg-card p-3 text-left
                  hover:border-foreground/20 hover:bg-muted/30
                  transition-all duration-150 group
                "
              >
                <Icon className="w-4 h-4 text-muted-foreground mb-2 group-hover:text-foreground transition-colors" />
                <div className="text-[13px] font-medium text-foreground">{item.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ListOrdered2({ className }: { className?: string }) {
  return <ListOrdered className={className} />;
}
import { ListOrdered } from "lucide-react";
