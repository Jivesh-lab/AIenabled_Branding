// Phase 6 end-to-end: milestones, progress consistency and project monitoring.
// Same three servers as e2e-mentor.mjs (see its header), then:  npm run test:e2e:milestones
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { encode } from "next-auth/jwt";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const STUB = process.env.E2E_STUB_URL ?? "http://127.0.0.1:5055";
const SECRET = process.env.NEXTAUTH_SECRET ?? "smoke-test-secret";
const objectId = () => randomBytes(12).toString("hex");
const STUDENT_ID = objectId();
const OTHER_ID = objectId();
const RUN = Date.now().toString(36);
const istDate = (offset = 0) => new Date(Date.now() + 5.5 * 3600000 + offset * 86400000).toISOString().slice(0, 10);

const cookieFor = async (id, role) =>
  `next-auth.session-token=${await encode({ token: { id, role, name: `User ${id.slice(0, 4)}`, email: `${id}@example.edu` }, secret: SECRET })}`;

async function call(cookie, method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML */ }
  return { status: response.status, json, text };
}
const setDb = (state) => fetch(`${STUB}/__db`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });

const idea = (name, extra = {}) => ({
  name, shortDescription: "Soil-moisture driven irrigation for small farms.", department: "Electronics", domain: "AgriTech",
  projectType: "Hardware", maturity: "PROTOTYPE",
  problem: "Smallholder farmers over-water crops because they cannot measure soil moisture.",
  affectedUsers: "Smallholder farmers in semi-arid regions.", currentSolutions: "Manual scheduling.",
  solution: "A low-cost sensor node that opens valves only when the soil is dry.", differentiation: "Costs a tenth of commercial controllers.",
  teamMembers: [{ id: "lead", name: "Asha Rao", rollNumber: "", email: "asha@example.edu", inviteStatus: "LEAD" }],
  technologies: ["ESP32"], githubUrl: "", demoUrl: "", prototypeAvailable: "YES", attachments: [], declarationAccepted: true, ...extra,
});

let student, other, faculty, admin, appId;
const detail = (cookie = student) => call(cookie, "GET", `/workspace/student/projects/${appId}`);
const world = (extra = {}) => ({ profiles: [{ applicationId: appId, founderId: STUDENT_ID }], users: { [STUDENT_ID]: { name: "Asha Rao", email: "asha@example.edu" } }, ...extra });
const projectSummary = async () => (await call(student, "GET", "/api/applications")).json.projects.find((p) => p.id === appId);
const msUrl = (suffix = "") => `/api/applications/${appId}/milestones${suffix}`;

test("setup: an approved project owned by the student", async () => {
  student = await cookieFor(STUDENT_ID, "student");
  other = await cookieFor(OTHER_ID, "student");
  faculty = await cookieFor(objectId(), "faculty");
  admin = await cookieFor(objectId(), "admin");
  await setDb({});
  const draft = await call(student, "POST", "/api/applications/draft", { values: { ...idea(`Milestones ${RUN}`), declarationAccepted: undefined }, step: 0, furthestStep: 0 });
  appId = draft.json.application_id;
  assert.equal((await call(student, "POST", "/api/applications/submit", idea(`Milestones ${RUN}`, { applicationId: appId }))).status, 200);
  await setDb(world());
  const before = await detail();
  assert.doesNotMatch(before.text, /No milestones have been recorded/, "no milestone panel before approval");
  assert.equal((await call(admin, "POST", `/api/admin/applications/${appId}/decide`, { decision: "approved" })).status, 200);
});

test("approved with nothing recorded: missing data is shown as missing, never as a healthy project", async () => {
  await setDb(world());
  const page = await detail();
  assert.match(page.text, /No milestones have been recorded for this project yet/);
  assert.match(page.text, /Not enough data/);
  assert.doesNotMatch(page.text, />On track</);
  assert.equal((await projectSummary()).milestones.progress, null, "not tracked is null, not 0");
  const list = await call(student, "GET", "/workspace/student/projects");
  assert.match(list.text, /No milestones recorded yet/);
  assert.doesNotMatch(list.text, /Milestone progress/);
});

test("authorization of the milestone APIs", async () => {
  assert.equal((await call(null, "GET", msUrl())).status, 401);
  assert.equal((await call(faculty, "GET", msUrl())).status, 403);
  assert.equal((await call(faculty, "POST", msUrl(), { title: "By faculty" })).status, 403);
  assert.equal((await call(other, "GET", msUrl())).status, 403, "another student");
  assert.equal((await call(other, "POST", msUrl(), { title: "Hijack milestone" })).status, 403);
});

let doneId;
test("create milestones: persisted, validated, de-duplicated", async () => {
  const late = await call(student, "POST", msUrl(), { title: "Build prototype", dueDate: istDate(-3) });
  assert.equal(late.status, 201, JSON.stringify(late.json));
  assert.equal(late.json.milestone.state, "overdue");
  const soon = await call(student, "POST", msUrl(), { title: "Field pilot", dueDate: istDate(20), description: "Pilot with five farms" });
  assert.equal(soon.status, 201);
  doneId = late.json.milestone.id;

  assert.equal((await call(student, "POST", msUrl(), { title: "ab" })).status, 422);
  assert.equal((await call(student, "POST", msUrl(), { title: "field PILOT" })).status, 409, "duplicate title");
  const listing = await call(student, "GET", msUrl());
  assert.deepEqual(listing.json.milestones.map((m) => m.title).sort(), ["Build prototype", "Field pilot"]);
});

test("overdue work is visible, and monitoring reports it with a link to fix it", async () => {
  const page = await detail();
  assert.match(page.text, /Build prototype/);
  assert.match(page.text, />Overdue</);
  assert.match(page.text, /0 of 2 done · 1 overdue/);
  assert.match(page.text, /Needs attention/);
  assert.match(page.text, /1 milestone is currently overdue/);
  assert.match(page.text, /not decisions/);
  assert.ok(page.text.includes("#milestones"), "the finding links to the milestones workflow");
  assert.match(page.text, /Update milestones/);
});

test("showing a recommendation never changes status: nothing is marked resolved by being displayed", async () => {
  const listing = await call(student, "GET", msUrl());
  const lateOne = listing.json.milestones.find((m) => m.title === "Build prototype");
  assert.equal(lateOne.status, "pending");
  assert.equal(lateOne.state, "overdue");
  assert.equal((await projectSummary()).reviewStatus, "APPROVED");
});

test("updating a milestone persists, stays valid, and clears the overdue flag", async () => {
  assert.equal((await call(student, "PATCH", msUrl(`/${doneId}`), { status: "blocked" })).status, 400, "blocked is not a supported status");
  assert.equal((await call(student, "PATCH", msUrl(`/${doneId}`), { completionPct: 300 })).status, 400);
  assert.equal((await call(other, "PATCH", msUrl(`/${doneId}`), { status: "completed" })).status, 403);

  const done = await call(student, "PATCH", msUrl(`/${doneId}`), { status: "completed" });
  assert.equal(done.status, 200);
  assert.equal(done.json.milestone.state, "completed");
  assert.ok(done.json.milestone.completedAt);
  const again = await call(student, "PATCH", msUrl(`/${doneId}`), { status: "completed" });
  assert.equal(again.json.milestone.completedAt, done.json.milestone.completedAt, "repeat does not move the completion date");
});

test("one progress figure everywhere: list API, milestones API, project page, project list, journey, dashboard API", async () => {
  const summary = (await projectSummary()).milestones;
  assert.deepEqual({ total: summary.total, completed: summary.completed, overdue: summary.overdue, progress: summary.progress }, { total: 2, completed: 1, overdue: 0, progress: 50 });
  const fromMilestones = (await call(student, "GET", msUrl())).json.summary;
  assert.deepEqual(fromMilestones, summary);

  for (const [name, path] of [["project page", `/workspace/student/projects/${appId}`], ["project list", "/workspace/student/projects"], ["journey", "/workspace/student/journey"]]) {
    const page = await call(student, "GET", path);
    assert.match(page.text, /1 of 2 done/, `${name} shows the same milestone figures`);
  }
  const monitoring = await detail();
  assert.doesNotMatch(monitoring.text, /milestone is currently overdue/, "monitoring follows the updated records");
});

test("tasks feed monitoring: an untouched task lowers task completion", async () => {
  await setDb(world({ tasks: [{ id: "t-1", title: "Upload field report", projectId: appId, projectTitle: "Milestones", assignedRole: "student", dueDate: istDate(4), priority: "High", status: "Pending", description: "" }] }));
  const page = await detail();
  assert.match(page.text, /0 of 1 tasks done/);
  assert.match(page.text, /Task completion rate is 0%/);
  assert.match(page.text, /Review tasks/);
});

test("when tasks cannot be loaded the check is not run on partial data, and says so", async () => {
  await setDb(world({ forceStatus: 500 }));
  const page = await detail();
  assert.match(page.text, /Check unavailable/);
  assert.match(page.text, /says nothing about how your project is doing/);
  assert.doesNotMatch(page.text, />On track</);
  await setDb(world());
});

test("another student sees none of this project's milestones", async () => {
  const page = await detail(other);
  assert.match(page.text, /No access/);
  assert.ok(!page.text.includes("Build prototype") && !page.text.includes("Field pilot"));
});
