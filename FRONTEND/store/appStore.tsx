"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { RankedCandidate, generateMockData } from '../data/mockData';

export type AppStatus = 'idle' | 'loading' | 'ranking' | 'done' | 'error';
export type ExecutionMode = 'competition' | 'demo';
export type Theme = 'light' | 'dark';

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

export interface AppState {
  status: AppStatus;
  candidatesData: RankedCandidate[];
  rankingResults: RankedCandidate[];
  selectedCandidate: RankedCandidate | null;
  activeFilters: FilterState;
  pipelineStages: PipelineStage[];
  liveLogs: string[];
  rankingProgress: number;
  executionMode: ExecutionMode;
  theme: Theme;
}

type Action =
  | { type: 'SET_STATUS'; payload: AppStatus }
  | { type: 'LOAD_DATA'; payload: RankedCandidate[] }
  | { type: 'SET_RESULTS'; payload: RankedCandidate[] }
  | { type: 'SELECT_CANDIDATE'; payload: RankedCandidate | null }
  | { type: 'UPDATE_FILTERS'; payload: Partial<FilterState> }
  | { type: 'UPDATE_PIPELINE'; payload: PipelineStage[] }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_EXECUTION_MODE'; payload: ExecutionMode }
  | { type: 'SET_THEME'; payload: Theme };

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 1, name: 'Loading & normalizing candidates', description: 'Parse JSON/JSONL, validate schema, normalize fields', status: 'pending', durationMs: 300 },
  { id: 2, name: 'Running title pre-filter', description: 'Assign title_relevance_score. ~69% non-tech titles → near-zero', status: 'pending', durationMs: 400 },
  { id: 3, name: 'Detecting honeypot profiles', description: '4-category check, sigmoid confidence score (0–1)', status: 'pending', durationMs: 700 },
  { id: 4, name: 'Computing semantic similarity', description: '3 JD queries × candidate embeddings → cosine similarity', status: 'pending', durationMs: 1100 },
  { id: 5, name: 'Scoring skill trust', description: 'proficiency × sigmoid(duration) × log(endorsements) × assessment', status: 'pending', durationMs: 900 },
  { id: 6, name: 'Analyzing career + behavioral', description: 'Company classification, production signals, availability multiplier', status: 'pending', durationMs: 700 },
  { id: 7, name: 'First-pass ranking — shortlisting', description: 'Sort all 100K by composite score. Top 300 selected.', status: 'pending', durationMs: 500 },
  { id: 8, name: 'Cross-encoder re-ranking', description: 'Local ms-marco-MiniLM-L-6-v2: (JD query, candidate) pairs. 40% algo + 60% CE blend.', status: 'pending', durationMs: 2800, isCE: true },
];

const initialState: AppState = {
  status: 'idle',
  candidatesData: [],
  rankingResults: [],
  selectedCandidate: null,
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
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'LOAD_DATA':
      return { ...state, candidatesData: action.payload };
    case 'SET_RESULTS':
      return { ...state, rankingResults: action.payload };
    case 'SELECT_CANDIDATE':
      return { ...state, selectedCandidate: action.payload };
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
