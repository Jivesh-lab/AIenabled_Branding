import type { Maturity, PipelinePosition, ReviewStatus } from "@/types/status";

export interface ProjectNextStep {
  kind: "action" | "milestone";
  label: string;
  dueDate?: string;
}

/** Preliminary assessment returned by agent-service on submit. Never an admission decision. */
export interface AgentEvaluationData {
  summary?: {
    problem?: string;
    proposed_solution?: string;
    target_users?: string;
    innovation_differentiation?: string;
    business_model?: string;
    requested_support?: string;
  };
  assessment?: {
    problem_clarity_score?: number;
    technical_feasibility_score?: number;
    market_potential_score?: number;
    overall_readiness_score?: number;
    strengths?: string[];
    weaknesses?: string[];
  };
  questions?: string[];
  missing_evidence?: string[];
  validation?: {
    is_complete?: boolean;
    completeness_score?: number;
    missing_fields?: string[];
  };
  recommendation_summary?: string;
}

/** Response body of POST /api/applications/submit. */
export interface SubmitApplicationResponse {
  success: boolean;
  application_id: string;
  status: string;
  agent_evaluation?: AgentEvaluationData | null;
}

export interface StudentProject {
  id: string;
  name: string;
  shortDescription: string;
  domain: string;
  reviewStatus: ReviewStatus;
  pipelinePosition: PipelinePosition | null;
  maturity: Maturity;
  progress: number;
  facultyGuide: string | null;
  teamSize: number;
  updatedAt: string | null;
  next: ProjectNextStep | null;
}
