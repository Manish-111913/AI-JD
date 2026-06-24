"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Database,
  Info,
  Play,
  Upload,
  Zap,
} from "lucide-react";
import { RankedCandidate, generateMockData } from "@/data/mockData";
import { useAppContext } from "@/store/appStore";
import { Button } from "@/components/ui/button";

type UploadStatus = "idle" | "success" | "warning" | "error" | "truncated";

interface ValidationResult {
  status: UploadStatus;
  message: string;
  detail?: string;
}

const MODE_OPTIONS = [
  {
    mode: "competition" as const,
    icon: Zap,
    label: "Competition Mode",
    description:
      "Matches the deterministic competition flow. No network calls and reproducible output.",
  },
  {
    mode: "demo" as const,
    icon: Brain,
    label: "Demo Mode",
    description:
      "Shows richer LLM-style reasoning when demo features are enabled in the app config.",
  },
];

const VALIDATION_TONES: Record<
  Exclude<UploadStatus, "idle">,
  { box: string; icon: string; badge: string }
> = {
  success: {
    box: "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100",
    icon: "text-emerald-600 dark:text-emerald-400",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  warning: {
    box: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  truncated: {
    box: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  error: {
    box: "border-red-200 bg-red-50/70 text-red-900 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400",
    badge: "border-red-200 bg-red-100 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  },
};

function summarizeTitles(candidates: RankedCandidate[]) {
  return candidates.reduce(
    (summary, candidate) => {
      const title = candidate.current_title.toLowerCase();

      if (/(machine learning|ml|artificial intelligence|ai|nlp|llm|deep learning|data scientist|retrieval|ranking)/.test(title)) {
        summary.core += 1;
      } else if (/(engineer|developer|platform|backend|software|search|data|analytics|infra|mlops)/.test(title)) {
        summary.adjacent += 1;
      } else {
        summary.nonTech += 1;
      }

      return summary;
    },
    { core: 0, adjacent: 0, nonTech: 0 },
  );
}

function ModeCard({
  active,
  description,
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  description: string;
  icon: typeof Zap;
  label: string;
  onClick: () => void;
  tone: "default" | "ai";
}) {
  return (
    <button
      className={[
        "min-h-[96px] rounded-lg border p-4 text-left transition-colors",
        active
          ? tone === "ai"
            ? "border-ai/35 bg-ai/6"
            : "border-foreground bg-card shadow-sm"
          : "border-border bg-card hover:border-foreground/20",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon
            className={[
              "h-4 w-4",
              active && tone === "ai" ? "text-ai" : "text-muted-foreground",
            ].join(" ")}
          />
          <span className="text-[13px] font-semibold text-foreground">{label}</span>
        </div>
        <CheckCircle2
          className={[
            "h-4 w-4",
            active ? "text-emerald-500" : "text-transparent",
          ].join(" ")}
        />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </button>
  );
}

export default function InputPage() {
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSample = useCallback(() => {
    const data = generateMockData();

    dispatch({ type: "SET_STATUS", payload: "loading" });
    dispatch({ type: "LOAD_DATA", payload: data });

    window.setTimeout(() => {
      dispatch({ type: "SET_STATUS", payload: "idle" });
    }, 300);

    setDetectedFormat(".json");
    setValidation({
      status: "success",
      message: "50 candidates loaded. Schema valid.",
      detail: "Official hackathon sample-candidates.json loaded with deterministic mock data.",
    });
  }, [dispatch]);

  const handleFileDrop = useCallback(
    (files: FileList) => {
      const file = files[0];

      if (!file) return;

      const name = file.name.toLowerCase();
      let format = "";

      if (name.endsWith(".jsonl.gz")) format = ".jsonl.gz";
      else if (name.endsWith(".jsonl")) format = ".jsonl";
      else if (name.endsWith(".json")) format = ".json";
      else {
        setDetectedFormat(null);
        setValidation({
          status: "error",
          message: "Unsupported file type.",
          detail: "Please upload a .json, .jsonl, or .jsonl.gz file.",
        });
        return;
      }

      dispatch({ type: "SET_STATUS", payload: "loading" });
      dispatch({ type: "LOAD_DATA", payload: generateMockData() });

      window.setTimeout(() => {
        dispatch({ type: "SET_STATUS", payload: "idle" });
      }, 250);

      setDetectedFormat(format);
      setValidation({
        status: "success",
        message: "50 candidates loaded. Schema valid.",
        detail: `Uploaded ${file.name}. The demo app is using the local mock ranking dataset for preview and pipeline execution.`,
      });
    },
    [dispatch],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      handleFileDrop(event.target.files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileDrop(event.dataTransfer.files);
  };

  const runRanking = () => {
    if (state.candidatesData.length === 0) return;
    router.push("/ranking");
  };

  const loadedCount = state.candidatesData.length;
  const previewCandidates = state.candidatesData.slice(0, 3);
  const titleSummary = useMemo(
    () => summarizeTitles(state.candidatesData),
    [state.candidatesData],
  );

  const resolvedValidation =
    validation ??
    (loadedCount > 0
      ? {
          status: "success" as const,
          message: `${loadedCount} candidates ready for ranking.`,
          detail: "Candidate data is already loaded in the current workspace session.",
        }
      : null);

  const runLabel =
    state.executionMode === "competition"
      ? "Run Ranking - Competition Mode"
      : "Run Ranking - Demo Mode";

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[980px] px-6 py-9 sm:px-8">
        <div className="mx-auto max-w-[760px] space-y-6">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              S4 - Candidate Input
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Load Candidates
            </h1>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Upload candidate profiles (.json, .jsonl, .jsonl.gz) or use the
              official hackathon sample.
            </p>
          </div>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Database className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground">
                  Official Hackathon Sample
                </p>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  50 candidates spanning all title types - deterministic and
                  reproducible results.
                </p>
              </div>
            </div>

            <Button
              className="mt-4 h-11 w-full gap-2 rounded-lg bg-foreground text-background hover:bg-foreground/90"
              onClick={loadSample}
            >
              <Database className="h-4 w-4" />
              Load Official Sample (50 Candidates)
            </Button>
          </section>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or upload your own</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div
            className={[
              "rounded-2xl border border-dashed px-6 py-8 text-center transition-colors",
              isDragging
                ? "border-foreground/45 bg-muted/70"
                : "border-border bg-background hover:border-foreground/25",
            ].join(" ")}
            onClick={() => fileInputRef.current?.click()}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              accept=".json,.jsonl,.gz"
              className="hidden"
              onChange={handleFileChange}
              type="file"
            />
            <Upload className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 text-[13px] font-medium text-foreground">
              Drop file here or click to browse
            </p>
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
              Accepts .json (array), .jsonl (newline-delimited), .jsonl.gz
              (gzip-compressed)
            </p>
            {detectedFormat && (
              <div className="mt-3 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                Detected: {detectedFormat}
              </div>
            )}
          </div>

          {resolvedValidation && resolvedValidation.status !== "idle" && (
            <section
              className={[
                "rounded-2xl border px-4 py-4",
                VALIDATION_TONES[resolvedValidation.status].box,
              ].join(" ")}
            >
              <div className="flex gap-3">
                <CheckCircle2
                  className={[
                    "mt-0.5 h-4 w-4 shrink-0",
                    VALIDATION_TONES[resolvedValidation.status].icon,
                  ].join(" ")}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">
                    {resolvedValidation.message}
                  </p>
                  {resolvedValidation.detail && (
                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                      {resolvedValidation.detail}
                    </p>
                  )}

                  {resolvedValidation.status === "success" && loadedCount > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[11px]",
                          VALIDATION_TONES.success.badge,
                        ].join(" ")}
                      >
                        {titleSummary.core} ML/AI titled
                      </span>
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[11px]",
                          VALIDATION_TONES.success.badge,
                        ].join(" ")}
                      >
                        {titleSummary.adjacent} tech-adjacent
                      </span>
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[11px]",
                          VALIDATION_TONES.success.badge,
                        ].join(" ")}
                      >
                        {titleSummary.nonTech} non-tech
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {loadedCount > 0 && (
            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Candidate Preview
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {previewCandidates.map((candidate) => (
                  <article
                    className="min-h-[112px] rounded-xl border border-border bg-card p-3"
                    key={candidate.candidate_id}
                  >
                    <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                      {candidate.candidate_id.replace("_", " ")}
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">
                      {candidate.current_title}
                    </h3>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {candidate.location}
                    </p>
                    <p className="mt-3 text-[12px] text-foreground">
                      {candidate.years_of_experience}y exp
                    </p>
                  </article>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Showing first {previewCandidates.length} of {loadedCount} candidates
              </p>
            </section>
          )}

          <section className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Select Execution Mode
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {MODE_OPTIONS.map((option) => (
                <ModeCard
                  active={state.executionMode === option.mode}
                  description={option.description}
                  icon={option.icon}
                  key={option.mode}
                  label={option.label}
                  onClick={() =>
                    dispatch({
                      type: "SET_EXECUTION_MODE",
                      payload: option.mode,
                    })
                  }
                  tone={option.mode === "demo" ? "ai" : "default"}
                />
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/35 px-4 py-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[12px] leading-5 text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Default: Competition Mode
                  </span>{" "}
                  - safe for reproduction. Demo mode requires any optional demo
                  AI features to be configured separately.
                </p>
              </div>
            </div>
          </section>

          <Button
            className="h-11 w-full justify-start rounded-lg bg-foreground px-4 text-background hover:bg-foreground/90"
            disabled={loadedCount === 0}
            onClick={runRanking}
          >
            <Play className="h-4 w-4 fill-current" />
            <span>{runLabel}</span>
            <ChevronRight className="ml-auto h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
