"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Search, ChevronLeft, ChevronRight,
  Download, AlertTriangle, X, Shield, Brain, Cpu,
  CheckCircle2, XCircle, SlidersHorizontal, MapPin, Briefcase, Star, Filter, Sparkles,
} from "lucide-react";
import { useAppContext, BackendResult } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PAGE_SIZE = 20;

// ── Helpers ────────────────────────────────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 0.90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0.70) return "text-ai";
  if (score >= 0.50) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function getAvail(r: BackendResult) {
  const sig = r.redrob_signals;
  if (!sig) return "bg-muted-foreground";
  const days = Math.floor((Date.now() - new Date(sig.last_active_date).getTime()) / 86400000);
  if (sig.open_to_work_flag && days < 30 && sig.recruiter_response_rate > 0.5) return "bg-emerald-500";
  if (sig.open_to_work_flag || sig.recruiter_response_rate > 0.4) return "bg-amber-400";
  return "bg-red-500";
}

function isAvailable(r: BackendResult) {
  const sig = r.redrob_signals;
  if (!sig) return false;
  return sig.open_to_work_flag || sig.recruiter_response_rate > 0.4;
}

function profColor(p: string) {
  if (p === "expert") return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/30";
  if (p === "advanced") return "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200/40 dark:border-blue-800/30";
  if (p === "intermediate") return "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/40 dark:border-amber-800/30";
  return "bg-muted text-muted-foreground border border-border";
}

function trustColor(t: number) {
  if (t >= 0.8) return "text-emerald-600 dark:text-emerald-400 font-bold";
  if (t >= 0.5) return "text-purple-600 dark:text-purple-400 font-bold";
  return "text-amber-600 dark:text-amber-500 font-bold";
}

function companyBadge(type: string) {
  const m: Record<string, string> = {
    product: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
    consulting: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
    research: "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50",
    startup: "bg-muted text-foreground border-border",
  };
  return m[type] || "bg-muted text-muted-foreground border-border";
}

// Get unique locations from results
function getUniqueLocations(results: BackendResult[]): string[] {
  const locs = new Set<string>();
  results.forEach(r => {
    if (r.location) {
      const city = r.location.split(",")[0].trim();
      locs.add(city);
    }
  });
  return Array.from(locs).sort();
}

// ── Score Bar ──────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 1, highlight }: { label: string; value: number; max?: number; highlight?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className={`text-[12px] w-36 flex-shrink-0 ${highlight ? "text-ai font-medium" : "text-muted-foreground"}`}>{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${highlight ? "bg-ai" : "bg-foreground/70"}`}
        />
      </div>
      <span className={`text-[12px] font-mono font-semibold w-12 text-right ${highlight ? "text-ai" : "text-foreground"}`}>
        {value.toFixed(3)}
      </span>
    </div>
  );
}

// ── Filter Panel ──────────────────────────────────────────────────────────────
interface FilterState {
  keyword: string;
  titleCategory: string;
  scoreMin: number;
  scoreMax: number;
  expMin: number;
  expMax: number;
  availabilityOnly: boolean;
  hideHoneypots: boolean;
  locationFilter: string;
  rankDeltaFilter: string; // "promoted" | "dropped" | "stable" | "all"
}

function FilterPanel({
  filters,
  onChange,
  onClose,
  allLocations,
  jdExpMin,
  jdExpMax,
}: {
  filters: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  onClose: () => void;
  allLocations: string[];
  jdExpMin: number;
  jdExpMax: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-background shadow-xl z-50 p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground">Advanced Filters</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Score range */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          Final Score Range
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0} max={1} step={0.01}
            value={filters.scoreMin}
            onChange={e => onChange({ scoreMin: parseFloat(e.target.value) || 0 })}
            className="w-16 text-[12px] px-2 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-center"
          />
          <span className="text-[11px] text-muted-foreground">to</span>
          <input
            type="number"
            min={0} max={1} step={0.01}
            value={filters.scoreMax}
            onChange={e => onChange({ scoreMax: parseFloat(e.target.value) || 1 })}
            className="w-16 text-[12px] px-2 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-center"
          />
        </div>
      </div>

      {/* Experience range */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
          Experience (years)
          {jdExpMin > 0 && (
            <span className="ml-2 text-ai font-normal normal-case">JD: {jdExpMin}–{jdExpMax}y</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0} max={20} step={1}
            value={filters.expMin}
            onChange={e => onChange({ expMin: parseInt(e.target.value) || 0 })}
            className="w-16 text-[12px] px-2 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-center"
          />
          <span className="text-[11px] text-muted-foreground">to</span>
          <input
            type="number"
            min={0} max={40} step={1}
            value={filters.expMax}
            onChange={e => onChange({ expMax: parseInt(e.target.value) || 40 })}
            className="w-16 text-[12px] px-2 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-center"
          />
        </div>
      </div>

      {/* Location filter */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          Location
        </label>
        <select
          value={filters.locationFilter}
          onChange={e => onChange({ locationFilter: e.target.value })}
          className="w-full text-[12px] px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground focus:outline-none"
        >
          <option value="">All Locations</option>
          {allLocations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* Rank delta filter */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          CE Rank Change
        </label>
        <select
          value={filters.rankDeltaFilter}
          onChange={e => onChange({ rankDeltaFilter: e.target.value })}
          className="w-full text-[12px] px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground focus:outline-none"
        >
          <option value="all">All</option>
          <option value="promoted">Promoted (↑)</option>
          <option value="dropped">Dropped (↓)</option>
          <option value="stable">Stable (=)</option>
        </select>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        {[
          { key: "availabilityOnly", label: "Available candidates only", icon: "🟢" },
          { key: "hideHoneypots", label: "Hide honeypot profiles", icon: "🛡️" },
        ].map(({ key, label, icon }) => (
          <label key={key} className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => onChange({ [key]: !filters[key as keyof FilterState] } as Partial<FilterState>)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                filters[key as keyof FilterState] ? "bg-foreground" : "bg-muted-foreground/30"
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                filters[key as keyof FilterState] ? "translate-x-4" : "translate-x-0"
              }`} />
            </div>
            <span className="text-[12px] text-muted-foreground">{icon} {label}</span>
          </label>
        ))}
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({
          scoreMin: 0, scoreMax: 1, expMin: 0, expMax: 40,
          availabilityOnly: false, hideHoneypots: false,
          locationFilter: "", rankDeltaFilter: "all",
        })}
        className="w-full text-[12px] text-muted-foreground hover:text-foreground py-1.5 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        Reset All Filters
      </button>
    </motion.div>
  );
}

// ── Candidate Detail Panel ────────────────────────────────────────────────────
function CandidatePanel({ candidate, onClose, executionMode, jdSkills }: {
  candidate: BackendResult;
  onClose: () => void;
  executionMode: string;
  jdSkills: string[];
}) {
  const [tab, setTab] = useState("overview");
  const TABS = ["overview", "skills", "career", "signals", "honeypot", "reasoning"];

  const feat = candidate.features || {};
  const scoreColor = candidate.final_score >= 0.9 ? "text-emerald-500" : candidate.final_score >= 0.7 ? "text-ai" : "text-amber-500";
  const delta = candidate.rank_delta || (candidate.algo_rank - candidate.rank);

  const getFeatureVal = (key: string): number => {
    const v = feat[key] !== undefined ? feat[key] : (candidate as any)[key];
    return typeof v === "number" ? v : 0;
  };

  const ceRaw = candidate.ce_score || getFeatureVal("ce_score") || 0;
  const ceDisplay = ceRaw <= 1 ? Math.round(ceRaw * 100) : Math.round(ceRaw);

  // Check if candidate skill matches a JD skill
  const isJDSkill = (skillName: string) => {
    return jdSkills.some(js => skillName.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(skillName.toLowerCase()));
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-[52%] bg-background border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-muted-foreground tracking-widest mb-1">
            {candidate.candidate_id} · {executionMode === "competition" ? "Competition" : "Demo"}
          </div>
          <h2 className="text-[16px] font-bold text-foreground truncate">{candidate.current_title}</h2>
          <p className="text-[13px] text-muted-foreground">{candidate.current_company}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className={`text-2xl font-bold font-mono ${scoreColor}`}>
              {candidate.final_score.toFixed(3)}
            </div>
            <div className="text-[10px] text-muted-foreground">Final Score</div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
            candidate.rank <= 10 ? "bg-foreground text-background" : "bg-muted text-foreground"
          }`}>
            #{candidate.rank}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[12px] font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* OVERVIEW */}
            {tab === "overview" && (
              <div className="space-y-5">
                {/* JD Match banner */}
                {jdSkills.length > 0 && (
                  <div className="rounded-xl border border-ai/20 bg-ai/4 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-3.5 h-3.5 text-ai" />
                      <span className="text-[12px] font-semibold text-foreground">JD Skill Match</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {jdSkills.slice(0, 6).map(skill => {
                        const matched = (candidate.skills || []).some(cs =>
                          cs.name.toLowerCase().includes(skill.toLowerCase()) ||
                          skill.toLowerCase().includes(cs.name.toLowerCase())
                        );
                        return (
                          <span key={skill} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                            matched
                              ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                              : "bg-muted text-muted-foreground border-border"
                          }`}>
                            {matched ? "✓ " : ""}{skill}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Score breakdown */}
                <div>
                  <h3 className="text-[12px] font-semibold text-foreground mb-3">Score Breakdown</h3>
                  <div className="space-y-2">
                    <ScoreBar label="Skills — Semantic" value={getFeatureVal("skill_semantic_component") || getFeatureVal("semantic_score") || 0} />
                    <ScoreBar label="Skills — Keyword Trust" value={getFeatureVal("skill_keyword_component") || getFeatureVal("skill_score") || 0} />
                    <ScoreBar label="Career Quality" value={getFeatureVal("career_score") || 0} />
                    <ScoreBar label="Experience Years" value={getFeatureVal("experience_score") || 0} />
                    <ScoreBar label="Location" value={getFeatureVal("location_score") || 0} />
                    <ScoreBar label="Education" value={getFeatureVal("education_score") || 0} />
                    <ScoreBar label="Platform Quality" value={getFeatureVal("platform_quality_score") || 0} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Behavioral multiplier</span>
                    <span className="font-mono text-[13px] font-semibold text-foreground">
                      ×{(getFeatureVal("behavioral_multiplier") || 1).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* CE Score */}
                <div className="rounded-xl border border-ai/20 bg-ai/4 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-3.5 h-3.5 text-ai" />
                    <span className="text-[12px] font-semibold text-foreground">Cross-Encoder Score</span>
                    <span className="ml-auto text-[20px] font-bold font-mono text-ai">
                      {ceDisplay}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ceDisplay}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-ai rounded-full"
                    />
                  </div>
                  {candidate.blend_calculation && (
                    <p className="text-[11px] font-mono text-muted-foreground mt-2">{candidate.blend_calculation}</p>
                  )}
                </div>

                {/* Rank delta */}
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="text-muted-foreground">Rank change (CE vs algo):</span>
                  {delta === 0 ? (
                    <span className="flex items-center gap-1 text-muted-foreground"><Minus className="w-3 h-3" />No change</span>
                  ) : delta > 0 ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"><TrendingUp className="w-3.5 h-3.5" />+{delta} positions promoted</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 font-semibold"><TrendingDown className="w-3.5 h-3.5" />{delta} positions dropped</span>
                  )}
                </div>

                {/* Reasoning */}
                {candidate.reasoning && (
                  <div>
                    <h3 className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-ai" /> Reasoning
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">Template</span>
                    </h3>
                    <p className="text-[12px] text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                      {candidate.reasoning}
                    </p>
                  </div>
                )}

                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <span className="text-muted-foreground">Location</span>
                    <p className="font-medium text-foreground">{candidate.location}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Experience</span>
                    <p className="font-medium text-foreground">{candidate.years_of_experience?.toFixed(1)} years</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Algo Rank</span>
                    <p className="font-mono font-medium text-foreground">#{candidate.algo_rank}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Final Rank</span>
                    <p className="font-mono font-bold text-foreground">#{candidate.rank}</p>
                  </div>
                </div>
              </div>
            )}

            {/* SKILLS */}
            {tab === "skills" && (
              <div className="space-y-4">
                <p className="text-[12px] text-muted-foreground">Sorted by JD match then trust score.</p>
                {(candidate.skills || []).length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No skill data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px] text-left">
                      <thead>
                        <tr className="border-b border-border">
                          {["SKILL", "PROFICIENCY", "MONTHS", "ENDORSEMENTS", "TRUST", "JD MATCH"].map(h => (
                            <th key={h} className="pb-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(candidate.skills || []).map((sk, i) => {
                          const matchesJD = isJDSkill(sk.name);
                          const duration = sk.duration_months || 0;
                          const endorsements = sk.endorsements ?? sk.endorsement_count ?? 0;
                          const trust = Math.min(1, (sk.proficiency === "expert" ? 0.9 : sk.proficiency === "advanced" ? 0.7 : 0.45) *
                            (1 / (1 + Math.exp(-(duration / 12 - 1)))) *
                            Math.log(endorsements + 2) / Math.log(10));
                          return (
                            <tr key={i} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                              <td className="py-3 pr-4 font-semibold text-foreground text-[12.5px]">{sk.name}</td>
                              <td className="py-3 pr-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${profColor(sk.proficiency)}`}>{sk.proficiency}</span>
                              </td>
                              <td className="py-3 pr-4 font-mono text-muted-foreground">{duration}m</td>
                              <td className="py-3 pr-4 font-mono text-muted-foreground">{endorsements}</td>
                              <td className="py-3 pr-4">
                                <span className={`font-mono ${trustColor(trust)}`}>{trust.toFixed(2)}</span>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground text-[11px]">
                                {matchesJD ? (
                                  <span className="text-gray-500 font-medium">
                                    {["Embeddings", "Vector DB", "Retrieval", "LLMs", "Evaluation", "Python"].find(cat =>
                                      sk.name.toLowerCase().includes(cat.toLowerCase().split(" ")[0])
                                    ) || "Yes"}
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CAREER */}
            {tab === "career" && (
              <div className="relative pl-2 space-y-0">
                {(candidate.career_history || []).length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No career data available.</p>
                ) : (
                  <>
                    {/* Timeline line */}
                    <div className="absolute left-[12px] top-3 bottom-3 w-[1.5px] bg-muted-foreground/15 -translate-x-[50%]" />
                    
                    {(candidate.career_history || []).map((job, i) => (
                      <div key={i} className="relative pl-6 pb-6 last:pb-1 group">
                        {/* Timeline dot */}
                        <div className="absolute left-[12px] top-[10px] w-2.5 h-2.5 rounded-full bg-muted-foreground/40 border border-background -translate-x-[50%] transition-transform group-hover:scale-110" />
                        
                        <div className="flex items-center gap-2 mb-1.5">
                          {job.company_type && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${companyBadge(job.company_type)}`}>
                              {job.company_type.charAt(0).toUpperCase() + job.company_type.slice(1)}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">{job.duration_months}m</span>
                          {i === 0 && <span className="text-[11px] text-muted-foreground/80 font-mono">Current × 2.5</span>}
                        </div>
                        
                        <h3 className="text-[13px] font-bold text-foreground mt-0.5">{job.title}</h3>
                        <div className="text-[11px] text-muted-foreground/85 font-medium">{job.company} · {job.industry}</div>
                        <p className="text-[11.5px] text-muted-foreground/95 mt-1.5 leading-relaxed">{job.description || ""}</p>
                        
                        {job.description && (job.description.toLowerCase().includes("deploy") || job.description.toLowerCase().includes("production") || job.description.toLowerCase().includes("build")) && (
                          <div className="inline-flex items-center gap-1 mt-2 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20">
                            <span>✓ Production Evidence Found</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* SIGNALS */}
            {tab === "signals" && (
              <div className="space-y-3">
                {!candidate.redrob_signals ? (
                  <p className="text-[13px] text-muted-foreground">No signals data available.</p>
                ) : (
                  <>
                    {[
                      { label: "Open to Work", val: candidate.redrob_signals.open_to_work_flag ? "Yes" : "No", good: candidate.redrob_signals.open_to_work_flag },
                      { label: "Willing to Relocate", val: candidate.redrob_signals.willing_to_relocate ? "Yes" : "No", good: candidate.redrob_signals.willing_to_relocate },
                      { label: "Recruiter Response Rate", val: `${(candidate.redrob_signals.recruiter_response_rate * 100).toFixed(0)}%`, good: candidate.redrob_signals.recruiter_response_rate > 0.5 },
                      { label: "Notice Period", val: `${candidate.redrob_signals.notice_period_days} days`, good: candidate.redrob_signals.notice_period_days <= 30 },
                      { label: "Profile Completeness", val: `${(candidate.redrob_signals.profile_completeness_score * 100).toFixed(0)}%`, good: candidate.redrob_signals.profile_completeness_score > 0.7 },
                      { label: "GitHub Activity", val: `${(candidate.redrob_signals.github_activity_score * 100).toFixed(0)}%`, good: candidate.redrob_signals.github_activity_score > 0.4 },
                      { label: "Expected Salary", val: candidate.redrob_signals.expected_salary_range_inr_lpa || "—", good: true },
                      { label: "Work Mode", val: candidate.redrob_signals.preferred_work_mode || "—", good: true },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between text-[12px] py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-medium ${row.good ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {String(row.val)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* HONEYPOT */}
            {tab === "honeypot" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">
                      Honeypot Confidence: {((candidate.honeypot_confidence || (feat.honeypot_confidence as number) || 0) * 100).toFixed(0)}%
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {(candidate.honeypot_confidence || 0) > 0.55 ? "⚠ Elevated confidence — review flags" : "✓ Low honeypot risk"}
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(candidate.honeypot_confidence || 0) > 0.55 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${(candidate.honeypot_confidence || 0) * 100}%` }}
                  />
                </div>
                {(candidate.honeypot_flags || []).length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Flags Detected</p>
                    {(candidate.honeypot_flags || []).map((flag, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px] text-amber-600 dark:text-amber-400">
                        <XCircle className="w-3 h-3 flex-shrink-0" />
                        {flag}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">No honeypot flags detected.</p>
                )}
              </div>
            )}

            {/* REASONING */}
            {tab === "reasoning" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-ai/20 bg-ai/4 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-3.5 h-3.5 text-ai" />
                    <span className="text-[12px] font-semibold text-foreground">AI Reasoning</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {candidate.reasoning || "No reasoning generated for this candidate."}
                  </p>
                </div>
                {candidate.blend_calculation && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-mono text-muted-foreground font-semibold mb-1">Blend Formula</p>
                    <p className="text-[12px] font-mono text-foreground">{candidate.blend_calculation}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main Results Page ─────────────────────────────────────────────────────────
export default function ResultsPage() {
  const ctx = useAppContext();
  const { dispatch } = ctx;
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [titleCat, setTitleCat] = useState("All");
  const [selectedCandidate, setSelectedCandidate] = useState<BackendResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // JD-aware filter state
  const jdData = ctx.state.jdData;
  const jdExpMin = jdData?.experience?.min_years || 0;
  const jdExpMax = jdData?.experience?.max_years || 40;
  const jdSkills = jdData?.hard_skills?.flatMap(s => [...s.keywords.slice(0, 3), s.name]) || [];
  const jdLocations = jdData?.locations || [];

  const [filters, setFilters] = useState<FilterState>({
    keyword: "",
    titleCategory: "All",
    scoreMin: 0,
    scoreMax: 1,
    expMin: 0,
    expMax: 40,
    availabilityOnly: false,
    hideHoneypots: false,
    locationFilter: "",
    rankDeltaFilter: "all",
  });

  const updateFilter = useCallback((f: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...f }));
    setPage(1);
  }, []);

  // Build unified list: prefer backendResults, fallback to rankingResults → mockData
  const allResults: BackendResult[] = useMemo(() => {
    if (ctx.state.backendResults.length > 0) return ctx.state.backendResults;
    if (ctx.state.rankingResults.length > 0) {
      return ctx.state.rankingResults.map(r => ({
        ...r,
        ce_score: r.ce_score / 100,
        honeypot_confidence: r.honeypot_confidence,
        honeypot_flags: r.honeypot_flags,
        rank_delta: r.algo_rank - r.rank,
        features: {
          skill_semantic_component: r.skill_semantic_component || 0,
          skill_keyword_component: r.skill_keyword_component || 0,
          career_score: r.career_score || 0,
          experience_score: r.experience_score || 0,
          location_score: r.location_score || 0,
          education_score: r.education_score || 0,
          platform_quality_score: r.platform_quality_score || 0,
          behavioral_multiplier: r.behavioral_multiplier || 1,
          ce_score: r.ce_score / 100,
        },
      } as BackendResult));
    }
    return [];
  }, [ctx.state.backendResults, ctx.state.rankingResults]);

  // Fetch from backend if no results
  useEffect(() => {
    if (allResults.length === 0) {
      setIsLoading(true);
      const startTime = Date.now();
      fetch(`${API_BASE}/api/results`)
        .then(r => r.json())
        .then(data => {
          if (data.results?.length > 0) {
            dispatch({ type: "SET_BACKEND_RESULTS", payload: data.results, honeypotsFlagged: data.honeypots_flagged });
          } else {
            dispatch({ type: "SET_STATUS", payload: "done" });
          }
        })
        .catch(() => {
          dispatch({ type: "SET_STATUS", payload: "done" });
        })
        .finally(() => {
          const elapsed = Date.now() - startTime;
          const delay = Math.max(1500 - elapsed, 0);
          setTimeout(() => setIsLoading(false), delay);
        });
    }
  }, []);

  const allLocations = useMemo(() => getUniqueLocations(allResults), [allResults]);

  // Full filter logic — JD-aware
  const filtered = useMemo(() => {
    return allResults.filter(c => {
      // Text search
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.current_title.toLowerCase().includes(q) &&
          !c.current_company.toLowerCase().includes(q) &&
          !(c.location || "").toLowerCase().includes(q)
        ) return false;
      }
      // Title category
      if (titleCat !== "All") {
        const title = c.current_title.toLowerCase();
        const isCore = /(machine learning|ml|artificial intelligence|ai|nlp|llm|deep learning|data scientist|retrieval|ranking|search engineer|nlp engineer)/.test(title);
        const isTech = !isCore && /(engineer|developer|platform|backend|software|data|analytics|infra|mlops)/.test(title);
        if (titleCat === "Core ML/AI" && !isCore) return false;
        if (titleCat === "Tech Adjacent" && !isTech) return false;
        if (titleCat === "Other" && (isCore || isTech)) return false;
      }
      // Score range
      if (c.final_score < filters.scoreMin || c.final_score > filters.scoreMax) return false;
      // Experience range
      const exp = c.years_of_experience || 0;
      if (exp < filters.expMin || exp > filters.expMax) return false;
      // Availability
      if (filters.availabilityOnly && !isAvailable(c)) return false;
      // Honeypots
      if (filters.hideHoneypots && (c.honeypot_confidence || 0) > 0.55) return false;
      // Location
      if (filters.locationFilter) {
        const city = (c.location || "").split(",")[0].trim();
        if (!city.toLowerCase().includes(filters.locationFilter.toLowerCase())) return false;
      }
      // Rank delta
      if (filters.rankDeltaFilter !== "all") {
        const delta = c.rank_delta ?? (c.algo_rank - c.rank);
        if (filters.rankDeltaFilter === "promoted" && delta <= 0) return false;
        if (filters.rankDeltaFilter === "dropped" && delta >= 0) return false;
        if (filters.rankDeltaFilter === "stable" && delta !== 0) return false;
      }
      return true;
    });
  }, [allResults, search, titleCat, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const honeypots = ctx.state.honeypotsFlagged !== undefined
    ? ctx.state.honeypotsFlagged
    : allResults.filter(c => (c.honeypot_confidence || 0) > 0.55).length;
  const avgDelta = allResults.length > 0
    ? allResults.reduce((sum, c) => sum + (c.rank_delta || 0), 0) / allResults.length
    : 0;

  // Count active filters
  const activeFilterCount = [
    filters.scoreMin > 0 || filters.scoreMax < 1,
    filters.expMin > 0 || filters.expMax < 40,
    filters.availabilityOnly,
    filters.hideHoneypots,
    filters.locationFilter !== "",
    filters.rankDeltaFilter !== "all",
  ].filter(Boolean).length;

  const exportCsv = useCallback(() => {
    if (allResults.length === 0) return;
    
    const rows = allResults.map(r => {
      const semanticScore = Number(r.features?.skill_semantic_component || r.features?.semantic_score || (r as any).skill_semantic_component || (r as any).semantic_score || 0);
      const featureScore = Number(r.features?.skill_keyword_component || r.features?.skill_score || (r as any).skill_keyword_component || (r as any).skill_score || 0);
      const aiRec = r.final_score >= 0.8 ? "Strong Hire" : r.final_score >= 0.65 ? "Consider" : "Pass";
      const keySkills = (r.skills && r.skills.length > 0) ? r.skills.slice(0, 3).map(s => s.name).join(", ") : "N/A";
      const candidateName = (r.anonymized_name as string) || (r.profile as any)?.anonymized_name || `Candidate ${r.candidate_id.split("-").pop() || r.candidate_id}`;
      const ceDisplay = r.ce_score !== undefined ? (r.ce_score <= 1 ? Math.round(r.ce_score * 100) : Math.round(r.ce_score)) : 0;
      const sig = r.redrob_signals;
      const isAvail = sig ? (sig.open_to_work_flag || (sig.recruiter_response_rate ?? 0) > 0.4) : false;

      return {
        "Rank": r.rank,
        "Candidate ID": r.candidate_id,
        "Name": candidateName,
        "Current Title": r.current_title,
        "Current Company": r.current_company,
        "Experience (Yrs)": r.years_of_experience,
        "Location": r.location || "Unknown",
        "Overall Score": r.final_score.toFixed(3),
        "Match %": `${Math.round(r.final_score * 100)}%`,
        "AI Recommendation": aiRec,
        "Key Skills": keySkills,
        "Semantic Score": semanticScore.toFixed(3),
        "Feature Score": featureScore.toFixed(3),
        "Cross-Encoder Score": ceDisplay,
        "Availability": isAvail ? "Yes" : "No",
        "Honeypot Check": `${Math.round((r.honeypot_confidence || 0) * 100)}%`,
        "Reasoning": r.reasoning || r.ce_reasoning || "N/A"
      };
    });

    const header = Object.keys(rows[0]);
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = [
      header.map(escapeCsv).join(","),
      ...rows.map(r => Object.values(r).map(escapeCsv).join(","))
    ].join("\n");
    
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    a.download = `ranked_candidates_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }, [allResults]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Summary bar skeleton */}
        <div className="px-8 py-4 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </div>
          <div className="flex items-center gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="ml-auto">
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        {/* Filters skeleton */}
        <div className="px-8 py-3 border-b border-border flex items-center gap-3">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-4 w-36 ml-auto" />
        </div>

        {/* Table skeleton */}
        <div className="flex-1 overflow-auto px-8 py-4">
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="divide-y divide-border">
              {/* Header skeleton */}
              <div className="flex items-center px-4 py-3 bg-muted/40 gap-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              {/* Rows skeleton */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center px-4 py-4 gap-4">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-20" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <div className="w-48 flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (allResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">No data available</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Please upload candidates and run the ranking pipeline first.</p>
          </div>
          <Button onClick={() => router.push("/input")} className="mt-4">
            Go to Input
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${selectedCandidate ? "mr-[52%]" : ""}`}>

        {/* Summary bar */}
        <div className="px-8 py-4 border-b border-border bg-background flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">S7 · Results</div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Ranked Candidates</h1>
            {jdData && (
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {jdData.role_title}
                {jdLocations.length > 0 && (
                  <><span className="text-border ml-1">·</span>
                  <MapPin className="w-3 h-3 ml-1" />
                  {jdLocations.join(", ")}</>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-5 ml-4 flex-wrap">
            {[
              { label: "Top of", value: `${allResults.length}` },
              { label: "CE re-ranked", value: `${ctx.state.totalCandidatesProcessed || allResults.length} shortlisted` },
              { label: "Avg rank change", value: `±${Math.abs(avgDelta).toFixed(1)}` },
              { label: "Honeypots", value: honeypots === 0 ? "None" : `${honeypots} flagged`, warn: honeypots > 0 },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`text-[13px] font-semibold ${s.warn ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  {s.value}
                </span>
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
            {ctx.state.pipelineRuntime && (
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-foreground">{ctx.state.pipelineRuntime}s</span>
                <span className="text-[11px] text-muted-foreground">Runtime</span>
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-[12px]" onClick={exportCsv} disabled={allResults.length === 0}>
              <Download className="w-3 h-3" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Honeypot warning */}
        {honeypots > 0 && (
          <div className="mx-8 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-[12px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning: {honeypots} candidate{honeypots > 1 ? "s" : ""} in this list have elevated honeypot confidence (&gt;0.55). Review CE Evidence tab for details.
          </div>
        )}

        {/* JD skill context */}
        {jdData && jdData.hard_skills.length > 0 && (
          <div className="mx-8 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-ai/15 bg-ai/4 text-[11px]">
            <Star className="w-3 h-3 text-ai flex-shrink-0" />
            <span className="text-muted-foreground">Ranking against:</span>
            <div className="flex flex-wrap gap-1.5">
              {jdData.hard_skills.slice(0, 5).map(s => (
                <span key={s.name} className="px-1.5 py-0.5 rounded-full bg-ai/10 text-ai border border-ai/20 font-medium">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-8 py-3 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search title, company, location…"
              className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            value={titleCat}
            onChange={e => { setTitleCat(e.target.value); setPage(1); }}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground focus:outline-none"
          >
            <option value="All">All categories</option>
            <option value="Core ML/AI">Core ML/AI</option>
            <option value="Tech Adjacent">Tech Adjacent</option>
            <option value="Other">Other</option>
          </select>

          {/* Advanced filter button */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
                activeFilterCount > 0
                  ? "border-ai/30 bg-ai/8 text-ai"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-ai text-white text-[9px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showFilters && (
                <FilterPanel
                  filters={filters}
                  onChange={updateFilter}
                  onClose={() => setShowFilters(false)}
                  allLocations={allLocations}
                  jdExpMin={jdExpMin}
                  jdExpMax={jdExpMax}
                />
              )}
            </AnimatePresence>
          </div>

          <span className="text-[11px] text-muted-foreground ml-auto">
            {filtered.length} candidates · Page {page}/{totalPages}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {allResults.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <p className="text-[14px] font-semibold text-foreground mb-2">No results yet</p>
                <p className="text-[12px] text-muted-foreground mb-4">Run the ranking pipeline to see results here.</p>
                <Button size="sm" onClick={() => router.push("/input")}>Upload & Rank Candidates</Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <Filter className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-foreground mb-2">No candidates match filters</p>
                <p className="text-[12px] text-muted-foreground mb-4">Try relaxing the filter criteria.</p>
                <button
                  onClick={() => updateFilter({
                    scoreMin: 0, scoreMax: 1, expMin: 0, expMax: 40,
                    availabilityOnly: false, hideHoneypots: false,
                    locationFilter: "", rankDeltaFilter: "all",
                  })}
                  className="text-[12px] text-ai hover:underline"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full relative border rounded-md shadow-sm bg-card">
              <Table className="text-[12px] min-w-max">
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-20 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[60px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Rank</TableHead>
                    <TableHead className="w-[100px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Candidate ID</TableHead>
                    <TableHead className="w-[150px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Name</TableHead>
                    <TableHead className="w-[180px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Current Role</TableHead>
                    <TableHead className="w-[100px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Experience</TableHead>
                    <TableHead className="w-[150px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Location</TableHead>
                    <TableHead className="w-[120px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Overall Score</TableHead>
                    <TableHead className="w-[100px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Match %</TableHead>
                    <TableHead className="w-[160px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">AI Recommendation</TableHead>
                    <TableHead className="w-[200px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Key Skills</TableHead>
                    <TableHead className="w-[130px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Semantic Score</TableHead>
                    <TableHead className="w-[130px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Feature Score</TableHead>
                    <TableHead className="w-[150px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Cross-Encoder</TableHead>
                    <TableHead className="w-[100px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Availability</TableHead>
                    <TableHead className="w-[130px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Honeypot Check</TableHead>
                    <TableHead className="w-[300px] uppercase text-[10px] font-bold text-muted-foreground tracking-widest whitespace-nowrap px-4 h-10">Reasoning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((c, i) => {
                    const delta = c.rank_delta ?? (c.algo_rank - c.rank);
                    const ceRaw = c.ce_score || 0;
                    const ceDisplay = ceRaw <= 1 ? Math.round(ceRaw * 100) : Math.round(ceRaw);
                    const isHoneypot = (c.honeypot_confidence || 0) > 0.55;
                    const expInRange = jdData && c.years_of_experience >= jdExpMin && c.years_of_experience <= jdExpMax;
                    const semanticScore = Number(c.features?.skill_semantic_component || c.features?.semantic_score || (c as any).skill_semantic_component || (c as any).semantic_score || 0);
                    const featureScore = Number(c.features?.skill_keyword_component || c.features?.skill_score || (c as any).skill_keyword_component || (c as any).skill_score || 0);
                    const aiRec = c.final_score >= 0.8 ? "Strong Hire" : c.final_score >= 0.65 ? "Consider" : "Pass";
                    const keySkills = (c.skills && c.skills.length > 0) ? c.skills.slice(0, 3).map(s => s.name).join(", ") : "N/A";
                    const candidateName = (c.anonymized_name as string) || (c.profile as any)?.anonymized_name || `Candidate ${c.candidate_id.split("-").pop() || c.candidate_id}`;
                    
                    return (
                      <TableRow
                        key={c.candidate_id}
                        onClick={() => setSelectedCandidate(c)}
                        className={`
                          cursor-pointer transition-colors
                          ${selectedCandidate?.candidate_id === c.candidate_id ? "bg-muted/60" : ""}
                          ${c.rank <= 10 ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""}
                          ${isHoneypot ? "opacity-60" : ""}
                        `}
                      >
                        <TableCell className="px-4 py-3 font-medium whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold ${
                            c.rank <= 10 ? "bg-foreground text-background" : "bg-muted text-foreground"
                          }`}>
                            {c.rank}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{c.candidate_id}</TableCell>
                        <TableCell className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{candidateName}</TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-foreground max-w-[200px] truncate flex items-center gap-1.5" title={c.current_title}>
                            {isHoneypot && <Shield className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                            {c.current_title}
                          </div>
                          <div className="text-muted-foreground text-[11px] truncate max-w-[200px]" title={c.current_company}>{c.current_company}</div>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span className={`font-mono font-semibold ${
                            expInRange ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          }`}>
                            {c.years_of_experience?.toFixed(1)} yrs
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span className="text-muted-foreground truncate block max-w-[150px]" title={c.location}>
                            {c.location}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span className={`font-mono font-semibold ${getScoreColor(c.final_score)}`}>
                            {c.final_score.toFixed(3)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-foreground font-medium">
                            {Math.round(c.final_score * 100)}%
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            aiRec === "Strong Hire" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200" :
                            aiRec === "Consider" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200" :
                            "bg-muted text-muted-foreground border-border"
                          }`}>
                            {aiRec}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="max-w-[200px] truncate text-[11px] text-muted-foreground" title={keySkills}>
                            {keySkills}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                          {semanticScore.toFixed(3)}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                          {featureScore.toFixed(3)}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span className="ai-badge text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px]">
                            {ceDisplay}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${getAvail(c)}`} />
                            {isAvailable(c) ? "Yes" : "No"}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] font-mono font-bold text-[11px] ${
                            isHoneypot
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : (c.honeypot_confidence || 0) > 0.30
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
                          }`}>
                            {Math.round((c.honeypot_confidence || 0) * 100)}%
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="max-w-[300px] truncate text-[11px] text-muted-foreground bg-muted/30 px-2 py-1 rounded" title={c.reasoning}>
                            {c.reasoning || "No reasoning available"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {allResults.length > 0 && (
          <div className="px-8 py-3 border-t border-border flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-7 h-7 p-0">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                .map(p => (
                  <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)} className="w-7 h-7 p-0 text-[11px]">
                    {p}
                  </Button>
                ))}
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="w-7 h-7 p-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Detail Panel */}
      <AnimatePresence>
        {selectedCandidate && (
          <CandidatePanel
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
            executionMode={ctx.state.executionMode}
            jdSkills={jdSkills}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
