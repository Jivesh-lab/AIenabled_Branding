import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";
import { createBackendToken } from "@/lib/backendToken";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !user.role) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const upstreamUrl = new URL(`${AGENT_SERVICE_URL}/api/chat/stream/${encodeURIComponent(resolvedParams.sessionId)}`);
  for (const key of ["message", "startup_id"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) upstreamUrl.searchParams.set(key, value);
  }

    const context = await loadAuthorizedContext(user.id, user.role);
    if (Object.keys(context).length > 0) {
      upstreamUrl.searchParams.set("context", JSON.stringify(context));
    }

  try {
    const token = await createInternalToken(user, []);
    const response = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      const body = await response.text();
      return new NextResponse(body || "Agent service unavailable", {
        status: response.status || 502,
        headers: { "Content-Type": response.headers.get("content-type") || "text/plain" },
      });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Chat stream] Error:", error);
    return NextResponse.json({ message: "The assistant is unavailable." }, { status: 502 });
  }
}

async function loadAuthorizedContext(userId: string, role: string) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  try {
    const token = await createBackendToken(userId, role);
    const headers = { Authorization: `Bearer ${token}` };
    const context: Record<string, unknown> = { role, userId };

    const notifRes = await fetch(`${backendUrl}/api/notifications?limit=10`, { headers, cache: "no-store" }).catch(() => null);
    if (notifRes?.ok) {
      const json = await notifRes.json();
      context.notifications = Array.isArray(json.data) ? json.data.slice(0, 5).map((i: any) => ({ title: i.title, message: i.message })) : [];
    }

    if (role === "student") {
      const [tasksRes, meetsRes] = await Promise.all([
        fetch(`${backendUrl}/api/student/tasks`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${backendUrl}/api/student/meetings`, { headers, cache: "no-store" }).catch(() => null),
      ]);
      if (tasksRes?.ok) {
        const json = await tasksRes.json();
        context.tasks = json.data;
      }
      if (meetsRes?.ok) {
        const json = await meetsRes.json();
        context.meetings = json.data;
      }
    } else if (role === "faculty") {
      const [projectsRes, overviewRes] = await Promise.all([
        fetch(`${backendUrl}/api/faculty/projects`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${backendUrl}/api/faculty/monitoring/overview`, { headers, cache: "no-store" }).catch(() => null),
      ]);
      if (projectsRes?.ok) {
        const json = await projectsRes.json();
        context.assignedStartups = Array.isArray(json.data) ? json.data.map((p: any) => ({ id: p.id, title: p.title, health: p.health, progress: p.progress, mentor: p.allocatedMentorName, stage: p.stage })) : [];
      }
      if (overviewRes?.ok) {
        const json = await overviewRes.json();
        context.monitoringSummary = json.data || json;
      }
    } else if (role === "admin" || role === "super_admin") {
      const [eventsRes, startupsRes] = await Promise.all([
        fetch(`${backendUrl}/api/faculty/agent-events?status=all`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${backendUrl}/api/faculty/mentor-matching/startups`, { headers, cache: "no-store" }).catch(() => null),
      ]);
      if (eventsRes?.ok) {
        const json = await eventsRes.json();
        const evts = Array.isArray(json.data) ? json.data : [];
        context.agentEvents = evts.slice(0, 10).map((e: any) => ({ eventType: e.eventType, status: e.status, aggregateId: e.aggregateId, attempts: e.attempts, lastError: e.lastError }));
        context.failedAgentEvents = evts.filter((e: any) => e.status === "failed" || e.status === "dead_letter");
      }
      if (startupsRes?.ok) {
        const json = await startupsRes.json();
        const list = Array.isArray(json.data) ? json.data : [];
        context.awaitingMentorAllocation = list.filter((s: any) => s.mentorStatus === "Needs Mentor" || s.mentorStatus === "Ready for Matching");
      }
    } else if (role === "investor") {
      const introRes = await fetch(`${backendUrl}/api/investors/introductions`, { headers, cache: "no-store" }).catch(() => null);
      if (introRes?.ok) {
        const json = await introRes.json();
        context.introductions = json.data;
      }
    } else if (role === "mentor") {
      const [tasksRes, meetsRes] = await Promise.all([
        fetch(`${backendUrl}/api/faculty/tasks`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${backendUrl}/api/faculty/meetings`, { headers, cache: "no-store" }).catch(() => null),
      ]);
      if (tasksRes?.ok) {
        const json = await tasksRes.json();
        context.mentorTasks = json.data;
      }
      if (meetsRes?.ok) {
        const json = await meetsRes.json();
        context.mentorMeetings = json.data;
      }
    }
    return context;
  } catch (error) {
    console.error("[Chat context] Error:", error);
    return { role, userId };
  }
}
