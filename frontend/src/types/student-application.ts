import type { Maturity, PipelinePosition, ReviewStatus } from "@/types/status";

export interface ProjectNextStep {
  kind: "action" | "milestone";
  label: string;
  dueDate?: string;
}

/** Preliminary assessment returned by agent-service on submit. Never an admission decision. */
export interface AgentEvaluationData {
  /** False when the AI service was unavailable: only `validation` is present, nothing is invented. */
  assessment_available?: boolean;
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
  /** Persisted milestone progress for this project (same figures on every student page). */
  milestones: MilestoneSummary;
  /** Stored agent output (JSON strings), null when no AI assessment was produced. */
  aiSummary?: string | null;
  aiFeedback?: string | null;
  /** YYYY-MM-DD of the last persisted change. */
  updatedAt: string | null;
  next: ProjectNextStep | null;
}

/** One status transition, from application_audit_logs (reviewer comments included, actor ids never). */
export interface ApplicationHistoryEntry {
  from: string | null;
  to: string;
  at: string | null;
  comments: string | null;
}

export interface ApplicationTeamMember {
  id?: string;
  name: string;
  rollNumber?: string;
  email?: string;
  inviteStatus?: string;
}

/** Response body of GET /api/applications/:id. */
export interface ApplicationDetail {
  id: string;
  startup: { name: string; tagline: string; problem: string; solution: string; sector: string; stage: string };
  status: string;
  aiSummary: string | null;
  aiFeedback: string | null;
  reviewerComments?: string | null;
  formData: {
    department?: string;
    projectType?: string;
    affectedUsers?: string;
    currentSolutions?: string;
    differentiation?: string;
    teamMembers?: ApplicationTeamMember[];
    technologies?: string[];
    githubUrl?: string;
    demoUrl?: string;
    prototypeAvailable?: string;
  };
  documents: Array<Record<string, unknown>>;
  submittedAt: string | null;
  updatedAt?: string | null;
  history: ApplicationHistoryEntry[];
}

/** Response body of GET /api/applications/. */
export interface ProjectsResponse {
  projects: StudentProject[];
}

/** Milestone progress for one project (core/milestones.py). `progress: null` means "not tracked", which is not 0. */
export interface MilestoneSummary {
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  upcoming: number;
  progress: number | null;
}

export type MilestoneState = "completed" | "overdue" | "in_progress" | "upcoming" | "no_date";

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  /** Persisted status: pending | in_progress | completed. */
  status: string;
  /** Display state, derived from status and due date. */
  state: MilestoneState;
  completionPct: number;
  completedAt: string | null;
  createdByYou: boolean;
}

export interface MilestonesResponse {
  milestones: Milestone[];
  summary: MilestoneSummary;
  canEdit: boolean;
}

export interface MonitoringSignal {
  code: string;
  label: string;
  /** Which student workflow can address the finding. */
  target: "milestones" | "tasks" | "meetings";
}

/** Response of POST /api/applications/:id/monitoring - advice, never an official status. */
export interface MonitoringResponse {
  evaluation: {
    health_status: "On Track" | "Needs Attention" | "At Risk" | "No Data";
    measured_facts: Record<string, unknown>;
    ai_interpretation: {
      summary: string;
      risk_factors: string[];
      recommended_interventions: string[];
      signals: MonitoringSignal[];
      not_tracked?: string[];
      requires_staff_confirmation: boolean;
      evaluated_at: string;
    };
  };
  milestoneSummary: MilestoneSummary;
  isOfficialStatus: false;
  note: string;
}
