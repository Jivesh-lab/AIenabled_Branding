import { NextRequest } from "next/server";
import { proxyToAgent } from "@/lib/agentProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";

/** GET /api/applications/:id - one application; agent-service enforces that it belongs to the caller. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToAgent({
    path: `/api/applications/${encodeURIComponent(id)}`,
    permissions: ["view_applications"],
    roles: STUDENT_READ_ROLES,
    tag: "Single Application API",
  });
}
