import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** POST /api/team/:projectId/invite - founder: invite (or resend to) a teammate */
export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  return proxyToBackend({
    path: `/api/team/${encodeURIComponent(projectId)}/invite`,
    method: "POST",
    body,
    roles: STUDENT_WRITE_ROLES,
    tag: "Team Invite API",
  });
}
