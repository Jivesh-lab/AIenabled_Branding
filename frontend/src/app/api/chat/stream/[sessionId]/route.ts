import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !user.role) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const upstreamUrl = new URL(`${AGENT_SERVICE_URL}/api/chat/stream/${encodeURIComponent(resolvedParams.sessionId)}`);
  for (const key of ["message", "startup_id"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) upstreamUrl.searchParams.set(key, value);
  }

  try {
    const token = await createInternalToken(user, []);
    const response = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      const body = await response.text();
      return new NextResponse(body || "Agent service unavailable", {
        status: response.status || 502,
        headers: { "Content-Type": response.headers.get("content-type") || "text/plain" },
      });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Chat stream] Error:", error);
    return NextResponse.json({ message: "The assistant is unavailable." }, { status: 502 });
  }
}
