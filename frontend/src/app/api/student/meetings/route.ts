import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** GET /api/student/meetings - meetings of the signed-in student's own projects. */
export async function GET() {
  return proxyToBackend({ path: "/api/student/meetings", roles: STUDENT_WRITE_ROLES, tag: "Student Meetings API" });
}
