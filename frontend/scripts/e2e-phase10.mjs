// Phase 10 end-to-end: the scenarios the earlier suites did not cover.
//   sessions (expired / tampered / wrong secret), rejection, double-submit racing through the Next layer,
//   other-role regression, and a full service outage with recovery.
// Run via `npm run verify` (starts everything), or by hand like the other e2e files:  npm run test:e2e:phase10
// The outage tests need a second Next server whose AGENT_SERVICE_URL points nowhere: E2E_OUTAGE_URL=http://localhost:3101
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { encode } from "next-auth/jwt";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const OUTAGE = process.env.E2E_OUTAGE_URL ?? "";
const STUB = process.env.E2E_STUB_URL ?? "http://127.0.0.1:5055";
const SECRET = process.env.NEXTAUTH_SECRET ?? "smoke-test-secret";
const objectId = () => randomBytes(12).toString("hex");
const RUN = Date.now().toString(36);

async function cookieFor(id, role, { secret = SECRET, maxAge } = {}) {
  const token = await encode({ token: { id, role, name: `User ${id.slice(0, 4)}`, email: `${id}@example.edu` }, secret, ...(maxAge ? { maxAge } : {}) });
  return `next-auth.session-token=${token}`;
}
async function call(cookie, method, path, body, base = BASE) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const raw = await response.text();
  let json = null;
  try { json = JSON.parse(raw); } catch { /* HTML */ }
  return { status: response.status, json, text: raw.replace(/<!-- -->/g, ""), location: response.headers.get("location") };
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

const S = objectId();
let student, faculty, mentor, investor, admin;
const projects = async (cookie = student) => (await call(cookie, "GET", "/api/applications")).json.projects;

test("setup", async () => {
  student = await cookieFor(S, "student");
  faculty = await cookieFor(objectId(), "faculty");
  mentor = await cookieFor(objectId(), "mentor");
  investor = await cookieFor(objectId(), "investor");
  admin = await cookieFor(objectId(), "admin");
  await setDb({});
});

// ── 1. Login and access control ──────────────────────────────────────────────

test("no session: every student page redirects to login and every API says 401", async () => {
  for (const path of ["dashboard", "projects", "journey", "meetings", "submit"]) {
    const res = await call(null, "GET", `/workspace/student/${path}`);
    assert.equal(res.status, 307, path);
    assert.match(res.location ?? "", /\/login\?callbackUrl=/, path);
  }
  for (const [method, path] of [["GET", "/api/applications"], ["GET", "/api/student/overview"], ["GET", "/api/student/tasks"], ["POST", "/api/student/assistant"], ["POST", "/api/applications/draft"]]) {
    assert.equal((await call(null, method, path, method === "POST" ? {} : undefined)).status, 401, `${method} ${path}`);
  }
});

test("invalid sessions are treated as signed out: garbage, wrong signing secret, expired", async () => {
  const forged = await cookieFor(S, "student", { secret: "not-the-real-secret" });
  // NextAuth tolerates 15s of clock skew, so use a token that expired a minute ago.
  const expired = await cookieFor(S, "student", { maxAge: -60 });
  for (const [name, cookie] of [["garbage", "next-auth.session-token=not.a.jwt"], ["wrong secret", forged], ["expired", expired]]) {
    const page = await call(cookie, "GET", "/workspace/student/dashboard");
    assert.equal(page.status, 307, `${name}: page`);
    assert.equal((await call(cookie, "GET", "/api/applications")).status, 401, `${name}: API`);
    assert.equal((await call(cookie, "POST", "/api/applications/draft", { values: { name: "x" }, step: 0, furthestStep: 0 })).status, 401, `${name}: write`);
  }
});

test("a role claim cannot be self-assigned: a student session cannot reach reviewer or admin endpoints", async () => {
  for (const path of ["/api/admin/applications/queue", "/api/admin/applications/x", "/api/admin/users"]) {
    const res = await call(student, "GET", path);
    assert.ok([401, 403].includes(res.status), `${path} -> ${res.status}`);
  }
  assert.equal((await call(student, "POST", "/api/admin/applications/x/decide", { decision: "approved" })).status, 403);
});

test("other roles keep working and are kept out of the student workspace", async () => {
  for (const [name, cookie] of [["faculty", faculty], ["mentor", mentor], ["investor", investor]]) {
    const res = await call(cookie, "GET", "/workspace/student/projects");
    assert.equal(res.status, 307, `${name} is redirected away from the student workspace`);
    assert.equal((await call(cookie, "GET", "/api/student/overview")).status, 403, `${name} cannot read student data`);
  }
  assert.equal((await call(faculty, "GET", "/workspace/faculty/dashboard")).status, 200, "faculty dashboard still renders");
  assert.equal((await call(mentor, "GET", "/workspace/mentor/dashboard")).status, 200, "mentor dashboard still renders");
  assert.equal((await call(investor, "GET", "/workspace/investor/dashboard")).status, 200, "investor dashboard still renders");
  assert.equal((await call(null, "GET", "/login")).status, 200);
  assert.equal((await call(null, "GET", "/")).status, 200);
  const adminView = await call(admin, "GET", "/workspace/student/projects");
  assert.equal(adminView.status, 200, "admins may inspect the student workspace");
  assert.ok((await projects(admin)).length === 0, "...and see none of the students' projects");
});

// ── 4. Duplicate submission, raced through the Next layer ────────────────────

test("double-click: two simultaneous submits of one draft create one submission", async () => {
  const name = `Phase10 Race ${RUN}`;
  const draft = await call(student, "POST", "/api/applications/draft", { values: { ...idea(name), declarationAccepted: undefined }, step: 3, furthestStep: 3 });
  const id = draft.json.application_id;
  const results = await Promise.all([1, 2, 3].map(() => call(student, "POST", "/api/applications/submit", idea(name, { applicationId: id }))));
  const codes = results.map((r) => r.status).sort();
  assert.deepEqual(codes, [200, 409, 409], `exactly one winner, got ${codes}`);
  assert.equal((await projects()).filter((p) => p.id === id).length, 1);
  assert.equal((await projects()).find((p) => p.id === id).reviewStatus, "SUBMITTED");
});

test("double-click without a draft: two simultaneous first submits of one idea create one record", async () => {
  const name = `Phase10 Fresh ${RUN}`;
  const results = await Promise.all([1, 2].map(() => call(student, "POST", "/api/applications/submit", idea(name))));
  const codes = results.map((r) => r.status).sort();
  assert.deepEqual(codes, [200, 409]);
  assert.equal((await projects()).filter((p) => p.name === name).length, 1);
});

// ── 3 & 5. Validation, rejection ─────────────────────────────────────────────

test("an invalid submission is refused with field errors and leaves nothing behind", async () => {
  const before = (await projects()).length;
  const bad = await call(student, "POST", "/api/applications/submit", idea(`Phase10 Bad ${RUN}`, { name: "ab", teamMembers: [] }));
  assert.equal(bad.status, 422);
  assert.ok(Array.isArray(bad.json.detail) && bad.json.detail.some((e) => e.loc.at(-1) === "name"));
  assert.equal((await projects()).length, before);
});

let rejectedId;
test("rejection: the decision is final for the student and every page agrees", async () => {
  const name = `Phase10 Reject ${RUN}`;
  rejectedId = (await call(student, "POST", "/api/applications/submit", idea(name))).json.application_id;
  assert.equal((await call(admin, "POST", `/api/admin/applications/${rejectedId}/decide`, { decision: "rejected", comments: "Out of scope" })).status, 200);

  assert.equal((await projects()).find((p) => p.id === rejectedId).reviewStatus, "REJECTED");
  assert.match((await call(student, "GET", `/workspace/student/projects/${rejectedId}`)).text, /Rejected/);
  const journey = (await call(student, "GET", "/workspace/student/journey")).text;
  assert.ok(journey.includes(name));
  assert.match(journey, /Not approved by the review panel/);

  // The student cannot reopen or work around it.
  assert.equal((await call(student, "POST", "/api/applications/submit", idea(name, { applicationId: rejectedId }))).status, 409);
  assert.equal((await call(student, "POST", "/api/applications/draft", { applicationId: rejectedId, values: { name: "x" }, step: 0, furthestStep: 0 })).status, 409);
  assert.equal((await call(student, "POST", `/api/applications/${rejectedId}/milestones`, { title: "Sneaky milestone" })).status, 409);
  assert.equal((await call(student, "POST", "/api/student/assistant", { message: "What is my status?", projectId: rejectedId })).json.verified[0].text, `Your application "${name}" is not approved (rejected).`);
});

// ── 13. Whole-service outage and recovery ────────────────────────────────────

test("outage: with the application service unreachable, pages and APIs fail explicitly", { skip: !OUTAGE && "set E2E_OUTAGE_URL to a Next server whose AGENT_SERVICE_URL is unreachable" }, async () => {
  for (const path of ["dashboard", "projects", "journey"]) {
    const res = await call(student, "GET", `/workspace/student/${path}`, undefined, OUTAGE);
    assert.equal(res.status, 200, path);
    if (path !== "dashboard") assert.match(res.text, /couldn.t load/i, `${path} says it could not load`);
    assert.doesNotMatch(res.text, /You haven.t submitted any ideas yet|Your journey starts with an idea/, `${path} must not present an outage as an empty account`);
  }
  const overview = await call(student, "GET", "/api/student/overview", undefined, OUTAGE);
  assert.equal(overview.status, 200);
  assert.equal(overview.json.projects.ok, false, "the projects section reports its own failure");
  assert.equal((await call(student, "GET", "/api/applications", undefined, OUTAGE)).status, 503);
  assert.equal((await call(student, "POST", "/api/student/assistant", { message: "status?" }, OUTAGE)).status, 503);
  assert.equal((await call(student, "POST", "/api/applications/submit", idea("Outage idea"), OUTAGE)).status, 503, "a submit during an outage is not silently accepted");
});

test("recovery: the same student on the healthy server sees the same saved data", async () => {
  const all = await projects();
  assert.ok(all.some((p) => p.id === rejectedId), "nothing was lost");
  const overview = (await call(student, "GET", "/api/student/overview")).json;
  assert.ok(overview.projects.ok);
  assert.equal(overview.projects.data.length, all.length);
});
