/**
 * Which projects the dashboard previews. The dashboard is a summary, not the full list: it shows the projects that
 * most need the student's attention first, and "View all" opens the complete My Projects page. Nothing is hidden
 * from the student, only ordered and capped here. Pure and unit-tested.
 *
 * Attention order (lower = earlier):
 *   0 revision requested   - the student has to act
 *   1 draft                - unfinished submission
 *   2 approved with overdue milestones
 *   3 submitted / under review
 *   4 approved, nothing overdue
 *   5 rejected
 * Ties: most recently updated first, then name.
 */
import type { StudentProject } from "../types/student-application.ts";

export const DASHBOARD_PROJECT_LIMIT = 4;

export function attentionRank(project: StudentProject): number {
  switch (project.reviewStatus) {
    case "REVISION_REQUESTED":
      return 0;
    case "DRAFT":
      return 1;
    case "APPROVED":
      return project.milestones.overdue > 0 ? 2 : 4;
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return 3;
    default:
      return 5; // REJECTED
  }
}

export function rankProjects(projects: StudentProject[]): StudentProject[] {
  return [...projects].sort(
    (a, b) =>
      attentionRank(a) - attentionRank(b) ||
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") ||
      a.name.localeCompare(b.name),
  );
}

export function dashboardPreview(projects: StudentProject[], limit = DASHBOARD_PROJECT_LIMIT): { shown: StudentProject[]; total: number; hidden: number } {
  const ranked = rankProjects(projects);
  const shown = ranked.slice(0, limit);
  return { shown, total: projects.length, hidden: projects.length - shown.length };
}
