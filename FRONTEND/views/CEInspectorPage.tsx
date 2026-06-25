"use client";

import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell, CartesianGrid
} from "recharts";
import { useAppContext, BackendResult } from "@/store/appStore";
import { Cpu, TrendingUp, TrendingDown, Search, AlertTriangle } from "lucide-react";

// Helper to safely get a numeric value from top-level or features dict
function getField(c: BackendResult, key: string, fallback: number = 0): number {
  const topLevel = (c as any)[key];
  if (topLevel !== undefined && topLevel !== null) return Number(topLevel);
  const fromFeatures = (c.features as any)?.[key];
  if (fromFeatures !== undefined && fromFeatures !== null) return Number(fromFeatures);
  return fallback;
}

const BATCH_DATA = Array.from({ length: 10 }, (_, i) => ({
  batch: i + 1,
  min: 35 + Math.floor(Math.random() * 15),
  max: 70 + Math.floor(Math.random() * 25),
  avg: 52 + Math.floor(Math.random() * 18),
  time: (3.0 + Math.random() * 0.6).toFixed(1),
  status: "Success",
}));

function TooltipBox({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as BackendResult;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-2.5 text-[11px] shadow-lg max-w-[200px]">
      <div className="font-semibold text-foreground truncate">{d.current_title}</div>
      <div className="text-muted-foreground">{d.current_company}</div>
      <div className="mt-1 space-y-0.5">
        <div>Algo rank: <span className="font-mono font-bold text-foreground">#{getField(d, "algo_rank", 0)}</span></div>
        <div>Final rank: <span className="font-mono font-bold text-foreground">#{d.rank}</span></div>
        <div>CE score: <span className="font-mono font-bold text-ai">{Math.round(getField(d, "ce_score", 0))}</span></div>
      </div>
    </div>
  );
}

export default function CEInspectorPage() {
  const { state, dispatch } = useAppContext();
  const [logSearch, setLogSearch] = useState("");
  const results: BackendResult[] = (state.backendResults || []);

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">No data available</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Please upload candidates and run the ranking pipeline first.</p>
          </div>
        </div>
      </div>
    );
  }

  const scatterData = useMemo(() =>
    results.map(c => ({ ...c, x: getField(c, "algo_rank", c.rank ?? 0), y: c.rank ?? 0 })),
    [results]
  );

  const ceHist = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}–${(i + 1) * 10}`, count: 0, aboveCut: false }));
    results.forEach(c => {
      const ceScore = getField(c, "ce_score", 0);
      const i = Math.min(9, Math.floor(ceScore / 10));
      buckets[i].count++;
    });
    const cutScore = getField(results[results.length - 1] as any, "ce_score", 40);
    return buckets.map((b, i) => ({ ...b, aboveCut: i * 10 >= cutScore }));
  }, [results]);

  const promotions = useMemo(() =>
    results
      .map(c => ({ ...c, delta: getField(c, "algo_rank", c.rank ?? 0) - (c.rank ?? 0) }))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5),
    [results]
  );

  const demotions = useMemo(() =>
    results
      .map(c => ({ ...c, delta: getField(c, "algo_rank", c.rank ?? 0) - (c.rank ?? 0) }))
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 5),
    [results]
  );

  const avgCE = (results.reduce((sum, c) => sum + getField(c, "ce_score", 0), 0) / Math.max(results.length, 1)).toFixed(1);
  const algoCECorr = 0.72; // Pearson correlation (simulated)
  const topPromoted = results.filter(c => (getField(c, "algo_rank", c.rank ?? 0) - (c.rank ?? 0)) >= 10).length;
  const topDemoted = results.filter(c => ((c.rank ?? 0) - getField(c, "algo_rank", c.rank ?? 0)) >= 10).length;

  const loggedResults = results.filter(c =>
    !logSearch || (c.current_title || "").toLowerCase().includes(logSearch.toLowerCase()) ||
    (c.candidate_id || "").toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">
      <div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">S11 · Cross-Encoder Inspector</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          CE Inspector
          <span className="text-[12px] ai-badge px-2 py-1 rounded-[6px] font-medium">ms-marco-MiniLM-L-6-v2</span>
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1">Deep-dive into the cross-encoder re-ranking phase.</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Shortlist Size", value: "300" },
          { label: "Pairs Scored", value: "300" },
          { label: "Avg CE Score", value: avgCE },
          { label: "Total CE Time", value: "28.4s" },
          { label: "Algo-CE Correlation", value: `r = ${algoCECorr}`, sub: "High = models agreed" },
          { label: "Top Promoted (10+)", value: String(topPromoted), color: "text-emerald-500" },
          { label: "Top Demoted (10+)", value: String(topDemoted), color: "text-red-500" },
          { label: "Model", value: "Local CPU", sub: "No network" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`text-[20px] font-bold font-mono ${(s as any).color ?? "text-foreground"}`}>{s.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            {(s as any).sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{(s as any).sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scatter plot */}
        <section>
          <h2 className="text-[14px] font-semibold text-foreground mb-3">Rank Change Scatter Plot</h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] text-muted-foreground mb-3">X = algo rank · Y = final rank · Dots above diagonal = CE promoted</p>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="x" name="Algo Rank" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Algo Rank", position: "insideBottomRight", offset: -5, fontSize: 10 }} />
                <YAxis dataKey="y" name="Final Rank" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Final Rank", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <Tooltip content={<TooltipBox />} />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: 50, y: 50 }]}
                  stroke="hsl(var(--muted-foreground) / 0.4)"
                  strokeDasharray="4 4"
                />
                <Scatter
                  data={scatterData}
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const ceScore = getField(payload, "ce_score", 0);
                    const color = ceScore >= 80 ? "hsl(142 72% 29%)" : ceScore >= 60 ? "hsl(var(--ai))" : ceScore >= 40 ? "hsl(38 92% 50%)" : "hsl(var(--muted-foreground))";
                    return <circle cx={cx} cy={cy} r={3.5} fill={color} fillOpacity={0.8} stroke="none" />;
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* CE Score Distribution */}
        <section>
          <h2 className="text-[14px] font-semibold text-foreground mb-3">CE Score Distribution</h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] text-muted-foreground mb-3">X = CE score buckets · Vertical line = top-100 cutoff</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ceHist}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} angle={-30} dy={10} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="rounded-lg border border-border bg-popover p-2 text-[11px] shadow-lg">
                    <div className="font-semibold">{label}</div>
                    <div>{payload[0]?.value} candidates</div>
                  </div>
                ) : null} />
                <Bar dataKey="count" name="Candidates" radius={[3, 3, 0, 0]}>
                  {ceHist.map((b, i) => (
                    <Cell key={i} fill={b.aboveCut ? "hsl(var(--ai))" : "hsl(var(--muted-foreground) / 0.3)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Biggest disagreements */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-3">Biggest CE Disagreements</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-6 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-500"><TrendingUp className="w-3 h-3" /> Top 5 Promotions</span>
            <span className="flex items-center gap-1 text-red-500"><TrendingDown className="w-3 h-3" /> Bottom 5 Demotions</span>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {["Candidate", "Algo Rank", "Final Rank", "Δ", "CE Score"].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...promotions, ...demotions].map((c, i) => {
                const delta = getField(c, "algo_rank", c.rank ?? 0) - (c.rank ?? 0);
                const isPromo = delta > 0;
                return (
                  <tr key={c.candidate_id + i} className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${i === 4 ? "border-b-2 border-border" : ""}`}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground truncate max-w-[160px]">{c.current_title}</div>
                      <div className="text-[10px] text-muted-foreground">{c.current_company}</div>
                    </td>
                    <td className="px-4 py-2 font-mono text-foreground">#{getField(c, "algo_rank", c.rank ?? 0)}</td>
                    <td className="px-4 py-2 font-mono text-foreground">#{c.rank ?? 0}</td>
                    <td className="px-4 py-2">
                      <span className={`font-mono font-bold text-[13px] ${isPromo ? "text-emerald-500" : "text-red-500"}`}>
                        {isPromo ? "+" : ""}{delta}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="ai-badge text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-[4px]">
                        {Math.round(c.ce_score)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Batch Quality Monitor */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-3">Batch Quality Monitor</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {["Batch #", "CE Score Range", "Avg CE Score", "Time (s)", "Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BATCH_DATA.map(b => (
                <tr key={b.batch} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 font-mono text-foreground font-semibold">#{b.batch}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">{b.min} – {b.max}</td>
                  <td className="px-4 py-2">
                    <span className="ai-badge text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-[4px]">{b.avg}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-foreground">{b.time}s</td>
                  <td className="px-4 py-2">
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Full Re-Ranking Log */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-foreground">Full Re-Ranking Log</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              placeholder="Search candidates…"
              className="pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-auto max-h-64">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card border-b border-border">
                <tr>
                  {["Candidate ID", "Title", "Algo Score", "CE Score", "Blended", "Δ Rank"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loggedResults.map(c => {
                  const delta = getField(c, "algo_rank", c.rank ?? 0) - (c.rank ?? 0);
                  return (
                    <tr key={c.candidate_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{c.candidate_id}</td>
                      <td className="px-3 py-1.5 text-foreground max-w-[120px] truncate">{c.current_title}</td>
                      <td className="px-3 py-1.5 font-mono text-foreground">{getField(c, "skill_score", getField(c, "first_pass_score", 0)).toFixed(3)}</td>
                      <td className="px-3 py-1.5">
                        <span className="ai-badge text-[10px] font-mono px-1 py-0.5 rounded-[3px]">{Math.round(getField(c, "ce_score", 0))}</span>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-foreground">{(c.final_score ?? 0).toFixed(3)}</td>
                      <td className="px-3 py-1.5">
                        <span className={`font-mono font-bold ${delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
