import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** DELETE /api/team/:projectId/invite/:id - founder: revoke an invitation or membership */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string; id: string }> }) {
  const { projectId, id } = await params;
  return proxyToBackend({
    path: `/api/team/${encodeURIComponent(projectId)}/invite/${encodeURIComponent(id)}`,
    method: "DELETE",
    roles: STUDENT_WRITE_ROLES,
    tag: "Team Revoke API",
  });
}
