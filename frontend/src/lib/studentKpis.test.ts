import assert from "node:assert/strict";
import { test } from "node:test";
import { computeKpis } from "./studentKpis.ts";
import { journeysFor } from "./overviewJourneys.ts";
import type { MilestoneSummary, StudentProject } from "../types/student-application.ts";
import type { StudentOverview } from "../types/student-overview.ts";
import type { StudentMeeting } from "../types/student-workflow.ts";

const NOW = { date: "2026-11-04", time: "12:00" };
const none: MilestoneSummary = { total: 0, completed: 0, overdue: 0, inProgress: 0, upcoming: 0, progress: null };
const proj = (id: string, status: StudentProject["reviewStatus"], milestones: Partial<MilestoneSummary> = {}): StudentProject => ({
  id, name: id, shortDescription: "", domain: "", reviewStatus: status, pipelinePosition: null, maturity: "IDEA", progress: 0, facultyGuide: null,
  teamSize: 1, updatedAt: null, next: null, milestones: { ...none, ...milestones },
});
const meeting = (extra: Partial<StudentMeeting>): StudentMeeting => ({
  id: "m", title: "M", projectId: "a", projectTitle: "A", date: "2026-11-06", startTime: "10:00", durationMinutes: 60, timeZone: "IST", meetingType: "x",
  agenda: "", provider: "", location: "", invitationStatus: "Sent", participants: [], notes: null, attendanceLogged: false, reminder: null, ...extra,
});
const fail = { ok: false as const, kind: "unavailable" as const, message: "down" };
const byId = (k: ReturnType<typeof computeKpis>) => Object.fromEntries(k.map((x) => [x.id, x]));

const projects = [
  proj("draft", "DRAFT"), proj("sub", "SUBMITTED"), proj("rev", "REVISION_REQUESTED"), proj("rej", "REJECTED"),
  proj("ok", "APPROVED", { total: 3, completed: 1, overdue: 2, progress: 40 }),
];

test("KPI values follow their documented definitions", () => {
  const k = byId(computeKpis({ projects: { ok: true, data: projects }, meetings: { ok: true, data: [
    meeting({ id: "1" }), meeting({ id: "2", date: "2026-11-04", startTime: "15:00" }),
    meeting({ id: "req", invitationStatus: "Requested" }), meeting({ id: "cx", invitationStatus: "Cancelled" }),
    meeting({ id: "past", date: "2026-10-01" }), meeting({ id: "loose", date: "soon" }),
  ] } }, NOW));
  assert.equal(k["active-projects"].value, 3, "submitted + revision + approved ... drafts and rejected excluded");
  assert.equal(k["pending-reviews"].value, 1);
  assert.equal(k["upcoming-meetings"].value, 2, "requests, cancelled, past and undated are not upcoming");
  assert.equal(k["overdue-milestones"].value, 2);
  for (const kpi of Object.values(k)) assert.ok(kpi.source && kpi.definition, `${kpi.id} documents its source and rule`);
});

test("0 and 'not tracked' are different, and neither is shown as a failure", () => {
  const empty = byId(computeKpis({ projects: { ok: true, data: [] }, meetings: { ok: true, data: [] } }, NOW));
  assert.deepEqual([empty["active-projects"].value, empty["active-projects"].state], [0, "ok"]);
  assert.deepEqual([empty["upcoming-meetings"].value, empty["upcoming-meetings"].state], [0, "ok"]);
  assert.deepEqual([empty["overdue-milestones"].value, empty["overdue-milestones"].state], [null, "not-tracked"]);
  const tracked = byId(computeKpis({ projects: { ok: true, data: [proj("a", "APPROVED", { total: 1, progress: 0 })] }, meetings: { ok: true, data: [] } }, NOW));
  assert.deepEqual([tracked["overdue-milestones"].value, tracked["overdue-milestones"].state], [0, "ok"]);
});

test("a failed source marks only its own KPIs unavailable - the others still compute", () => {
  const meetingsDown = byId(computeKpis({ projects: { ok: true, data: projects }, meetings: fail }, NOW));
  assert.equal(meetingsDown["upcoming-meetings"].state, "unavailable");
  assert.equal(meetingsDown["upcoming-meetings"].value, null);
  assert.equal(meetingsDown["active-projects"].value, 3);

  const projectsDown = byId(computeKpis({ projects: fail, meetings: { ok: true, data: [meeting({})] } }, NOW));
  assert.deepEqual(["active-projects", "pending-reviews", "overdue-milestones"].map((id) => projectsDown[id as never].state), ["unavailable", "unavailable", "unavailable"]);
  assert.equal(projectsDown["upcoming-meetings"].value, 1, "meetings still shown when projects fail");
});

test("every KPI links to a student page", () => {
  const kpis = computeKpis({ projects: { ok: true, data: [] }, meetings: { ok: true, data: [] } }, NOW);
  assert.ok(kpis.every((k) => k.href.startsWith("/workspace/student/")));
});

// ── cross-page consistency: dashboard and journey page both call journeysFor() on the same overview ─────────────
const overview = (extra: Partial<StudentOverview> = {}): StudentOverview => ({
  generatedAt: "", projects: { ok: true, data: projects }, tasks: { ok: true, data: [] }, meetings: { ok: true, data: [] }, mentors: {}, monitoring: {}, ...extra,
});

test("one overview yields one journey per project, with the same status the project list shows", () => {
  const journeys = journeysFor(overview(), NOW);
  assert.deepEqual(journeys.map((j) => j.projectId), projects.map((p) => p.id));
  const stageOf = Object.fromEntries(journeys.map((j) => [j.projectId, j.stages[2].state]));
  assert.deepEqual(stageOf, { draft: "upcoming", sub: "current", rev: "blocked", rej: "closed", ok: "complete" });
});

test("when projects fail there are no journeys (no invented ones); when other sources fail the journey says so", () => {
  assert.deepEqual(journeysFor(overview({ projects: fail }), NOW), []);
  const partial = journeysFor(overview({ tasks: fail, meetings: fail }), NOW).find((j) => j.projectId === "ok")!;
  assert.ok(partial.missing.includes("tasks") && partial.missing.includes("meetings") && partial.missing.includes("mentor"));
  assert.equal(partial.stages[2].state, "complete", "unrelated stages are unaffected by the failures");
});
