"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Search, Shield, MapPin, TrendingUp, Brain, Info,
  Upload, X, CheckCircle, AlertCircle, Loader2, FileUp, Sparkles,
  ChevronRight, BarChart3, Zap,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
import { useAppContext } from "@/store/appStore";


const TABS = [
  { id: "hard", label: "Hard Skills", icon: FileText },
  { id: "preferred", label: "Preferred", icon: TrendingUp },
  { id: "disqualifiers", label: "Disqualifiers", icon: Shield },
  { id: "location", label: "Location Map", icon: MapPin },
  { id: "experience", label: "Experience", icon: TrendingUp },
  { id: "queries", label: "AI Queries", icon: Brain },
];

type JDData = {
  success: boolean;
  filename: string;
  role_title: string;
  locations: string[];
  experience: { min_years: number; max_years: number; peak_years: number };
  hard_skills: { name: string; weight: number; keywords: string[] }[];
  preferred_skills: { name: string; note: string }[];
  disqualifiers: { name: string; logic: string; color: string; bg: string }[];
  location_map: { bucket: string; score: number; bar: number; is_primary: boolean }[];
  ai_queries: { weight: string; label: string; text: string }[];
  title_tiers: { tier: string; score: string; examples: string; color: string; bg: string }[];
  jd_excerpt: string;
  jd_text_length: number;
};

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onAnalyzed }: { onAnalyzed: (data: JDData) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(f.type) && !["pdf", "docx", "txt"].includes(ext || "")) {
      setError("Please upload a PDF, DOCX, or TXT file.");
      return;
    }
    setFile(f);
    setError("");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const analyze = async () => {
    if (!file) return;
    setStatus("analyzing");
    setProgress(0);
    setError("");

    // Animate progress while uploading
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 18, 88));
    }, 200);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/upload-jd`, { method: "POST", body: form });
      clearInterval(interval);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      const data: JDData = await res.json();
      setProgress(100);
      await new Promise(r => setTimeout(r, 400));
      onAnalyzed(data);
    } catch (err: unknown) {
      clearInterval(interval);
      setStatus("error");
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ai/10 border border-ai/20 text-ai text-[11px] font-semibold uppercase tracking-widest mb-4"
          >
            <Sparkles className="w-3 h-3" />
            S3 · JD Analyzer
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-2xl font-bold text-foreground tracking-tight"
          >
            Analyze Job Description
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-[14px] mt-2"
          >
            Upload a JD file and the AI will extract skills, requirements,
            disqualifiers, and ranking signals automatically.
          </motion.p>
        </div>

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`
            relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
            ${dragOver ? "border-ai bg-ai/5 scale-[1.01]" : "border-border hover:border-ai/50 hover:bg-muted/30"}
            ${file ? "bg-card" : "bg-card/50"}
          `}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 px-8"
              >
                <div className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all
                  ${dragOver ? "bg-ai text-white scale-110" : "bg-muted text-muted-foreground"}
                `}>
                  <FileUp className="w-8 h-8" />
                </div>
                <p className="text-[15px] font-semibold text-foreground mb-1">
                  {dragOver ? "Drop it here!" : "Drop your JD file here"}
                </p>
                <p className="text-[13px] text-muted-foreground mb-4">or click to browse</p>
                <div className="flex gap-2">
                  {["PDF", "DOCX", "TXT"].map(t => (
                    <span key={t} className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="file"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-ai/10 border border-ai/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-ai" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[12px] text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  {status !== "analyzing" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); setStatus("idle"); setError(""); }}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {status === "analyzing" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analyzing JD…
                      </span>
                      <span className="text-[12px] font-mono text-ai">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-ai rounded-full"
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {["Extracting text", "Detecting skills", "Building queries", "Mapping location"].map((step, i) => (
                        <span
                          key={step}
                          className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                            progress > i * 25
                              ? "bg-ai/10 text-ai border border-ai/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {step}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 text-[13px] text-red-600 dark:text-red-400"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          disabled={!file || status === "analyzing"}
          onClick={analyze}
          className={`
            mt-4 w-full py-3.5 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2.5
            transition-all duration-200
            ${file && status !== "analyzing"
              ? "bg-foreground text-background hover:opacity-90 active:scale-[0.99]"
              : "bg-muted text-muted-foreground cursor-not-allowed"
            }
          `}
        >
          {status === "analyzing" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
          ) : (
            <><Zap className="w-4 h-4" /> Analyze Job Description</>
          )}
        </motion.button>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-[12px] text-muted-foreground mt-4"
        >
          The AI extracts skills, experience range, disqualifiers, and generates semantic ranking queries.
        </motion.p>
      </motion.div>
    </div>
  );
}

// ── Results View ──────────────────────────────────────────────────────────────
function JDResults({ data, onReset }: { data: JDData; onReset: () => void }) {
  const [activeTab, setActiveTab] = useState("hard");

  const weightPercent = (w: number) => `${Math.round(w * 100)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto px-8 py-10"
    >
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            S3 · Job Description Analyzer
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.role_title}</h1>
          <p className="text-muted-foreground text-[14px] mt-1">
            Parsed from <span className="font-mono text-foreground">{data.filename}</span>
            &nbsp;·&nbsp;{data.jd_text_length.toLocaleString()} characters extracted
            {data.locations.length > 0 && (
              <>&nbsp;·&nbsp;<MapPin className="inline w-3 h-3 mb-0.5" /> {data.locations.join(", ")}</>
            )}
          </p>
        </div>
        <button
          onClick={onReset}
          className="flex-shrink-0 flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
        >
          <Upload className="w-3 h-3" />
          New JD
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-5">

          {/* JD Excerpt */}
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
            {data.jd_excerpt && (
              <div className="px-4 pb-4">
                <div className="rounded-lg bg-muted/50 p-3 text-[12px] text-muted-foreground leading-relaxed font-mono max-h-32 overflow-hidden relative">
                  {data.jd_excerpt.slice(0, 300)}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/50 to-transparent" />
                </div>
              </div>
            )}
          </div>

          {/* Title Relevance Map */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-[13px] font-semibold text-foreground">Title Relevance Map</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">5-tier pre-filter classification</p>
            </div>
            <div className="divide-y divide-border">
              {data.title_tiers.map(t => (
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
                  Non-core titles receive near-zero title scores and are eliminated before semantic scoring.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Tabs */}
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
              {/* Hard Skills */}
              {activeTab === "hard" && (
                <div className="space-y-3">
                  <p className="text-[12px] text-muted-foreground">
                    {data.hard_skills.length} skill categories extracted from JD. Weight = share of total skill score.
                  </p>
                  {data.hard_skills.map(s => (
                    <div key={s.name} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold text-foreground">{s.name}</span>
                        <span className="text-[12px] font-bold text-ai font-mono">{weightPercent(s.weight)}</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: weightPercent(s.weight) }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full bg-ai/70 rounded-full"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.keywords.map(k => (
                          <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Preferred */}
              {activeTab === "preferred" && (
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground mb-3">
                    Lower-weight signals — not required but add score.
                  </p>
                  {data.preferred_skills.map(p => (
                    <div key={p.name} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <span className="text-[13px] text-foreground">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground">{p.note}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Disqualifiers */}
              {activeTab === "disqualifiers" && (
                <div className="space-y-3">
                  <p className="text-[12px] text-muted-foreground mb-3">
                    Soft-penalty disqualifiers — not binary, sigmoid curves applied.
                  </p>
                  {data.disqualifiers.map((d, i) => (
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
                      <p className="text-[12px] text-muted-foreground">{d.logic}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Location Map */}
              {activeTab === "location" && (
                <div className="space-y-2.5">
                  <p className="text-[12px] text-muted-foreground mb-3">
                    Location scoring relative to JD preference: {data.locations.join(", ")}.
                  </p>
                  {data.location_map.map(l => (
                    <div key={l.bucket} className="flex items-center gap-3">
                      <div className="w-40 text-[12px] text-foreground flex-shrink-0 flex items-center gap-1.5">
                        {l.bucket}
                        {l.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ai/10 text-ai border border-ai/20">JD</span>}
                      </div>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${l.bar}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full bg-foreground/80 rounded-full"
                        />
                      </div>
                      <span className="w-10 text-right text-[12px] font-mono font-bold text-foreground">
                        {l.score.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Experience */}
              {activeTab === "experience" && (
                <div>
                  <p className="text-[12px] text-muted-foreground mb-4">
                    Gaussian curve — peak at {data.experience.min_years}–{data.experience.max_years} years.
                  </p>
                  <div className="relative h-20 flex items-end gap-1">
                    {Array.from({ length: 21 }, (_, yr) => {
                      const peak = data.experience.peak_years;
                      const min = data.experience.min_years;
                      const max = data.experience.max_years;
                      let score: number;
                      if (yr < min - 2) score = 0.15;
                      else if (yr < min) score = 0.45;
                      else if (yr <= max) score = 0.95 - Math.abs(yr - peak) * 0.04;
                      else if (yr <= max + 2) score = 0.70;
                      else score = 0.45;
                      score = Math.max(0.12, Math.min(1, score));
                      const isPeak = yr >= min && yr <= max;
                      const isNear = yr >= min - 1 && yr <= max + 1 && !isPeak;
                      return (
                        <div key={yr} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-t-sm transition-colors ${isPeak ? "bg-foreground" : isNear ? "bg-foreground/50" : "bg-muted"}`}
                            style={{ height: `${score * 60}px` }}
                          />
                          {[0, 5, 10, 15, 20].includes(yr) && (
                            <span className="text-[9px] text-muted-foreground">{yr}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-4 text-[11px]">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-foreground" /> Peak ({data.experience.min_years}–{data.experience.max_years} yrs)</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-foreground/50" /> Near-target</div>
                  </div>
                </div>
              )}

              {/* AI Queries */}
              {activeTab === "queries" && (
                <div className="space-y-4">
                  <p className="text-[12px] text-muted-foreground">
                    3 semantic queries generated from JD. Weighted {data.ai_queries.map(q => q.weight).join(" / ")}.
                  </p>
                  {data.ai_queries.map((q, i) => (
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
                        &ldquo;{q.text}&rdquo;
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JDAnalyzerPage() {
  const { state, dispatch } = useAppContext();
  const jdData = state.jdData;
  const apiModeEnabled = state.apiSettings?.apiModeEnabled;

  // Custom JD paste panel state (API Mode only)
  const [showCustomJD, setShowCustomJD] = useState(false);
  const [customJDText, setCustomJDText] = useState("");
  const [parsingLLM, setParsingLLM] = useState(false);
  const [parseError, setParseError] = useState("");
  const [llmParsedData, setLlmParsedData] = useState<JDData | null>(null);

  const handleAnalyzed = (data: JDData) => {
    dispatch({ type: 'SET_JD_DATA', payload: data });
  };

  const handleReset = () => {
    dispatch({ type: 'SET_JD_DATA', payload: null });
    setLlmParsedData(null);
  };

  const handleParseWithAI = async () => {
    if (!customJDText.trim() || customJDText.length < 50) {
      setParseError("JD text too short. Please paste a complete job description.");
      return;
    }
    setParsingLLM(true);
    setParseError("");
    try {
      const res = await fetch("http://localhost:8000/api/parse-jd-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: customJDText }),
      });
      const data = await res.json();
      if (data.success) {
        // Merge with expected JD structure
        const merged: JDData = {
          ...data,
          filename: "Custom JD (LLM parsed)",
          jd_text_length: customJDText.length,
          title_tiers: [],
          jd_excerpt: customJDText.slice(0, 400),
        };
        setLlmParsedData(merged);
        dispatch({ type: 'SET_JD_DATA', payload: merged });
        setShowCustomJD(false);
      } else {
        setParseError(data.error || "LLM parsing failed. Try again or use file upload.");
      }
    } catch {
      setParseError("Could not reach backend. Is the server running?");
    } finally {
      setParsingLLM(false);
    }
  };

  return (
    <div>
      {/* API Mode: Custom JD Paste Panel */}
      {apiModeEnabled && !jdData && (
        <div className="max-w-2xl mx-auto px-8 pt-8">
          <button
            onClick={() => setShowCustomJD(v => !v)}
            className="flex items-center gap-2 text-[13px] font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors mb-2"
          >
            <Sparkles className="w-4 h-4" />
            {showCustomJD ? "Hide" : "Paste a custom job description (API Mode)"}
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showCustomJD ? "rotate-90" : ""}`} />
          </button>

          <AnimatePresence>
            {showCustomJD && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/20 p-4 mb-6 space-y-3">
                  <div className="text-[12px] text-purple-700 dark:text-purple-300">
                    Paste any job description below. The LLM will extract skills, experience, disqualifiers, and generate semantic queries for any role.
                  </div>
                  <textarea
                    value={customJDText}
                    onChange={e => setCustomJDText(e.target.value)}
                    placeholder="Paste the full job description here..."
                    rows={6}
                    className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none font-mono"
                  />
                  {parseError && (
                    <p className="text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {parseError}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleParseWithAI}
                      disabled={parsingLLM || !customJDText.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {parsingLLM
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Parsing with AI...</>
                        : <><Sparkles className="w-3.5 h-3.5" /> Parse with AI</>
                      }
                    </button>
                    <span className="text-[11px] text-muted-foreground">~1-2 seconds · negligible cost</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!jdData ? (
          <motion.div key="upload" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <UploadModal onAnalyzed={handleAnalyzed} />
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* JD Source Badge */}
            {(jdData as any).llm_parsed && (
              <div className="max-w-5xl mx-auto px-8 pt-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                  <Sparkles className="w-3 h-3" /> Custom JD — parsed by {(jdData as any).llm_model || "AI"}
                </span>
              </div>
            )}
            <JDResults data={jdData} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
