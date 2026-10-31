import { proxyToAgent } from "@/lib/agentProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";

/** GET /api/applications - the signed-in student's own applications. */
export async function GET() {
  return proxyToAgent({
    path: "/api/applications/",
    permissions: ["view_applications"],
    roles: STUDENT_READ_ROLES,
    tag: "Applications API",
  });
}
