export interface Candidate {
  candidate_id: string;
  anonymized_name: string;
  current_title: string;
  current_company: string;
  location: string;
  country: string;
  years_of_experience: number;
  headline: string;
  summary: string;
  skills: Array<{
    name: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    duration_months: number;
    endorsement_count: number;
    endorsements?: number;
    assessment_score?: number;
  }>;
  career_history: Array<{
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    duration_months: number;
    company_size: string;
    industry: string;
    description: string;
    company_type: 'product' | 'consulting' | 'research' | 'startup';
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number;
    end_year: number;
    grade: string;
    institution_tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'unknown';
    tier?: string;
  }>;
  redrob_signals: {
    open_to_work_flag: boolean;
    last_active_date: string;
    recruiter_response_rate: number;
    avg_response_time_hours: number;
    notice_period_days: number;
    profile_completeness_score: number;
    github_activity_score: number;
    interview_completion_rate: number;
    offer_acceptance_rate: number;
    connection_count: number;
    endorsements_received: number;
    profile_views_received_30d: number;
    saved_by_recruiters_30d: number;
    search_appearance_30d: number;
    applications_submitted_30d: number;
    preferred_work_mode: 'remote' | 'hybrid' | 'onsite';
    willing_to_relocate: boolean;
    expected_salary_range_inr_lpa: string;
    verified_email: boolean;
    verified_phone: boolean;
    linkedin_connected: boolean;
  };
}

export interface RankedCandidate extends Candidate {
  rank: number;
  algo_rank: number;
  final_score: number;
  skill_score: number;
  skill_semantic_component: number;
  skill_keyword_component: number;
  career_score: number;
  experience_score: number;
  location_score: number;
  education_score: number;
  behavioral_multiplier: number;
  disqualifier_penalty: number;
  platform_quality_score: number;
  honeypot_confidence: number;
  honeypot_flags: string[];
  ce_score: number;
  ce_reasoning: string;
  llm_concern: string;
  rank_delta: number;
  reasoning: string;
  candidate_summary_sent_to_llm: string;
  jd_context_sent_to_llm: string;
  blend_calculation: string;
}
