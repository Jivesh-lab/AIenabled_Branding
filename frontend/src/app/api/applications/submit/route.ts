import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_JWT_SECRET = process.env.INTERNAL_JWT_SECRET;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the NextAuth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!INTERNAL_JWT_SECRET) {
      console.error("[Submit API] INTERNAL_JWT_SECRET is missing");
      return NextResponse.json({ message: "Internal server configuration error" }, { status: 500 });
    }

    const payload = await req.json();

    // 2. Generate a short-lived internal JWT
    const secret = new TextEncoder().encode(INTERNAL_JWT_SECRET);
    const token = await new SignJWT({
      sub: session.user.id,
      role: session.user.role,
      permissions: ["submit_application"]
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("next-server")
      .setAudience("fastapi-internal")
      .setExpirationTime("1m") // strictly 60 seconds
      .sign(secret);

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
