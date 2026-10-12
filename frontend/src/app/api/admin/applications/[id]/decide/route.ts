import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_JWT_SECRET = process.env.INTERNAL_JWT_SECRET;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Only admins or specific roles can access
    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!INTERNAL_JWT_SECRET) {
      return NextResponse.json({ message: "Internal server configuration error" }, { status: 500 });
    }

    const payload = await req.json();

    const secret = new TextEncoder().encode(INTERNAL_JWT_SECRET);
    const token = await new SignJWT({
      sub: session.user.id,
      role: session.user.role,
      permissions: ["review_applications"]
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("next-server")
      .setAudience("fastapi-internal")
      .setExpirationTime("1m")
      .sign(secret);

    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/${resolvedParams.id}/decide`, {
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

    // Task 1: If approved, synchronize permitted public fields to MongoDB StartupProfile
    if (payload.decision && String(payload.decision).toLowerCase() === "approved") {
      try {
        const appRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/${resolvedParams.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (appRes.ok) {
          const appDetails = await appRes.json();
          const expressBackendUrl = process.env.BACKEND_URL || "http://localhost:5000";
          const { createBackendToken } = await import("@/lib/backendToken");
          const backendToken = await createBackendToken(session.user.id, session.user.role);

          await fetch(`${expressBackendUrl}/api/admin/applications/${resolvedParams.id}/sync-startup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${backendToken}`,
            },
            body: JSON.stringify({
              applicationId: resolvedParams.id,
              startup: appDetails.startup,
              applicantId: appDetails.applicantId || session.user.id,
              isApproved: true,
            }),
          });
        }
      } catch (syncErr) {
        console.error("[Decide API] Non-fatal sync to MongoDB failed:", syncErr);
      }
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[Decide API] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
