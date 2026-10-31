import { fetchAgent } from "@/lib/agentProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";
import type { MonitoringResponse } from "@/types/student-application";
import type { StudentTask } from "@/types/student-workflow";

export type ProjectMonitoring =
  | { ok: true; data: MonitoringResponse }
  | { ok: false; message: string; canRetry: boolean };

/**
 * Runs the monitoring check for one approved project. It needs the student's task counts; if the tasks could not
 * be loaded the check is NOT run on partial data - it reports itself unavailable instead of describing half the
 * picture. Server-side only.
 */
export async function getProjectMonitoring(projectId: string, tasks: StudentTask[] | null): Promise<ProjectMonitoring> {
  if (tasks === null) {
    return { ok: false, message: "Your tasks could not be loaded, so the check was not run.", canRetry: true };
  }
  const mine = tasks.filter((t) => t.projectId === projectId);
  const check = await fetchAgent<MonitoringResponse>({
    path: `/api/applications/${encodeURIComponent(projectId)}/monitoring`,
    method: "POST",
    body: mine.length > 0 ? { tasksTotal: mine.length, tasksCompleted: mine.filter((t) => t.status === "Completed").length } : {},
    permissions: ["view_applications"],
    roles: STUDENT_READ_ROLES,
    tag: "Project Monitoring",
  });
  return check.ok ? { ok: true, data: check.data } : { ok: false, message: check.message, canRetry: check.kind === "unavailable" };
}
