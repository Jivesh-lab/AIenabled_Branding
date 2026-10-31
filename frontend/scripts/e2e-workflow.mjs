// Phase 5 end-to-end: tasks, meetings, meeting requests (reminders are covered by backend unit tests).
// Same three servers as e2e-mentor.mjs (see its header), then:  npm run test:e2e:workflow
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
const getDb = async () => (await fetch(`${STUB}/__db`)).json();

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
const meeting = (extra) => ({
  id: "m-1", title: "Prototype review", projectId: appId, projectTitle: "Mentor Flow", participants: ["Asha Rao"], date: istDate(3), startTime: "10:00",
  durationMinutes: 45, timeZone: "IST", meetingType: "Milestone Review", agenda: "Walk through test results", meetingProvider: "Online",
  meetingLinkOrLocation: "https://meet.example/abc", invitationStatus: "Sent", notes: "HOST NOTES", attendanceLogged: false, ...extra,
});
const task = (extra) => ({
  id: "t-1", title: "Upload field-test report", projectId: appId, projectTitle: "Mentor Flow", assignedTo: "Asha", assignedRole: "student",
  dueDate: istDate(-2), priority: "High", status: "Pending", description: "PDF with soil readings", ...extra,
});
const world = (extra = {}) => ({ profiles: [{ applicationId: appId, founderId: STUDENT_ID }, { applicationId: "someone-else", founderId: OTHER_ID }], users: { [STUDENT_ID]: { name: "Asha Rao", email: "asha@example.edu" } }, ...extra });

test("setup: an approved application owned by the student", async () => {
  student = await cookieFor(STUDENT_ID, "student");
  other = await cookieFor(OTHER_ID, "student");
  faculty = await cookieFor(objectId(), "faculty");
  admin = await cookieFor(objectId(), "admin");
  await setDb({});
  const draft = await call(student, "POST", "/api/applications/draft", { values: { ...idea(`Workflow ${RUN}`), declarationAccepted: undefined }, step: 0, furthestStep: 0 });
  appId = draft.json.application_id;
  assert.equal((await call(student, "POST", "/api/applications/submit", idea(`Workflow ${RUN}`, { applicationId: appId }))).status, 200);
  assert.equal((await call(admin, "POST", `/api/admin/applications/${appId}/decide`, { decision: "approved" })).status, 200);
});

test("authorization of the workflow APIs", async () => {
  await setDb(world());
  for (const [method, path] of [["GET", "/api/student/meetings"], ["GET", "/api/student/tasks"]]) {
    assert.equal((await call(null, method, path)).status, 401, `${path} anonymous`);
    assert.equal((await call(faculty, method, path)).status, 403, `${path} faculty`);
  }
  assert.equal((await call(faculty, "POST", "/api/student/meeting-requests", {})).status, 403);
  assert.equal((await call(faculty, "PUT", "/api/student/tasks/t-1/status", { status: "Completed" })).status, 403);
});

test("meetings page: own meetings only, real statuses, no invented ones", async () => {
  await setDb(world({
    meetings: [
      meeting(),
      meeting({ id: "m-req", title: "My request", invitationStatus: "Requested", meetingProvider: "To be confirmed", meetingLinkOrLocation: "" }),
      meeting({ id: "m-cx", title: "Cancelled sync", invitationStatus: "Cancelled" }),
      meeting({ id: "m-tbc", title: "Loose date", date: "sometime in Nov" }),
      meeting({ id: "m-foreign", projectId: "someone-else", title: "SOMEONE ELSES MEETING" }),
    ],
  }));
  const page = await call(student, "GET", "/workspace/student/meetings");
  assert.equal(page.status, 200);
  for (const text of ["Prototype review", "My request", "Cancelled sync", "Loose date", "Awaiting confirmation", "Date to be confirmed"]) assert.ok(page.text.includes(text), text);
  assert.ok(!page.text.includes("SOMEONE ELSES MEETING"), "another project's meeting must not appear");
  assert.ok(!page.text.includes("HOST NOTES"), "notes stay hidden until the host logs the meeting as held");
});

test("meeting detail: own meeting renders; a foreign or unknown id does not", async () => {
  await setDb(world({ meetings: [meeting(), meeting({ id: "m-held", title: "Held review", date: istDate(-3), attendanceLogged: true, notes: "Agreed to retest in two weeks" }), meeting({ id: "m-foreign", projectId: "someone-else", title: "SOMEONE ELSES MEETING" })] }));
  const own = await call(student, "GET", "/workspace/student/meetings/m-1");
  assert.match(own.text, /Prototype review/);
  assert.match(own.text, /Walk through test results/);
  assert.match(own.text, /None have been recorded yet/);
  assert.ok(!own.text.includes("HOST NOTES"));
  const held = await call(student, "GET", "/workspace/student/meetings/m-held");
  assert.match(held.text, /Agreed to retest in two weeks/);
  const foreign = await call(student, "GET", "/workspace/student/meetings/m-foreign");
  assert.match(foreign.text, /Meeting not found/);
  assert.ok(!foreign.text.includes("SOMEONE ELSES MEETING"));
  assert.match((await call(student, "GET", "/workspace/student/meetings/nope")).text, /Meeting not found/);
});

test("meeting request: saved as 'Requested' in the real meeting store, validated, de-duplicated and owner-only", async () => {
  await setDb(world());
  const body = { projectId: appId, date: istDate(5), startTime: "11:00", agenda: "Review sensor calibration" };
  const created = await call(student, "POST", "/api/student/meeting-requests", body);
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.data.invitationStatus, "Requested");

  const stored = (await getDb()).meetings;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].invitationStatus, "Requested");
  assert.equal(stored[0].projectId, appId);

  assert.equal((await call(student, "POST", "/api/student/meeting-requests", body)).status, 409, "same slot twice");
  assert.equal((await call(student, "POST", "/api/student/meeting-requests", { ...body, date: istDate(-1) })).status, 400);
  assert.equal((await call(other, "POST", "/api/student/meeting-requests", body)).status, 404, "not their project");
  assert.equal((await getDb()).meetings.length, 1, "refused requests created nothing");

  const page = await call(student, "GET", "/workspace/student/meetings");
  assert.match(page.text, /Awaiting confirmation/);
});

test("tasks: only the student's own, status moves forward, repeats are harmless, going back is refused", async () => {
  await setDb(world({ tasks: [task(), task({ id: "t-vol", assignedRole: "volunteer", title: "VOLUNTEER ONLY" }), task({ id: "t-foreign", projectId: "someone-else", title: "FOREIGN TASK" })] }));
  const list = await call(student, "GET", "/api/student/tasks");
  assert.deepEqual(list.json.data.map((t) => t.id), ["t-1"]);

  const page = await call(student, "GET", `/workspace/student/projects/${appId}`);
  assert.match(page.text, /Upload field-test report/);
  assert.match(page.text, />Overdue</, "a past due date is shown as overdue");
  assert.match(page.text, /Mark done/);
  assert.ok(!page.text.includes("VOLUNTEER ONLY") && !page.text.includes("FOREIGN TASK"));

  const progress = await call(student, "PUT", "/api/student/tasks/t-1/status", { status: "In Progress" });
  assert.equal(progress.status, 200);
  assert.equal((await call(student, "PUT", "/api/student/tasks/t-1/status", { status: "In Progress" })).status, 200);
  assert.equal((await call(student, "PUT", "/api/student/tasks/t-1/status", { status: "Completed" })).status, 200);
  assert.equal((await getDb()).tasks.find((t) => t.id === "t-1").status, "Completed", "persisted in the store");
  assert.equal((await call(student, "PUT", "/api/student/tasks/t-1/status", { status: "Pending" })).status, 409);

  const after = await call(student, "GET", `/workspace/student/projects/${appId}`);
  assert.match(after.text, />Completed</);
  assert.ok(!after.text.includes("Mark done"));
});

test("tasks: another student, a volunteer task and bad input are all refused", async () => {
  await setDb(world({ tasks: [task(), task({ id: "t-vol", assignedRole: "volunteer" })] }));
  assert.equal((await call(other, "PUT", "/api/student/tasks/t-1/status", { status: "Completed" })).status, 404);
  assert.equal((await call(student, "PUT", "/api/student/tasks/t-vol/status", { status: "Completed" })).status, 404);
  assert.equal((await call(student, "PUT", "/api/student/tasks/t-1/status", { status: "Overdue" })).status, 400);
  assert.equal((await getDb()).tasks.find((t) => t.id === "t-1").status, "Pending");
});

test("reminders are reported only from recorded outcomes", async () => {
  await setDb(world({
    meetings: [meeting({ id: "m-sent" }), meeting({ id: "m-none", title: "No reminder meeting" })],
    reminders: [{ kind: "meeting", refId: "m-sent", status: "sent", sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
  }));
  const list = await call(student, "GET", "/api/student/meetings");
  assert.equal(list.json.data.find((m) => m.id === "m-sent").reminder.status, "sent");
  assert.equal(list.json.data.find((m) => m.id === "m-none").reminder, null);
  const detail = await call(student, "GET", "/workspace/student/meetings/m-none");
  assert.ok(!/Reminder email/.test(detail.text), "no reminder claimed when none was attempted");
});

test("backend failure: explicit error with retry on the pages, never an empty list", async () => {
  await setDb(world({ forceStatus: 500 }));
  const page = await call(student, "GET", "/workspace/student/meetings");
  assert.match(page.text, /couldn.t load your meetings/i);
  assert.match(page.text, /Try again/);
  assert.doesNotMatch(page.text, /No upcoming meetings/);
  const api = await call(student, "GET", "/api/student/tasks");
  assert.ok(api.status >= 500, `expected an explicit server-side failure, got ${api.status}`);
  assert.equal(typeof api.json.message, "string");
  assert.equal(api.json.data, undefined, "a failure must not look like an empty list");
  await setDb({});
});
