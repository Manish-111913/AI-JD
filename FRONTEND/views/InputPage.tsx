"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Info,
  Play,
  Upload,
  Zap,
  AlertCircle,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { useAppContext } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import type { CandidatePreviewItem } from "@/types/candidateUpload";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type UploadStatus = "idle" | "uploading" | "success" | "warning" | "error";

interface ValidationResult {
  status: Exclude<UploadStatus, "idle" | "uploading">;
  message: string;
  detail?: string;
  count?: number;
  preview?: CandidatePreviewItem[];
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
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToBackend = useCallback(
    async (file: File) => {
      setUploadStatus("uploading");
      setSelectedFile(file);
      setValidation(null);
      setDetectedFormat(null);
      dispatch({
        type: "SET_UPLOADED_COUNT",
        payload: { count: 0, preview: [] },
      });

      const name = file.name.toLowerCase();
      let format = "";
      if (name.endsWith(".jsonl.gz")) format = ".jsonl.gz";
      else if (name.endsWith(".jsonl")) format = ".jsonl";
      else if (name.endsWith(".json")) format = ".json";
      else {
        setUploadStatus("error");
        setValidation({
          status: "error",
          message: "Unsupported file type.",
          detail: "Please upload a .json, .jsonl, or .jsonl.gz file.",
        });
        return;
      }

      setDetectedFormat(format);
      dispatch({ type: "SET_STATUS", payload: "loading" });

      const startTime = Date.now();

      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Upload failed" }));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Upload failed");
        }

        const elapsed = Date.now() - startTime;
        const delay = Math.max(1500 - elapsed, 0);

        setTimeout(() => {
          // Store count + preview in state
          dispatch({
            type: "SET_UPLOADED_COUNT",
            payload: { count: data.count, preview: data.preview || [] },
          });
          dispatch({ type: "SET_STATUS", payload: "idle" });

          setUploadStatus("success");
          setValidation({
            status: "success",
            message: `${data.count} candidates loaded. Schema valid.`,
            detail: data.skipped > 0
              ? `${data.skipped} rows skipped due to errors.`
              : `Uploaded ${file.name} successfully. Ready for ranking.`,
            count: data.count,
            preview: data.preview,
          });
        }, delay);
      } catch (err: unknown) {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(1500 - elapsed, 0);

        setTimeout(() => {
          dispatch({ type: "SET_STATUS", payload: "error" });
          setUploadStatus("error");
          setValidation({
            status: "error",
            message: "Upload failed.",
            detail: err instanceof Error ? err.message : "Unexpected error.",
          });
        }, delay);
      }
    },
    [dispatch]
  );

  const handleFileDrop = useCallback(
    (files: FileList) => {
      const file = files[0];
      if (!file) return;
      uploadToBackend(file);
    },
    [uploadToBackend]
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
    const count = state.uploadedCount || state.candidatesData.length;
    if (count === 0) return;
    router.push("/ranking");
  };

  const loadedCount = state.uploadedCount || state.candidatesData.length;
  const previewItems = validation?.preview || state.uploadedPreview || [];

  const runLabel =
    state.executionMode === "competition"
      ? "Run Ranking - Competition Mode"
      : "Run Ranking - Demo Mode";

  const validationTone = validation?.status === "success"
    ? {
        box: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20",
        icon: "text-emerald-600 dark:text-emerald-400",
        badge: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
      }
    : validation?.status === "error"
    ? {
        box: "border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20",
        icon: "text-red-600 dark:text-red-400",
        badge: "border-red-200 bg-red-100 text-red-700",
      }
    : {
        box: "border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20",
        icon: "text-amber-600 dark:text-amber-400",
        badge: "border-amber-200 bg-amber-100 text-amber-700",
      };

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
              Upload candidate profiles (.json, .jsonl, .jsonl.gz). Files are sent to the real ranking backend.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>upload candidates</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {uploadStatus === "success" ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground">{selectedFile?.name}</p>
                  <p className="mt-1 text-[12px] text-emerald-600 dark:text-emerald-400">Uploaded successfully</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Upload complete. Preview, execution mode, and run controls are now available below.
                  </p>
                </div>
              </div>
              <button
                className="mt-3 text-[11px] text-muted-foreground underline hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setValidation(null);
                  setDetectedFormat(null);
                  setUploadStatus("idle");
                  dispatch({ type: "SET_UPLOADED_COUNT", payload: { count: 0, preview: [] } });
                }}
              >
                Upload different file
              </button>
            </section>
          ) : (
            <div
              className="rounded-2xl border border-dashed px-6 py-8 text-center transition-colors cursor-pointer border-border bg-background hover:border-foreground/25"
              onClick={() => uploadStatus !== "uploading" && fileInputRef.current?.click()}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
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

              <AnimatePresence mode="wait">
                {uploadStatus === "uploading" ? (
                  <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 className="mx-auto h-9 w-9 animate-spin text-muted-foreground" />
                    <p className="mt-3 text-[13px] font-medium text-foreground">Uploading to backend…</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{selectedFile?.name}</p>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Upload className="mx-auto h-9 w-9 text-muted-foreground" />
                    <p className="mt-3 text-[13px] font-medium text-foreground">
                      Drop file here or click to browse
                    </p>
                    <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
                      Accepts .json (array), .jsonl (newline-delimited), .jsonl.gz (gzip-compressed)
                    </p>
                    {detectedFormat && (
                      <div className="mt-3 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                        Detected: {detectedFormat}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Validation result */}
          <AnimatePresence>
            {validation && (
              <motion.section
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={["rounded-2xl border px-4 py-4", validationTone.box].join(" ")}
              >
                <div className="flex gap-3">
                  {validation.status === "success" ? (
                    <CheckCircle2 className={["mt-0.5 h-4 w-4 shrink-0", validationTone.icon].join(" ")} />
                  ) : (
                    <AlertCircle className={["mt-0.5 h-4 w-4 shrink-0", validationTone.icon].join(" ")} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">{validation.message}</p>
                    {validation.detail && (
                      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{validation.detail}</p>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Candidate Preview Skeleton during upload */}
          {uploadStatus === "uploading" && (
            <section className="space-y-3 animate-pulse">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Parsing Candidates...
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <article
                    className="min-h-[180px] rounded-xl border border-border bg-card p-3 space-y-3"
                    key={idx}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-16 animate-pulse" />
                        <Skeleton className="h-4 w-28 animate-pulse" />
                      </div>
                      <Skeleton className="h-5 w-12 rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-5/6 animate-pulse" />
                      <Skeleton className="h-3 w-full animate-pulse" />
                      <Skeleton className="h-3 w-1/2 animate-pulse" />
                    </div>
                    <div className="flex gap-1.5 pt-2">
                      <Skeleton className="h-5 w-14 rounded-full animate-pulse" />
                      <Skeleton className="h-5 w-16 rounded-full animate-pulse" />
                      <Skeleton className="h-5 w-12 rounded-full animate-pulse" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Candidate Preview */}
          {uploadStatus === "success" && previewItems.length > 0 && (
            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Candidate Preview
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {previewItems.slice(0, 3).map((c) => (
                  <article
                    className="min-h-[112px] rounded-xl border border-border bg-card p-3"
                    key={c.candidate_id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                          {c.candidate_id.replace("_", " ")}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                          {c.anonymized_name}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {c.current_company_size}
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">
                      {c.current_title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-[12px] text-muted-foreground">
                      {c.current_company} · {c.current_industry}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{c.location}</p>
                    <p className="mt-3 text-[12px] text-foreground">{c.years_of_experience}y exp</p>
                    {c.headline && (
                      <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                        {c.headline}
                      </p>
                    )}
                    {c.top_skills?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.top_skills.slice(0, 3).map((skill) => (
                          <span
                            className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground"
                            key={skill}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Showing first {previewItems.length} of {loadedCount} candidates
              </p>
            </section>
          )}

          {uploadStatus === "success" && (
            <>
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
                      <span className="font-semibold text-foreground">Default: Competition Mode</span>{" "}
                      — safe for reproduction. Demo mode requires any optional demo AI features to be
                      configured separately.
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
