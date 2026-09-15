/**
 * AAI–DBITIC project status model — the single definition in code.
 *
 * A project carries THREE independent fields. They are never merged into one
 * enum, and one is never displayed as another (docs/ai-agents/ui-design-system.md §15.2).
 *
 *   ReviewStatus      where the project is in the approval process
 *   PipelinePosition  which reviewer currently holds it
 *   Maturity          how developed the idea/product itself is
 */

// ---------------------------------------------------------------------------
// Badge tones — how a status is coloured. Semantic, not decorative.
// ---------------------------------------------------------------------------
export type StatusTone = "info" | "progress" | "attention" | "success" | "danger" | "neutral";

// ---------------------------------------------------------------------------
// Review status
// ---------------------------------------------------------------------------
export const REVIEW_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED",
  "REJECTED",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  REVISION_REQUESTED: "Revision Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const REVIEW_STATUS_TONE: Record<ReviewStatus, StatusTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "progress",
  REVISION_REQUESTED: "attention", // gold — the most actionable state
  APPROVED: "success",
  REJECTED: "danger",
};

// ---------------------------------------------------------------------------
// Pipeline position
// ---------------------------------------------------------------------------
export const PIPELINE_POSITIONS = ["FACULTY_REVIEW", "DEPARTMENT_REVIEW", "INCUBATION_REVIEW"] as const;
export type PipelinePosition = (typeof PIPELINE_POSITIONS)[number];

export const PIPELINE_POSITION_LABEL: Record<PipelinePosition, string> = {
  FACULTY_REVIEW: "Faculty Review",
  DEPARTMENT_REVIEW: "Department Review",
  INCUBATION_REVIEW: "Incubation Review",
};

// ---------------------------------------------------------------------------
// Maturity
// ---------------------------------------------------------------------------
export const MATURITY_LEVELS = ["IDEA", "CONCEPT", "PROTOTYPE", "MVP", "MARKET_READY"] as const;
export type Maturity = (typeof MATURITY_LEVELS)[number];

export const MATURITY_LABEL: Record<Maturity, string> = {
  IDEA: "Idea",
  CONCEPT: "Concept",
  PROTOTYPE: "Prototype",
  MVP: "MVP",
  MARKET_READY: "Market Ready",
};

/** A new submission cannot claim MARKET_READY — that is reached through incubation. */
export const SUBMITTABLE_MATURITY_LEVELS = ["IDEA", "CONCEPT", "PROTOTYPE", "MVP"] as const;
export type SubmittableMaturity = (typeof SUBMITTABLE_MATURITY_LEVELS)[number];
