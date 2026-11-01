import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Only admins or specific roles can access
    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const token = await createInternalToken(session.user, ["review_applications"]);

    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/queue`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[Queue API] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
