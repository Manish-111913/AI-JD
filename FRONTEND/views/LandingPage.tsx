"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Shield, Search, GitBranch, Zap, Sun, Moon } from "lucide-react";
import { useAppContext } from "@/store/appStore";

const PIPELINE_STEPS = [
  { n: 1, label: "Title Pre-Filter", short: "~69% eliminated" },
  { n: 2, label: "Parse JD", short: "6 skill groups" },
  { n: 3, label: "Stream & Normalize", short: "100K candidates" },
  { n: 4, label: "Honeypot Detection", short: "4-category check" },
  { n: 5, label: "Bi-Encoder", short: "Semantic search" },
  { n: 6, label: "Feature Scoring", short: "6 components" },
  { n: 7, label: "Shortlist 300", short: "First-pass rank" },
  { n: 8, label: "Cross-Encoder", short: "ms-marco-MiniLM", isCE: true },
];

const FEATURES = [
  { icon: Search, title: "Semantic-First", desc: "60% of skill score from 3-query bi-encoder. Finds production engineers who don't list buzzwords." },
  { icon: Shield, title: "Honeypot Detection", desc: "4-category soft scoring. Sigmoid confidence, not binary. Robust against false positives." },
  { icon: Cpu, title: "Cross-Encoder Re-Ranking", desc: "Local ms-marco-MiniLM-L-6-v2. No network required. Fully reproducible." },
  { icon: GitBranch, title: "Transparent Scoring", desc: "Every score is auditable. CE evidence, skill trust, career breakdown — all visible." },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const } }),
};

export default function LandingPage() {
  const router = useRouter();
  const { state, dispatch } = useAppContext();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Topbar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[6px] bg-foreground flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-background" />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-foreground">Redrob AI Ranker</span>
            <span className="text-[11px] text-muted-foreground ml-2">Hackathon 2025</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch({ type: "SET_THEME", payload: state.theme === "light" ? "dark" : "light" })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {state.theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => router.push("/home")}
            className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Open App <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center">
        <motion.div initial="hidden" animate="show" variants={fade} custom={0} className="mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Redrob AI Hackathon 2025 Submission
          </span>
        </motion.div>

        <motion.h1
          initial="hidden" animate="show" variants={fade} custom={1}
          className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground mb-6 max-w-3xl leading-[1.1]"
        >
          AI Candidate Ranking at Scale
        </motion.h1>

        <motion.p
          initial="hidden" animate="show" variants={fade} custom={2}
          className="text-[17px] text-muted-foreground max-w-xl leading-relaxed mb-10"
        >
          An 8-stage hybrid pipeline combining semantic search, multi-signal scoring,
          and local cross-encoder re-ranking to rank 100K candidates for a Senior AI Engineer role.
        </motion.p>

        <motion.div initial="hidden" animate="show" variants={fade} custom={3} className="flex gap-3">
          <button
            onClick={() => router.push("/home")}
            className="
              flex items-center gap-2 px-6 py-3 rounded-xl
              bg-foreground text-background text-[14px] font-semibold
              hover:bg-foreground/90 transition-colors
            "
          >
            <Zap className="w-4 h-4" />
            Open App
          </button>
          <button
            onClick={() => router.push("/results")}
            className="
              flex items-center gap-2 px-6 py-3 rounded-xl
              border border-border text-foreground text-[14px] font-medium
              hover:bg-muted/30 transition-colors
            "
          >
            View Results
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Scoring formula */}
        <motion.div
          initial="hidden" animate="show" variants={fade} custom={4}
          className="mt-12 px-5 py-3 rounded-xl border border-border bg-card text-[13px] font-mono text-muted-foreground"
        >
          Judge Formula: <span className="text-foreground font-semibold">0.50</span> × NDCG@10 +{" "}
          <span className="text-foreground font-semibold">0.30</span> × NDCG@50 +{" "}
          <span className="text-foreground font-semibold">0.15</span> × MAP +{" "}
          <span className="text-foreground font-semibold">0.05</span> × P@10
        </motion.div>
      </div>

      {/* Pipeline visualization */}
      <div className="px-8 pb-16">
        <motion.div
          initial="hidden" animate="show" variants={fade} custom={5}
          className="max-w-5xl mx-auto"
        >
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center mb-6">
            8-Step Pipeline
          </div>
          <div className="flex items-stretch gap-0 overflow-x-auto">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.n} className="flex items-center flex-1 min-w-[100px]">
                <div className={`
                  flex-1 rounded-xl border p-3 text-center
                  ${step.isCE
                    ? "border-ai/25 bg-ai/5"
                    : "border-border bg-card"
                  }
                `}>
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mx-auto mb-1.5
                    ${step.isCE ? "bg-ai text-white" : "bg-muted text-foreground"}
                  `}>
                    {step.n}
                  </div>
                  <div className={`text-[11px] font-semibold leading-tight ${step.isCE ? "text-ai" : "text-foreground"}`}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{step.short}</div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="w-4 flex-shrink-0 flex items-center justify-center">
                    <div className="w-2 h-px bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Feature cards */}
      <div className="px-8 pb-20 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial="hidden"
                animate="show"
                variants={fade}
                custom={6 + i}
                className="rounded-xl border border-border bg-card p-4"
              >
                <Icon className="w-5 h-5 text-muted-foreground mb-3" />
                <div className="text-[13px] font-semibold text-foreground mb-1">{f.title}</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-8 py-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Redrob AI Hackathon 2025</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Ready · Competition Mode</span>
        </div>
      </div>
    </div>
  );
}
