import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJourney, type JourneyInput } from "./journey.ts";
import type { MentorResult } from "./mentorState.ts";
import type { MilestoneSummary, MonitoringResponse, StudentProject } from "../types/student-application.ts";
import type { StudentMeeting, StudentTask } from "../types/student-workflow.ts";

const NOW = { date: "2026-11-04", time: "12:00" };
const none: MilestoneSummary = { total: 0, completed: 0, overdue: 0, inProgress: 0, upcoming: 0, progress: null };

const project = (status: StudentProject["reviewStatus"], milestones: Partial<MilestoneSummary> = {}): StudentProject => ({
  id: "p1", name: "Smart Irrigation", shortDescription: "", domain: "AgriTech", reviewStatus: status, pipelinePosition: null,
  maturity: "PROTOTYPE", progress: 0, facultyGuide: null, teamSize: 1, updatedAt: null, next: null, milestones: { ...none, ...milestones },
});
const mentor = (state: string, name?: string): MentorResult => ({
  ok: true,
  data: { applicationId: "p1", state: state as never, requestedExpertise: [], recommendation: null, profileUnavailable: false, updatedAt: null, mentor: name ? { name, contact: null, directory: null } : null },
});
const task = (extra: Partial<StudentTask> = {}): StudentTask => ({ id: "t", title: "Upload report", description: "", projectId: "p1", projectTitle: "P", dueDate: "2026-11-10", priority: "High", status: "Pending", reminder: null, ...extra });
const meeting = (extra: Partial<StudentMeeting> = {}): StudentMeeting => ({
  id: "m", title: "Review", projectId: "p1", projectTitle: "P", date: "2026-11-06", startTime: "10:00", durationMinutes: 60, timeZone: "IST", meetingType: "x",
  agenda: "", provider: "", location: "", invitationStatus: "Sent", participants: [], notes: null, attendanceLogged: false, reminder: null, ...extra,
});
const monitoring = (health: MonitoringResponse["evaluation"]["health_status"], risk: string[] = []): MonitoringResponse => ({
  evaluation: { health_status: health, measured_facts: {}, ai_interpretation: { summary: "", risk_factors: risk, recommended_interventions: [], signals: [], requires_staff_confirmation: false, evaluated_at: "" } },
  milestoneSummary: none, isOfficialStatus: false, note: "",
});
const journey = (p: StudentProject, extra: Partial<JourneyInput> = {}) =>
  buildJourney({ project: p, mentor: undefined, tasks: [], meetings: [], monitoring: null, now: NOW, ...extra });
const states = (j: ReturnType<typeof journey>) => j.stages.map((s) => s.state);

test("draft: only the first stage is current; nothing is complete", () => {
  const j = journey(project("DRAFT"));
  assert.deepEqual(states(j), ["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  assert.equal(j.progress.percent, 0);
  assert.equal(j.currentStageId, "saved");
  assert.ok(j.actions[0].href.includes("/submit?applicationId=p1") && j.actions[0].urgent);
});

test("submitted / under review: stages 1-2 done, review is current, no student action is invented", () => {
  for (const status of ["SUBMITTED", "UNDER_REVIEW"] as const) {
    const j = journey(project(status));
    assert.deepEqual(states(j), ["complete", "complete", "current", "upcoming", "upcoming"]);
    assert.equal(j.progress.percent, 40);
    assert.deepEqual(j.blockers, []);
    assert.ok(j.actions.every((a) => !a.urgent));
  }
});

test("revision requested: review is BLOCKED, a blocker and an urgent action point to the edit page", () => {
  const j = journey(project("REVISION_REQUESTED"));
  assert.equal(j.stages[2].state, "blocked");
  assert.equal(j.currentStageId, "review");
  assert.equal(j.blockers[0].id, "revision");
  assert.ok(j.blockers[0].href.includes("/submit?applicationId=p1"));
  assert.ok(j.actions.some((a) => a.urgent && a.href.includes("/submit")));
  assert.equal(j.progress.percent, 40);
});

test("rejected: later stages are closed, not 'upcoming', and nothing is counted done beyond submission", () => {
  const j = journey(project("REJECTED"));
  assert.deepEqual(states(j), ["complete", "complete", "closed", "closed", "closed"]);
  assert.equal(j.currentStageId, null);
  assert.equal(j.progress.percent, 40);
});

test("approved with nothing else recorded: review done, mentor and milestones are NOT done", () => {
  const j = journey(project("APPROVED"), { mentor: mentor("not-requested") });
  assert.deepEqual(states(j), ["complete", "complete", "complete", "current", "current"]);
  assert.equal(j.progress.percent, 60);
  assert.ok(j.actions.some((a) => a.id === "add-milestone"));
});

test("a recommendation or pending request never counts as a mentor", () => {
  for (const state of ["pending", "in-progress", "recommended", "not-requested", "matched-name-pending"]) {
    assert.equal(journey(project("APPROVED"), { mentor: mentor(state) }).stages[3].state, "current", state);
  }
  const matched = journey(project("APPROVED"), { mentor: mentor("matched", "Dr. K. R. Raman") });
  assert.equal(matched.stages[3].state, "complete");
  assert.match(matched.stages[3].detail, /Dr\. K\. R\. Raman/);
  assert.equal(journey(project("APPROVED"), { mentor: mentor("unsuccessful") }).stages[3].state, "blocked");
});

test("unavailable sources are reported as missing and never counted as done or as 'nothing to do'", () => {
  const j = journey(project("APPROVED"), { mentor: { ok: false, kind: "unavailable", message: "x" }, tasks: null, meetings: null, monitoring: "unavailable" });
  assert.deepEqual([...j.missing].sort(), ["meetings", "mentor", "monitoring", "tasks"]);
  assert.equal(j.stages[3].state, "current");
  assert.match(j.stages[3].detail, /unavailable/);
  assert.equal(journey(project("APPROVED"), { mentor: undefined }).missing.includes("mentor"), true);
});

test("milestones: complete only when at least one exists and all are completed", () => {
  const stage = (m: Partial<MilestoneSummary>) => journey(project("APPROVED", m), { mentor: mentor("matched", "X") }).stages[4];
  assert.equal(stage({}).state, "current"); // none recorded is not 'done'
  assert.equal(stage({ total: 3, completed: 3, progress: 100 }).state, "complete");
  assert.equal(stage({ total: 3, completed: 1, progress: 33 }).state, "current");
  const late = stage({ total: 3, completed: 1, overdue: 1, progress: 33 });
  assert.equal(late.state, "blocked");
  assert.match(late.detail, /1 overdue/);
});

test("full progress only when every stage is proven complete", () => {
  const j = journey(project("APPROVED", { total: 2, completed: 2, progress: 100 }), { mentor: mentor("matched", "X") });
  assert.deepEqual(states(j), ["complete", "complete", "complete", "complete", "complete"]);
  assert.equal(j.progress.percent, 100);
  assert.equal(j.currentStageId, null);
});

test("blockers come from overdue milestones, overdue tasks and monitoring - each links to its workflow", () => {
  const j = journey(project("APPROVED", { total: 2, completed: 0, overdue: 1, progress: 0 }), {
    mentor: mentor("matched", "X"),
    tasks: [task({ dueDate: "2026-11-01" })],
    monitoring: monitoring("Needs Attention", ["1 milestone is currently overdue"]),
  });
  const ids = j.blockers.map((b) => b.id).sort();
  assert.deepEqual(ids, ["monitoring", "overdue-milestones", "overdue-tasks"]);
  assert.ok(j.blockers.find((b) => b.id === "overdue-milestones")!.href.endsWith("#milestones"));
  assert.ok(j.blockers.find((b) => b.id === "overdue-tasks")!.href.endsWith("#tasks"));
});

test("monitoring that says 'No Data' or 'On Track' creates no blocker, and is never turned into progress", () => {
  for (const health of ["No Data", "On Track"] as const) {
    const j = journey(project("APPROVED"), { mentor: mentor("matched", "X"), monitoring: monitoring(health) });
    assert.ok(!j.blockers.some((b) => b.id === "monitoring"));
    assert.equal(j.progress.percent, 80);
  }
});

test("actions: only this project's open tasks and its next confirmed meeting; urgent first", () => {
  const j = journey(project("APPROVED", { total: 1, completed: 0, progress: 0 }), {
    mentor: mentor("matched", "X"),
    tasks: [task({ id: "late", title: "Late one", dueDate: "2026-11-01" }), task({ id: "other", projectId: "p2" }), task({ id: "done", status: "Completed" }), task({ id: "far", title: "Far one", dueDate: "2026-12-30" })],
    meetings: [meeting({ id: "later", date: "2026-11-20" }), meeting({ id: "soon", title: "Soon", date: "2026-11-06" }), meeting({ id: "ask", invitationStatus: "Requested", date: "2026-11-05" }), meeting({ id: "foreign", projectId: "p2" })],
  });
  const labels = j.actions.map((a) => a.label);
  assert.ok(labels[0].startsWith("Task: Late one") && j.actions[0].urgent);
  assert.ok(labels.some((l) => l.startsWith("Meeting: Soon")));
  assert.ok(!labels.some((l) => /Meeting: Review/.test(l) && l.includes("20 Nov")), "only the next meeting is listed");
  assert.equal(j.actions.filter((a) => a.id.startsWith("task-")).length, 2, "completed and foreign tasks are excluded");
  assert.ok(j.actions.find((a) => a.id === "meeting-soon")!.href.endsWith("/meetings/soon"));
});

test("a mentor but no upcoming meeting suggests requesting one (guidance, not a record)", () => {
  const j = journey(project("APPROVED"), { mentor: mentor("matched", "X"), meetings: [] });
  assert.ok(j.actions.some((a) => a.id === "request-meeting" && a.href === "/workspace/student/meetings" && !a.urgent));
});

test("the journey is a pure function of its input", () => {
  const input: JourneyInput = { project: project("APPROVED", { total: 2, completed: 1, progress: 50 }), mentor: mentor("pending"), tasks: [task()], meetings: [meeting()], monitoring: null, now: NOW };
  assert.deepEqual(buildJourney(input), buildJourney(input));
});
