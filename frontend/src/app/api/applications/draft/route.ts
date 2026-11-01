import { NextRequest, NextResponse } from "next/server";
import { proxyToAgent } from "@/lib/agentProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** POST /api/applications/draft - create or update the student's server-side draft. Students only. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });

  return proxyToAgent({
    path: "/api/applications/draft",
    method: "POST",
    body,
    permissions: ["submit_application"],
    roles: STUDENT_WRITE_ROLES,
    tag: "Draft API",
  });
}
