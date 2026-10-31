import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchAgent } from "@/lib/agentProxy";
import { STUDENT_READ_ROLES, authorize } from "@/lib/apiPolicy";
import { getMentorInfoForProjects } from "@/lib/mentorAllocation";
import type { ProjectsResponse } from "@/types/student-application";

/**
 * GET /api/student/mentors - mentor matching info for each of the signed-in student's projects, keyed by
 * application id. Projects come from agent-service (so only the caller's own applications are ever
 * considered); each entry is either data or an explicit failure.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = authorize(session?.user, STUDENT_READ_ROLES);
  if (denied) return NextResponse.json({ message: denied.message }, { status: denied.status });

  const projects = await fetchAgent<ProjectsResponse>({
    path: "/api/applications/",
    permissions: ["view_applications"],
    roles: STUDENT_READ_ROLES,
    tag: "Mentors API",
  });
  if (!projects.ok) {
    const status = projects.kind === "unauthenticated" ? 401 : projects.kind === "forbidden" ? 403 : 503;
    return NextResponse.json({ message: projects.message }, { status });
  }

  // Admins inspecting the student workspace have no projects of their own, so this stays empty for them.
  return NextResponse.json({ mentors: await getMentorInfoForProjects(projects.data.projects) });
}
