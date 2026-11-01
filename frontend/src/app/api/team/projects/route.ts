import { proxyToBackend } from "@/lib/backendProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** GET /api/team/projects - projects the signed-in student joined through an accepted invitation */
export async function GET() {
  return proxyToBackend({ path: "/api/team/projects", roles: STUDENT_WRITE_ROLES, tag: "Team Projects API" });
}
