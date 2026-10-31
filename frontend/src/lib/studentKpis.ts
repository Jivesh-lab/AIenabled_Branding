/**
 * Dashboard KPI definitions. Every KPI documents its source and rule, and reports WHY it has no value:
 * "unavailable" (its source failed) is different from "not-tracked" (source fine, nothing recorded) and from a
 * real 0. Pure and unit-tested.
 */
import type { Journey } from "./journey.ts";
import { summarize, taskState, type Now } from "./workflowState.ts";
import type { Section } from "../types/student-overview.ts";
import type { StudentProject } from "../types/student-application.ts";
import type { StudentMeeting, StudentTask } from "../types/student-workflow.ts";

export type KpiState = "ok" | "unavailable" | "not-tracked";

export interface Kpi {
  id: "active-projects" | "needs-attention" | "upcoming-meetings" | "overdue-tasks";
  label: string;
  value: number | null;
  state: KpiState;
  /** Where the number comes from. */
  source: string;
  /** The exact rule. */
  definition: string;
  href: string;
}

const ACTIVE = ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED", "APPROVED"];

export function computeKpis(
  input: { projects: Section<StudentProject[]>; meetings: Section<StudentMeeting[]>; tasks: Section<StudentTask[]>; journeys: Journey[] },
  now: Now,
): Kpi[] {
  const { projects, meetings, tasks, journeys } = input;

  const fromProjects = (id: Kpi["id"], label: string, definition: string, href: string, calc: (p: StudentProject[]) => number | null): Kpi => {
    const base = { id, label, definition, href, source: "Your applications (agent-service)" };
    if (!projects.ok) return { ...base, value: null, state: "unavailable" };
    const value = calc(projects.data);
    return value === null ? { ...base, value: null, state: "not-tracked" } : { ...base, value, state: "ok" };
  };

  return [
    fromProjects(
      "active-projects", "Active Projects",
      "Applications that are submitted, under review, awaiting changes or approved. Drafts and rejected ones are excluded.",
      "/workspace/student/projects",
      (p) => p.filter((x) => ACTIVE.includes(x.reviewStatus)).length,
    ),
    fromProjects(
      "needs-attention", "Needs Attention",
      "Urgent actions that are the student's to take: a requested revision, an unfinished draft, overdue milestones, overdue or soon-due tasks, a meeting today. Waiting for a faculty review is not counted.",
      "/workspace/student/journey",
      () => journeys.reduce((n, j) => n + j.actions.filter((a) => a.urgent).length, 0),
    ),
    meetings.ok
      ? {
          id: "upcoming-meetings", label: "Upcoming Meetings", value: summarize(meetings.data, now).upcoming, state: "ok",
          source: "Meetings of your projects (backend)",
          definition: "Confirmed meetings happening today or later. Requests still awaiting the host and cancelled meetings are excluded.",
          href: "/workspace/student/meetings",
        }
      : {
          id: "upcoming-meetings", label: "Upcoming Meetings", value: null, state: "unavailable",
          source: "Meetings of your projects (backend)", definition: "Confirmed meetings happening today or later.", href: "/workspace/student/meetings",
        },
    tasks.ok
      ? {
          id: "overdue-tasks", label: "Overdue Tasks", value: tasks.data.length === 0 ? null : tasks.data.filter((t) => taskState(t, now.date) === "OVERDUE").length,
          state: tasks.data.length === 0 ? "not-tracked" : "ok",
          source: "Tasks set for your projects (backend)",
          definition: "Tasks past their due date and not completed. Not tracked when no task has been set for any of your projects.",
          href: "/workspace/student/journey",
        }
      : {
          id: "overdue-tasks", label: "Overdue Tasks", value: null, state: "unavailable",
          source: "Tasks set for your projects (backend)", definition: "Tasks past their due date and not completed.", href: "/workspace/student/journey",
        },
  ];
}
