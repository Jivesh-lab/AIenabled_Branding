import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

/**
 * Catch-all proxy for /api/faculty/[...path]
 * Forwards GET/POST/PUT/DELETE to Express backend at :5000/api/faculty/[...path]
 * Passes cookies so the JWT auth middleware on Express can validate the session.
 */
async function proxyRequest(req: NextRequest, path: string) {
  const backendTarget = `${BACKEND_URL}/api/faculty/${path}`;
  const cookie = req.headers.get("cookie") || "";

  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      cookie,
    },
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      const body = await req.text();
      if (body) init.body = body;
    } catch {
      // no body
    }
  }

  try {
    const res = await fetch(backendTarget, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error(`[Faculty Proxy] Error proxying to ${backendTarget}:`, err.message);
    return NextResponse.json(
      { success: false, message: "Backend unavailable. Make sure the Express server is running on port 5000." },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"));
}
