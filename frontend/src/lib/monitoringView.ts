/**
 * How monitoring and milestone progress are worded and linked on student pages. Pure and unit-tested.
 * The rules that matter: missing data is never worded as health, a failed check is never worded as a status,
 * and a recommendation is never worded as an official decision.
 */
import type { MilestoneSummary, MonitoringSignal } from "../types/student-application.ts";

export type HealthTone = "success" | "attention" | "danger" | "neutral";

export interface HealthView {
  label: string;
  tone: HealthTone;
  description: string;
}

export function describeHealth(health: string): HealthView {
  switch (health) {
    case "On Track":
      return { label: "On track", tone: "success", description: "Based on the milestones and tasks recorded so far." };
    case "Needs Attention":
      return { label: "Needs attention", tone: "attention", description: "Some recorded milestones or tasks are behind." };
    case "At Risk":
      return { label: "At risk", tone: "danger", description: "Several recorded items are overdue." };
    default:
      // "No Data" and anything unrecognised: say we cannot tell, never "healthy".
      return { label: "Not enough data", tone: "neutral", description: "There are no recorded milestones or tasks to assess yet." };
  }
}

export const MONITORING_UNAVAILABLE: HealthView = {
  label: "Check unavailable",
  tone: "neutral",
  description: "The monitoring check could not run. This says nothing about how your project is doing.",
};

export function actionForSignal(signal: MonitoringSignal, projectId: string): { href: string; label: string } {
  const id = encodeURIComponent(projectId);
  switch (signal.target) {
    case "milestones":
      return { href: `/workspace/student/projects/${id}#milestones`, label: "Update milestones" };
    case "tasks":
      return { href: `/workspace/student/projects/${id}#tasks`, label: "Review tasks" };
    default:
      return { href: "/workspace/student/meetings", label: "Request a check-in meeting" };
  }
}

/** One-line milestone progress. "No milestones recorded" is deliberately different from "0%". */
export function progressText(summary: MilestoneSummary): { tracked: boolean; text: string } {
  if (summary.total === 0 || summary.progress === null) return { tracked: false, text: "No milestones recorded" };
  const overdue = summary.overdue > 0 ? ` · ${summary.overdue} overdue` : "";
  return { tracked: true, text: `${summary.completed} of ${summary.total} done${overdue}` };
}

/** Total overdue milestones across projects, or null when no project tracks milestones at all. */
export function overdueAcross(summaries: MilestoneSummary[]): number | null {
  const tracked = summaries.filter((s) => s.total > 0);
  return tracked.length === 0 ? null : tracked.reduce((n, s) => n + s.overdue, 0);
}
