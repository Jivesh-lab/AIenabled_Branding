/**
 * Mentor matching states shown to students. Pure (no framework imports) so it is unit-tested directly.
 *
 * Source of truth for the allocation is the MentorAllocation record kept by the faculty/coordinator
 * workflow (statuses: requested, under_review, recommended, approved, rejected, allocated). This module
 * only maps those persisted statuses - plus the application's own status - to what the student sees. It
 * never creates a state the backend did not report.
 */

export const ALLOCATION_STATUSES = ["requested", "under_review", "recommended", "approved", "rejected", "allocated"] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export type MatchingState =
  | "not-applicable" // application rejected: no mentoring
  | "not-started" // application not approved yet, so matching cannot begin
  | "not-requested" // approved, but the coordinator has not opened a mentor request
  | "pending" // requested
  | "in-progress" // under review by the coordinator
  | "recommended" // a mentor is proposed but NOT yet confirmed
  | "matched" // confirmed, mentor recorded
  | "matched-name-pending" // confirmed, but no mentor name recorded yet
  | "unsuccessful" // request rejected
  | "unknown"; // backend reported a status this app does not know

export const MATCHING_LABEL: Record<MatchingState, string> = {
  "not-applicable": "Not applicable",
  "not-started": "Not started",
  "not-requested": "No request yet",
  pending: "Pending",
  "in-progress": "In progress",
  recommended: "Recommendation only",
  matched: "Mentor assigned",
  "matched-name-pending": "Approved",
  unsuccessful: "Unsuccessful",
  unknown: "Status unavailable",
};

export const MATCHING_DESCRIPTION: Record<MatchingState, string> = {
  "not-applicable": "Mentoring is not available because this application was not approved.",
  "not-started": "Mentor matching begins after your application is approved.",
  "not-requested": "Your project is approved, but no mentor request has been opened yet. The incubation coordinator opens one.",
  pending: "A mentor request has been submitted and is waiting for the coordinator to review it.",
  "in-progress": "The coordinator is reviewing your mentor request.",
  recommended: "A mentor has been proposed for your project. It is a recommendation, not a confirmed assignment, until the coordinator approves it.",
  matched: "The coordinator has approved a mentor for your project.",
  "matched-name-pending": "The coordinator approved your mentor request, but the mentor's name has not been recorded yet.",
  unsuccessful: "The mentor request was not approved. Speak to your faculty coordinator about next steps.",
  unknown: "The mentoring system reported a status this page does not recognise.",
};

export type MatchingTone = "neutral" | "progress" | "attention" | "success" | "danger";
export const MATCHING_TONE: Record<MatchingState, MatchingTone> = {
  "not-applicable": "neutral",
  "not-started": "neutral",
  "not-requested": "neutral",
  pending: "progress",
  "in-progress": "progress",
  recommended: "attention",
  matched: "success",
  "matched-name-pending": "progress",
  unsuccessful: "danger",
  unknown: "neutral",
};

/** The persisted allocation as the student BFF receives it (see backend/src/routes/student.js). */
export interface AllocationView {
  status: string;
  requestedExpertise: string[];
  recommendation: { name: string; organization: string | null } | null;
  mentor: { name: string | null; contact: MentorContact | null } | null;
  updatedAt: string | null;
}

export interface MentorContact {
  email: string | null;
  organization: string | null;
  bio: string | null;
  expertise: string[];
}

/** Profile from the existing mentor cohort directory (agent-service), when the mentor is listed there. */
export interface DirectoryProfile {
  name: string;
  role: string;
  affiliation: string;
  domains: string[];
  expertise: string[];
  mentorType: string;
}

export function isAllocationStatus(value: string): value is AllocationStatus {
  return (ALLOCATION_STATUSES as readonly string[]).includes(value);
}

/**
 * @param applicationStatus the application's own review status (DRAFT, SUBMITTED, ..., APPROVED, REJECTED)
 * @param allocation        the persisted allocation, or null when none exists
 */
export function deriveMatchingState(applicationStatus: string, allocation: AllocationView | null | undefined): MatchingState {
  const app = applicationStatus.toUpperCase();
  if (app === "REJECTED") return "not-applicable";
  if (app !== "APPROVED") return "not-started";
  if (!allocation) return "not-requested";

  const status = allocation.status;
  if (!isAllocationStatus(status)) return "unknown";
  switch (status) {
    case "requested":
      return "pending";
    case "under_review":
      return "in-progress";
    case "recommended":
      return "recommended";
    case "rejected":
      return "unsuccessful";
    case "approved":
    case "allocated":
      return allocation.mentor?.name ? "matched" : "matched-name-pending";
  }
}

/** What the student portal shows for one project. Built on the server; safe to send to the browser. */
export interface MentorInfo {
  applicationId: string;
  state: MatchingState;
  requestedExpertise: string[];
  recommendation: AllocationView["recommendation"];
  mentor: { name: string; contact: MentorContact | null; directory: DirectoryProfile | null } | null;
  /** True when the mentor is listed but their directory profile could not be loaded (not the same as "has none"). */
  profileUnavailable: boolean;
  updatedAt: string | null;
}

export type MentorFailureKind = "unauthenticated" | "forbidden" | "not-found" | "unavailable";

export type MentorResult =
  | { ok: true; data: MentorInfo }
  | { ok: false; kind: MentorFailureKind; message: string };

/** Single-line summary for compact views (dashboard, project list). Always honest about failure. */
export function summariseMentor(result: MentorResult | undefined): { text: string; tone: MatchingTone; confirmed: boolean } {
  if (!result) return { text: "Mentor status unavailable", tone: "neutral", confirmed: false };
  if (!result.ok) return { text: "Mentor status unavailable", tone: "danger", confirmed: false };
  const { state, mentor, recommendation } = result.data;
  if (state === "matched" && mentor) return { text: mentor.name, tone: "success", confirmed: true };
  if (state === "recommended" && recommendation) {
    return { text: `${MATCHING_LABEL[state]}: ${recommendation.name} (not confirmed)`, tone: MATCHING_TONE[state], confirmed: false };
  }
  return { text: MATCHING_LABEL[state], tone: MATCHING_TONE[state], confirmed: false };
}

export type AllocationResponse =
  | { ok: true; allocation: AllocationView | null }
  | { ok: false; kind: MentorFailureKind; message: string };

/**
 * Interprets the Express student endpoint. A failure is never turned into "no mentor": 404 means the
 * project is not reachable in the mentoring system (distinct from 200 + allocation:null = "no request yet").
 */
export function interpretAllocationResponse(status: number, body: unknown): AllocationResponse {
  const b = (body ?? {}) as { success?: boolean; message?: string; data?: { allocation?: AllocationView | null } };
  if (status === 200 && b.success === true && b.data) return { ok: true, allocation: b.data.allocation ?? null };
  if (status === 401) return { ok: false, kind: "unauthenticated", message: "Your session has expired. Please sign in again." };
  if (status === 403) return { ok: false, kind: "forbidden", message: "You do not have access to this project's mentoring record." };
  if (status === 404) {
    return {
      ok: false,
      kind: "not-found",
      message: "This approved project is not registered with the mentoring system yet. Please contact the incubation office.",
    };
  }
  return { ok: false, kind: "unavailable", message: "The mentoring service is unavailable. Please try again shortly." };
}
