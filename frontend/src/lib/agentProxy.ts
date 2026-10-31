import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken, type InternalPermission } from "@/lib/internalToken";
import {
  authorize,
  classifyStatus,
  classifyThrown,
  errorBody,
  failureMessage,
  type FailureKind,
  type Role,
} from "@/lib/apiPolicy";

/**
 * The one way student routes and pages talk to agent-service. It authenticates the NextAuth
 * session, enforces the allowed roles, mints the short-lived internal token (the secret never
 * leaves the server), and turns every failure into the same shape. Server-side only.
 */

interface AgentCall {
  path: string; // e.g. "/api/applications/"
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  permissions: InternalPermission[];
  roles: readonly Role[];
  /** Label used in server logs. */
  tag: string;
  /** Abort the call after this long; a timeout is reported as "unavailable". */
  timeoutMs?: number;
}

async function callAgent(call: AgentCall) {
  const session = await getServerSession(authOptions);
  const denied = authorize(session?.user, call.roles);
  if (denied || !session?.user) return { denied: denied ?? { status: 401 as const, message: "Unauthorized" } };

  const token = await createInternalToken(session.user, call.permissions);
  const response = await fetch(`${AGENT_SERVICE_URL}${call.path}`, {
    method: call.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(call.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: call.body !== undefined ? JSON.stringify(call.body) : undefined,
    cache: "no-store",
    signal: call.timeoutMs ? AbortSignal.timeout(call.timeoutMs) : undefined,
  });
  const data: unknown = await response.json().catch(() => null);
  return { response, data };
}

/** For route handlers: forwards to agent-service and returns a ready NextResponse. */
export async function proxyToAgent(call: AgentCall): Promise<NextResponse> {
  try {
    const result = await callAgent(call);
    if ("denied" in result && result.denied) {
      return NextResponse.json({ message: result.denied.message }, { status: result.denied.status });
    }
    const { response, data } = result as { response: Response; data: unknown };
    if (!response.ok) return NextResponse.json(errorBody(response.status, data), { status: response.status });
    if (data === null) return NextResponse.json({ message: "The application service returned an unreadable response." }, { status: 502 });
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    // Next signals "this render is dynamic" (and redirects/not-found) by throwing; never swallow those.
    unstable_rethrow(error);
    console.error(`[${call.tag}] Error:`, error);
    const failure = classifyThrown(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export type AgentResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: FailureKind; status: number; message: string };

/** For server components: same call, but returns a typed result the page can render explicitly. */
export async function fetchAgent<T>(call: AgentCall): Promise<AgentResult<T>> {
  try {
    const result = await callAgent(call);
    if ("denied" in result && result.denied) {
      const kind = classifyStatus(result.denied.status);
      return { ok: false, kind, status: result.denied.status, message: failureMessage(kind, null) };
    }
    const { response, data } = result as { response: Response; data: unknown };
    if (!response.ok) {
      const kind = classifyStatus(response.status);
      return { ok: false, kind, status: response.status, message: failureMessage(kind, data) };
    }
    if (data === null) {
      return { ok: false, kind: "unavailable", status: 502, message: "The application service returned an unreadable response." };
    }
    return { ok: true, data: data as T };
  } catch (error) {
    // Next signals "this render is dynamic" (and redirects/not-found) by throwing; never swallow those.
    unstable_rethrow(error);
    console.error(`[${call.tag}] Error:`, error);
    const failure = classifyThrown(error);
    return { ok: false, kind: "unavailable", status: failure.status, message: failure.message };
  }
}
