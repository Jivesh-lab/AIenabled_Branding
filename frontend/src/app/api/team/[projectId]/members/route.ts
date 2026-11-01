import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** GET /api/team/:projectId/members - founder: list all memberships for a project */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return proxyToBackend({
    path: `/api/team/${encodeURIComponent(projectId)}/members`,
    roles: STUDENT_WRITE_ROLES,
    tag: "Team Members API",
  });
}
