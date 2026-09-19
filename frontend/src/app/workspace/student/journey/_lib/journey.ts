/**
 * Journey derivation — pure functions, no React.
 *
 * The journey is shown as TWO tracks, because a project's review progress and
 * its maturity are independent (§15.2). A project can arrive at PROTOTYPE and
 * still be in Faculty Review; a single linear "…Approved → Prototype → MVP"
 * chain would wrongly show Prototype as not reached.
 *
 *   Review track:      Submitted → Faculty → Department → Incubation → Approval
 *   Development track: Idea → Concept → Prototype → MVP → Market Ready → Startup / Product / Patent
 *
 * Both tracks and the "current / upcoming" timeline entries are derived from
 * reviewStatus + pipelinePosition + maturity. Only past events are stored.
 */
import { formatLongDate } from "@/lib/dates";
import {
  MATURITY_LABEL,
  MATURITY_LEVELS,
  PIPELINE_POSITION_LABEL,
  PIPELINE_POSITIONS,
  type PipelinePosition,
} from "@/types/status";
import type { StudentProject } from "@/mock/student-projects";
import type { JourneyEvent } from "@/mock/student-journey";

export type StageState = "complete" | "current" | "revision" | "rejected" | "approved" | "upcoming" | "closed";

export interface TrackStage {
  id: string;
  label: string;
  state: StageState;
}

// ---------------------------------------------------------------------------
// Review track
// ---------------------------------------------------------------------------
const REVIEW_ORDER = ["SUBMITTED", ...PIPELINE_POSITIONS, "DECISION"] as const;
type ReviewStageId = (typeof REVIEW_ORDER)[number];

const REVIEW_LABEL: Record<ReviewStageId, string> = {
  SUBMITTED: "Submitted",
  ...PIPELINE_POSITION_LABEL,
  DECISION: "Approval",
};

export function reviewTrack(project: StudentProject): TrackStage[] {
  const { reviewStatus, pipelinePosition } = project;

  if (reviewStatus === "DRAFT") {
    return REVIEW_ORDER.map((id) => ({ id, label: REVIEW_LABEL[id], state: "upcoming" }));
  }

  if (reviewStatus === "APPROVED") {
    return REVIEW_ORDER.map((id) => ({
      id,
      label: REVIEW_LABEL[id],
      state: id === "DECISION" ? "approved" : "complete",
    }));
  }

  // SUBMITTED / UNDER_REVIEW / REVISION_REQUESTED / REJECTED all sit at a pipeline position.
  const position = REVIEW_ORDER.indexOf(pipelinePosition ?? "FACULTY_REVIEW");
  const heldState: StageState =
    reviewStatus === "REVISION_REQUESTED" ? "revision" : reviewStatus === "REJECTED" ? "rejected" : "current";

  return REVIEW_ORDER.map((id, i) => ({
    id,
    label: REVIEW_LABEL[id],
    state:
      i < position ? "complete" : i === position ? heldState : reviewStatus === "REJECTED" ? "closed" : "upcoming",
  }));
}

// ---------------------------------------------------------------------------
// Development track
// ---------------------------------------------------------------------------
export function developmentTrack(project: StudentProject): TrackStage[] {
  const index = MATURITY_LEVELS.indexOf(project.maturity);
  const stages: TrackStage[] = MATURITY_LEVELS.map((level, i) => ({
    id: level,
    label: MATURITY_LABEL[level],
    state: i < index ? "complete" : i === index ? "current" : "upcoming",
  }));
  stages.push({ id: "LAUNCH", label: "Startup / Product / Patent", state: "upcoming" });
  return stages;
}

/** One-line answer to "where is this project right now?" */
export function currentStageSummary(project: StudentProject): { label: string; detail: string } {
  switch (project.reviewStatus) {
    case "DRAFT":
      return { label: "Not yet submitted", detail: "Finish and submit the idea to start its review." };
    case "APPROVED":
      return {
        label: "Approved for incubation",
        detail: `Now in development at ${MATURITY_LABEL[project.maturity]} stage.`,
      };
    case "REJECTED":
      return {
        label: "Not approved",
        detail: `Closed at ${PIPELINE_POSITION_LABEL[project.pipelinePosition ?? "FACULTY_REVIEW"]}.`,
      };
    case "REVISION_REQUESTED":
      return {
        label: PIPELINE_POSITION_LABEL[project.pipelinePosition ?? "FACULTY_REVIEW"],
        detail: "Revision requested — the review is paused until you resubmit.",
      };
    case "SUBMITTED":
      return {
        label: PIPELINE_POSITION_LABEL[project.pipelinePosition ?? "FACULTY_REVIEW"],
        detail: "Submitted and waiting for review to begin.",
      };
    default:
      return {
        label: PIPELINE_POSITION_LABEL[project.pipelinePosition ?? "FACULTY_REVIEW"],
        detail: "Review in progress.",
      };
  }
}

// ---------------------------------------------------------------------------
// Timeline entries
// ---------------------------------------------------------------------------
export interface TimelineEntry {
  id: string;
  title: string;
  state: StageState;
  /** e.g. "Faculty Review · 14 Sep 2026", or "Pending" for future entries. */
  meta: string;
  description: string;
  score?: number;
  action?: { label: string; href: string };
}

const CURRENT_DESCRIPTION: Record<PipelinePosition, string> = {
  FACULTY_REVIEW: "Your faculty guide is reviewing the submission.",
  DEPARTMENT_REVIEW: "Waiting for the department review panel.",
  INCUBATION_REVIEW: "Under consideration by the incubation committee.",
};

const UPCOMING_DESCRIPTION: Record<Exclude<ReviewStageId, "SUBMITTED">, string> = {
  FACULTY_REVIEW: "Your faculty guide reviews the submission.",
  DEPARTMENT_REVIEW: "Assessed by your department's review panel.",
  INCUBATION_REVIEW: "Considered by the incubation committee for support.",
  DECISION: "Final decision on incubation support.",
};

const EVENT_STATE: Record<JourneyEvent["type"], StageState> = {
  SUBMITTED: "complete",
  GUIDE_ASSIGNED: "complete",
  REVIEW_COMPLETED: "complete",
  RESUBMITTED: "complete",
  MATURITY_UPDATED: "complete",
  REVISION_REQUESTED: "revision",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export function buildTimeline(project: StudentProject, events: JourneyEvent[]): TimelineEntry[] {
  const workspace = `/workspace/student/projects/${project.id}`;

  // 1. What has happened — oldest first.
  const past: TimelineEntry[] = [...events]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => {
      const context = event.pipelinePosition
        ? PIPELINE_POSITION_LABEL[event.pipelinePosition]
        : event.maturity
          ? `${MATURITY_LABEL[event.maturity.from]} → ${MATURITY_LABEL[event.maturity.to]}`
          : null;
      return {
        id: event.id,
        title: event.title,
        state: EVENT_STATE[event.type],
        meta: [context, formatLongDate(event.date)].filter(Boolean).join(" · "),
        description: event.description,
        score: event.score,
        action: event.hasFeedback ? { label: "View Feedback", href: `${workspace}#feedback` } : undefined,
      };
    });

  const { reviewStatus, pipelinePosition } = project;
  const position = pipelinePosition ? REVIEW_ORDER.indexOf(pipelinePosition) : -1;

  // 2. Where it is now.
  const now: TimelineEntry[] = [];
  if ((reviewStatus === "SUBMITTED" || reviewStatus === "UNDER_REVIEW") && pipelinePosition) {
    now.push({
      id: "current",
      title: `${PIPELINE_POSITION_LABEL[pipelinePosition]} in progress`,
      state: "current",
      meta: reviewStatus === "SUBMITTED" ? "Awaiting reviewer" : "In progress",
      description: CURRENT_DESCRIPTION[pipelinePosition],
    });
  } else if (reviewStatus === "REVISION_REQUESTED" && pipelinePosition) {
    now.push({
      id: "resubmit",
      title: "Resubmit for review",
      state: "current",
      meta: "Waiting on you",
      description: `Address the reviewer feedback, then resubmit to continue ${PIPELINE_POSITION_LABEL[pipelinePosition]}.`,
      action: { label: "Open Project", href: workspace },
    });
  } else if (reviewStatus === "APPROVED" && project.next) {
    now.push({
      id: "next-milestone",
      title: project.next.label,
      state: "current",
      meta: project.next.dueDate ? `Next milestone · due ${formatLongDate(project.next.dueDate)}` : "Next milestone",
      description: "Your current development milestone.",
      action: { label: "Open Project", href: workspace },
    });
  }

  // 3. What is still ahead in the review. Rejected and approved projects have nothing ahead.
  const ahead: TimelineEntry[] =
    reviewStatus === "SUBMITTED" || reviewStatus === "UNDER_REVIEW" || reviewStatus === "REVISION_REQUESTED"
      ? REVIEW_ORDER.slice(position + 1).map((id) => {
          const stageId = id as Exclude<ReviewStageId, "SUBMITTED">;
          return {
            id: `upcoming-${stageId}`,
            title: REVIEW_LABEL[stageId],
            state: "upcoming" as const,
            meta: "Pending",
            description: UPCOMING_DESCRIPTION[stageId],
          };
        })
      : [];

  return [...past, ...now, ...ahead];
}

/** Default selection: a project that needs attention, else the most recently updated submitted one. */
export function defaultProjectId(projects: StudentProject[]): string | undefined {
  const needsAttention = projects.find((p) => p.reviewStatus === "REVISION_REQUESTED");
  if (needsAttention) return needsAttention.id;
  const submitted = projects
    .filter((p) => p.reviewStatus !== "DRAFT")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (submitted[0] ?? projects[0])?.id;
}
