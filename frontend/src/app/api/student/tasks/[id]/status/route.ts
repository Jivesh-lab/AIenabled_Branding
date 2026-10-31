import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** PUT /api/student/tasks/:id/status - move one of the student's own tasks forward. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  return proxyToBackend({
    path: `/api/student/tasks/${encodeURIComponent(id)}/status`,
    method: "PUT",
    body,
    roles: STUDENT_WRITE_ROLES,
    tag: "Task Status API",
  });
}
