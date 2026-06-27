"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { RankedCandidate } from '../data/mockData';
import type { CandidatePreviewItem } from "@/types/candidateUpload";

export type AppStatus = 'idle' | 'loading' | 'ranking' | 'done' | 'error';
export type ExecutionMode = 'competition' | 'demo';
export type Theme = 'light' | 'dark';
export type ApiProvider = 'gemini' | 'openai';

export interface ApiSettings {
  provider: ApiProvider;
  apiModeEnabled: boolean;
  fallbackEnabled: boolean;
  geminiKeySet: boolean;
  openaiKeySet: boolean;
  modelConfig: {
    reasoning_model: string;
    jd_parse_model: string;
    chat_model: string;
  };
  sessionTokens: number;
  sessionCostUsd: number;
}

export interface JDData {
  success: boolean;
  filename: string;
  role_title: string;
  locations: string[];
  experience: { min_years: number; max_years: number; peak_years: number };
  hard_skills: { name: string; weight: number; keywords: string[] }[];
  preferred_skills: { name: string; note: string }[];
  disqualifiers: { name: string; logic: string; color: string; bg: string }[];
  location_map: { bucket: string; score: number; bar: number; is_primary: boolean }[];
  ai_queries: { weight: string; label: string; text: string }[];
  title_tiers: { tier: string; score: string; examples: string; color: string; bg: string }[];
  jd_excerpt: string;
  jd_text_length: number;
}

export interface FilterState {
  keyword: string;
  scoreRange: [number, number];
  ceScoreRange: [number, number];
  locations: string[];
  experienceRange: string;
  showHoneypots: boolean;
  companyType: string;
  titleCategory: string;
  availabilityOnly: boolean;
}

export interface PipelineStage {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  durationMs: number;
  isCE?: boolean;
}

// Real backend result (from /api/rank SSE complete event)
export interface BackendResult {
  candidate_id: string;
  rank: number;
  algo_rank: number;
  final_score: number;
  current_title: string;
  current_company: string;
  location: string;
  years_of_experience: number;
  headline?: string;
  summary?: string;
  skills?: Array<{
    name: string;
    proficiency: string;
    duration_months: number;
    endorsement_count: number;
    assessment_score?: number;
  }>;
  career_history?: Array<{
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    duration_months: number;
    company_size?: string;
    industry?: string;
    description: string;
    company_type?: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number;
    end_year: number;
    grade?: string;
    institution_tier?: string;
  }>;
  redrob_signals?: {
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
    preferred_work_mode: string;
    willing_to_relocate: boolean;
    expected_salary_range_inr_lpa: string;
    verified_email: boolean;
    verified_phone: boolean;
    linkedin_connected: boolean;
  };
  features?: Record<string, number | string | boolean>;
  honeypot_confidence?: number;
  honeypot_flags?: string[];
  ce_score?: number;
  ce_reasoning?: string;
  reasoning?: string;
  rank_delta?: number;
  blend_calculation?: string;
  [key: string]: unknown;
}

export interface AppState {
  status: AppStatus;
  candidatesData: RankedCandidate[];
  rankingResults: RankedCandidate[];
  // Real backend results
  backendResults: BackendResult[];
  uploadedCount: number;
  uploadedPreview: CandidatePreviewItem[];
  selectedCandidate: RankedCandidate | null;
  selectedBackendCandidate: BackendResult | null;
  activeFilters: FilterState;
  pipelineStages: PipelineStage[];
  liveLogs: string[];
  rankingProgress: number;
  executionMode: ExecutionMode;
  theme: Theme;
  pipelineRuntime?: number;
  totalCandidatesProcessed?: number;
  // JD data from upload-jd endpoint
  jdData: JDData | null;
  // API Mode settings
  apiSettings: ApiSettings | null;
}

type Action =
  | { type: 'SET_STATUS'; payload: AppStatus }
  | { type: 'LOAD_DATA'; payload: RankedCandidate[] }
  | { type: 'SET_RESULTS'; payload: RankedCandidate[] }
  | { type: 'SET_BACKEND_RESULTS'; payload: BackendResult[] }
  | { type: 'SET_UPLOADED_COUNT'; payload: { count: number; preview: CandidatePreviewItem[] } }
  | { type: 'SELECT_CANDIDATE'; payload: RankedCandidate | null }
  | { type: 'SELECT_BACKEND_CANDIDATE'; payload: BackendResult | null }
  | { type: 'UPDATE_FILTERS'; payload: Partial<FilterState> }
  | { type: 'UPDATE_PIPELINE'; payload: PipelineStage[] }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_EXECUTION_MODE'; payload: ExecutionMode }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_PIPELINE_RUNTIME'; payload: { runtime: number; total: number } }
  | { type: 'SET_JD_DATA'; payload: JDData | null }
  | { type: 'SET_API_SETTINGS'; payload: Partial<ApiSettings> };

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 1, name: 'Title Pre-Filter', description: 'Lookup table lookup. Skip if dataset < 500 candidates.', status: 'pending', durationMs: 300 },
  { id: 2, name: 'Bi-Encoder Semantic Similarity', description: 'Compute 3-query cosine similarity on all tech candidates.', status: 'pending', durationMs: 400 },
  { id: 3, name: 'Honeypot Detection', description: 'Accumulate 8-check evidence flags to detect fake profiles.', status: 'pending', durationMs: 700 },
  { id: 4, name: '6-Component Feature Scoring', description: 'Compute composite score on all tech candidates.', status: 'pending', durationMs: 1100 },
  { id: 5, name: 'Sort & Shortlist', description: 'Sort by composite score and shortlist dynamic top-N candidates.', status: 'pending', durationMs: 500 },
  { id: 6, name: 'Cross-Encoder Re-Ranking', description: 'Batch process ms-marco-MiniLM-L-6-v2 and blend with composite scores.', status: 'pending', durationMs: 2800, isCE: true },
  { id: 7, name: 'Finalizing Ranks', description: 'Sort by blended score, select top 100, and generate AI reasoning.', status: 'pending', durationMs: 400 },
  { id: 8, name: 'Pipeline Complete', description: 'Ranks and statistics finalized and ready for review.', status: 'pending', durationMs: 300 },
];

const initialState: AppState = {
  status: 'idle',
  candidatesData: [],
  rankingResults: [],
  backendResults: [],
  uploadedCount: 0,
  uploadedPreview: [],
  selectedCandidate: null,
  selectedBackendCandidate: null,
  activeFilters: {
    keyword: '',
    scoreRange: [0, 1],
    ceScoreRange: [0, 100],
    locations: [],
    experienceRange: 'Any',
    showHoneypots: false,
    companyType: 'All',
    titleCategory: 'All',
    availabilityOnly: false,
  },
  pipelineStages: PIPELINE_STAGES,
  liveLogs: [],
  rankingProgress: 0,
  executionMode: 'competition',
  theme: 'light',
  jdData: null,
  apiSettings: null,
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'LOAD_DATA':
      return { ...state, candidatesData: action.payload };
    case 'SET_RESULTS':
      return { ...state, rankingResults: action.payload };
    case 'SET_BACKEND_RESULTS':
      return { ...state, backendResults: action.payload };
    case 'SET_UPLOADED_COUNT':
      return { ...state, uploadedCount: action.payload.count, uploadedPreview: action.payload.preview };
    case 'SELECT_CANDIDATE':
      return { ...state, selectedCandidate: action.payload };
    case 'SELECT_BACKEND_CANDIDATE':
      return { ...state, selectedBackendCandidate: action.payload };
    case 'UPDATE_FILTERS':
      return { ...state, activeFilters: { ...state.activeFilters, ...action.payload } };
    case 'UPDATE_PIPELINE':
      return { ...state, pipelineStages: action.payload };
    case 'ADD_LOG':
      return { ...state, liveLogs: [...state.liveLogs, action.payload] };
    case 'SET_PROGRESS':
      return { ...state, rankingProgress: action.payload };
    case 'SET_EXECUTION_MODE':
      return { ...state, executionMode: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_PIPELINE_RUNTIME':
      return { ...state, pipelineRuntime: action.payload.runtime, totalCandidatesProcessed: action.payload.total };
    case 'SET_JD_DATA':
      return { ...state, jdData: action.payload };
    case 'SET_API_SETTINGS':
      return {
        ...state,
        apiSettings: state.apiSettings
          ? { ...state.apiSettings, ...action.payload }
          : (action.payload as ApiSettings),
      };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export { PIPELINE_STAGES };
