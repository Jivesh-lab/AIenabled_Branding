import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_JWT_SECRET = process.env.INTERNAL_JWT_SECRET || "test_internal_secret_key_123";

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

    if (!INTERNAL_JWT_SECRET) {
      return NextResponse.json({ message: "Internal server configuration error" }, { status: 500 });
    }

    const secret = new TextEncoder().encode(INTERNAL_JWT_SECRET);
    const token = await new SignJWT({
      sub: session.user.id,
      role: session.user.role,
      permissions: ["view_applications"]
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("next-server")
      .setAudience("fastapi-internal")
      .setExpirationTime("1m")
      .sign(secret);

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

