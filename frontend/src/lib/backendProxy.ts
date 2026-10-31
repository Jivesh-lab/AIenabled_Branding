import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBackendToken } from "@/lib/backendToken";
import type { AgentResult } from "@/lib/agentProxy";
import { authorize, classifyStatus, classifyThrown, errorBody, failureMessage, type Role } from "@/lib/apiPolicy";

/**
 * The student portal's door to the Express backend (meetings, tasks, mentoring). Authenticates the NextAuth
 * session, enforces the allowed roles, signs a short-lived backend token for THAT user, and shapes failures
 * the same way agentProxy does. Server-side only: the browser never sees the backend token or URL.
 */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

interface BackendCall {
  path: string; // e.g. "/api/student/meetings"
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  roles: readonly Role[];
  tag: string;
}

async function callBackend(call: BackendCall) {
  const session = await getServerSession(authOptions);
  const denied = authorize(session?.user, call.roles);
  if (denied || !session?.user) return { denied: denied ?? { status: 401 as const, message: "Unauthorized" } };

  const token = await createBackendToken(session.user.id, session.user.role);
  const response = await fetch(`${BACKEND_URL}${call.path}`, {
    method: call.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(call.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: call.body !== undefined ? JSON.stringify(call.body) : undefined,
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  return { response, data, role: session.user.role };
}

/** For route handlers. Passes the backend's `{ success, data }` body through on success. */
export async function proxyToBackend(call: BackendCall): Promise<NextResponse> {
  try {
    const result = await callBackend(call);
    if ("denied" in result && result.denied) {
      return NextResponse.json({ message: result.denied.message }, { status: result.denied.status });
    }
    const { response, data } = result as { response: Response; data: unknown };
    if (!response.ok) return NextResponse.json(errorBody(response.status, data), { status: response.status });
    if (data === null) return NextResponse.json({ message: "The service returned an unreadable response." }, { status: 502 });
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[${call.tag}] Error:`, error);
    const failure = classifyThrown(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

/**
 * For server components. Returns the unwrapped `data`. Non-student viewers (admins inspecting the student
 * workspace) own no records, so they get `emptyValue` without any backend call.
 */
export async function fetchBackend<T>(call: Omit<BackendCall, "method" | "body">, emptyValue: T): Promise<AgentResult<T>> {
  try {
    const result = await callBackend(call);
    if ("denied" in result && result.denied) {
      const kind = classifyStatus(result.denied.status);
      return { ok: false, kind, status: result.denied.status, message: failureMessage(kind, null) };
    }
    const { response, data, role } = result as { response: Response; data: unknown; role: string };
    if (role !== "student") return { ok: true, data: emptyValue };
    if (!response.ok) {
      const kind = classifyStatus(response.status);
      return { ok: false, kind, status: response.status, message: failureMessage(kind, data) };
    }
    const body = data as { success?: boolean; data?: T } | null;
    if (!body || body.success !== true || body.data === undefined) {
      return { ok: false, kind: "unavailable", status: 502, message: "The service returned an unreadable response." };
    }
    return { ok: true, data: body.data };
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[${call.tag}] Error:`, error);
    const failure = classifyThrown(error);
    return { ok: false, kind: "unavailable", status: failure.status, message: failure.message };
  }
}
