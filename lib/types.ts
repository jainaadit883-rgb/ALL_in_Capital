export type ApplicationStatus = "pending" | "researching" | "scoring" | "scored" | "call_booked" | "passed" | "funded";
export type Recommendation = "take_call" | "pass" | "more_info";
export type ActualDecision = "funded" | "passed";

export interface ThesisCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // 1-10
  is_anti_thesis: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  company_name: string;
  sector: string;
  stage: string;
  founder_names: string;
  website: string;
  deck_text: string;
  form_responses: string;
  submitted_at: string;
  status: ApplicationStatus;
}

export interface CriterionScore {
  id: string;
  application_id: string;
  criterion_id: string;
  criterion_name: string;
  score: number; // 0-10
  reasoning: string;
  sources: ScoreSource[];
  is_gap: boolean;
  gap_description: string;
  created_at: string;
}

export interface ScoreSource {
  url?: string;
  text: string;
  origin: "deck" | "form" | "web" | "not_found";
}

export interface OverallScore {
  id: string;
  application_id: string;
  total_score: number;
  recommendation: Recommendation;
  memo_text: string;
  created_at: string;
  criterion_scores?: CriterionScore[];
}

export interface Correction {
  id: string;
  score_id: string;
  application_id: string;
  criterion_name: string;
  original_score: number;
  corrected_score: number;
  reason: string;
  created_at: string;
}

export interface ResearchResult {
  id: string;
  application_id: string;
  company_findings: string;
  founder_findings: string;
  market_findings: string;
  sources: ResearchSource[];
  gaps: string[];
  created_at: string;
}

export interface ResearchSource {
  url: string;
  title: string;
  snippet: string;
  relevance: "company" | "founder" | "market";
}

export interface HistoricalDeal {
  id: string;
  company_name: string;
  sector: string;
  deck_text: string;
  actual_decision: ActualDecision;
  actual_reasoning: string;
  system_score?: number;
  system_recommendation?: Recommendation;
  system_reasoning?: string;
  agreed: boolean | null;
  backtested_at?: string;
}

export interface BacktestResult {
  total_deals: number;
  agreements: number;
  agreement_rate: number;
  false_positives: number;
  false_negatives: number;
  disagreements: BacktestDisagreement[];
  trust_assessment: string;
}

export interface BacktestDisagreement {
  deal_id: string;
  company_name: string;
  actual_decision: ActualDecision;
  system_recommendation: Recommendation;
  system_score: number;
  likely_wrong: "system" | "partners" | "unclear";
  reasoning: string;
}

export interface DashboardStats {
  total_applications: number;
  pending: number;
  scored: number;
  calls_booked: number;
  passed: number;
  funded: number;
  avg_score: number;
}
