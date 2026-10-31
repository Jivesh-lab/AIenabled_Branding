import { NextRequest, NextResponse } from "next/server";
import { proxyToAgent } from "@/lib/agentProxy";
import { STUDENT_READ_ROLES, STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** GET /api/applications/:id/milestones - the project's milestones and progress summary (owner only). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToAgent({
    path: `/api/applications/${encodeURIComponent(id)}/milestones`,
    permissions: ["view_applications"],
    roles: STUDENT_READ_ROLES,
    tag: "Milestones API",
  });
}

/** POST /api/applications/:id/milestones - add a milestone to an approved project. Students only. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  return proxyToAgent({
    path: `/api/applications/${encodeURIComponent(id)}/milestones`,
    method: "POST",
    body,
    permissions: ["submit_application"],
    roles: STUDENT_WRITE_ROLES,
    tag: "Milestones API",
  });
}
