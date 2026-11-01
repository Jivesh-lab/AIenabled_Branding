/**
 * The student journey: ONE model derived from persisted records, used by the Journey page, the dashboard and the
 * project page so they can never disagree. Pure (no framework imports) and unit-tested. It is a read-model, not a
 * workflow engine: every transition still happens in the existing workflows (review, mentoring, milestones...).
 *
 * Stages (5, equal weight):
 *   1 Idea saved            complete once the application is no longer a draft
 *   2 Application submitted complete once submitted
 *   3 Review & approval     complete ONLY when the application is approved
 *   4 Mentor                complete ONLY when the coordinator confirmed a mentor
 *   5 Milestones & delivery complete ONLY when at least one milestone exists and all are completed
 *
 * Progress rule: percent = completed stages / 5, rounded. A stage counts only if its persisted record proves it.
 * Missing or unavailable data NEVER counts as completed (it shows as current/upcoming with an "unavailable" note).
 */
import { formatLongDateSafe } from "./journeyFormat.ts";
import { MATCHING_DESCRIPTION, type MentorResult } from "./mentorState.ts";
import { describeHealth } from "./monitoringView.ts";
import { isIsoDate, meetingStatus, taskState, type Now } from "./workflowState.ts";
import type { MonitoringResponse, StudentProject } from "../types/student-application.ts";
import type { StudentMeeting, StudentTask } from "../types/student-workflow.ts";

export type StageId = "saved" | "submitted" | "review" | "mentor" | "milestones";
export type StageState = "complete" | "current" | "upcoming" | "blocked" | "closed";

export interface JourneyStage {
  id: StageId;
  label: string;
  state: StageState;
  detail: string;
  /** Where the student works on this stage, or null when there is nothing for them to do. */
  href: string | null;
}

export interface JourneyBlocker {
  id: string;
  label: string;
  href: string;
}

export interface JourneyAction {
  id: string;
  label: string;
  href: string;
  urgent: boolean;
}

/** Sources that could not be loaded; the journey is built from what is available and says so. */
export type MissingSource = "mentor" | "tasks" | "meetings" | "monitoring";

export interface Journey {
  projectId: string;
  projectName: string;
  stages: JourneyStage[];
  currentStageId: StageId | null;
  blockers: JourneyBlocker[];
  actions: JourneyAction[];
  progress: { done: number; total: number; percent: number };
  missing: MissingSource[];
}

export const PROGRESS_RULE = "Progress = completed stages ÷ 5. A stage counts only when its saved record shows it complete.";

export interface JourneyInput {
  project: StudentProject;
  /** undefined = not loaded; { ok:false } = failed. Both are "unavailable". */
  mentor: MentorResult | undefined;
  /** null = the source failed to load (distinct from an empty list). */
  tasks: StudentTask[] | null;
  meetings: StudentMeeting[] | null;
  /** null = not run / not applicable; "unavailable" = the check failed. */
  monitoring: MonitoringResponse | null | "unavailable";
  now: Now;
}

const enc = encodeURIComponent;
export const projectUrl = (id: string, hash = "") => `/workspace/student/projects/${enc(id)}${hash}`;
export const editUrl = (id: string) => `/workspace/student/submit?applicationId=${enc(id)}`;

export function buildJourney(input: JourneyInput): Journey {
  const { project, mentor, tasks, meetings, monitoring, now } = input;
  const status = project.reviewStatus;
  const approved = status === "APPROVED";
  const rejected = status === "REJECTED";
  const missing: MissingSource[] = [];
  const blockers: JourneyBlocker[] = [];
  const actions: JourneyAction[] = [];
  const id = project.id;

  // ── Stage 1-3: the application ────────────────────────────────────────────
  const isDraft = status === "DRAFT";
  const saved: JourneyStage = isDraft
    ? { id: "saved", label: "Idea saved", state: "current", detail: "Draft saved. Finish and submit it for review.", href: editUrl(id) }
    : { id: "saved", label: "Idea saved", state: "complete", detail: "Application created.", href: null };

  const submitted: JourneyStage = isDraft
    ? { id: "submitted", label: "Application submitted", state: "upcoming", detail: "Not submitted yet.", href: null }
    : { id: "submitted", label: "Application submitted", state: "complete", detail: "Submitted for faculty review.", href: projectUrl(id) };

  let review: JourneyStage;
  if (approved) review = { id: "review", label: "Review & approval", state: "complete", detail: "Approved by the review panel.", href: projectUrl(id) };
  else if (rejected) review = { id: "review", label: "Review & approval", state: "closed", detail: "Not approved by the review panel.", href: projectUrl(id) };
  else if (status === "REVISION_REQUESTED") {
    review = { id: "review", label: "Review & approval", state: "blocked", detail: "The reviewer asked for changes. Update and resubmit.", href: editUrl(id) };
    blockers.push({ id: "revision", label: "Reviewer requested changes", href: editUrl(id) });
    actions.push({ id: "revise", label: "Update and resubmit your application", href: editUrl(id), urgent: true });
  } else if (status === "SUBMITTED" || status === "UNDER_REVIEW") {
    review = {
      id: "review", label: "Review & approval", state: "current",
      detail: status === "SUBMITTED" ? "Waiting for a reviewer." : "A reviewer is looking at it.", href: projectUrl(id),
    };
    actions.push({ id: "await", label: "Waiting for the review decision", href: projectUrl(id), urgent: false });
  } else review = { id: "review", label: "Review & approval", state: "upcoming", detail: "Starts after you submit.", href: null };

  if (isDraft) actions.push({ id: "finish", label: "Finish and submit your application", href: editUrl(id), urgent: true });

  // ── Stage 4: mentor ───────────────────────────────────────────────────────
  let mentorStage: JourneyStage;
  if (rejected) mentorStage = { id: "mentor", label: "Mentor", state: "closed", detail: "Not applicable.", href: null };
  else if (!approved) mentorStage = { id: "mentor", label: "Mentor", state: "upcoming", detail: "Mentor matching begins after approval.", href: null };
  else if (!mentor || !mentor.ok) {
    missing.push("mentor");
    mentorStage = { id: "mentor", label: "Mentor", state: "current", detail: "Mentor status is unavailable right now.", href: projectUrl(id) };
  } else {
    const state = mentor.data.state;
    if (state === "matched" && mentor.data.mentor) {
      mentorStage = { id: "mentor", label: "Mentor", state: "complete", detail: `Mentor: ${mentor.data.mentor.name}`, href: projectUrl(id) };
    } else if (state === "unsuccessful") {
      mentorStage = { id: "mentor", label: "Mentor", state: "blocked", detail: MATCHING_DESCRIPTION[state], href: projectUrl(id) };
      blockers.push({ id: "mentor", label: "Mentor request was not approved", href: projectUrl(id) });
    } else {
      mentorStage = { id: "mentor", label: "Mentor", state: "current", detail: MATCHING_DESCRIPTION[state], href: projectUrl(id) };
    }
  }

  // ── Stage 5: milestones ───────────────────────────────────────────────────
  const m = project.milestones;
  let milestoneStage: JourneyStage;
  if (rejected) milestoneStage = { id: "milestones", label: "Milestones & delivery", state: "closed", detail: "Not applicable.", href: null };
  else if (!approved) milestoneStage = { id: "milestones", label: "Milestones & delivery", state: "upcoming", detail: "Available once the project is approved.", href: null };
  else if (m.total === 0) {
    milestoneStage = { id: "milestones", label: "Milestones & delivery", state: "current", detail: "No milestones recorded yet.", href: projectUrl(id, "#milestones") };
    actions.push({ id: "add-milestone", label: "Add your first milestone", href: projectUrl(id, "#milestones"), urgent: false });
  } else if (m.completed === m.total) {
    milestoneStage = { id: "milestones", label: "Milestones & delivery", state: "complete", detail: `All ${m.total} milestones completed.`, href: projectUrl(id, "#milestones") };
  } else if (m.overdue > 0) {
    milestoneStage = { id: "milestones", label: "Milestones & delivery", state: "blocked", detail: `${m.completed} of ${m.total} done · ${m.overdue} overdue`, href: projectUrl(id, "#milestones") };
    blockers.push({ id: "overdue-milestones", label: `${m.overdue} overdue ${m.overdue === 1 ? "milestone" : "milestones"}`, href: projectUrl(id, "#milestones") });
    actions.push({ id: "overdue-milestones", label: `Update ${m.overdue} overdue ${m.overdue === 1 ? "milestone" : "milestones"}`, href: projectUrl(id, "#milestones"), urgent: true });
  } else {
    milestoneStage = { id: "milestones", label: "Milestones & delivery", state: "current", detail: `${m.completed} of ${m.total} done`, href: projectUrl(id, "#milestones") };
  }

  // ── Tasks, meetings, monitoring (only meaningful once approved) ───────────
  if (approved) {
    if (tasks === null) missing.push("tasks");
    else {
      const mine = tasks.filter((t) => t.projectId === id && t.status !== "Completed");
      const overdue = mine.filter((t) => taskState(t, now.date) === "OVERDUE");
      if (overdue.length > 0) {
        blockers.push({ id: "overdue-tasks", label: `${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"}`, href: projectUrl(id, "#tasks") });
      }
      for (const t of mine) {
        const state = taskState(t, now.date);
        actions.push({
          id: `task-${t.id}`,
          label: `Task: ${t.title}${isIsoDate(t.dueDate) ? ` (due ${formatLongDateSafe(t.dueDate)})` : ""}`,
          href: projectUrl(id, "#tasks"),
          urgent: state === "OVERDUE" || state === "DUE_SOON",
        });
      }
    }

    if (meetings === null) missing.push("meetings");
    else {
      const upcoming = meetings
        .filter((x) => x.projectId === id && ["TODAY", "UPCOMING"].includes(meetingStatus(x, now)))
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
      if (upcoming) {
        actions.push({
          id: `meeting-${upcoming.id}`,
          label: `Meeting: ${upcoming.title} (${formatLongDateSafe(upcoming.date)})`,
          href: `/workspace/student/meetings/${enc(upcoming.id)}`,
          urgent: upcoming.date === now.date,
        });
      } else if (mentorStage.state === "complete") {
        actions.push({ id: "request-meeting", label: "Request a meeting with your mentor", href: "/workspace/student/meetings", urgent: false });
      }
    }

    if (monitoring === "unavailable") missing.push("monitoring");
    else if (monitoring) {
      const health = monitoring.evaluation.health_status;
      if (health === "Needs Attention" || health === "At Risk") {
        const first = monitoring.evaluation.ai_interpretation.risk_factors[0];
        blockers.push({ id: "monitoring", label: `Monitoring: ${describeHealth(health).label}${first ? ` - ${first}` : ""}`, href: projectUrl(id, "#milestones") });
      }
    }
  }

  const stages = [saved, submitted, review, mentorStage, milestoneStage];
  const done = stages.filter((s) => s.state === "complete").length;
  const current = stages.find((s) => s.state === "current" || s.state === "blocked");

  return {
    projectId: id,
    projectName: project.name,
    stages,
    currentStageId: current ? current.id : null,
    blockers,
    actions: actions.sort((a, b) => Number(b.urgent) - Number(a.urgent)).slice(0, 8),
    progress: { done, total: stages.length, percent: Math.round((done / stages.length) * 100) },
    missing,
  };
}
