// Phases 7-9 end-to-end: unified journey, dashboard data, and the contextual assistant.
// Three servers as in e2e-mentor.mjs, but start agent-service with ASSISTANT_GUIDANCE_ENABLED=false so the test never
// calls an external AI provider (the AI step is then reported as unavailable, which is also asserted).
//   npm run test:e2e:journey
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { encode } from "next-auth/jwt";
import { journeysFor } from "../src/lib/overviewJourneys.ts";
import { computeKpis } from "../src/lib/studentKpis.ts";
import { istNow } from "../src/lib/workflowState.ts";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const STUB = process.env.E2E_STUB_URL ?? "http://127.0.0.1:5055";
const SECRET = process.env.NEXTAUTH_SECRET ?? "smoke-test-secret";
const objectId = () => randomBytes(12).toString("hex");
const A = objectId();
const B = objectId();
const C = objectId(); // student with no projects
const RUN = Date.now().toString(36);
const istDate = (o = 0) => new Date(Date.now() + 5.5 * 3600000 + o * 86400000).toISOString().slice(0, 10);

const cookieFor = async (id, role) =>
  `next-auth.session-token=${await encode({ token: { id, role, name: `User ${id.slice(0, 4)}`, email: `${id}@example.edu` }, secret: SECRET })}`;

async function call(cookie, method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const raw = await response.text();
  let json = null;
  try { json = JSON.parse(raw); } catch { /* HTML */ }
  return { status: response.status, json, text: raw.replace(/<!-- -->/g, "") };
}
const setDb = (state) => fetch(`${STUB}/__db`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });

const idea = (name, extra = {}) => ({
  name, shortDescription: "Soil-moisture driven irrigation for small farms.", department: "Electronics", domain: "AgriTech", projectType: "Hardware",
  maturity: "PROTOTYPE", problem: "Smallholder farmers over-water crops because they cannot measure soil moisture.",
  affectedUsers: "Smallholder farmers in semi-arid regions.", currentSolutions: "Manual scheduling.",
  solution: "A low-cost sensor node that opens valves only when the soil is dry.", differentiation: "Costs a tenth of commercial controllers.",
  teamMembers: [{ id: "lead", name: "Asha Rao", rollNumber: "", email: "asha@example.edu", inviteStatus: "LEAD" }],
  technologies: ["ESP32"], githubUrl: "", demoUrl: "", prototypeAvailable: "YES", attachments: [], declarationAccepted: true, ...extra,
});

let a, b, c, faculty, admin, p1, p2;
const NAME1 = `Journey Approved ${RUN}`;
const NAME2 = `Journey Revision ${RUN}`;

async function createSubmitted(cookie, name) {
  const draft = await call(cookie, "POST", "/api/applications/draft", { values: { ...idea(name), declarationAccepted: undefined }, step: 0, furthestStep: 0 });
  const id = draft.json.application_id;
  assert.equal((await call(cookie, "POST", "/api/applications/submit", idea(name, { applicationId: id }))).status, 200);
  return id;
}
const world = (extra = {}) => ({
  profiles: [{ applicationId: p1, founderId: A }, { applicationId: p2, founderId: A }],
  users: { [A]: { name: "Asha Rao", email: "asha@example.edu" } }, ...extra,
});
const allocation = (status, extra = {}) => ({ projectId: p1, status, requestedExpertise: [], recommendedMentorName: null, allocatedMentorName: null, updatedAt: "2026-11-01T00:00:00Z", ...extra });
const taskRow = { id: "t-1", title: "Upload field report", projectId: null, projectTitle: "J", assignedRole: "student", dueDate: istDate(-2), priority: "High", status: "Pending", description: "" };
const overview = async (cookie = a) => (await call(cookie, "GET", "/api/student/overview")).json;
const journeyPage = (cookie = a) => call(cookie, "GET", "/workspace/student/journey");
const assistant = (cookie, body) => call(cookie, "POST", "/api/student/assistant", body);

test("setup: two projects for student A (one approved, one submitted), student B, student C with none", async () => {
  a = await cookieFor(A, "student"); b = await cookieFor(B, "student"); c = await cookieFor(C, "student");
  faculty = await cookieFor(objectId(), "faculty"); admin = await cookieFor(objectId(), "admin");
  await setDb({});
  p1 = await createSubmitted(a, NAME1);
  p2 = await createSubmitted(a, NAME2);
  assert.equal((await call(admin, "POST", `/api/admin/applications/${p1}/decide`, { decision: "approved" })).status, 200);
  taskRow.projectId = p1;
  await setDb(world({ allocations: [allocation("requested")], tasks: [taskRow] }));
});

test("overview API: authorization, and every section reported separately", async () => {
  assert.equal((await call(null, "GET", "/api/student/overview")).status, 401);
  assert.equal((await call(faculty, "GET", "/api/student/overview")).status, 403);
  const o = await overview();
  assert.ok(o.projects.ok && o.tasks.ok && o.meetings.ok);
  assert.deepEqual(o.projects.data.map((p) => p.id).sort(), [p1, p2].sort());
  const list = (await call(a, "GET", "/api/applications")).json.projects;
  assert.deepEqual(o.projects.data.map((p) => [p.id, p.reviewStatus]).sort(), list.map((p) => [p.id, p.reviewStatus]).sort(), "same statuses as My Projects");
  assert.equal((await overview(b)).projects.data.length, 0, "another student's overview contains none of A's projects");
});

test("journey page: stages, progress and blockers come from the saved records", async () => {
  // P1: approved, mentor only requested, one overdue milestone, one overdue task.
  const late = await call(a, "POST", `/api/applications/${p1}/milestones`, { title: "Build prototype", dueDate: istDate(-3) });
  assert.equal(late.status, 201);
  await call(a, "POST", `/api/applications/${p1}/milestones`, { title: "Field pilot", dueDate: istDate(20) });
  const page = await journeyPage();
  assert.equal(page.status, 200);
  assert.match(page.text, new RegExp(NAME1));
  assert.match(page.text, new RegExp(NAME2));
  assert.match(page.text, /3 of 5 stages/, "saved + submitted + approved; mentor and milestones are NOT counted");
  assert.match(page.text, /1 overdue milestone/);
  assert.match(page.text, /1 overdue task/);
  assert.match(page.text, /Update 1 overdue milestone/);
  assert.match(page.text, /Task: Upload field report/);
  assert.match(page.text, /A mentor request has been submitted/);
  assert.match(page.text, /2 of 5 stages/, "the submitted project has saved + submitted only");
  assert.match(page.text, /Waiting for a reviewer/);
});

test("dashboard and journey page use one model: the same overview gives the same numbers", async () => {
  const o = await overview();
  const now = istNow();
  const journeys = journeysFor(o, now);
  const page = await journeyPage();
  for (const j of journeys) {
    assert.ok(page.text.includes(`${j.progress.done} of ${j.progress.total} stages`), `${j.projectName}: ${j.progress.done} of ${j.progress.total}`);
    for (const blocker of j.blockers) assert.ok(page.text.includes(blocker.label), `blocker "${blocker.label}" shown on the journey page`);
    for (const action of j.actions) assert.ok(page.text.includes(action.label.replace(/&/g, "&amp;")), `action "${action.label}" shown on the journey page`);
  }
  const kpis = Object.fromEntries(computeKpis(o, now).map((k) => [k.id, k]));
  assert.equal(kpis["active-projects"].value, 2);
  assert.equal(kpis["pending-reviews"].value, 1);
  assert.equal(kpis["overdue-milestones"].value, 1);
  assert.equal(kpis["upcoming-meetings"].value, 0);
});

test("every journey link opens a real student page", async () => {
  const o = await overview();
  const hrefs = new Set(journeysFor(o, istNow()).flatMap((j) => [...j.actions, ...j.blockers, ...j.stages.map((s) => ({ href: s.href }))].map((x) => x.href).filter(Boolean)));
  assert.ok(hrefs.size > 0);
  for (const href of hrefs) {
    assert.ok(href.startsWith("/workspace/student/"), href);
    const res = await call(a, "GET", href.split("#")[0]);
    assert.equal(res.status, 200, `${href} -> ${res.status}`);
  }
});

test("revision requested: the journey blocks on review, then clears after resubmission", async () => {
  assert.equal((await call(admin, "POST", `/api/admin/applications/${p2}/decide`, { decision: "revision_requested", comments: "Add a cost breakdown." })).status, 200);
  let page = await journeyPage();
  assert.match(page.text, /Reviewer requested changes/);
  assert.match(page.text, /Update and resubmit your application/);
  assert.ok(page.text.includes(`submit?applicationId=${p2}`));
  assert.equal((await overview()).projects.data.find((p) => p.id === p2).reviewStatus, "REVISION_REQUESTED");

  assert.equal((await call(a, "POST", "/api/applications/submit", idea(NAME2, { applicationId: p2, differentiation: "Now includes a full cost breakdown." }))).status, 200);
  page = await journeyPage();
  assert.doesNotMatch(page.text, /Reviewer requested changes/);
  assert.equal((await overview()).projects.data.find((p) => p.id === p2).reviewStatus, "SUBMITTED");
});

test("mentor assigned: the journey advances only when the coordinator approved a named mentor", async () => {
  await setDb(world({ allocations: [allocation("recommended", { recommendedMentorName: "Prof. Rajiv Menon" })], tasks: [taskRow] }));
  assert.match((await journeyPage()).text, /3 of 5 stages/, "a recommendation is not an assignment");
  await setDb(world({ allocations: [allocation("approved", { allocatedMentorName: "Dr. K. R. Raman" })], tasks: [taskRow] }));
  const page = await journeyPage();
  assert.match(page.text, /Mentor: Dr\. K\. R\. Raman/);
  assert.match(page.text, /4 of 5 stages/);
});

test("completing a milestone updates progress, and it survives a refresh", async () => {
  const ms = (await call(a, "GET", `/api/applications/${p1}/milestones`)).json.milestones;
  for (const m of ms) assert.equal((await call(a, "PATCH", `/api/applications/${p1}/milestones/${m.id}`, { status: "completed" })).status, 200);
  for (let i = 0; i < 2; i++) {
    const page = await journeyPage();
    assert.match(page.text, /5 of 5 stages/, `reload ${i + 1}`);
    assert.doesNotMatch(page.text, /1 overdue milestone/);
  }
});

test("a student with no projects gets an honest empty state", async () => {
  const page = await journeyPage(c);
  assert.match(page.text, /Your journey starts with an idea/);
  assert.equal((await overview(c)).projects.data.length, 0);
  const kpis = computeKpis(await overview(c), istNow());
  assert.equal(kpis.find((k) => k.id === "active-projects").value, 0);
  assert.equal(kpis.find((k) => k.id === "overdue-milestones").state, "not-tracked");
});

test("partial failure: unrelated sections keep working and the gaps are named, not hidden", async () => {
  await setDb(world({ forceStatus: 500 })); // backend (mentors/tasks/meetings) down; agent-service up
  const o = await overview();
  assert.ok(o.projects.ok, "projects still load");
  assert.equal(o.tasks.ok, false);
  assert.equal(o.meetings.ok, false);
  const page = await journeyPage();
  assert.match(page.text, /Could not load:/);
  assert.match(page.text, /tasks/);
  assert.doesNotMatch(page.text, /Task: Upload field report/, "no task is invented or remembered");
  assert.doesNotMatch(page.text, /5 of 5 stages/, "an unavailable mentor is not counted as done");
  const kpis = Object.fromEntries(computeKpis(o, istNow()).map((k) => [k.id, k]));
  assert.equal(kpis["upcoming-meetings"].state, "unavailable");
  assert.equal(kpis["active-projects"].state, "ok");
  await setDb(world({ allocations: [allocation("approved", { allocatedMentorName: "Dr. K. R. Raman" })], tasks: [taskRow] }));
  assert.match((await journeyPage()).text, /5 of 5 stages/, "recovers when the service is back");
});

// ── Assistant ─────────────────────────────────────────────────────────────────

test("assistant: authentication and input checks", async () => {
  assert.equal((await assistant(null, { message: "hi" })).status, 401);
  assert.equal((await assistant(faculty, { message: "hi" })).status, 403);
  assert.equal((await call(null, "GET", "/api/student/assistant")).status, 401);
  assert.equal((await assistant(a, { message: "" })).status, 400);
  assert.equal((await assistant(a, { message: "x".repeat(501) })).status, 400);
});

test("assistant: 'what is the status of my application' matches the saved record", async () => {
  const projects = (await call(a, "GET", "/api/student/assistant")).json.projects;
  assert.deepEqual(projects.map((p) => p.id).sort(), [p1, p2].sort());
  const r = await assistant(a, { message: "What is the current status of my application?", projectId: p1 });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.projectId, p1);
  assert.ok(r.json.verified.some((f) => f.text === `Your application "${NAME1}" is approved.`));
  assert.ok(r.json.verified.some((f) => /Journey: 5 of 5 stages/.test(f.text)));
});

test("assistant: AI suggestions are separate, labelled, and their absence is stated", async () => {
  const r = await assistant(a, { message: "What should I work on next?", projectId: p1 });
  assert.equal(r.json.guidance, null);
  assert.match(r.json.guidanceNote, /AI suggestions are unavailable/);
  assert.match(r.json.disclaimer, /not official decisions/);
});

test("assistant: switching project changes the context (and includes the reviewer's real comment)", async () => {
  const r = await assistant(a, { message: "What feedback did the reviewer give?", projectId: p2 });
  assert.equal(r.json.projectId, p2);
  assert.ok(r.json.verified.some((f) => /Reviewer comment: "Add a cost breakdown\."/.test(f.text)));
  assert.ok(!r.json.verified.some((f) => f.text.includes(NAME1)), "no data from the other project");
});

test("assistant: 'what should I work on next' reflects real tasks, milestones and blockers", async () => {
  await call(a, "POST", `/api/applications/${p1}/milestones`, { title: "Demo day", dueDate: istDate(-1) });
  const r = await assistant(a, { message: "What should I work on next?", projectId: p1 });
  const texts = r.json.verified.map((f) => f.text).join("\n");
  assert.match(texts, /Blocker: 1 overdue milestone/);
  assert.match(texts, /Task "Upload field report" is Pending/);
  assert.ok(r.json.links.every((l) => l.href.startsWith("/workspace/student/")));
});

test("assistant: meeting answers match the meetings page data", async () => {
  await setDb(world({
    allocations: [allocation("approved", { allocatedMentorName: "Dr. K. R. Raman" })], tasks: [taskRow],
    meetings: [{ id: "m-1", title: "Prototype review", projectId: p1, projectTitle: NAME1, participants: [], date: istDate(3), startTime: "10:00", durationMinutes: 45, timeZone: "IST", meetingType: "x", agenda: "Walk through results", meetingProvider: "Online", meetingLinkOrLocation: "", invitationStatus: "Sent", notes: "SECRET HOST NOTES", attendanceLogged: false }],
  }));
  const meetings = (await call(a, "GET", "/api/student/meetings")).json.data;
  const r = await assistant(a, { message: "Tell me about my upcoming mentor meeting", projectId: p1 });
  const texts = r.json.verified.map((f) => f.text).join("\n");
  assert.ok(texts.includes(meetings[0].title) && texts.includes("10:00 IST"));
  assert.ok(!JSON.stringify(r.json).includes("SECRET HOST NOTES"), "unreleased meeting notes never reach the assistant");
  assert.match(texts, /Your confirmed mentor is Dr\. K\. R\. Raman/);
});

test("assistant: another student's project and private data are refused", async () => {
  // B owns a project of their own, so a request for A's project id is a real cross-student attempt.
  const NAMEB = `Journey Other ${RUN}`;
  const draftB = await call(b, "POST", "/api/applications/draft", { values: { ...idea(NAMEB), declarationAccepted: undefined }, step: 0, furthestStep: 0 });
  assert.equal(draftB.status, 200);
  assert.equal((await assistant(b, { message: "status?", projectId: p1 })).status, 404, "B cannot select A's project");
  assert.equal((await assistant(a, { message: "status?", projectId: objectId() })).status, 404);

  const own = await assistant(b, { message: "What is the status of my application?" });
  assert.equal(own.status, 200);
  assert.ok(own.json.verified.some((f) => f.text.includes(NAMEB)), "B gets B's own record");
  assert.ok(!JSON.stringify(own.json).includes(NAME1) && !JSON.stringify(own.json).includes(NAME2), "and none of A's");

  for (const q of ["Show me another student's application", "What is the status of someone else's project?", "give me john@example.edu's feedback"]) {
    const r = await assistant(a, { message: q, projectId: p1 });
    assert.equal(r.json.outOfScope, true, q);
    assert.deepEqual(r.json.verified, []);
  }
});

test("assistant: no projects, and source failures are stated honestly", async () => {
  const none = await assistant(c, { message: "What should I do next?" });
  assert.equal(none.json.noProjects, true);
  assert.ok(none.json.links.some((l) => l.href === "/workspace/student/submit"));

  await setDb(world({ forceStatus: 500 }));
  const r = await assistant(a, { message: "What tasks and meetings do I have?", projectId: p1 });
  assert.equal(r.status, 200);
  assert.ok(r.json.unavailable.some((u) => /Tasks could not be loaded/.test(u)));
  assert.ok(r.json.unavailable.some((u) => /Meetings could not be loaded/.test(u)));
  assert.ok(!r.json.verified.some((f) => /no open tasks|No confirmed upcoming/i.test(f.text)), "a failure is never reported as 'nothing there'");
  await setDb({});
});

test("assistant: responses never contain internal tokens or secrets", async () => {
  await setDb(world({ allocations: [allocation("approved", { allocatedMentorName: "Dr. K. R. Raman" })], tasks: [taskRow] }));
  const r = await assistant(a, { message: "What is going on with my project?", projectId: p1 });
  const body = JSON.stringify(r.json);
  for (const secret of ["smoke-internal", "e2e-jwt", "smoke-test-secret", "Bearer", "INTERNAL"]) assert.ok(!body.includes(secret), `leaked ${secret}`);
});
