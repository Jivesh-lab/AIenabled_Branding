import { NextRequest, NextResponse } from "next/server";
import { proxyToAgent } from "@/lib/agentProxy";
import { STUDENT_WRITE_ROLES } from "@/lib/apiPolicy";

/** POST /api/applications/submit - submit (or resubmit after revision) an application. Students only. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });

  return proxyToAgent({
    path: "/api/applications/submit",
    method: "POST",
    body,
    permissions: ["submit_application"],
    roles: STUDENT_WRITE_ROLES,
    tag: "Submit API",
  });
}
