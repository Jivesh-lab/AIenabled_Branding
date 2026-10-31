import type { Maturity, PipelinePosition } from "@/types/status";

export type JourneyEventType =
  | "SUBMITTED"
  | "GUIDE_ASSIGNED"
  | "REVIEW_COMPLETED"
  | "REVISION_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "MATURITY_UPDATED";

export interface JourneyEvent {
  id: string;
  projectId: string;
  type: JourneyEventType;
  date: string; // ISO date
  title: string;
  description: string;
  /** The review stage this event belongs to, when it belongs to one. */
  pipelinePosition?: PipelinePosition;
  score?: number;
  /** For MATURITY_UPDATED events. */
  maturity?: { from: Maturity; to: Maturity };
  /** Reviewer feedback exists for this event. */
  hasFeedback?: boolean;
}
