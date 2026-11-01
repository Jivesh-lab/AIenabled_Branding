import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const token = await createInternalToken(session.user, ["review_applications"]);
    const response = await fetch(`${AGENT_SERVICE_URL}/api/applications/${encodeURIComponent(id)}/assessment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({ message: "Invalid application-service response" }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Application assessment] Error:", error);
    return NextResponse.json({ message: "Application assessment is unavailable" }, { status: 502 });
  }
}
