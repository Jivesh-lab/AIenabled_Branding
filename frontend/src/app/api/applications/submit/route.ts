import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the NextAuth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();

    // 2. Generate a short-lived internal JWT
    const token = await createInternalToken(session.user, ["submit_application"]);

    // 3. Forward the submission to FastAPI
    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("[Submit API] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
