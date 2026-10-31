import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** GET /api/student/tasks - tasks assigned to the signed-in student on their own projects. */
export async function GET() {
  return proxyToBackend({ path: "/api/student/tasks", roles: STUDENT_WRITE_ROLES, tag: "Student Tasks API" });
}
