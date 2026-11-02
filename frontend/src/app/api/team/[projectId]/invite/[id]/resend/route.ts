import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** POST /api/team/:projectId/invite/:id/resend - founder: issue a fresh link for a pending invitation */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ projectId: string; id: string }> }) {
  const { projectId, id } = await params;
  return proxyToBackend({
    path: `/api/team/${encodeURIComponent(projectId)}/invite/${encodeURIComponent(id)}/resend`,
    method: "POST",
    body: {},
    roles: STUDENT_WRITE_ROLES,
    tag: "Team Resend API",
  });
}
