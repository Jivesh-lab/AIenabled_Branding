import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBackendToken } from "@/lib/backendToken";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const token = await createBackendToken(session.user.id, session.user.role);
    const response = await fetch(`${BACKEND_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({ message: "Invalid notification response" }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json({ message: "Notifications are unavailable" }, { status: 502 });
  }
}
