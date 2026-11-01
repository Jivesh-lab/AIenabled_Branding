import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** POST /api/student/meeting-requests - ask for a meeting on one of the student's own projects. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  return proxyToBackend({ path: "/api/student/meeting-requests", method: "POST", body, roles: STUDENT_WRITE_ROLES, tag: "Meeting Request API" });
}
