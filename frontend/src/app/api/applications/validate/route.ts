import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL } from "@/lib/internalToken";
import { STUDENT_WRITE_ROLES, authorize, classifyThrown, errorBody } from "@/lib/apiPolicy";

/** POST /api/applications/validate - rule-based pre-submission check shown in the review step. Students only. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = authorize(session?.user, STUDENT_WRITE_ROLES);
    if (denied) return NextResponse.json({ message: denied.message }, { status: denied.status });

    const payload = await req.json().catch(() => undefined);
    if (payload === undefined) return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });

    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/agents/application/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data: unknown = await backendRes.json().catch(() => null);
    if (!backendRes.ok || data === null) {
      return NextResponse.json(errorBody(backendRes.ok ? 502 : backendRes.status, data), { status: backendRes.ok ? 502 : backendRes.status });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[Validate API] Error:", error);
    const failure = classifyThrown(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
