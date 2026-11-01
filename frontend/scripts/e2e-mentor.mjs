// Phase 4 end-to-end: mentor matching visibility.
// Real Next server + real agent-service + the real Express student router (stub harness, no MongoDB).
//
//   agent-service:  INTERNAL_JWT_SECRET=smoke-internal  uvicorn main:app --port 8011
//   express stub:   JWT_SECRET=e2e-jwt node scripts/e2e-express-stub.cjs 5055
//   next:           NEXTAUTH_SECRET=smoke-test-secret NEXTAUTH_URL=http://localhost:3100 INTERNAL_JWT_SECRET=smoke-internal \
//                   AGENT_SERVICE_URL=http://127.0.0.1:8011 BACKEND_URL=http://127.0.0.1:5055 JWT_SECRET=e2e-jwt \
//                   npx next start -p 3100
//   then:           E2E_STUB_URL=http://127.0.0.1:5055 npm run test:e2e:mentor
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { encode } from "next-auth/jwt";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const STUB = process.env.E2E_STUB_URL ?? "http://127.0.0.1:5055";
const SECRET = process.env.NEXTAUTH_SECRET ?? "smoke-test-secret";
const objectId = () => randomBytes(12).toString("hex"); // the Express backend identifies users by Mongo ObjectId

const STUDENT_ID = objectId();
const OTHER_ID = objectId();
const RUN = Date.now().toString(36);

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
  name,
  shortDescription: "Soil-moisture driven irrigation for small farms.",
  department: "Electronics", domain: "AgriTech", projectType: "Hardware", maturity: "PROTOTYPE",
  problem: "Smallholder farmers over-water crops because they cannot measure soil moisture.",
  affectedUsers: "Smallholder farmers in semi-arid regions.", currentSolutions: "Manual scheduling.",
  solution: "A low-cost sensor node that opens valves only when the soil is dry.",
  differentiation: "Costs a tenth of commercial controllers.",
  teamMembers: [{ id: "lead", name: "Asha Rao", rollNumber: "", email: "asha@example.edu", inviteStatus: "LEAD" }],
  technologies: ["ESP32"], githubUrl: "", demoUrl: "", prototypeAvailable: "YES", attachments: [], declarationAccepted: true,
  ...extra,
});

let student, other, faculty, admin, appId;
const detail = (cookie = student) => call(cookie, "GET", `/workspace/student/projects/${appId}`);
const allocation = (extra) => ({
  projectId: appId, status: "requested", requestedExpertise: ["Edge AI"], recommendedMentorName: null, recommendedMentorOrg: null,
  allocatedMentorName: null, justification: "INTERNAL", coordinatorComment: "INTERNAL NOTE", recommendedByVolunteerName: "Internal Volunteer",
  updatedAt: "2026-11-01T00:00:00.000Z", ...extra,
});

test("setup: a submitted application and signed sessions", async () => {
  student = await cookieFor(STUDENT_ID, "student");
  other = await cookieFor(OTHER_ID, "student");
  faculty = await cookieFor(objectId(), "faculty");
  admin = await cookieFor(objectId(), "admin");
  await setDb({});
  const draft = await call(student, "POST", "/api/applications/draft", { values: { ...idea(`Mentor Flow ${RUN}`), declarationAccepted: undefined }, step: 0, furthestStep: 0 });
  assert.equal(draft.status, 200, JSON.stringify(draft.json));
  appId = draft.json.application_id;
  const sub = await call(student, "POST", "/api/applications/submit", idea(`Mentor Flow ${RUN}`, { applicationId: appId }));
  assert.equal(sub.status, 200, JSON.stringify(sub.json));
});

test("before approval: 'not started', derived from the application status, no mentoring lookup", async () => {
  const page = await detail();
  assert.match(page.text, /Mentor matching begins after your application is approved/);
  assert.doesNotMatch(page.text, /Confirmed assignment/);
});

test("authorization of the mentors API", async () => {
  assert.equal((await call(null, "GET", "/api/student/mentors")).status, 401);
  assert.equal((await call(faculty, "GET", "/api/student/mentors")).status, 403);
  assert.equal((await call(student, "GET", "/api/student/mentors")).status, 200);
});

test("approve the application (reviewer) so a mentoring record can exist", async () => {
  const res = await call(admin, "POST", `/api/admin/applications/${appId}/decide`, { decision: "approved" });
  assert.equal(res.status, 200, JSON.stringify(res.json));
});

test("approved + no mentor request: 'No request yet', not a mentor", async () => {
  await setDb({ profiles: [{ applicationId: appId, founderId: STUDENT_ID }], allocations: [] });
  const page = await detail();
  assert.match(page.text, /No request yet/);
  assert.match(page.text, /no mentor request has been opened yet/);
  assert.doesNotMatch(page.text, /Confirmed assignment/);
});

test("pending and in-progress are distinguished", async () => {
  const profiles = [{ applicationId: appId, founderId: STUDENT_ID }];
  await setDb({ profiles, allocations: [allocation({ status: "requested" })] });
  assert.match((await detail()).text, />Pending</);
  await setDb({ profiles, allocations: [allocation({ status: "under_review" })] });
  assert.match((await detail()).text, />In progress</);
});

test("recommended: shown as a recommendation, never as a confirmed assignment", async () => {
  await setDb({
    profiles: [{ applicationId: appId, founderId: STUDENT_ID }],
    allocations: [allocation({ status: "recommended", recommendedMentorName: "Prof. Rajiv Menon", recommendedMentorOrg: "DBIT" })],
  });
  const page = await detail();
  assert.match(page.text, /Recommendation - not confirmed/);
  assert.match(page.text, /Prof\. Rajiv Menon/);
  assert.doesNotMatch(page.text, /Confirmed assignment/);
});

test("approved with a mentor: confirmed assignment with directory expertise and a meeting link", async () => {
  await setDb({
    profiles: [{ applicationId: appId, founderId: STUDENT_ID }],
    allocations: [allocation({ status: "approved", allocatedMentorName: "Dr. K. R. Raman" })],
  });
  const page = await detail();
  assert.match(page.text, /Confirmed assignment/);
  assert.match(page.text, /Dr\. K\. R\. Raman/);
  assert.match(page.text, /Deep Learning/, "expertise comes from the existing mentor directory");
  assert.match(page.text, /Request a meeting/);
  for (const internal of ["INTERNAL NOTE", "Internal Volunteer"]) assert.ok(!page.text.includes(internal), `leaked ${internal}`);
});

test("a mentor missing from the directory shows the name only, with no invented profile", async () => {
  await setDb({
    profiles: [{ applicationId: appId, founderId: STUDENT_ID }],
    allocations: [allocation({ status: "approved", allocatedMentorName: "Someone Not Listed" })],
  });
  const page = await detail();
  assert.match(page.text, /Someone Not Listed/);
  assert.match(page.text, /No further profile details are on record/);
});

test("rejected: unsuccessful", async () => {
  await setDb({ profiles: [{ applicationId: appId, founderId: STUDENT_ID }], allocations: [allocation({ status: "rejected" })] });
  const page = await detail();
  assert.match(page.text, />Unsuccessful</);
  assert.doesNotMatch(page.text, /Confirmed assignment/);
});

test("consistency: the dashboard API reports the same state the detail page shows", async () => {
  await setDb({
    profiles: [{ applicationId: appId, founderId: STUDENT_ID }],
    allocations: [allocation({ status: "approved", allocatedMentorName: "Dr. K. R. Raman" })],
  });
  const api = await call(student, "GET", "/api/student/mentors");
  const entry = api.json.mentors[appId];
  assert.equal(entry.ok, true);
  assert.equal(entry.data.state, "matched");
  assert.equal(entry.data.mentor.name, "Dr. K. R. Raman");
  const list = await call(student, "GET", "/workspace/student/projects");
  assert.match(list.text, /Dr\. K\. R\. Raman/);
});

test("ownership: another student gets no mentor data for this project", async () => {
  const api = await call(other, "GET", "/api/student/mentors");
  assert.deepEqual(api.json.mentors, {}, "no projects, so no entries");
  const page = await detail(other);
  assert.match(page.text, /No access/);
  assert.ok(!page.text.includes("Dr. K. R. Raman"));
});

test("the mentoring system rejects a non-owner even when called directly", async () => {
  const jwt = (await import("../../backend/node_modules/jsonwebtoken/index.js")).default;
  const token = jwt.sign({ sub: OTHER_ID, role: "student" }, process.env.JWT_SECRET ?? "e2e-jwt");
  const res = await fetch(`${STUB}/api/student/mentor-allocation/${appId}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 404);
});

test("API failure: shown as an error with retry, never as 'no mentor'", async () => {
  await setDb({ profiles: [{ applicationId: appId, founderId: STUDENT_ID }], allocations: [], forceStatus: 500 });
  const page = await detail();
  assert.match(page.text, /mentoring service is unavailable/);
  assert.match(page.text, /Try again/);
  assert.doesNotMatch(page.text, /No request yet/);
  const api = await call(student, "GET", "/api/student/mentors");
  assert.equal(api.json.mentors[appId].ok, false);
  await setDb({});
});
