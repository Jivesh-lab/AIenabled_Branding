import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { STUDENT_READ_ROLES, authorize } from "@/lib/apiPolicy";
import { loadStudentOverview } from "@/lib/studentOverview";

/**
 * GET /api/student/overview - the signed-in student's projects, tasks, meetings and mentor info in one call.
 * Each section is `{ ok: true, data }` or `{ ok: false, message }`; a failing source never fails the request.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = authorize(session?.user, STUDENT_READ_ROLES);
  if (denied) return NextResponse.json({ message: denied.message }, { status: denied.status });
  return NextResponse.json(await loadStudentOverview());
}
