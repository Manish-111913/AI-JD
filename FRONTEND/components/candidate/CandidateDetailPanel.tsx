import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronDown, ChevronUp, Cpu, CheckCircle2, XCircle,
  Briefcase, GraduationCap, BarChart2, Shield, Brain,
  TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { useAppContext } from "@/store/appStore";
import { RankedCandidate } from "@/data/mockData";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "skills", label: "Skills" },
  { id: "career", label: "Career" },
  { id: "signals", label: "Signals" },
  { id: "honeypot", label: "Honeypot" },
  { id: "ce", label: "CE Evidence" },
];

const JD_QUERY = "Senior ML engineer with expertise in dense retrieval, vector embeddings, semantic similarity, FAISS, Weaviate, Pinecone, reranking pipelines, production-grade search and ranking systems, ANN search";

function profColor(p: string) {
  if (p === "expert") return "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300";
  if (p === "advanced") return "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300";
  if (p === "intermediate") return "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

function trustColor(t: number) {
  if (t >= 0.8) return "text-emerald-600 dark:text-emerald-400";
  if (t >= 0.5) return "text-ai";
  return "text-amber-600 dark:text-amber-400";
}

function companyBadge(type: string) {
  const m: Record<string, string> = {
    product: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    consulting: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    research: "bg-ai/10 text-ai border-ai/20",
    startup: "bg-muted text-foreground border-border",
  };
  return m[type] || "bg-muted text-muted-foreground border-border";
}

export default function CandidateDetailPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppContext();
  const c = state.selectedCandidate as RankedCandidate;
  const [tab, setTab] = useState("overview");
  const [queryOpen, setQueryOpen] = useState(false);
  const [passageOpen, setPassageOpen] = useState(false);

  if (!c) return null;

  const delta = c.algo_rank - c.rank;
  const algoNorm = Math.min(1, (100 - c.algo_rank) / 100);
  const ceNorm = c.ce_score / 100;
  const blended = (0.4 * algoNorm + 0.6 * ceNorm).toFixed(3);
  const candidatePassage = `${c.current_title} at ${c.current_company}. ${c.years_of_experience.toFixed(1)} years of experience. ${c.summary?.slice(0, 200) ?? ""}`;

  const scoreColor = c.final_score >= 0.9 ? "text-emerald-500" : c.final_score >= 0.7 ? "text-ai" : "text-amber-500";

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-[52%] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-[11px] text-muted-foreground">{c.candidate_id}</span>
            {state.executionMode === "competition" ? (
              <span className="text-[10px] border border-border text-muted-foreground px-1.5 py-0.5 rounded-[4px]">Competition</span>
            ) : (
              <span className="text-[10px] ai-badge px-1.5 py-0.5 rounded-[4px]">Demo Mode</span>
            )}
          </div>
          <div className="text-[15px] font-semibold text-foreground truncate">{c.current_title}</div>
          <div className="text-[12px] text-muted-foreground">{c.current_company}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className={`text-2xl font-bold font-mono ${scoreColor}`}>{c.final_score.toFixed(3)}</div>
            <div className="text-[10px] text-muted-foreground">Final Score</div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold ${c.rank <= 10 ? "bg-foreground text-background" : "bg-muted text-foreground"}`}>
            #{c.rank}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            } ${t.id === "ce" ? "text-ai border-ai" : ""}`}
          >
            {t.label}
            {t.id === "ce" && <span className="ml-1 text-[9px] ai-badge px-1 py-0.5 rounded-[3px]">AI</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* ── Overview ── */}
            {tab === "overview" && (
              <div className="space-y-5">
                {/* Score breakdown */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-[12px] font-semibold text-foreground mb-3">Score Breakdown</div>
                  <div className="space-y-2">
                    {[
                      { label: "Skills — Semantic", val: c.skill_semantic_component, max: 0.35 * 0.6 },
                      { label: "Skills — Keyword Trust", val: c.skill_keyword_component, max: 0.35 * 0.4 },
                      { label: "Career Quality", val: c.career_score * 0.30, max: 0.30 },
                      { label: "Experience Years", val: c.experience_score * 0.10, max: 0.10 },
                      { label: "Location", val: c.location_score * 0.10, max: 0.10 },
                      { label: "Education", val: c.education_score * 0.05, max: 0.05 },
                      { label: "Platform Quality", val: c.platform_quality_score * 0.10, max: 0.10 },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground w-36 flex-shrink-0">{s.label}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${Math.min(100, (s.val / 0.35) * 100)}%` }} />
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-foreground w-10 text-right">{s.val.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Behavioral multiplier</span>
                    <span className="font-mono font-bold text-foreground">×{c.behavioral_multiplier.toFixed(2)}</span>
                  </div>
                  {/* CE bar */}
                  <div className="mt-2 pt-2 border-t border-ai/15">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-ai font-medium w-36 flex-shrink-0">Cross-Encoder Score</span>
                      <div className="flex-1 h-1.5 bg-ai/15 rounded-full overflow-hidden">
                        <div className="h-full bg-ai rounded-full" style={{ width: `${c.ce_score}%` }} />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-ai w-10 text-right">{Math.round(c.ce_score)}</span>
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[12px] font-semibold text-foreground">Reasoning</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] border ${state.executionMode === "competition" ? "border-border text-muted-foreground" : "ai-badge"}`}>
                      {state.executionMode === "competition" ? "Template" : "AI-Generated"}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{c.ce_reasoning}</p>
                </div>
              </div>
            )}

            {/* ── Skills ── */}
            {tab === "skills" && (
              <div className="space-y-3">
                <p className="text-[12px] text-muted-foreground">Sorted by JD match then trust score.</p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Skill", "Proficiency", "Months", "Endorsements", "Trust", "JD Match"].map(h => (
                        <th key={h} className="pb-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {c.skills.map((s, i) => {
                      const trust = Math.min(1, (s.proficiency === "expert" ? 0.9 : s.proficiency === "advanced" ? 0.7 : 0.45) *
                        (1 / (1 + Math.exp(-(s.duration_months / 12 - 1)))) *
                        Math.log(s.endorsement_count + 2) / Math.log(10));
                      return (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="py-2 pr-3 font-medium text-foreground">{s.name}</td>
                          <td className="py-2 pr-3">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-medium ${profColor(s.proficiency)}`}>{s.proficiency}</span>
                          </td>
                          <td className="py-2 pr-3 font-mono text-foreground">{s.duration_months}m</td>
                          <td className="py-2 pr-3 font-mono text-foreground">{s.endorsement_count}</td>
                          <td className="py-2 pr-3">
                            <span className={`font-mono font-bold ${trustColor(trust)}`}>{trust.toFixed(2)}</span>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground text-[11px]">
                            {["Embeddings", "Vector DB", "Retrieval", "LLMs", "Evaluation", "Python"].find(cat =>
                              s.name.toLowerCase().includes(cat.toLowerCase().split(" ")[0])
                            ) || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Career ── */}
            {tab === "career" && (
              <div className="space-y-4">
                {c.career_history.map((r, i) => (
                  <div key={i} className="relative pl-5 border-l-2 border-border">
                    <div className="absolute -left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-foreground/20 border border-border" />
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-[4px] border ${companyBadge(r.company_type)}`}>
                        {r.company_type.charAt(0).toUpperCase() + r.company_type.slice(1)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{r.duration_months}m</span>
                      {i === 0 && <span className="text-[10px] text-muted-foreground font-mono">Current × 2.5</span>}
                    </div>
                    <div className="text-[13px] font-semibold text-foreground">{r.title}</div>
                    <div className="text-[12px] text-muted-foreground">{r.company} · {r.industry}</div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.description.slice(0, 180)}…</p>
                    {r.description.toLowerCase().includes("deploy") && (
                      <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Production Evidence Found
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Signals ── */}
            {tab === "signals" && (() => {
              const s = c.redrob_signals;
              const daysSince = Math.floor((Date.now() - new Date(s.last_active_date).getTime()) / 86400000);
              const recency = Math.exp(-daysSince / 90);
              const openMult = s.open_to_work_flag ? 1.2 : 0.8;
              const responseMult = 0.3 + 0.7 * s.recruiter_response_rate;
              const noticeMult = Math.exp(-(Math.max(0, s.notice_period_days - 30)) / 90);
              const combined = (recency * openMult * responseMult * noticeMult).toFixed(2);
              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="text-[12px] font-semibold text-foreground mb-1">Availability Multiplier</div>
                    <div className="text-3xl font-bold font-mono text-foreground mb-2">×{combined}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      recency×{recency.toFixed(2)} × open×{openMult.toFixed(2)} × response×{responseMult.toFixed(2)} × notice×{noticeMult.toFixed(2)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { g: "Availability", items: [
                        { k: "Open to Work", v: s.open_to_work_flag ? "✓ Yes" : "✗ No" },
                        { k: "Last Active", v: `${daysSince}d ago` },
                        { k: "Response Rate", v: `${(s.recruiter_response_rate * 100).toFixed(0)}%` },
                        { k: "Avg Response", v: `${s.avg_response_time_hours}h` },
                      ]},
                      { g: "Logistics", items: [
                        { k: "Notice Period", v: `${s.notice_period_days}d` },
                        { k: "Relocate", v: s.willing_to_relocate ? "Yes" : "No" },
                        { k: "Work Mode", v: s.preferred_work_mode },
                        { k: "Salary Range", v: s.expected_salary_range_inr_lpa },
                      ]},
                      { g: "Platform", items: [
                        { k: "GitHub Score", v: s.github_activity_score === -1 ? "No GitHub" : String(s.github_activity_score) },
                        { k: "Interview Rate", v: `${(s.interview_completion_rate * 100).toFixed(0)}%` },
                        { k: "Offer Acceptance", v: s.offer_acceptance_rate === -1 ? "No history" : `${(s.offer_acceptance_rate * 100).toFixed(0)}%` },
                        { k: "Saved by Recruiters", v: String(s.saved_by_recruiters_30d) },
                      ]},
                      { g: "Verification", items: [
                        { k: "Email", v: s.verified_email ? "✓ Verified" : "✗ Not verified" },
                        { k: "Phone", v: s.verified_phone ? "✓ Verified" : "✗ Not verified" },
                        { k: "LinkedIn", v: s.linkedin_connected ? "✓ Connected" : "✗ Not connected" },
                        { k: "Completeness", v: `${s.profile_completeness_score}/100` },
                      ]},
                    ].map(grp => (
                      <div key={grp.g} className="rounded-xl border border-border bg-card p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{grp.g}</div>
                        {grp.items.map(item => (
                          <div key={item.k} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                            <span className="text-[11px] text-muted-foreground">{item.k}</span>
                            <span className="text-[11px] font-medium text-foreground">{item.v}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Honeypot ── */}
            {tab === "honeypot" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
                  <div>
                    <div className="text-[12px] font-semibold text-foreground mb-0.5">Honeypot Confidence</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.honeypot_confidence < 0.30 ? "Clean" : c.honeypot_confidence < 0.55 ? "Suspicious" : c.honeypot_confidence < 0.75 ? "Likely Honeypot" : "Honeypot"}
                    </div>
                  </div>
                  <div className={`text-3xl font-bold font-mono ml-auto ${c.honeypot_confidence < 0.30 ? "text-emerald-500" : c.honeypot_confidence < 0.55 ? "text-amber-500" : "text-red-500"}`}>
                    {(c.honeypot_confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "Timeline Consistency", pass: !c.honeypot_flags.some(f => f.includes("timeline")), detail: "Checks career dates for impossible overlaps or gaps" },
                    { name: "Skill Trust Plausibility", pass: !c.honeypot_flags.some(f => f.includes("skill")), detail: "Detects expert claims with zero duration/endorsements" },
                    { name: "Behavioral Patterns", pass: !c.honeypot_flags.some(f => f.includes("application")), detail: "Mass application patterns, response rate anomalies" },
                    { name: "Assessment Scores", pass: !c.honeypot_flags.some(f => f.includes("assessment")), detail: "Statistically implausible perfect scores" },
                  ].map(check => (
                    <div key={check.name} className={`rounded-xl border p-3 ${check.pass ? "border-border bg-card" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {check.pass
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          : <XCircle className="w-3.5 h-3.5 text-red-500" />
                        }
                        <span className="text-[12px] font-semibold text-foreground">{check.name}</span>
                        <span className={`ml-auto text-[10px] font-bold ${check.pass ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {check.pass ? "PASS" : "FAIL"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{check.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CE Evidence ── */}
            {tab === "ce" && (
              <div className="space-y-4">
                {/* Attribution */}
                <div className="rounded-xl border border-ai/25 bg-ai/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-4 h-4 text-ai" />
                    <span className="text-[13px] font-semibold text-foreground">Cross-Encoder Evidence</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground font-mono mb-3">
                    Scored by: <span className="text-ai font-medium">cross-encoder/ms-marco-MiniLM-L-6-v2</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Algorithmic Rank (pre-CE)", value: `#${c.algo_rank}` },
                      { label: "CE Score", value: `${Math.round(c.ce_score)} / 100` },
                      { label: "Final Blended Rank", value: `#${c.rank}` },
                      { label: "Rank Change", value: delta === 0 ? "Stable" : delta > 0 ? `↑ +${delta} promoted` : `↓ ${delta} demoted`, color: delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-muted-foreground" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg border border-border bg-card p-3">
                        <div className="text-[10px] text-muted-foreground mb-0.5">{s.label}</div>
                        <div className={`text-[16px] font-bold font-mono ${(s as any).color || "text-foreground"}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blend calculation */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-[12px] font-semibold text-foreground mb-2">Blend Calculation</div>
                  <div className="font-mono text-[12px] text-muted-foreground space-y-1">
                    <div>0.40 × algo_normalized + 0.60 × ce_score = blended_score</div>
                    <div className="text-foreground font-medium">
                      0.40 × {algoNorm.toFixed(3)} + 0.60 × {(c.ce_score / 100).toFixed(3)} = {blended}
                    </div>
                  </div>
                </div>

                {/* Query text */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setQueryOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-[12px] font-semibold text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <span>Query Text Sent to Cross-Encoder</span>
                    {queryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {queryOpen && (
                    <div className="px-4 pb-4 border-t border-border">
                      <p className="text-[11px] font-mono text-muted-foreground leading-relaxed mt-3 bg-muted/30 rounded-lg p-3">
                        "{JD_QUERY}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Candidate passage */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setPassageOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-[12px] font-semibold text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <span>Candidate Passage Evaluated</span>
                    {passageOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {passageOpen && (
                    <div className="px-4 pb-4 border-t border-border">
                      <p className="text-[11px] font-mono text-muted-foreground leading-relaxed mt-3 bg-muted/30 rounded-lg p-3">
                        "{candidatePassage}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
