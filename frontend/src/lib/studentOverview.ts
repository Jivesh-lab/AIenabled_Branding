import { fetchAgent } from "@/lib/agentProxy";
import { fetchBackend } from "@/lib/backendProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";
import { getMentorInfoForProjects } from "@/lib/mentorAllocation";
import { getProjectMonitoring } from "@/lib/projectMonitoring";
import type { MonitoringResponse, ProjectsResponse } from "@/types/student-application";
import type { StudentOverview } from "@/types/student-overview";
import type { StudentMeeting, StudentTask } from "@/types/student-workflow";

/**
 * Loads every student-scoped source once, in parallel, each succeeding or failing independently. This is the only
 * place the Journey page and the dashboard get their data, so they cannot drift apart. Server-side only; each
 * underlying call enforces the signed-in student's ownership.
 */
export async function loadStudentOverview(opts: { withMonitoring?: boolean } = {}): Promise<StudentOverview> {
  const [projects, tasks, meetings] = await Promise.all([
    fetchAgent<ProjectsResponse>({ path: "/api/applications/", permissions: ["view_applications"], roles: STUDENT_READ_ROLES, tag: "Overview Projects" }),
    fetchBackend<StudentTask[]>({ path: "/api/student/tasks", roles: STUDENT_READ_ROLES, tag: "Overview Tasks" }, []),
    fetchBackend<StudentMeeting[]>({ path: "/api/student/meetings", roles: STUDENT_READ_ROLES, tag: "Overview Meetings" }, []),
  ]);

  const projectList = projects.ok ? projects.data.projects : [];
  const mentors = await getMentorInfoForProjects(projectList);

  const monitoring: StudentOverview["monitoring"] = {};
  if (opts.withMonitoring) {
    const taskData = tasks.ok ? tasks.data : null;
    await Promise.all(
      projectList
        .filter((p) => p.reviewStatus === "APPROVED")
        .map(async (p) => {
          const result = await getProjectMonitoring(p.id, taskData);
          monitoring[p.id] = result.ok ? (result.data as MonitoringResponse) : "unavailable";
        }),
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    projects: projects.ok ? { ok: true, data: projects.data.projects } : projects,
    tasks,
    meetings,
    mentors,
    monitoring,
  };
}
