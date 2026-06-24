"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Cpu, Loader2, ArrowRight, AlertCircle, Wifi, WifiOff, FileText, Users, Zap } from "lucide-react";
import { useAppContext, PIPELINE_STAGES, BackendResult } from "@/store/appStore";
import { generateMockData } from "@/data/mockData";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROGRESS_WEIGHTS = [5, 5, 10, 10, 15, 10, 15, 30];

// Dynamic mock logs that use actual candidate count
const buildMockLogs = (count: number, roleTitle: string) => ({
  1: [
    `Reading ${count} candidate JSON records…`,
    "Schema validation: all required fields present",
    "Location strings normalized (Bengaluru → Bengaluru, India)",
    `✓ ${count} candidates loaded and data normalized.`,
  ],
  2: [
    `Running title pre-filter on ${count} candidates…`,
    "Title relevance map loaded from config",
    `Scoring relevance for role: "${roleTitle}"`,
    "Non-tech titles → near-zero score applied",
    "✓ Title pre-filter complete.",
  ],
  3: [
    "Running 7-check honeypot evidence accumulation model…",
    "⚠ Checking: expert skills with 0 months duration",
    "⚠ Checking: career / graduation date mismatches",
    "⚠ Checking: mass application signals (>30 in 30 days)",
    "✓ Honeypot detection complete.",
  ],
  4: [
    `Building text representations for ${count} candidates…`,
    "Loading bi-encoder: sentence-transformers/all-MiniLM-L6-v2…",
    `Embedding ${count} candidates (batch inference)…`,
    "Computing 3-query cosine similarity (Q1×60% + Q2×30% + Q3×10%)…",
    "✓ Semantic scoring complete.",
  ],
  5: [
    "Scoring skill trust: proficiency × sigmoid(duration) × log(endorsements)…",
    "JD category keyword matching running…",
    "Minimum floor 0.05 applied to all skills.",
    "✓ Skill trust scoring complete.",
  ],
  6: [
    "Classifying companies: Product / Consulting / Research / Startup…",
    "Scanning production deployment signals in career descriptions…",
    "Behavioral multiplier: recency × open_to_work × response_rate × notice…",
    "✓ Career + behavioral scoring complete.",
  ],
  7: [
    `Computing composite scores for all ${count} candidates…`,
    `Top 300 shortlisted for CE re-ranking.`,
    "✓ First-pass complete. Shortlist ready.",
  ],
  8: [
    "Loading cross-encoder/ms-marco-MiniLM-L-6-v2…",
    "Model ready. CPU inference. No network required.",
    "CE re-ranking: batch 1/10 complete (32 pairs, 3.2s)",
    "CE re-ranking: batch 5/10 complete (32 pairs, 3.1s)",
    "CE re-ranking: batch 10/10 complete (32 pairs, 3.3s)",
    "CE re-ranking complete. Blending: 40% algo + 60% CE.",
    "✓ Final ranking complete.",
  ],
});

export default function RankingPage() {
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  const [stages, setStages] = useState(
    PIPELINE_STAGES.map(s => ({ ...s, status: "pending" as "pending" | "active" | "completed" }))
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [cePair, setCePair] = useState(0);
  const [ceBatch, setCeBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(10);
  const [showSummary, setShowSummary] = useState(false);
  const [backendMode, setBackendMode] = useState<"real" | "mock" | "detecting">("detecting");
  const [pipelineStats, setPipelineStats] = useState({
    candidatesRanked: 0,
    runtime: 0,
    shortlisted: 0,
    promoted: 0,
    honeypots: 0,
  });
  const logEndRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  const candidateCount = state.uploadedCount || state.candidatesData.length || 50;
  const roleTitle = state.jdData?.role_title || "ML / AI Engineer";
  const jdLocations = state.jdData?.locations?.join(", ") || "India";
  const jdSkills = state.jdData?.hard_skills?.slice(0, 3).map(s => s.name).join(", ") || "ML, NLP, Vector Search";
  const mockLogs = buildMockLogs(candidateCount, roleTitle);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs(prev => [...prev, `[${ts}] ${msg}`]);
  };

  const completeStage = (stageIdx: number) => {
    setStages(prev =>
      prev.map((s, i) => i === stageIdx ? { ...s, status: "completed" } : s)
    );
    const newPct = PROGRESS_WEIGHTS.slice(0, stageIdx + 1).reduce((a, b) => a + b, 0);
    setProgress(newPct);
  };

  const activateStage = (stageIdx: number) => {
    setStages(prev =>
      prev.map((s, i) => i === stageIdx ? { ...s, status: "active" } : s)
    );
  };

  // ── Real SSE Pipeline ──────────────────────────────────────────────────────────────────
  const runRealPipeline = async () => {
    setBackendMode("real");
    dispatch({ type: "SET_STATUS", payload: "ranking" });

    try {
      const response = await fetch(`${API_BASE}/api/rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          llm_enabled: state.executionMode === "demo",
          jd_data: state.jdData
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastStageNum = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            const stageNum: number = evt.stage || 0;
            const msg: string = evt.message || "";
            const prog: number = evt.progress || 0;

            if (msg) addLog(msg);
            if (prog > 0) setProgress(prog);

            if (stageNum > 0 && stageNum <= 8) {
              const sIdx = stageNum - 1;
              if (stageNum !== lastStageNum) {
                if (lastStageNum > 0 && lastStageNum <= 8) completeStage(lastStageNum - 1);
                activateStage(sIdx);
                lastStageNum = stageNum;
              }
            }

            if (evt.ce_batch !== undefined) {
              setCeBatch(evt.ce_batch);
              setCePair(evt.ce_pairs_done || evt.ce_batch * 32);
              if (evt.ce_total_batches) setTotalBatches(evt.ce_total_batches);
            }

            if (evt.type === "complete" && evt.results) {
              setStages(prev => prev.map(s => ({ ...s, status: "completed" })));
              setProgress(100);

              const results: BackendResult[] = evt.results;
              dispatch({ type: "SET_BACKEND_RESULTS", payload: results });
              dispatch({ type: "SET_STATUS", payload: "done" });
              dispatch({
                type: "SET_PIPELINE_RUNTIME",
                payload: { runtime: evt.runtime_seconds || 0, total: evt.candidates_processed || results.length },
              });

              const honeypots = results.filter(r => (r.honeypot_confidence || 0) > 0.55).length;
              const promoted = results.filter(r => (r.rank_delta || 0) > 5).length;

              setPipelineStats({
                candidatesRanked: results.length,
                runtime: evt.runtime_seconds || 0,
                shortlisted: evt.candidates_processed || results.length,
                promoted,
                honeypots,
              });
              setShowSummary(true);
            }

            if (stageNum === 8 && evt.status === "completed") completeStage(7);
          } catch (_) { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      console.error("Real pipeline error:", err);
      addLog(`⚠ Backend pipeline error: ${err instanceof Error ? err.message : String(err)}`);
      runMockPipeline();
    }
  };

  // ── Mock Pipeline (fallback / demo) ────────────────────────────────────────────────────
  const runMockPipeline = () => {
    setBackendMode("mock");
    dispatch({ type: "SET_STATUS", payload: "ranking" });

    let cumDelay = 0;
    PIPELINE_STAGES.forEach((stage, idx) => {
      setTimeout(() => {
        activateStage(idx);
        const lines = mockLogs[stage.id as keyof typeof mockLogs] || [];
        lines.forEach((line, li) => {
          setTimeout(() => addLog(line), (li + 1) * (stage.durationMs / (lines.length + 1)));
        });
        if (stage.isCE) {
          for (let b = 1; b <= 10; b++) {
            setTimeout(() => { setCeBatch(b); setCePair(Math.min(b * Math.ceil(candidateCount / 10), candidateCount)); }, (b / 10) * (stage.durationMs - 300));
          }
        }
      }, cumDelay);

      setTimeout(() => {
        completeStage(idx);
        if (idx === PIPELINE_STAGES.length - 1) {
          const mockData = generateMockData();
          dispatch({ type: "SET_BACKEND_RESULTS", payload: mockData as unknown as BackendResult[] });
          dispatch({ type: "SET_STATUS", payload: "done" });
          const hpCount = Math.floor(mockData.length * 0.08);
          const promoCount = Math.floor(mockData.length * 0.06);
          setPipelineStats({
            candidatesRanked: mockData.length,
            runtime: 28.4,
            shortlisted: Math.min(300, candidateCount),
            promoted: promoCount,
            honeypots: hpCount,
          });
          setShowSummary(true);
        }
      }, cumDelay + stage.durationMs);

      cumDelay += stage.durationMs;
    });
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    fetch(`${API_BASE}/api/status`)
      .then(r => r.json())
      .then(status => {
        if (status.candidates_loaded > 0) {
          runRealPipeline();
        } else {
          runMockPipeline();
        }
      })
      .catch(() => runMockPipeline());
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const isDone = stages.every(s => s.status === "completed");
  const activeStage = stages.find(s => s.status === "active");

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">
            S6 · Processing Tracker
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ranking Pipeline</h1>
          {state.jdData && (
            <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              {roleTitle}
              <span className="text-border">·</span>
              <Users className="w-3 h-3" />
              {candidateCount} candidates
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {backendMode === "real" ? (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <Wifi className="w-3 h-3" /> Live Backend
            </span>
          ) : backendMode === "mock" ? (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <WifiOff className="w-3 h-3" /> Demo Mode
            </span>
          ) : null}
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
            isDone
              ? "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
              : "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 animate-pulse"
          }`}>
            {isDone ? "Complete" : "Running"} · {state.executionMode === "competition" ? "Competition" : "Demo"} Mode
          </span>
        </div>
      </div>

      {/* JD context pill - only shown when JD is uploaded */}
      {state.jdData && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-ai/20 bg-ai/4 text-[11px]"
        >
          <Zap className="w-3.5 h-3.5 text-ai flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-foreground">Ranking against JD:</span>{" "}
            <span className="text-muted-foreground">{jdSkills}</span>
          </div>
          <span className="text-muted-foreground flex-shrink-0">📍 {jdLocations}</span>
        </motion.div>
      )}

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>Overall progress</span>
          <span className="font-mono font-semibold text-foreground">{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-foreground rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Stages list */}
        <div className="col-span-2 space-y-0.5">
          {stages.map((stage) => (
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

        {/* Log panel */}
        <div
          className="col-span-3 rounded-xl border border-border bg-[hsl(var(--muted)/0.4)] overflow-hidden flex flex-col"
          style={{ minHeight: 280 }}
        >
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
              Pipeline Log
            </span>
            {activeStage?.isCE && (
              <span className="text-[10px] font-mono text-ai">
                pair {cePair}/{pipelineStats.shortlisted || candidateCount} · batch {ceBatch}/{totalBatches}
              </span>
            )}
          </div>
          <div className="flex-1 p-3 overflow-y-auto max-h-64 font-mono text-[10.5px] space-y-0.5">
            {logs.length === 0 && (
              <div className="text-muted-foreground/50 italic">Initializing pipeline…</div>
            )}
            {logs.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`leading-relaxed ${
                  line.includes("⚠")
                    ? "text-amber-500 dark:text-amber-400"
                    : line.includes("✓")
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
              >
                {line}
              </motion.div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* CE Live counter */}
      {activeStage?.isCE && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-ai/20 bg-ai/4 px-5 py-3"
        >
          <div className="flex items-center gap-4">
            <Cpu className="w-4 h-4 text-ai flex-shrink-0" />
            <div>
              <div className="text-[13px] font-medium text-foreground">
                Cross-Encoder scoring pair: <span className="font-mono text-ai">{cePair}</span> / {pipelineStats.shortlisted || candidateCount} candidates
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                Batch: {ceBatch} / {totalBatches} (batch size: 32) — ms-marco-MiniLM-L-6-v2
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary card */}
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
              <span className="ml-auto ai-badge text-[10px] px-2 py-0.5 rounded-[4px] font-medium">
                ms-marco-MiniLM-L-6-v2
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { v: `${pipelineStats.shortlisted || candidateCount} candidates`, l: "Re-ranked" },
                { v: `${totalBatches} batches`, l: "Batch count" },
                { v: "40% + 60% CE", l: "Score blend" },
                { v: `~${pipelineStats.promoted || 3} promoted 10+`, l: "Top promoted" },
              ].map(s => (
                <div key={s.l} className="text-center">
                  <div className="text-[13px] font-semibold text-foreground">{s.v}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Dynamic stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Role", value: roleTitle, icon: "🎯" },
                { label: "Location", value: jdLocations, icon: "📍" },
                { label: "Honeypots flagged", value: `${pipelineStats.honeypots}`, icon: "🛡️" },
              ].map(item => (
                <div key={item.label} className="rounded-lg bg-muted/40 border border-border px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{item.icon} {item.label}</div>
                  <div className="text-[12px] font-semibold text-foreground mt-0.5 truncate">{item.value}</div>
                </div>
              ))}
            </div>

            {pipelineStats.runtime > 0 && (
              <div className="text-[11px] text-muted-foreground mb-3">
                Total runtime: <span className="font-mono font-semibold text-foreground">{pipelineStats.runtime}s</span>
                {backendMode === "real" && (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400">· Real backend results</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-ai/15">
              <span className="text-[12px] text-muted-foreground">
                {pipelineStats.candidatesRanked} candidates ranked. Redirecting to results…
              </span>
              <Button
                size="sm"
                className="gap-1.5 bg-foreground text-background text-[12px]"
                onClick={() => router.push("/results")}
              >
                View Results <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
