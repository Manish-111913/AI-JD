"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Cpu, Loader2, ArrowRight } from "lucide-react";
import { useAppContext, PIPELINE_STAGES } from "@/store/appStore";
import { generateMockData } from "@/data/mockData";
import { Button } from "@/components/ui/button";

const STAGE_LOGS: Record<number, string[]> = {
  1: ["Reading candidate JSON payload…", "Validated schema — 50 records, all required fields present", "Location strings normalized: 12 distinct locations mapped", "Career history dates parsed. Candidate data ready."],
  2: ["Running title pre-filter on 50 candidates…", "Title relevance map loaded: 17 distinct title categories", "35 candidates assigned near-zero title score (non-tech)", "3 Core ML/AI → 1.00, 12 tech-adjacent → 0.35–0.70", "Title pre-filter complete."],
  3: ["Running honeypot detection heuristics…", "⚠ CAND_0000046: Expert skills with 0 months duration — honeypot signal", "⚠ CAND_0000048: Career start 2002, graduation 2022 — impossible", "⚠ CAND_0000049: 47 applications in 30 days — mass application", "Honeypot detection complete. 5 flagged (confidence > 0.70)."],
  4: ["Loading pre-computed candidate embeddings (offline)…", "Embeddings: 50 × 768-dim vectors loaded", "Cosine similarity: Query 1 (weight 60%)… done", "Cosine similarity: Query 2 (weight 30%)… done", "Cosine similarity: Query 3 (weight 10%)… done", "Semantic scoring complete."],
  5: ["Scoring skill trust for 50 candidates…", "Formula: proficiency × sigmoid(duration) × log(endorsements) × assessment", "Minimum floor 0.05 applied to all skills", "Skill trust scoring complete."],
  6: ["Classifying company types: Product / Consulting / Research / Startup…", "Scanning for production deployment signals in career descriptions…", "Behavioral multiplier: recency × open_to_work × response_rate × notice", "Career + behavioral scoring complete."],
  7: ["First-pass scoring complete. Sorting 50 by composite score…", "Top 300 shortlisted for CE re-ranking. (Demo: all 50 candidates)", "Shortlist ready. Passing to cross-encoder phase."],
  8: ["Loading cross-encoder: cross-encoder/ms-marco-MiniLM-L-6-v2", "Model ready. CPU inference. No network required.", "CE re-ranking: batch 1/10 complete (32 pairs, 3.2s)", "CE re-ranking: batch 2/10 complete (32 pairs, 3.1s)", "CE re-ranking: batch 3/10 complete (32 pairs, 3.3s)", "CE re-ranking: batch 4/10 complete (32 pairs, 3.0s)", "CE re-ranking: batch 5/10 complete (32 pairs, 3.2s)", "CE re-ranking: batch 6/10 complete (32 pairs, 3.1s)", "CE re-ranking: batch 7/10 complete (32 pairs, 3.4s)", "CE re-ranking: batch 8/10 complete (32 pairs, 3.2s)", "CE re-ranking: batch 9/10 complete (32 pairs, 3.1s)", "CE re-ranking: batch 10/10 complete (32 pairs, 3.3s)", "CE re-ranking complete. Blending: 40% algo + 60% CE.", "Final ranking complete. Top 100 selected. Runtime: 28.4s"],
};

const PROGRESS_WEIGHTS = [5, 5, 10, 10, 15, 10, 15, 30];

export default function RankingPage() {
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  const [stages, setStages] = useState(PIPELINE_STAGES.map(s => ({ ...s, status: "pending" as "pending" | "active" | "completed" })));
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStageIdx, setCurrentStageIdx] = useState(-1);
  const [cePair, setCePair] = useState(0);
  const [ceBatch, setCeBatch] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (state.candidatesData.length === 0) {
      dispatch({ type: "LOAD_DATA", payload: generateMockData() });
    }
    dispatch({ type: "SET_STATUS", payload: "ranking" });

    let cumDelay = 0;
    PIPELINE_STAGES.forEach((stage, idx) => {
      // Activate
      setTimeout(() => {
        setStages(prev => prev.map((s, i) => i === idx ? { ...s, status: "active" } : s));
        setCurrentStageIdx(idx);
        const lines = STAGE_LOGS[stage.id] || [];
        lines.forEach((line, li) => {
          setTimeout(() => {
            const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
            setLogs(prev => [...prev, `[${ts}] ${line}`]);
          }, (li + 1) * (stage.durationMs / (lines.length + 1)));
        });
        if (stage.isCE) {
          for (let b = 1; b <= 10; b++) {
            setTimeout(() => { setCeBatch(b); setCePair(Math.min(b * 32, 300)); }, (b / 10) * (stage.durationMs - 300));
          }
        }
      }, cumDelay);

      // Complete
      setTimeout(() => {
        setStages(prev => prev.map((s, i) => i === idx ? { ...s, status: "completed" } : s));
        const newPct = PROGRESS_WEIGHTS.slice(0, idx + 1).reduce((a, b) => a + b, 0);
        setProgress(newPct);
        if (idx === PIPELINE_STAGES.length - 1) {
          dispatch({ type: "SET_RESULTS", payload: generateMockData() });
          dispatch({ type: "SET_STATUS", payload: "done" });
          setShowSummary(true);
          setTimeout(() => router.push("/results"), 3500);
        }
      }, cumDelay + stage.durationMs);

      cumDelay += stage.durationMs;
    });
  }, []);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const isDone = stages.every(s => s.status === "completed");
  const activeStage = stages.find(s => s.status === "active");

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">S6 · Processing Tracker</div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ranking Pipeline</h1>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
          isDone
            ? "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 animate-pulse"
        }`}>
          {isDone ? "Complete" : "Running"} · {state.executionMode === "competition" ? "Competition" : "Demo"} Mode
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>Overall progress</span>
          <span className="font-mono font-semibold text-foreground">{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-foreground rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Stages */}
        <div className="col-span-2 space-y-0.5">
          {stages.map((stage, i) => (
            <div
              key={stage.id}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all
                ${stage.status === "active"
                  ? stage.isCE ? "bg-ai/8 border border-ai/20" : "bg-muted/60 border border-border"
                  : stage.status === "completed" ? "" : "opacity-25"
                }
              `}
            >
              <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                {stage.status === "completed"
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  : stage.status === "active"
                    ? <Loader2 className={`w-3.5 h-3.5 animate-spin ${stage.isCE ? "text-ai" : "text-foreground"}`} />
                    : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25" />
                }
              </div>
              <span className={`text-[11px] font-medium leading-tight flex-1 min-w-0 truncate ${
                stage.status === "active" ? (stage.isCE ? "text-ai" : "text-foreground") : "text-muted-foreground"
              }`}>
                {stage.name}
              </span>
              {stage.isCE && stage.status === "active" && (
                <span className="flex-shrink-0 text-[9px] font-bold ai-badge px-1 py-0.5 rounded-[3px]">CE</span>
              )}
            </div>
          ))}
        </div>

        {/* Log */}
        <div className="col-span-3 rounded-xl border border-border bg-[hsl(var(--muted)/0.4)] overflow-hidden flex flex-col" style={{ minHeight: 280 }}>
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Pipeline Log</span>
            {activeStage?.isCE && (
              <span className="text-[10px] font-mono text-ai">
                pair {cePair}/300 · batch {ceBatch}/10
              </span>
            )}
          </div>
          <div className="flex-1 p-3 overflow-y-auto max-h-64 font-mono text-[10.5px] space-y-0.5">
            {logs.map((line, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`leading-relaxed ${line.includes("⚠") ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"}`}>
                {line}
              </motion.div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Stage 8 CE counter */}
      {activeStage?.isCE && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-ai/20 bg-ai/4 px-5 py-3">
          <div className="flex items-center gap-4">
            <Cpu className="w-4 h-4 text-ai flex-shrink-0" />
            <div>
              <div className="text-[13px] font-medium text-foreground">
                Scoring pair: <span className="font-mono text-ai">{cePair}</span> / 300 candidates
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                Batch: {ceBatch} / 10 (batch size: 32)
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* CE Summary card */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="rounded-xl border border-ai/25 bg-ai/5 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-ai" />
              <h3 className="text-[14px] font-semibold text-foreground">Cross-Encoder Phase Complete</h3>
              <span className="ml-auto ai-badge text-[10px] px-2 py-0.5 rounded-[4px] font-medium">ms-marco-MiniLM-L-6-v2</span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { v: "300 candidates", l: "Re-ranked" },
                { v: "10 batches", l: "Batch count" },
                { v: "40% + 60% CE", l: "Score blend" },
                { v: "~3 promoted 10+", l: "Top promoted" },
              ].map(s => (
                <div key={s.l} className="text-center">
                  <div className="text-[13px] font-semibold text-foreground">{s.v}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-ai/15">
              <span className="text-[12px] text-muted-foreground">Redirecting to results…</span>
              <Button size="sm" className="gap-1.5 bg-foreground text-background text-[12px]" onClick={() => router.push("/results")}>
                View Results <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
