import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = await createInternalToken(session.user, ["view_applications"]);

    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });

    const data = await backendRes.json();
    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("[Single Application API] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

