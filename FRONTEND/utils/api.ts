/**
 * api.ts — Frontend API client for the FastAPI backend
 * Connects the Next.js frontend to the Python ranking backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface BackendStatus {
  status: "idle" | "loading" | "ranking" | "done" | "error";
  embeddings_loaded: boolean;
  jd_parsed: boolean;
  model_loaded: boolean;
  candidates_loaded: number;
  results_ready: number;
  ce_available: boolean;
  error: string | null;
}

export interface RankingResult {
  candidate_id: string;
  rank: number;
  algo_rank: number;
  final_score: number;
  reasoning: string;
  blend_calculation: string;
  rank_delta: number;
  current_title: string;
  current_company: string;
  location: string;
  years_of_experience: number;
  features: {
    skill_score: number;
    skill_keyword_component: number;
    skill_semantic_component: number;
    career_score: number;
    experience_score: number;
    location_score: number;
    education_score: number;
    platform_quality_score: number;
    behavioral_multiplier: number;
    behavioral_breakdown: {
      recency: number;
      days_inactive: number;
      open_to_work: number;
      response_rate: number;
      notice: number;
    };
    disqualifier_penalty: number;
    disqualifier_flags: string[];
    honeypot_confidence: number;
    honeypot_evidence_points: number;
    honeypot_flags: string[];
    title_score: number;
    ce_score: number;
    first_pass_score: number;
    blended_score: number;
    semantic_score: number;
  };
}

export interface PipelineEvent {
  stage: number;
  stage_name?: string;
  status?: "active" | "completed";
  progress: number;
  message: string;
  timestamp?: number;
  // CE-specific
  ce_batch?: number;
  ce_total_batches?: number;
  ce_pairs_done?: number;
  ce_total_pairs?: number;
  // Final event
  type?: "complete";
  results?: RankingResult[];
  runtime_seconds?: number;
  candidates_processed?: number;
}

export interface UploadResponse {
  success: boolean;
  count: number;
  skipped: number;
  preview: Array<{
    candidate_id: string;
    current_title: string;
    current_company: string;
    location: string;
    years_of_experience: number;
  }>;
  errors: string[];
}

export interface ValidationResponse {
  valid: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

// ── API Client Functions ──────────────────────────────────────────────────────

export async function getStatus(): Promise<BackendStatus> {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) throw new Error(`Status failed: ${res.status}`);
  return res.json();
}

export async function getJD(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/jd`);
  if (!res.ok) throw new Error(`JD fetch failed: ${res.status}`);
  return res.json();
}

export async function uploadCandidates(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function getResults(): Promise<{ results: RankingResult[]; count: number }> {
  const res = await fetch(`${API_BASE}/api/results`);
  if (!res.ok) throw new Error(`Results fetch failed: ${res.status}`);
  return res.json();
}

export async function getCandidate(id: string): Promise<RankingResult> {
  const res = await fetch(`${API_BASE}/api/candidate/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Candidate fetch failed: ${res.status}`);
  return res.json();
}

export async function validateResults(
  results: RankingResult[]
): Promise<ValidationResponse> {
  const res = await fetch(`${API_BASE}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results }),
  });
  if (!res.ok) throw new Error(`Validation failed: ${res.status}`);
  return res.json();
}

export async function exportCSV(
  results: RankingResult[],
  filename = "submission.csv"
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results, filename }),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Stream the ranking pipeline via Server-Sent Events.
 * @param candidates Optional candidate list override
 * @param onEvent Called with each pipeline event
 * @param onComplete Called with final results when pipeline finishes
 * @param onError Called if streaming fails
 */
export function streamRanking(
  candidates: object[] | null,
  onEvent: (event: PipelineEvent) => void,
  onComplete: (results: RankingResult[], runtime: number) => void,
  onError: (err: Error) => void
): AbortController {
  const controller = new AbortController();

  const body = JSON.stringify({
    candidates: candidates ?? null,
    llm_enabled: false,
  });

  fetch(`${API_BASE}/api/rank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Ranking failed: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: PipelineEvent = JSON.parse(line.slice(6));
              onEvent(event);
              if (event.type === "complete" && event.results) {
                onComplete(event.results, event.runtime_seconds ?? 0);
              }
            } catch (e) {
              // Skip malformed SSE lines
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err);
      }
    });

  return controller;
}

/**
 * Check if the backend is reachable.
 */
export async function isBackendReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
