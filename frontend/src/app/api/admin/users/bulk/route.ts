import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBackendToken } from "@/lib/backendToken";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const body = await req.json();
    const token = await createBackendToken(session.user.id, session.user.role);

    const backendRes = await fetch(`${BACKEND_URL}/api/admin/users/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
