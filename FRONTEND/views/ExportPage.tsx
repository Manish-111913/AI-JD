"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, CheckCircle2, XCircle, ExternalLink, FileText, Github, Sparkles, Loader2, Coins } from "lucide-react";
import { useAppContext } from "@/store/appStore";
import { RankedCandidate } from "@/data/mockData";
import { validateSubmission, exportToCsv } from "@/utils/csvExport";
import { Button } from "@/components/ui/button";

const METADATA_FIELDS = [
  { field: "team_name", where: "portal + submission_metadata.yaml", note: "Your registered team name" },
  { field: "github_repo", where: "portal + yaml", note: "Must be reachable. Private OK if you grant access at Stage 3." },
  { field: "sandbox_link", where: "portal + yaml", note: "This app's deployed URL. Must accept ≤100 candidates and produce CSV." },
  { field: "reproduce_command", where: "yaml", note: "Exactly: python rank.py --candidates ./candidates.jsonl --out ./submission.csv" },
  { field: "pre_computation_required", where: "yaml", note: "Set true — embeddings and CE model must be pre-downloaded" },
  { field: "has_network_during_ranking", where: "yaml", note: "Must be false — no API calls in rank.py" },
  { field: "uses_gpu_for_inference", where: "yaml", note: "Must be false — CPU only" },
  { field: "ai_tools_used", where: "yaml", note: "Declare honestly. Claude, Copilot, etc. Honest declaration is NOT penalized." },
];

export default function ExportPage() {
  const { state } = useAppContext();
  const results: RankedCandidate[] = (state.backendResults || []) as unknown as RankedCandidate[];
  const validation = results.length > 0 
    ? validateSubmission(results) 
    : { valid: false, checks: [] as Array<{ name: string; passed: boolean; message: string }> };

  const [downloaded, setDownloaded] = useState(false);
  const [githubReady, setGithubReady] = useState(false);
  const [sandboxReady, setSandboxReady] = useState(false);
  const [metaFilled, setMetaFilled] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [sandboxUrl, setSandboxUrl] = useState(typeof window !== "undefined" ? window.location.origin : "");
  // API Mode: Executive Brief
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefText, setBriefText] = useState("");
  const [briefError, setBriefError] = useState("");
  const [briefThemes, setBriefThemes] = useState<string[]>([]);
  const [briefInterviews, setBriefInterviews] = useState<string[]>([]);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);

  const apiModeEnabled = state.apiSettings?.apiModeEnabled;

  const handleDownload = () => {
    exportToCsv(results);
    setDownloaded(true);
  };

  const handleGenerateBrief = async () => {
    setBriefLoading(true);
    setBriefError("");
    try {
      const res = await fetch("http://localhost:8000/api/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_title: "Senior AI Engineer", top_n: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        setBriefText(data.summary || "");
        setBriefThemes(data.key_themes || []);
        setBriefInterviews(data.recommended_interviews || []);
        if (data.session_tokens) setSessionTokens(data.session_tokens);
        if (data.session_cost_usd) setSessionCost(data.session_cost_usd);
      } else {
        setBriefError(data.error || "Failed to generate brief.");
      }
    } catch {
      setBriefError("Could not reach backend.");
    } finally {
      setBriefLoading(false);
    }
  };

  const handleDownloadBrief = () => {
    if (!briefText) return;
    const blob = new Blob([briefText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "executive_brief.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const allValid = validation.valid;
  const preview = results.slice(0, 10);

  const checklist = [
    { label: "CSV generated and downloaded", done: downloaded, auto: true },
    { label: "validate_submission.py passes", done: allValid, auto: true },
    { label: "GitHub repo ready with README", done: githubReady, auto: false, extra: (
      <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/your/repo" className="ml-2 text-[11px] px-2 py-0.5 rounded border border-border bg-muted/30 text-foreground focus:outline-none w-52" />
    )},
    { label: "Sandbox demo link working", done: sandboxReady, auto: false, extra: (
      <input value={sandboxUrl} onChange={e => setSandboxUrl(e.target.value)} className="ml-2 text-[11px] px-2 py-0.5 rounded border border-border bg-muted/30 text-foreground focus:outline-none w-52" />
    )},
    { label: "submission_metadata.yaml filled", done: metaFilled, auto: false },
  ];

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">No data available</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Please upload candidates and run the ranking pipeline first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">
      <div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">S10 · Export & Submission</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Export & Submit</h1>
        <p className="text-[14px] text-muted-foreground mt-1">Validate, download submission CSV, and complete submission checklist.</p>
      </div>

      {/* CSV Preview */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          CSV Preview (first 10 rows)
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["rank", "candidate_id", "score", "reasoning"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map(c => (
                  <tr key={c.candidate_id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 font-mono text-foreground">{c.rank}</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">{c.candidate_id}</td>
                    <td className="px-4 py-2 font-mono text-foreground">{c.final_score.toFixed(4)}</td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[300px] truncate">{c.ce_reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Validator */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-3">Format Validator</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className={`px-4 py-3 border-b border-border ${allValid ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
            <div className="flex items-center gap-2">
              {allValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
              <span className={`text-[13px] font-semibold ${allValid ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                {allValid ? "VALID — Ready to submit" : "INVALID — fix errors before submitting"}
              </span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {validation.checks.map(check => (
              <div key={check.name} className="flex items-center gap-3 px-4 py-2.5">
                {check.passed
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                }
                <span className="text-[12px] text-muted-foreground flex-1">{check.name}</span>
                <span className={`text-[11px] font-bold ${check.passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {check.passed ? "PASS" : "FAIL"}
                </span>
                {check.message && <span className="text-[11px] text-muted-foreground ml-2">{check.message}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download button */}
      <section className="flex items-center gap-4">
        <Button
          className="gap-2 bg-foreground text-background hover:bg-foreground/90 text-[13px] px-6 py-2.5"
          disabled={!allValid}
          onClick={handleDownload}
        >
          <Download className="w-4 h-4" />
          Download submission.csv
        </Button>
        {!allValid && <p className="text-[12px] text-muted-foreground">Run ranking first to generate valid results.</p>}
        {downloaded && <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Downloaded</span>}
      </section>

      {/* API Mode: AI Executive Brief */}
      {apiModeEnabled && (
        <section className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> AI Executive Brief
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Generate a 300-word hiring summary for your hiring manager, analyzing the top 20 candidates.
              </p>
            </div>
            <Button
              onClick={handleGenerateBrief}
              disabled={briefLoading || !allValid}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-[13px] flex-shrink-0"
            >
              {briefLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                : <><Sparkles className="w-3.5 h-3.5" /> Generate Brief</>
              }
            </Button>
          </div>

          {briefError && (
            <div className="text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> {briefError}
            </div>
          )}

          {briefText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="rounded-lg border border-border bg-background p-4 text-[13px] text-foreground leading-relaxed whitespace-pre-line">
                {briefText}
              </div>
              {briefThemes.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">KEY THEMES</div>
                  <div className="flex flex-wrap gap-1.5">
                    {briefThemes.map(t => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {briefInterviews.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">RECOMMENDED INTERVIEWS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {briefInterviews.map(id => (
                      <span key={id} className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">{id}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadBrief}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/30 text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download Brief (.txt)
                </button>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Coins className="w-3 h-3" /> Session: {sessionTokens.toLocaleString()} tokens · ${sessionCost.toFixed(4)}
              </div>
            </motion.div>
          )}
        </section>
      )}

      {/* Metadata guide */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-3">submission_metadata.yaml Guide</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 text-[11px] text-muted-foreground">
            Fields judges review at Stage 3. Fill these before submission.
          </div>
          <div className="divide-y divide-border">
            {METADATA_FIELDS.map(f => (
              <div key={f.field} className="flex items-start gap-4 px-4 py-3">
                <span className="font-mono text-[12px] text-ai w-36 flex-shrink-0">{f.field}</span>
                <span className="text-[11px] text-muted-foreground w-40 flex-shrink-0">{f.where}</span>
                <span className="text-[12px] text-muted-foreground">{f.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-3">Submission Checklist</h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {checklist.map((item, i) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => {
                  if (!item.auto) {
                    if (i === 2) setGithubReady(v => !v);
                    if (i === 3) setSandboxReady(v => !v);
                    if (i === 4) setMetaFilled(v => !v);
                  }
                }}
                disabled={item.auto}
                className={`w-5 h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors ${
                  item.done
                    ? "bg-foreground border-foreground"
                    : "border-border hover:border-foreground/50"
                } ${item.auto ? "cursor-default" : "cursor-pointer"}`}
              >
                {item.done && <CheckCircle2 className="w-3 h-3 text-background" />}
              </button>
              <span className={`text-[13px] ${item.done ? "text-foreground" : "text-muted-foreground"} flex-1`}>{item.label}</span>
              {(item as any).extra}
              {item.auto && <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-[4px]">Auto</span>}
            </div>
          ))}
        </div>
        <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl border text-[13px] font-semibold ${
          checklist.every(c => c.done)
            ? "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
            : "border-border text-muted-foreground bg-muted/20"
        }`}>
          {checklist.every(c => c.done)
            ? <><CheckCircle2 className="w-4 h-4" /> All items complete — ready to submit!</>
            : <>{checklist.filter(c => c.done).length} / {checklist.length} items complete</>
          }
        </div>
      </section>
    </div>
  );
}
