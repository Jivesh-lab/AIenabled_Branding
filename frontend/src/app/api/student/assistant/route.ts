import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchAgent } from "@/lib/agentProxy";
import { STUDENT_WRITE_ROLES, authorize } from "@/lib/apiPolicy";
import { answerFor, OUT_OF_SCOPE_ANSWER, isOutOfScope, type AssistantContext } from "@/lib/assistantFacts";
import { buildJourney } from "@/lib/journey";
import { getMentorInfo } from "@/lib/mentorAllocation";
import { loadStudentOverview } from "@/lib/studentOverview";
import { istNow } from "@/lib/workflowState";
import type { ApplicationDetail, MilestonesResponse } from "@/types/student-application";

/**
 * Student assistant.
 *
 *  GET  -> the signed-in student's own projects (for the project picker).
 *  POST -> { message, projectId? }: answers from that student's OWN saved records.
 *
 * Safety model: this handler never takes a student id from the request. Every record is loaded through the same
 * student-scoped sources the portal pages use (each enforces ownership with the session), so another student's
 * data is never even loaded; a projectId that is not in the caller's own list is rejected. The AI step receives
 * only the already-selected verified facts and can only phrase suggestions; nothing here writes anywhere.
 */
const MAX_MESSAGE = 500;

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = authorize(session?.user, STUDENT_WRITE_ROLES);
  if (denied) return NextResponse.json({ message: denied.message }, { status: denied.status });

  const projects = await fetchAgent<{ projects: { id: string; name: string; reviewStatus: string }[] }>({
    path: "/api/applications/", permissions: ["view_applications"], roles: STUDENT_WRITE_ROLES, tag: "Assistant Projects",
  });
  if (!projects.ok) return NextResponse.json({ message: projects.message }, { status: projects.kind === "unauthenticated" ? 401 : 503 });
  return NextResponse.json({ projects: projects.data.projects.map((p) => ({ id: p.id, name: p.name, status: p.reviewStatus })) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = authorize(session?.user, STUDENT_WRITE_ROLES);
  if (denied) return NextResponse.json({ message: denied.message }, { status: denied.status });

  const body = (await req.json().catch(() => null)) as { message?: unknown; projectId?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ message: "Type a question first." }, { status: 400 });
  if (message.length > MAX_MESSAGE) return NextResponse.json({ message: `Keep your question under ${MAX_MESSAGE} characters.` }, { status: 400 });

  // A courtesy refusal. The real guarantee is below: only this student's records are ever loaded.
  if (isOutOfScope(message)) {
    return NextResponse.json({ outOfScope: true, answer: OUT_OF_SCOPE_ANSWER, verified: [], unavailable: [], links: [], guidance: null });
  }

  const overview = await loadStudentOverview();
  if (!overview.projects.ok) {
    return NextResponse.json({ message: `Your projects could not be loaded, so I can't answer from your records. ${overview.projects.message}` }, { status: 503 });
  }
  const projects = overview.projects.data;
  if (projects.length === 0) {
    return NextResponse.json({
      noProjects: true, answer: "You have no saved projects yet, so there are no records to answer from.", verified: [], unavailable: [],
      links: [{ label: "Submit an idea", href: "/workspace/student/submit" }], guidance: null,
    });
  }

  const requested = typeof body?.projectId === "string" ? body.projectId : null;
  const project = requested ? projects.find((p) => p.id === requested) : (projects.find((p) => p.reviewStatus !== "REJECTED") ?? projects[0]);
  if (!project) return NextResponse.json({ message: "That project is not one of yours." }, { status: 404 });

  const approved = project.reviewStatus === "APPROVED";
  const [detail, milestones, mentor] = await Promise.all([
    fetchAgent<ApplicationDetail>({ path: `/api/applications/${encodeURIComponent(project.id)}`, permissions: ["view_applications"], roles: STUDENT_WRITE_ROLES, tag: "Assistant Detail" }),
    approved
      ? fetchAgent<MilestonesResponse>({ path: `/api/applications/${encodeURIComponent(project.id)}/milestones`, permissions: ["view_applications"], roles: STUDENT_WRITE_ROLES, tag: "Assistant Milestones" })
      : Promise.resolve(null),
    overview.mentors[project.id] ? Promise.resolve(overview.mentors[project.id]) : getMentorInfo(project.id, project.reviewStatus),
  ]);

  const now = istNow();
  const tasks = overview.tasks.ok ? overview.tasks.data : null;
  const meetings = overview.meetings.ok ? overview.meetings.data : null;
  const ctx: AssistantContext = {
    project,
    detail: detail.ok ? detail.data : null,
    journey: buildJourney({ project, mentor, tasks, meetings, monitoring: null, now }),
    mentor,
    tasks,
    meetings,
    milestones: milestones && milestones.ok ? milestones.data : null,
    now,
  };

  const record = answerFor(ctx, message);

  // AI suggestion step: optional, labelled, and allowed to fail without affecting the verified part.
  let guidance: { text: string; source: "ai" } | null = null;
  let guidanceNote: string | null = null;
  if (record.facts.length > 0) {
    const ai = await fetchAgent<{ guidance: string }>({
      path: "/api/assistant/guidance",
      method: "POST",
      body: { question: message, projectName: project.name, facts: record.facts.map((f) => f.text.slice(0, 400)) },
      permissions: ["view_applications"],
      roles: STUDENT_WRITE_ROLES,
      tag: "Assistant Guidance",
      timeoutMs: 25_000,
    });
    if (ai.ok && typeof ai.data.guidance === "string" && ai.data.guidance.trim()) guidance = { text: ai.data.guidance.trim(), source: "ai" };
    else guidanceNote = "AI suggestions are unavailable right now. The facts above come straight from your records.";
  }

  return NextResponse.json({
    projectId: project.id,
    projectName: project.name,
    topics: record.topics,
    verified: record.facts.map((f) => ({ text: f.text, href: f.href ?? null })),
    unavailable: record.unavailable,
    links: record.links,
    guidance,
    guidanceNote,
    disclaimer: "Facts come from your saved records. Suggestions are AI-written and are not official decisions.",
  });
}
