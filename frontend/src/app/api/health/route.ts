import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return NextResponse.json({ ok: true, backend: "connected" });
    }
    return NextResponse.json({ ok: false, backend: "unhealthy" }, { status: 502 });
  } catch {
    return NextResponse.json({ ok: false, backend: "unreachable" }, { status: 503 });
  }
}
