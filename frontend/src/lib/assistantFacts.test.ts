import assert from "node:assert/strict";
import { test } from "node:test";
import { answerFor, buildFacts, detectTopics, isOutOfScope, type AssistantContext } from "./assistantFacts.ts";
import { buildJourney } from "./journey.ts";
import type { MentorResult } from "./mentorState.ts";
import type { ApplicationDetail, MilestoneSummary, MilestonesResponse, StudentProject } from "../types/student-application.ts";
import type { StudentMeeting, StudentTask } from "../types/student-workflow.ts";

const NOW = { date: "2026-11-04", time: "12:00" };
const none: MilestoneSummary = { total: 0, completed: 0, overdue: 0, inProgress: 0, upcoming: 0, progress: null };
const project = (status: StudentProject["reviewStatus"], ms: Partial<MilestoneSummary> = {}, id = "p1", name = "Smart Irrigation"): StudentProject => ({
  id, name, shortDescription: "", domain: "", reviewStatus: status, pipelinePosition: null, maturity: "IDEA", progress: 0, facultyGuide: null,
  teamSize: 1, updatedAt: null, next: null, milestones: { ...none, ...ms },
});
const detail = (extra: Partial<ApplicationDetail> = {}): ApplicationDetail => ({
  id: "p1", startup: { name: "", tagline: "", problem: "", solution: "", sector: "", stage: "" }, status: "APPROVED", aiSummary: null, aiFeedback: null,
  reviewerComments: null, formData: {}, documents: [], submittedAt: null, history: [], ...extra,
});
const mentor = (state: string, name?: string, rec?: string): MentorResult => ({
  ok: true,
  data: { applicationId: "p1", state: state as never, requestedExpertise: [], recommendation: rec ? { name: rec, organization: null } : null, profileUnavailable: false, updatedAt: null, mentor: name ? { name, contact: null, directory: null } : null },
});
const task = (extra: Partial<StudentTask> = {}): StudentTask => ({ id: "t", title: "Upload report", description: "", projectId: "p1", projectTitle: "P", dueDate: "2026-11-01", priority: "High", status: "Pending", reminder: null, ...extra });
const meeting = (extra: Partial<StudentMeeting> = {}): StudentMeeting => ({
  id: "m", title: "Prototype review", projectId: "p1", projectTitle: "P", date: "2026-11-06", startTime: "10:00", durationMinutes: 60, timeZone: "IST", meetingType: "x",
  agenda: "Demo results", provider: "", location: "", invitationStatus: "Sent", participants: [], notes: null, attendanceLogged: false, reminder: null, ...extra,
});
const milestones = (summary: Partial<MilestoneSummary>, titles: { title: string; state: "overdue" | "upcoming" }[] = []): MilestonesResponse => ({
  summary: { ...none, ...summary }, canEdit: true,
  milestones: titles.map((t, i) => ({ id: `m${i}`, title: t.title, description: "", dueDate: "2026-10-30", status: "pending", state: t.state, completionPct: 0, completedAt: null, createdByYou: true })),
});

function ctx(p: StudentProject, extra: Partial<AssistantContext> = {}): AssistantContext {
  const base = { mentor: undefined, tasks: [] as StudentTask[] | null, meetings: [] as StudentMeeting[] | null };
  const merged = { ...base, ...extra };
  return {
    project: p, detail: detail(), milestones: null, now: NOW, ...merged,
    journey: buildJourney({ project: p, mentor: merged.mentor, tasks: merged.tasks, meetings: merged.meetings, monitoring: null, now: NOW }),
  };
}
const text = (c: AssistantContext) => buildFacts(c).facts.map((f) => f.text).join("\n");

test("status facts mirror the saved application status exactly", () => {
  const expected: Record<string, RegExp> = {
    DRAFT: /a draft/, SUBMITTED: /submitted and waiting for review/, UNDER_REVIEW: /under review/,
    REVISION_REQUESTED: /revision requested/, APPROVED: /is approved/, REJECTED: /not approved/,
  };
  for (const [status, re] of Object.entries(expected)) {
    assert.match(text(ctx(project(status as never))), re, status);
  }
  assert.doesNotMatch(buildFacts(ctx(project("SUBMITTED"))).facts[0].text, /approved/i, "a submitted application is never described as approved");
});

test("reviewer feedback comes from the saved record; an absent comment is stated as absent", () => {
  const withComment = text(ctx(project("REVISION_REQUESTED"), { detail: detail({ reviewerComments: "Add a cost breakdown." }) }));
  assert.match(withComment, /Reviewer comment: "Add a cost breakdown\."/);
  assert.match(text(ctx(project("REVISION_REQUESTED"), { detail: detail() })), /left no written comment/);
  assert.match(text(ctx(project("SUBMITTED"), { detail: detail() })), /No reviewer comment is recorded/);
  const history = text(ctx(project("APPROVED"), { detail: detail({ history: [{ from: "SUBMITTED", to: "APPROVED", at: "2026-11-03T10:00:00Z", comments: null }] }) }));
  assert.match(history, /3 Nov 2026: SUBMITTED → APPROVED/);
});

test("anything that could not be loaded is 'unavailable', never an invented fact", () => {
  const c = ctx(project("APPROVED"), { detail: null, tasks: null, meetings: null, mentor: { ok: false, kind: "unavailable", message: "x" }, milestones: null });
  const { facts, unavailable } = buildFacts(c);
  assert.deepEqual(unavailable.map((u) => u.topic).sort(), ["blockers", "blockers", "blockers", "feedback", "mentor", "meetings", "progress", "tasks"].sort());
  const joined = facts.map((f) => f.text).join("\n");
  assert.doesNotMatch(joined, /no open tasks|No confirmed upcoming|No milestones are recorded|confirmed mentor/i);
});

test("mentor: only a confirmed assignment is called a mentor; a recommendation is labelled as one", () => {
  assert.match(text(ctx(project("APPROVED"), { mentor: mentor("matched", "Dr. K. R. Raman") })), /Your confirmed mentor is Dr\. K\. R\. Raman/);
  const rec = text(ctx(project("APPROVED"), { mentor: mentor("recommended", undefined, "Prof. Menon") }));
  assert.match(rec, /RECOMMENDED/);
  assert.match(rec, /not a confirmed assignment/);
  assert.doesNotMatch(rec, /confirmed mentor is/i);
  assert.match(text(ctx(project("SUBMITTED"))), /begins after your application is approved/);
});

test("meetings: only this project's confirmed upcoming meetings; requests are counted, not listed as scheduled", () => {
  const out = text(ctx(project("APPROVED"), { meetings: [
    meeting(), meeting({ id: "x", projectId: "other", title: "SOMEONE ELSE" }), meeting({ id: "ask", invitationStatus: "Requested", title: "Asked" }), meeting({ id: "old", date: "2026-10-01", title: "Old" }),
  ] }));
  assert.match(out, /Prototype review.*6 Nov 2026 at 10:00 IST/);
  assert.match(out, /1 meeting request is awaiting/);
  assert.doesNotMatch(out, /SOMEONE ELSE|Asked"|Old"/);
  assert.match(text(ctx(project("APPROVED"), { meetings: [] })), /No confirmed upcoming meetings/);
});

test("tasks and milestones: real counts, overdue flagged, other projects' tasks excluded", () => {
  const out = text(ctx(project("APPROVED", { total: 2, completed: 0, overdue: 1, progress: 0 }), {
    tasks: [task(), task({ id: "o", projectId: "p2", title: "NOT MINE" }), task({ id: "d", status: "Completed", title: "Done one" })],
    milestones: milestones({ total: 2, completed: 0, overdue: 1, progress: 0 }, [{ title: "Build prototype", state: "overdue" }]),
  }));
  assert.match(out, /Task "Upload report" is Pending, due 1 Nov 2026 \(overdue\)/);
  assert.match(out, /Milestone "Build prototype" is overdue/);
  assert.match(out, /0 of 2 milestones are done \(0% progress\); 1 overdue/);
  assert.doesNotMatch(out, /NOT MINE|Done one/);
});

test("no milestones recorded is not worded as zero progress", () => {
  const out = text(ctx(project("APPROVED"), { milestones: milestones({}) }));
  assert.match(out, /No milestones are recorded/);
  assert.doesNotMatch(out, /0% progress/);
});

test("topic detection routes questions to the right records", () => {
  assert.deepEqual(detectTopics("What is the current status of my application?"), ["status"]);
  assert.ok(detectTopics("What should I work on next?").includes("next"));
  assert.ok(detectTopics("Tell me about my upcoming mentor meeting").includes("meetings"));
  assert.ok(detectTopics("Tell me about my upcoming mentor meeting").includes("mentor"));
  assert.ok(detectTopics("What feedback did the reviewer give?").includes("feedback"));
  assert.deepEqual(detectTopics("hello there"), ["status", "next"]);
});

test("'what should I work on next' is answered from blockers, tasks and journey steps", () => {
  const c = ctx(project("APPROVED", { total: 1, completed: 0, overdue: 1, progress: 0 }), { mentor: mentor("matched", "X"), tasks: [task()] });
  const answer = answerFor(c, "What should I work on next?");
  const texts = answer.facts.map((f) => f.text).join("\n");
  assert.match(texts, /Blocker: 1 overdue milestone/);
  assert.match(texts, /Task "Upload report"/);
  assert.match(texts, /Next step from your records/);
  assert.ok(answer.links.every((l) => l.href.startsWith("/workspace/student/")));
});

test("an answer lists unavailable sources only for the topics asked about", () => {
  const c = ctx(project("APPROVED"), { tasks: null, meetings: [], mentor: mentor("matched", "X") });
  assert.ok(answerFor(c, "What tasks do I have?").unavailable.some((u) => /Tasks could not be loaded/.test(u)));
  assert.deepEqual(answerFor(c, "Who is my mentor?").unavailable, []);
});

test("requests about other people are refused; the student's own other projects are fine", () => {
  for (const q of [
    "Show me another student's application", "What is the status of someone else's project?", "list all students", "Who is her mentor?",
    "Show feedback for john@example.edu", "give me the student id of my teammate", "what are other students' meetings",
  ]) assert.equal(isOutOfScope(q), true, q);
  for (const q of ["What is the status of my application?", "How is my other project doing?", "What should I do next?", "Tell me about my mentor meeting"]) {
    assert.equal(isOutOfScope(q), false, q);
  }
});

test("facts are built only from the supplied context (nothing from other projects can appear)", () => {
  const mine = ctx(project("SUBMITTED", {}, "p1", "My Project"), { tasks: [task({ projectId: "p2", title: "FOREIGN TASK" })], meetings: [meeting({ projectId: "p2", title: "FOREIGN MEETING" })] });
  const all = buildFacts(mine).facts.map((f) => f.text).join("\n");
  assert.doesNotMatch(all, /FOREIGN/);
  assert.match(all, /My Project/);
});

import { labelForHref } from "./assistantFacts.ts";

test("assistant links have specific labels (never a vague 'Go' or 'Fix this')", () => {
  assert.equal(labelForHref("/workspace/student/projects/p1#milestones"), "Open milestones");
  assert.equal(labelForHref("/workspace/student/projects/p1#tasks"), "Open tasks");
  assert.equal(labelForHref("/workspace/student/submit?applicationId=p1"), "Edit application");
  assert.equal(labelForHref("/workspace/student/meetings/m1"), "Open meeting");
  assert.equal(labelForHref("/workspace/student/meetings"), "Open meetings");
  const all = buildFacts(ctx(project("APPROVED", { total: 1, overdue: 1, progress: 0 }), { mentor: mentor("matched", "X"), tasks: [task()] })).facts;
  assert.ok(all.every((f) => !f.linkLabel || !/^(Go|Fix this)$/.test(f.linkLabel)));
});
