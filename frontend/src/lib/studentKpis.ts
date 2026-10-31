/**
 * Dashboard KPI definitions. Every KPI documents its source and rule, and reports WHY it has no value:
 * "unavailable" (its source failed) is different from "not-tracked" (source fine, nothing recorded) and from a
 * real 0. Pure and unit-tested.
 */
import { overdueAcross } from "./monitoringView.ts";
import { summarize, type Now } from "./workflowState.ts";
import type { Section } from "../types/student-overview.ts";
import type { StudentProject } from "../types/student-application.ts";
import type { StudentMeeting } from "../types/student-workflow.ts";

export type KpiState = "ok" | "unavailable" | "not-tracked";

export interface Kpi {
  id: "active-projects" | "pending-reviews" | "upcoming-meetings" | "overdue-milestones";
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
const AWAITING = ["SUBMITTED", "UNDER_REVIEW"];

export function computeKpis(
  input: { projects: Section<StudentProject[]>; meetings: Section<StudentMeeting[]> },
  now: Now,
): Kpi[] {
  const { projects, meetings } = input;

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
      "pending-reviews", "Pending Reviews",
      "Applications currently waiting for a reviewer (submitted or under review).",
      "/workspace/student/journey",
      (p) => p.filter((x) => AWAITING.includes(x.reviewStatus)).length,
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
    fromProjects(
      "overdue-milestones", "Overdue Milestones",
      "Milestones past their target date and not completed, across projects that have milestones. Not tracked when no project has any.",
      "/workspace/student/journey",
      (p) => overdueAcross(p.map((x) => x.milestones)),
    ),
  ];
}
