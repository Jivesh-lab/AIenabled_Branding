const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const h = require('./testing/harness');
const { models } = h;
const approvals = require('./approvals');
const { notifyForEvent } = require('../services/notificationService');

delete process.env.MONGO_URI;
const app = require('../app');

let server;
let base;
test.before(async () => {
  server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
test.beforeEach(() => h.resetAll());

const token = (u) => jwt.sign({ sub: String(u._id), role: u.role }, process.env.JWT_SECRET, { expiresIn: '5m' });
async function api(path, user, init = {}) {
  const res = await fetch(`${base}/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...(init.headers || {}) }, body: init.json && init.method && init.method !== 'GET' ? JSON.stringify(init.json) : init.body });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function world() {
  const student = h.person('student', 'Asha Rao');
  const other = h.person('student', 'Ravi Kumar');
  const admin = h.person('admin', 'Kavita');
  const superAdmin = h.person('super_admin', 'Root');
  const coordinator = h.person('faculty', 'Dr Neha Sharma', { facultyRole: 'coordinator' });
  const otherCoordinator = h.person('faculty', 'Dr Other', { facultyRole: 'coordinator' });
  const mentor = h.person('mentor', 'Dr Anil Rao', { profile: { expertise: ['AgriTech'] } });
  const investor = h.person('investor', 'Rohit', { isInvestorVerified: true });
  h.mem.seed(models.FacultyProject, { id: 'p1', title: 'AgriSense', domain: 'AgriTech', leadStudent: 'Asha Rao', ownerUserId: String(student._id), coordinatorUserId: String(coordinator._id), applicationId: 'p1' });
  h.mem.seed(models.FacultyProject, { id: 'p2', title: 'MediTrack', domain: 'HealthTech', leadStudent: 'Ravi Kumar', ownerUserId: String(other._id), coordinatorUserId: String(otherCoordinator._id), applicationId: 'p2' });
  return { student, other, admin, superAdmin, coordinator, otherCoordinator, mentor, investor };
}

test('authentication: there is no implicit identity - no token means 401 on faculty and agentic routes', async () => {
  world();
  for (const path of ['/faculty/overview', '/faculty/projects', '/agentic/feed', '/agentic/approvals', '/integrations/status', '/notifications']) {
    const res = await api(path, null);
    assert.strictEqual(res.status, 401, path);
  }
  const forged = await fetch(`${base}/api/faculty/overview`, { headers: { Authorization: 'Bearer not.a.token' } });
  assert.strictEqual(forged.status, 401);
});

test('the development fallback is off by default and only works when explicitly switched on in development', async () => {
  const w = world();
  const original = { env: process.env.NODE_ENV, flag: process.env.DEV_AUTH_FALLBACK, email: process.env.DEV_AUTH_FALLBACK_EMAIL };
  const desc = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { get: () => 1, configurable: true });
  try {
    process.env.NODE_ENV = 'development';
    delete process.env.DEV_AUTH_FALLBACK;
    assert.strictEqual((await api('/agentic/feed', null)).status, 401, 'development alone is not enough');
    process.env.DEV_AUTH_FALLBACK = 'true';
    delete process.env.DEV_AUTH_FALLBACK_EMAIL;
    assert.strictEqual((await api('/agentic/feed', null)).status, 401, 'the flag needs a named account');
    process.env.DEV_AUTH_FALLBACK_EMAIL = w.admin.email;
    process.env.NODE_ENV = 'production';
    assert.strictEqual((await api('/agentic/feed', null)).status, 401, 'never in production');
    process.env.NODE_ENV = 'development';
    assert.strictEqual((await api('/agentic/feed', null)).status, 200, 'explicitly enabled for the named local account');
  } finally {
    process.env.NODE_ENV = original.env; process.env.DEV_AUTH_FALLBACK = original.flag ?? ''; process.env.DEV_AUTH_FALLBACK_EMAIL = original.email ?? '';
    if (desc) Object.defineProperty(mongoose.connection, 'readyState', desc); else delete mongoose.connection.readyState;
    if (!original.flag) delete process.env.DEV_AUTH_FALLBACK; if (!original.email) delete process.env.DEV_AUTH_FALLBACK_EMAIL;
  }
});

test('role scoping: faculty see only their own startups; admins see all; students cannot reach faculty routes', async () => {
  const w = world();
  h.mem.seed(models.FacultyTask, { id: 't1', title: 'a', projectId: 'p1', dueDate: '2026-11-10', status: 'Pending' });
  h.mem.seed(models.FacultyTask, { id: 't2', title: 'b', projectId: 'p2', dueDate: '2026-11-10', status: 'Pending' });
  const mine = await api('/faculty/overview', w.coordinator);
  assert.deepStrictEqual(mine.body.data.projects.map((p) => p.id), ['p1']);
  assert.deepStrictEqual(mine.body.data.tasks.map((t) => t.id), ['t1']);
  const theirs = await api('/faculty/overview', w.otherCoordinator);
  assert.deepStrictEqual(theirs.body.data.projects.map((p) => p.id), ['p2']);
  const all = await api('/faculty/overview', w.admin);
  assert.deepStrictEqual(all.body.data.projects.map((p) => p.id).sort(), ['p1', 'p2']);
  assert.strictEqual((await api('/faculty/overview', w.student)).status, 403);
  assert.strictEqual((await api('/faculty/overview', w.investor)).status, 403);
});

test('one source of truth for pending mentor decisions, scoped to the viewer', async () => {
  const w = world();
  await approvals.request({ type: 'mentor_allocation', action: 'mentor.confirm_allocation', title: 'for p1', requestedBy: 'Mentor-Matching Agent', assignedRoles: ['faculty'], assignedUserIds: [String(w.coordinator._id)], projectId: 'p1', subjectId: 'p1' });
  await approvals.request({ type: 'mentor_allocation', action: 'mentor.confirm_allocation', title: 'for p2', requestedBy: 'Mentor-Matching Agent', assignedRoles: ['faculty'], assignedUserIds: [String(w.otherCoordinator._id)], projectId: 'p2', subjectId: 'p2' });
  assert.strictEqual((await api('/faculty/overview', w.coordinator)).body.data.metrics.pendingMentorDecisions, 1);
  assert.strictEqual((await api('/faculty/overview', w.admin)).body.data.metrics.pendingMentorDecisions, 0, 'admins do not own mentor allocations');
  assert.strictEqual((await api('/faculty/overview', w.superAdmin)).body.data.metrics.pendingMentorDecisions, 2);
  const counts = await api('/agentic/counts', w.coordinator);
  assert.strictEqual(counts.body.data.pendingApprovals, 1);
  assert.strictEqual((await api('/agentic/counts', w.student)).body.data.pendingApprovals, 0);
});

test('approval API: only the right role decides, a student cannot, and the queue is scoped', async () => {
  const w = world();
  await approvals.request({ type: 'admission', action: 'admission.decide', title: 'Decide', requestedBy: 'Application Agent', assignedRoles: ['admin'], applicationId: 'a1', subjectId: 'a1' });
  const id = h.mem.store(models.Approval)[0]._id;
  assert.strictEqual((await api('/agentic/approvals', w.student)).body.data.length, 0);
  assert.strictEqual((await api('/agentic/approvals', w.coordinator)).body.data.length, 0, 'faculty do not see admissions');
  assert.strictEqual((await api('/agentic/approvals', w.admin)).body.data.length, 1);
  const denied = await api(`/agentic/approvals/${id}/decide`, w.student, { method: 'POST', json: { decision: 'approved' } });
  assert.strictEqual(denied.status, 403);
  assert.strictEqual(h.mem.store(models.Approval)[0].status, 'pending');
  assert.strictEqual((await api(`/agentic/approvals/${id}/decide`, w.coordinator, { method: 'POST', json: { decision: 'approved' } })).status, 403);
});

test('super admin only: agent health, manual run, raw logs. Everyone else is refused', async () => {
  const w = world();
  for (const [method, path] of [['GET', '/agentic/health'], ['GET', '/agentic/super/events'], ['GET', '/agentic/super/jobs'], ['GET', '/agentic/super/outbox'], ['POST', '/agentic/override/run']]) {
    for (const user of [w.student, w.admin, w.coordinator, w.mentor, w.investor]) {
      assert.strictEqual((await api(path, user, { method, json: {} })).status, 403, `${method} ${path} as ${user.role}`);
    }
  }
  assert.strictEqual((await api('/agentic/admin/pipeline', w.student)).status, 403);
  const pipeline = await api('/agentic/admin/pipeline', w.admin);
  assert.strictEqual(pipeline.status, 200);
  assert.deepStrictEqual(Object.keys(pipeline.body.data).sort(), ['applicationsAwaitingDecision', 'applicationsByStatus', 'introductionsAwaitingApproval', 'jobsByState', 'last30Days', 'stuckWorkflows']);
  const health = await api('/agentic/health', w.superAdmin);
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.body.data.scheduler.status, 'never_ran');
  assert.strictEqual(health.body.data.integrations.email.mode, 'sandbox');
  assert.ok(!JSON.stringify(health.body).includes('INTERNAL_JWT'), 'no secrets');
});

test('manual agent runs are refused for admin and faculty with a clear message', async () => {
  const w = world();
  const faculty = await api('/faculty/mentor-matching/run', w.coordinator, { method: 'POST', json: { projectId: 'p1' } });
  assert.strictEqual(faculty.status, 403);
  assert.match(faculty.body.message, /run automatically/);
  assert.strictEqual((await api('/admin/agents/mentor-matching/trigger-sweep', w.admin, { method: 'POST', json: {} })).status, 403);
});

test('timeline and feed never leak another startup', async () => {
  const w = world();
  assert.strictEqual((await api('/agentic/timeline/p2', w.student)).status, 404);
  assert.strictEqual((await api('/agentic/timeline/p1', w.student)).status, 200);
  assert.strictEqual((await api('/agentic/timeline/p2', w.coordinator)).status, 404);
  assert.strictEqual((await api('/agentic/timeline/p2', w.admin)).status, 200);
});

test('mentor API: only the addressed mentor sees and answers a request', async () => {
  const w = world();
  const other = h.person('mentor', 'Dr Other Mentor');
  h.mem.seed(models.MentorRequest, { projectId: 'p1', projectTitle: 'AgriSense', mentorUserId: String(w.mentor._id), mentorName: 'Dr Anil Rao', dueAt: new Date(Date.now() + 86400000), status: 'pending' });
  const id = h.mem.store(models.MentorRequest)[0]._id;
  assert.strictEqual((await api('/agentic/mentor/requests', w.mentor)).body.data.length, 1);
  assert.strictEqual((await api('/agentic/mentor/requests', other)).body.data.length, 0);
  assert.strictEqual((await api('/agentic/mentor/requests', w.student)).status, 403);
  assert.strictEqual((await api(`/agentic/mentor/requests/${id}/respond`, other, { method: 'POST', json: { decision: 'accept' } })).status, 403);
  const ok = await api(`/agentic/mentor/requests/${id}/respond`, w.mentor, { method: 'POST', json: { decision: 'accept' } });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual((await api(`/agentic/mentor/requests/${id}/respond`, w.mentor, { method: 'POST', json: { decision: 'accept' } })).status, 409);
});

test('notifications: lifecycle notices go to the applicant only - not to every admin, faculty and super admin', async () => {
  const w = world();
  await notifyForEvent({ eventId: 'e1', eventType: 'application.submitted', payload: { applicant_id: String(w.student._id) }, correlationId: 'c' });
  const rows = h.mem.store(models.AgentNotification);
  assert.deepStrictEqual(rows.map((r) => r.recipientUserId), [String(w.student._id)]);
  assert.strictEqual((await api('/notifications', w.student)).body.data.length, 1);
  for (const staff of [w.admin, w.superAdmin, w.coordinator, w.mentor, w.investor]) {
    assert.strictEqual((await api('/notifications', staff)).body.data.length, 0, `${staff.role} has no unread count it does not own`);
  }
  // Same event twice: still one notice.
  await notifyForEvent({ eventId: 'e1', eventType: 'application.submitted', payload: { applicant_id: String(w.student._id) }, correlationId: 'c' });
  assert.strictEqual(h.mem.store(models.AgentNotification).length, 1);
});

test('assistant endpoint: needs a signed-in user and an actual message', async () => {
  const w = world();
  assert.strictEqual((await api('/agentic/assistant', null, { method: 'POST', json: { message: 'hi' } })).status, 401);
  assert.strictEqual((await api('/agentic/assistant', w.student, { method: 'POST', json: { message: '   ' } })).status, 400);
  const ok = await api('/agentic/assistant', w.student, { method: 'POST', json: { message: 'what did the agents do this week' } });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.data.handled, true);
});

test('the integrations status never reveals secrets and only shows missing variable NAMES to administrators', async () => {
  const w = world();
  process.env.SMTP_HOST = 'smtp.secret-host.example'; process.env.SMTP_USER = 'user'; process.env.SMTP_PASSWORD = 'hunter2';
  const student = await api('/integrations/status', w.student);
  assert.strictEqual(student.status, 200);
  assert.ok(!JSON.stringify(student.body).includes('hunter2') && !JSON.stringify(student.body).includes('secret-host'));
  assert.strictEqual(student.body.data.calendar.missing, undefined);
  const admin = await api('/integrations/status', w.admin);
  assert.ok(Array.isArray(admin.body.data.calendar.missing));
  assert.ok(!JSON.stringify(admin.body).includes('hunter2'));
  delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMTP_PASSWORD;
});

test('Google connect: friendly 503 when not configured; the callback needs a valid signed state', async () => {
  const w = world();
  const res = await api('/integrations/google/connect-url', w.student);
  assert.strictEqual(res.status, 503);
  assert.match(res.body.message, /Ask an administrator/);
  const cb = await fetch(`${base}/api/integrations/google/callback?code=x&state=forged`, { redirect: 'manual' });
  assert.strictEqual(cb.status, 302);
  assert.match(cb.headers.get('location'), /google=expired/);
});
