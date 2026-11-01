import { NextRequest, NextResponse } from "next/server";
import { proxyToAgent } from "@/lib/agentProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** PATCH /api/applications/:id/milestones/:milestoneId - update status / completion. Students only. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const { id, milestoneId } = await params;
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  return proxyToAgent({
    path: `/api/applications/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}`,
    method: "PATCH",
    body,
    permissions: ["submit_application"],
    roles: STUDENT_WRITE_ROLES,
    tag: "Milestone Update API",
  });
}
