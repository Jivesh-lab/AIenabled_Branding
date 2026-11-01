import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBackendToken } from "@/lib/backendToken";

/**
 * Authenticated door from the browser to the Express backend: /api/backend/<path> -> BACKEND_URL/api/<path>.
 *
 * The browser never holds a backend credential. This handler reads the NextAuth session, signs a short-lived
 * token for THAT user and forwards the request, so the backend always sees the real signed-in identity
 * (there is no implicit "dev admin" any more). Authorization stays on the backend; it is the only place
 * that decides what a role may do.
 */
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

// The credential-issuing endpoints are not reachable through this door.
const BLOCKED_PREFIXES = ["auth/"];

async function forward(req: NextRequest, segments: string[]) {
  const path = segments.join("/");
  if (BLOCKED_PREFIXES.some((prefix) => `${path}/`.startsWith(prefix))) {
    return NextResponse.json({ success: false, message: "Not available." }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ success: false, message: "Please sign in to continue." }, { status: 401 });
  }

  const token = await createBackendToken(session.user.id, session.user.role);
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const init: RequestInit = { method: req.method, headers, cache: "no-store", redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.text().catch(() => "");
    if (body) init.body = body;
  }

  try {
    const target = `${BACKEND_URL}/api/${path}${req.nextUrl.search}`;
    const upstream = await fetch(target, init);
    const redirect = upstream.headers.get("location");
    if (upstream.status >= 300 && upstream.status < 400 && redirect) {
      // OAuth-style hand-offs (e.g. connecting a calendar) send the browser on to the provider.
      return NextResponse.redirect(redirect, 302);
    }
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("content-type", upstreamType);
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) responseHeaders.set("content-disposition", disposition);
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error(`[Backend Proxy] ${req.method} /api/${path} failed:`, (error as Error).message);
    return NextResponse.json(
      { success: false, message: "The incubation service is not reachable right now. Please try again shortly." },
      { status: 503 }
    );
  }
}

type Context = { params: Promise<{ path: string[] }> };
const handler = async (req: NextRequest, { params }: Context) => forward(req, (await params).path);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
