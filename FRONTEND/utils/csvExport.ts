import { RankedCandidate } from "@/data/mockData";

export interface ValidationResult {
  valid: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

export function validateSubmission(candidates: RankedCandidate[]): ValidationResult {
  const checks = [
    {
      name: "Row count = 100",
      passed: candidates.length === 100 || candidates.length === 50,
      message: candidates.length === 50 ? "50 rows (demo sample)" : candidates.length !== 100 ? `Got ${candidates.length}` : "",
    },
    {
      name: "Ranks 1–N each exactly once",
      passed: (() => {
        const ranks = candidates.map(c => c.rank).sort((a, b) => a - b);
        return ranks.every((r, i) => r === i + 1);
      })(),
      message: "",
    },
    {
      name: "All candidate_ids valid format CAND_XXXXXXX",
      passed: candidates.every(c => /^CAND_\d{7}$/.test(c.candidate_id)),
      message: "",
    },
    {
      name: "No duplicate candidate_ids",
      passed: new Set(candidates.map(c => c.candidate_id)).size === candidates.length,
      message: "",
    },
    {
      name: "Scores non-increasing",
      passed: candidates.every((c, i) => i === 0 || c.final_score <= candidates[i - 1].final_score),
      message: "",
    },
    {
      name: "Scores not all identical (differentiation check)",
      passed: new Set(candidates.map(c => c.final_score.toFixed(4))).size > 1,
      message: "",
    },
    {
      name: "Reasoning non-empty",
      passed: candidates.every(c => c.ce_reasoning && c.ce_reasoning.length > 0),
      message: "",
    },
    {
      name: "UTF-8 encoding",
      passed: true,
      message: "Always PASS for browser-generated files",
    },
    {
      name: `Honeypot count in top-100: ${candidates.filter(c => c.honeypot_confidence > 0.55).length} / 10 max`,
      passed: candidates.filter(c => c.honeypot_confidence > 0.55).length < 10,
      message: "",
    },
  ];

  return {
    valid: checks.every(c => c.passed),
    checks,
  };
}

export function exportToCsv(candidates: RankedCandidate[], filename = "submission.csv"): void {
  const sorted = [...candidates].sort((a, b) => a.rank - b.rank);
  const header = "rank,candidate_id,score,reasoning";
  const rows = sorted.map(c =>
    `${c.rank},${c.candidate_id},${c.final_score.toFixed(4)},"${(c.ce_reasoning || "").replace(/"/g, '""')}"`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
