"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Search, ChevronLeft, ChevronRight,
  Download, AlertTriangle, Filter
} from "lucide-react";
import { useAppContext } from "@/store/appStore";
import { generateMockData, RankedCandidate } from "@/data/mockData";
import CandidateDetailPanel from "@/components/candidate/CandidateDetailPanel";
import { exportToCsv } from "@/utils/csvExport";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

function getScoreColor(score: number) {
  if (score >= 0.90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0.70) return "text-ai";
  if (score >= 0.50) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function getAvailabilityDot(c: RankedCandidate) {
  const sig = c.redrob_signals;
  const daysSince = Math.floor((Date.now() - new Date(sig.last_active_date).getTime()) / 86400000);
  if (sig.open_to_work_flag && daysSince < 30 && sig.recruiter_response_rate > 0.5) return "bg-emerald-500";
  if (sig.open_to_work_flag || sig.recruiter_response_rate > 0.4) return "bg-amber-400";
  return "bg-red-500";
}

function getTierClass(rank: number, ceScore: number): string {
  if (rank <= 10 && ceScore < 60) return "tier-1b-row";
  if (rank <= 10) return "tier-1-row";
  if (rank > 50) return "tier-3-row";
  return "";
}

export default function ResultsPage() {
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [titleCat, setTitleCat] = useState("All");
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (state.rankingResults.length === 0) {
      const data = generateMockData();
      dispatch({ type: "SET_RESULTS", payload: data });
      dispatch({ type: "LOAD_DATA", payload: data });
      dispatch({ type: "SET_STATUS", payload: "done" });
    }
  }, []);

  const results = state.rankingResults.length > 0 ? state.rankingResults : generateMockData();

  const filtered = useMemo(() => {
    return results.filter(c => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.current_title.toLowerCase().includes(q) &&
            !c.current_company.toLowerCase().includes(q) &&
            !c.location.toLowerCase().includes(q)) return false;
      }
      if (titleCat !== "All") {
        const isCore = ["ML Engineer", "AI Engineer", "NLP Engineer", "Data Scientist", "Research Scientist", "Search Engineer"].some(t => c.current_title.includes(t.split(" ")[0]));
        const isTech = !isCore && c.years_of_experience > 2;
        if (titleCat === "Core ML/AI" && !isCore) return false;
        if (titleCat === "Tech Adjacent" && !isTech) return false;
        if (titleCat === "Other" && (isCore || isTech)) return false;
      }
      return true;
    });
  }, [results, search, titleCat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const honeypots = results.filter(c => c.honeypot_confidence > 0.55).length;
  const avgDelta = results.reduce((sum, c) => sum + (c.algo_rank - c.rank), 0) / results.length;

  const handleRowClick = (c: RankedCandidate) => {
    dispatch({ type: "SELECT_CANDIDATE", payload: c });
    setShowPanel(true);
  };

  return (
    <div className="flex h-screen">
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${showPanel ? "mr-[52%]" : ""}`}>
        {/* Summary bar */}
        <div className="px-8 py-4 border-b border-border bg-background flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">S7 · Results</div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Ranked Candidates</h1>
          </div>
          <div className="flex items-center gap-5 ml-4 flex-wrap">
            {[
              { label: "Top of", value: `${results.length}` },
              { label: "CE re-ranked", value: "300 shortlisted" },
              { label: "Avg rank change", value: `±${Math.abs(avgDelta).toFixed(1)}` },
              { label: "Honeypots", value: honeypots === 0 ? "None" : `${honeypots} flagged`, warn: honeypots > 0 },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`text-[13px] font-semibold ${s.warn ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{s.value}</span>
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-[12px]" onClick={() => exportToCsv(results)}>
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
          <span className="text-[11px] text-muted-foreground ml-auto">
            {filtered.length} candidates · Page {page}/{totalPages}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-background border-b border-border z-10">
              <tr>
                {[
                  { label: "Rank", w: "56px" },
                  { label: "Score", w: "70px" },
                  { label: "CE Score", w: "76px" },
                  { label: "Δ Rank", w: "64px" },
                  { label: "Candidate", w: "auto" },
                  { label: "YoE", w: "48px" },
                  { label: "Location", w: "100px" },
                  { label: "Avail", w: "48px" },
                ].map(col => (
                  <th key={col.label} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-medium" style={{ width: col.w }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((c, i) => {
                const delta = c.algo_rank - c.rank;
                const tierClass = getTierClass(c.rank, c.ce_score);
                return (
                  <motion.tr
                    key={c.candidate_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => handleRowClick(c)}
                    className={`
                      border-b border-border/50 cursor-pointer transition-colors
                      hover:bg-muted/40 ${tierClass}
                      ${state.selectedCandidate?.candidate_id === c.candidate_id ? "bg-muted/60" : ""}
                    `}
                  >
                    {/* Rank */}
                    <td className="px-3 py-2.5">
                      <span className={`
                        inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold
                        ${c.rank <= 10 ? "bg-foreground text-background" : "bg-muted text-foreground"}
                      `}>
                        {c.rank}
                      </span>
                    </td>
                    {/* Score */}
                    <td className="px-3 py-2.5">
                      <span className={`font-mono font-semibold ${getScoreColor(c.final_score)}`}>
                        {c.final_score.toFixed(3)}
                      </span>
                    </td>
                    {/* CE Score */}
                    <td className="px-3 py-2.5">
                      <span className="ai-badge text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px]">
                        {Math.round(c.ce_score)}
                      </span>
                    </td>
                    {/* Rank delta */}
                    <td className="px-3 py-2.5">
                      {delta === 0
                        ? <span className="flex items-center gap-0.5 text-muted-foreground"><Minus className="w-3 h-3" />0</span>
                        : delta > 0
                          ? <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold"><TrendingUp className="w-3 h-3" />+{delta}</span>
                          : <span className="flex items-center gap-0.5 text-red-500 font-semibold"><TrendingDown className="w-3 h-3" />{delta}</span>
                      }
                    </td>
                    {/* Candidate */}
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <div className="font-medium text-foreground truncate">{c.current_title}</div>
                      <div className="text-muted-foreground truncate text-[11px]">{c.current_company}</div>
                    </td>
                    {/* YoE */}
                    <td className="px-3 py-2.5">
                      <span className={`font-mono font-semibold ${c.years_of_experience >= 5 && c.years_of_experience <= 9 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                        {c.years_of_experience.toFixed(1)}
                      </span>
                    </td>
                    {/* Location */}
                    <td className="px-3 py-2.5">
                      <span className="text-muted-foreground truncate block max-w-[96px]">{c.location}</span>
                    </td>
                    {/* Availability */}
                    <td className="px-3 py-2.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${getAvailabilityDot(c)}`} />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-8 py-3 border-t border-border flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-7 h-7 p-0">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages).map(p => (
              <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)} className="w-7 h-7 p-0 text-[11px]">
                {p}
              </Button>
            ))}
            <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="w-7 h-7 p-0">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Candidate Detail Panel */}
      <AnimatePresence>
        {showPanel && state.selectedCandidate && (
          <CandidateDetailPanel onClose={() => setShowPanel(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
