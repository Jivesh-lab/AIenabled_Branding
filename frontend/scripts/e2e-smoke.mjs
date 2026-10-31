// End-to-end smoke test: real Next.js server + real agent-service (standalone SQLite), real HTTP.
// Session cookies are signed locally with the same secret the Next server uses, so no login backend is needed.
//
//   1. agent-service:  INTERNAL_JWT_SECRET=smoke-internal  uvicorn main:app --port 8000   (cd agent-service)
//   2. frontend:       NEXTAUTH_SECRET=smoke-test-secret NEXTAUTH_URL=http://localhost:3100 \
//                      INTERNAL_JWT_SECRET=smoke-internal AGENT_SERVICE_URL=http://127.0.0.1:8000 \
//                      npx next build && npx next start -p 3100
//   3. frontend:       npm run test:e2e
import assert from "node:assert/strict";
import { test } from "node:test";
import { encode } from "next-auth/jwt";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const SECRET = process.env.NEXTAUTH_SECRET ?? "smoke-test-secret";
const RUN = Date.now().toString(36); // unique idea names per run

async function cookieFor(id, role) {
  const token = await encode({ token: { id, role, name: `User ${id}`, email: `${id}@example.edu` }, secret: SECRET });
  return `next-auth.session-token=${token}`;
}

async function call(cookie, method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { cookie, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML page */ }
  return { status: response.status, json, text };
}

const idea = (name, extra = {}) => ({
  name,
  shortDescription: "Soil-moisture driven irrigation for small farms.",
  department: "Electronics",
  domain: "AgriTech",
  projectType: "Hardware",
  maturity: "PROTOTYPE",
  problem: "Smallholder farmers over-water crops because they cannot measure soil moisture.",
  affectedUsers: "Smallholder farmers in semi-arid regions.",
  currentSolutions: "Manual scheduling.",
  solution: "A low-cost sensor node that opens valves only when the soil is dry.",
  differentiation: "Costs a tenth of commercial controllers.",
  teamMembers: [{ id: "lead", name: "Asha Rao", rollNumber: "", email: "asha@example.edu", inviteStatus: "LEAD" }],
  technologies: ["ESP32"],
  githubUrl: "",
  demoUrl: "",
  prototypeAvailable: "YES",
  attachments: [],
  declarationAccepted: true,
  ...extra,
});

let student, other, faculty, admin;
test("setup: sign session cookies", async () => {
  student = await cookieFor(`stu-a-${RUN}`, "student");
  other = await cookieFor(`stu-b-${RUN}`, "student");
  faculty = await cookieFor(`fac-${RUN}`, "faculty");
  admin = await cookieFor(`adm-${RUN}`, "admin");
});

test("identity: student pages render for the student and reject faculty", async () => {
  const ok = await call(student, "GET", "/workspace/student/projects");
  assert.equal(ok.status, 200);
  const denied = await call(faculty, "GET", "/workspace/student/projects");
  assert.equal(denied.status, 307, "faculty must be redirected away from the student workspace");
});

test("authorization: only students may write applications", async () => {
  for (const [who, cookie] of [["faculty", faculty], ["admin", admin]]) {
    const res = await call(cookie, "POST", "/api/applications/draft", { values: { name: "x" }, step: 0, furthestStep: 0 });
    assert.equal(res.status, 403, `${who} draft`);
    const sub = await call(cookie, "POST", "/api/applications/submit", idea("Nope"));
    assert.equal(sub.status, 403, `${who} submit`);
  }
});

let appId;
test("lifecycle: draft -> list -> resume -> submit -> duplicate rejected", async () => {
  const name = `Smart Irrigation ${RUN}`;
  const draft = await call(student, "POST", "/api/applications/draft", { values: { ...idea(name), declarationAccepted: undefined }, step: 2, furthestStep: 2 });
  assert.equal(draft.status, 200, JSON.stringify(draft.json));
  appId = draft.json.application_id;

  const list = await call(student, "GET", "/api/applications");
  assert.equal(list.status, 200);
  const mine = list.json.projects.find((p) => p.id === appId);
  assert.equal(mine.reviewStatus, "DRAFT");

  const detail = await call(student, "GET", `/api/applications/${appId}`);
  assert.equal(detail.json.formData._draft.step, 2);
  assert.ok(Array.isArray(detail.json.history));

  const submit = await call(student, "POST", "/api/applications/submit", idea(name, { applicationId: appId }));
  assert.equal(submit.status, 200, JSON.stringify(submit.json));
  assert.equal(submit.json.application_id, appId, "must submit the same record");

  const again = await call(student, "POST", "/api/applications/submit", idea(name, { applicationId: appId }));
  assert.equal(again.status, 409, "second submit of the same application");
  assert.equal(typeof again.json.message, "string");

  const after = await call(student, "GET", "/api/applications");
  assert.equal(after.json.projects.filter((p) => p.id === appId).length, 1);
  assert.equal(after.json.projects.find((p) => p.id === appId).reviewStatus, "SUBMITTED");
});

test("validation: server returns field-level errors and a message", async () => {
  const res = await call(student, "POST", "/api/applications/submit", idea("ab"));
  assert.equal(res.status, 422);
  assert.ok(res.json.detail.some((e) => e.loc.at(-1) === "name"));
  assert.equal(typeof res.json.message, "string");
});

test("ownership: another student cannot read or modify the application", async () => {
  const read = await call(other, "GET", `/api/applications/${appId}`);
  assert.equal(read.status, 403);
  const draft = await call(other, "POST", "/api/applications/draft", { applicationId: appId, values: { name: "hijack" }, step: 0, furthestStep: 0 });
  assert.equal(draft.status, 403);
  const list = await call(other, "GET", "/api/applications");
  assert.equal(list.json.projects.length, 0, "other student sees nothing");
});

test("detail page: renders the real project; unknown/foreign ids show an error, not fake data", async () => {
  const page = await call(student, "GET", `/workspace/student/projects/${appId}`);
  assert.equal(page.status, 200);
  assert.match(page.text, /Smart Irrigation/);
  assert.match(page.text, /Activity/);
  assert.doesNotMatch(page.text, /Eligible for Incubation|Pre-Screened/);

  const foreign = await call(other, "GET", `/workspace/student/projects/${appId}`);
  assert.match(foreign.text, /No access/);
  assert.doesNotMatch(foreign.text, /Smart Irrigation/);

  const missing = await call(student, "GET", "/workspace/student/projects/does-not-exist");
  assert.match(missing.text, /Project not found/);
});

test("reviewer endpoints are closed to students", async () => {
  const res = await call(student, "GET", "/api/admin/applications/queue");
  assert.equal(res.status, 403);
});

test("service outage: the page and API fail explicitly, never as empty data", async () => {
  // Only meaningful if AGENT_SERVICE_URL is unreachable; run with E2E_EXPECT_OUTAGE=1 against such a server.
  if (!process.env.E2E_EXPECT_OUTAGE) return;
  const api = await call(student, "GET", "/api/applications");
  assert.equal(api.status, 503);
  const page = await call(student, "GET", "/workspace/student/projects");
  assert.match(page.text, /couldn.t load your projects/i);
});
