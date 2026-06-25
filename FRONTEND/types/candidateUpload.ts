export type CandidateProficiency = "beginner" | "intermediate" | "advanced" | "expert";
export type WorkMode = "remote" | "hybrid" | "onsite" | "flexible";
export type InstitutionTier = "tier_1" | "tier_2" | "tier_3" | "tier_4" | "unknown";

export interface CandidateProfile {
  anonymized_name: string;
  headline: string;
  summary: string;
  location: string;
  country: string;
  years_of_experience: number;
  current_title: string;
  current_company: string;
  current_company_size: string;
  current_industry: string;
}

export interface CandidateCareerHistoryItem {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  duration_months: number;
  is_current: boolean;
  industry: string;
  company_size: string;
  description: string;
}

export interface CandidateEducationItem {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: number;
  end_year: number;
  grade?: string | null;
  tier: InstitutionTier;
}

export interface CandidateSkillItem {
  name: string;
  proficiency: CandidateProficiency;
  endorsements: number;
  duration_months?: number;
}

export interface CandidateSignalSet {
  profile_completeness_score: number;
  signup_date: string;
  last_active_date: string;
  open_to_work_flag: boolean;
  profile_views_received_30d: number;
  applications_submitted_30d: number;
  recruiter_response_rate: number;
  avg_response_time_hours: number;
  skill_assessment_scores: Record<string, number>;
  connection_count: number;
  endorsements_received: number;
  notice_period_days: number;
  expected_salary_range_inr_lpa: { min: number; max: number };
  preferred_work_mode: WorkMode;
  willing_to_relocate: boolean;
  github_activity_score: number;
  search_appearance_30d: number;
  saved_by_recruiters_30d: number;
  interview_completion_rate: number;
  offer_acceptance_rate: number;
  verified_email: boolean;
  verified_phone: boolean;
  linkedin_connected: boolean;
}

export interface CandidateUploadRecord {
  candidate_id: string;
  profile: CandidateProfile;
  career_history: CandidateCareerHistoryItem[];
  education: CandidateEducationItem[];
  skills: CandidateSkillItem[];
  certifications?: Array<{ name: string; issuer: string; year: number }>;
  languages?: Array<{ language: string; proficiency: string }>;
  redrob_signals: CandidateSignalSet;
}

export interface CandidatePreviewItem {
  candidate_id: string;
  anonymized_name: string;
  headline: string;
  current_title: string;
  current_company: string;
  current_company_size: string;
  current_industry: string;
  location: string;
  years_of_experience: number;
  top_skills?: string[];
}