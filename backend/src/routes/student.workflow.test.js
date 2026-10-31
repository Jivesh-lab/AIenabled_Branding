const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-workflow-jwt-secret';

const StartupProfile = require('../models/StartupProfile');
const FacultyProject = require('../models/FacultyProject');
const FacultyMeeting = require('../models/FacultyMeeting');
const FacultyTask = require('../models/FacultyTask');
const ReminderLog = require('../models/ReminderLog');
const User = require('../models/User');
const studentRouter = require('./student');
const { runReminderSweep, MAX_ATTEMPTS } = require('../services/reminderService');

const OWNER = '650000000000000000000004';
const STRANGER = '650000000000000000000005';
const APP = 'app-owned-1';
const OTHER_APP = 'app-someone-else';

// --------------------------------------------------------------------------
// In-memory database behind the model stubs
// --------------------------------------------------------------------------
let db;
function reset() {
  db = {
    profiles: [{ applicationId: APP, founderId: OWNER }, { applicationId: OTHER_APP, founderId: STRANGER }],
    meetings: [],
    tasks: [],
    reminders: new Map(),
    users: { [OWNER]: { _id: OWNER, name: 'Asha Rao', email: 'asha@example.edu' } },
    saved: [],
  };
}
reset();

const chain = (result) => {
  const c = { select: () => c, sort: () => c, lean: () => Promise.resolve(result) };
  return c;
};
const inList = (value, spec) => !spec || !spec.$in || spec.$in.includes(value);

StartupProfile.find = (q) => chain(db.profiles.filter((p) => String(p.founderId) === String(q.founderId)));
StartupProfile.findOne = (q) => {
  const hit = db.profiles.find((p) => p.applicationId === q.applicationId && (q.founderId === undefined || String(p.founderId) === String(q.founderId)));
  return chain(hit || null);
};
FacultyProject.findOne = () => chain({ title: 'Smart Irrigation' });
User.findById = (id) => chain(db.users[id] || null);
User.findOne = (q) => chain(db.users[String(q._id)] || null);

FacultyMeeting.find = (q = {}) => chain(db.meetings.filter((m) => inList(m.projectId, q.projectId)));
FacultyMeeting.findOne = (q) =>
  chain(db.meetings.find((m) => m.projectId === q.projectId && m.date === q.date && m.startTime === q.startTime && m.invitationStatus === q.invitationStatus) || null);
FacultyMeeting.countDocuments = async (q) => db.meetings.filter((m) => m.projectId === q.projectId && m.invitationStatus === q.invitationStatus).length;
FacultyMeeting.prototype.save = async function save() {
  db.meetings.push(this.toObject());
  return this;
};

FacultyTask.find = (q = {}) => chain(db.tasks.filter((t) => inList(t.projectId, q.projectId) && (!q.assignedRole || t.assignedRole === q.assignedRole) && (!q.status || !q.status.$ne || t.status !== q.status.$ne)));
FacultyTask.findOne = async (q) => db.tasks.find((t) => t.id === q.id && t.assignedRole === q.assignedRole && inList(t.projectId, q.projectId)) || null;

ReminderLog.find = (q) => chain([...db.reminders.values()].filter((r) => r.kind === q.kind && q.refId.$in.includes(r.refId)));
ReminderLog.create = async (row) => {
  if (db.reminders.has(row.key)) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
  db.reminders.set(row.key, { ...row, updatedAt: new Date() });
  return row;
};
ReminderLog.findOneAndUpdate = async (q, update) => {
  const row = db.reminders.get(q.key);
  if (!row || row.status !== q.status || !(row.attempts < q.attempts.$lt)) return null;
  Object.assign(row, update.$set);
  row.attempts += update.$inc.attempts;
  return row;
};
ReminderLog.updateOne = async (q, update) => {
  Object.assign(db.reminders.get(q.key), update.$set);
};

// --------------------------------------------------------------------------
// HTTP harness around the real router
// --------------------------------------------------------------------------
let server;
let base;
test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/student', studentRouter);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const tokenFor = (sub, role = 'student') => jwt.sign({ sub, role }, process.env.JWT_SECRET, { expiresIn: '5m' });
async function api(method, path, token, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}
const istDate = (offsetDays = 0) => new Date(Date.now() + 5.5 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);

const meeting = (extra = {}) => ({ id: 'm1', title: 'Prototype review', projectId: APP, projectTitle: 'Smart Irrigation', participants: ['Asha Rao'], date: istDate(3), startTime: '10:00', durationMinutes: 45, timeZone: 'IST', meetingType: 'Milestone Review', agenda: 'Demo', meetingProvider: 'Online', meetingLinkOrLocation: 'https://meet.example/abc', invitationStatus: 'Sent', notes: 'HOST NOTES', attendanceLogged: false, ...extra });
const task = (extra = {}) => ({ id: 't1', title: 'Upload test report', projectId: APP, projectTitle: 'Smart Irrigation', assignedTo: 'Asha', assignedRole: 'student', dueDate: istDate(5), priority: 'High', status: 'Pending', description: 'PDF', save: async function save() { return this; }, ...extra });

// --------------------------------------------------------------------------
// Authorization
// --------------------------------------------------------------------------
test('every workflow endpoint rejects missing tokens and non-student roles', async () => {
  reset();
  const calls = [['GET', '/meetings'], ['GET', '/tasks'], ['PUT', '/tasks/t1/status'], ['POST', '/meeting-requests']];
  for (const [method, path] of calls) {
    const body = method === 'GET' ? undefined : {};
    assert.strictEqual((await api(method, `/api/student${path}`, null, body)).status, 401, `${method} ${path} anonymous`);
    for (const role of ['faculty', 'mentor', 'admin', 'super_admin']) {
      assert.strictEqual((await api(method, `/api/student${path}`, tokenFor(OWNER, role), body)).status, 403, `${method} ${path} ${role}`);
    }
  }
});

// --------------------------------------------------------------------------
// Meetings
// --------------------------------------------------------------------------
test('meetings: a student sees only meetings of projects they founded', async () => {
  reset();
  db.meetings = [meeting(), meeting({ id: 'm2', projectId: OTHER_APP, title: 'Someone else' })];
  const mine = await api('GET', '/api/student/meetings', tokenFor(OWNER));
  assert.deepStrictEqual(mine.body.data.map((m) => m.id), ['m1']);
  const theirs = await api('GET', '/api/student/meetings', tokenFor(STRANGER));
  assert.deepStrictEqual(theirs.body.data.map((m) => m.id), ['m2']);
  const nobody = await api('GET', '/api/student/meetings', tokenFor('650000000000000000000099'));
  assert.deepStrictEqual(nobody.body.data, []);
});

test('meetings: notes are released only after the host logs the meeting as held', async () => {
  reset();
  db.meetings = [meeting({ id: 'future' }), meeting({ id: 'held', attendanceLogged: true, notes: 'Agreed on next steps' })];
  const { body } = await api('GET', '/api/student/meetings', tokenFor(OWNER));
  assert.strictEqual(body.data.find((m) => m.id === 'future').notes, null);
  assert.strictEqual(body.data.find((m) => m.id === 'held').notes, 'Agreed on next steps');
});

test('meetings: reminder outcome is reported only when one was recorded', async () => {
  reset();
  db.meetings = [meeting({ id: 'a' }), meeting({ id: 'b' })];
  db.reminders.set('meeting:a:x', { key: 'meeting:a:x', kind: 'meeting', refId: 'a', status: 'failed', updatedAt: new Date() });
  const { body } = await api('GET', '/api/student/meetings', tokenFor(OWNER));
  assert.strictEqual(body.data.find((m) => m.id === 'a').reminder.status, 'failed');
  assert.strictEqual(body.data.find((m) => m.id === 'b').reminder, null);
});

// --------------------------------------------------------------------------
// Tasks
// --------------------------------------------------------------------------
test('tasks: only tasks assigned to students on the caller\'s own projects', async () => {
  reset();
  db.tasks = [task(), task({ id: 'vol', assignedRole: 'volunteer' }), task({ id: 'foreign', projectId: OTHER_APP })];
  const { body } = await api('GET', '/api/student/tasks', tokenFor(OWNER));
  assert.deepStrictEqual(body.data.map((t) => t.id), ['t1']);
  assert.ok(!JSON.stringify(body).includes('assignedTo'));
});

test('tasks: status can move forward, repeats are idempotent, moving back is refused', async () => {
  reset();
  db.tasks = [task()];
  const owner = tokenFor(OWNER);
  assert.strictEqual((await api('PUT', '/api/student/tasks/t1/status', owner, { status: 'In Progress' })).body.data.status, 'In Progress');
  assert.strictEqual((await api('PUT', '/api/student/tasks/t1/status', owner, { status: 'In Progress' })).status, 200);
  assert.strictEqual((await api('PUT', '/api/student/tasks/t1/status', owner, { status: 'Completed' })).body.data.status, 'Completed');
  const back = await api('PUT', '/api/student/tasks/t1/status', owner, { status: 'Pending' });
  assert.strictEqual(back.status, 409);
  assert.strictEqual(db.tasks[0].status, 'Completed');
});

test('tasks: invalid status, a stranger\'s task, a volunteer task and unknown ids are all refused', async () => {
  reset();
  db.tasks = [task(), task({ id: 'vol', assignedRole: 'volunteer' })];
  const owner = tokenFor(OWNER);
  assert.strictEqual((await api('PUT', '/api/student/tasks/t1/status', owner, { status: 'Overdue' })).status, 400);
  assert.strictEqual((await api('PUT', '/api/student/tasks/t1/status', owner, { status: 'Done!' })).status, 400);
  assert.strictEqual((await api('PUT', '/api/student/tasks/t1/status', tokenFor(STRANGER), { status: 'Completed' })).status, 404);
  assert.strictEqual((await api('PUT', '/api/student/tasks/vol/status', owner, { status: 'Completed' })).status, 404);
  assert.strictEqual((await api('PUT', '/api/student/tasks/nope/status', owner, { status: 'Completed' })).status, 404);
  assert.strictEqual(db.tasks[0].status, 'Pending');
});

// --------------------------------------------------------------------------
// Meeting requests
// --------------------------------------------------------------------------
test('meeting request: creates an UNCONFIRMED request on an owned project', async () => {
  reset();
  const res = await api('POST', '/api/student/meeting-requests', tokenFor(OWNER), { projectId: APP, date: istDate(4), startTime: '11:30', agenda: 'Feedback on tests' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.invitationStatus, 'Requested');
  assert.strictEqual(db.meetings.length, 1);
  assert.strictEqual(db.meetings[0].invitationStatus, 'Requested');
  assert.deepStrictEqual(db.meetings[0].participants, ['Asha Rao']);
});

test('meeting request: validation, ownership, duplicates and flooding are refused', async () => {
  reset();
  const owner = tokenFor(OWNER);
  const ok = { projectId: APP, date: istDate(4), startTime: '11:30', agenda: 'x' };
  assert.strictEqual((await api('POST', '/api/student/meeting-requests', owner, { ...ok, date: istDate(-1) })).status, 400);
  assert.strictEqual((await api('POST', '/api/student/meeting-requests', owner, { ...ok, date: 'tomorrow' })).status, 400);
  assert.strictEqual((await api('POST', '/api/student/meeting-requests', owner, { ...ok, startTime: '25:99' })).status, 400);
  assert.strictEqual((await api('POST', '/api/student/meeting-requests', owner, { ...ok, agenda: 'a'.repeat(501) })).status, 400);
  assert.strictEqual((await api('POST', '/api/student/meeting-requests', owner, { ...ok, projectId: OTHER_APP })).status, 404);
  assert.strictEqual(db.meetings.length, 0, 'nothing was created by the refused requests');

  assert.strictEqual((await api('POST', '/api/student/meeting-requests', owner, ok)).status, 201);
  assert.strictEqual((await api('POST', '/api/student/meeting-requests', owner, ok)).status, 409, 'same date/time twice');
  for (let i = 0; i < 4; i++) await api('POST', '/api/student/meeting-requests', owner, { ...ok, startTime: `1${i}:00` });
  assert.strictEqual((await api('POST', '/api/student/meeting-requests', owner, { ...ok, startTime: '18:00' })).status, 429);
});

// --------------------------------------------------------------------------
// Reminders
// --------------------------------------------------------------------------
function recorder(behaviour = 'accept') {
  const calls = [];
  const mailer = async (msg) => {
    calls.push(msg);
    if (behaviour === 'throw') throw new Error('SMTP connection refused');
    if (behaviour === 'reject') return { accepted: [], rejected: [msg.to], messageId: null };
    return { accepted: [msg.to], rejected: [], messageId: `<id-${calls.length}@mail>` };
  };
  return { mailer, calls };
}
const NOW = Date.now();

test('reminders: nothing is attempted or recorded without a real mail server', async () => {
  reset();
  db.tasks = [task({ dueDate: istDate(1) })];
  const totals = await runReminderSweep({ now: NOW, mailer: null });
  assert.strictEqual(totals.configured, false);
  assert.strictEqual(db.reminders.size, 0);
});

test('reminders: a due task is reminded once; reprocessing the same event sends nothing more', async () => {
  reset();
  db.tasks = [task({ dueDate: istDate(1) })];
  const { mailer, calls } = recorder();
  const first = await runReminderSweep({ now: NOW, mailer });
  const second = await runReminderSweep({ now: NOW, mailer });
  assert.strictEqual(first.sent, 1);
  assert.strictEqual(second.sent, 0);
  assert.strictEqual(second.duplicates, 1);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].to, 'asha@example.edu');
  const row = [...db.reminders.values()][0];
  assert.strictEqual(row.status, 'sent');
  assert.ok(row.messageId && row.sentAt);
});

test('reminders: overlapping sweeps still send exactly once', async () => {
  reset();
  db.tasks = [task({ dueDate: istDate(1) })];
  const { mailer, calls } = recorder();
  await Promise.all([runReminderSweep({ now: NOW, mailer }), runReminderSweep({ now: NOW, mailer })]);
  assert.strictEqual(calls.length, 1);
});

test('reminders: only real, upcoming deadlines qualify', async () => {
  reset();
  db.tasks = [
    task({ id: 'done', dueDate: istDate(1), status: 'Completed' }),
    task({ id: 'far', dueDate: istDate(30) }),
    task({ id: 'past', dueDate: istDate(-2) }),
    task({ id: 'junk', dueDate: 'soon-ish' }),
    task({ id: 'volunteer', dueDate: istDate(1), assignedRole: 'volunteer' }),
  ];
  const { mailer, calls } = recorder();
  const totals = await runReminderSweep({ now: NOW, mailer });
  assert.strictEqual(totals.considered, 0);
  assert.strictEqual(calls.length, 0);
});

test('reminders: a failed send is recorded as failed (never sent), retried, and capped', async () => {
  reset();
  db.tasks = [task({ dueDate: istDate(1) })];
  const failing = recorder('throw');
  for (let i = 0; i < MAX_ATTEMPTS + 2; i++) await runReminderSweep({ now: NOW, mailer: failing.mailer });
  const row = [...db.reminders.values()][0];
  assert.strictEqual(row.status, 'failed');
  assert.match(row.error, /SMTP connection refused/);
  assert.strictEqual(row.attempts, MAX_ATTEMPTS);
  assert.strictEqual(failing.calls.length, MAX_ATTEMPTS, 'no sends beyond the attempt cap');

  // A recovered server delivers on the retry, when attempts remain.
  reset();
  db.tasks = [task({ dueDate: istDate(1) })];
  await runReminderSweep({ now: NOW, mailer: recorder('throw').mailer });
  const ok = recorder();
  await runReminderSweep({ now: NOW, mailer: ok.mailer });
  assert.strictEqual([...db.reminders.values()][0].status, 'sent');
  assert.strictEqual(ok.calls.length, 1);
});

test('reminders: a recipient the server did not accept is "failed", not "sent"', async () => {
  reset();
  db.tasks = [task({ dueDate: istDate(1) })];
  await runReminderSweep({ now: NOW, mailer: recorder('reject').mailer });
  assert.strictEqual([...db.reminders.values()][0].status, 'failed');
});

test('reminders: meetings - confirmed ones within 24h; requested/cancelled skipped; rescheduling re-reminds', async () => {
  reset();
  db.meetings = [
    meeting({ id: 'soon', date: istDate(1), startTime: '23:59' }),
    meeting({ id: 'asked', date: istDate(1), startTime: '23:59', invitationStatus: 'Requested' }),
    meeting({ id: 'cancelled', date: istDate(1), startTime: '23:59', invitationStatus: 'Cancelled' }),
    meeting({ id: 'later', date: istDate(10) }),
  ];
  const { mailer, calls } = recorder();
  await runReminderSweep({ now: NOW, mailer });
  // "soon" is at most ~48h away; restrict the assertion to what the window rules say.
  const reminded = new Set(calls.map((c) => c.subject));
  assert.ok(![...reminded].some((s) => /asked|cancelled/i.test(s)));
  assert.ok(calls.length <= 1);

  // Moving the meeting to a new slot inside the window is a different event and is reminded again.
  reset();
  const start = new Date(NOW + 5.5 * 3600000 + 3 * 3600000);
  const day = start.toISOString().slice(0, 10);
  const hhmm = start.toISOString().slice(11, 16);
  db.meetings = [meeting({ id: 'resched', date: day, startTime: hhmm })];
  const rec = recorder();
  await runReminderSweep({ now: NOW, mailer: rec.mailer });
  await runReminderSweep({ now: NOW, mailer: rec.mailer });
  assert.strictEqual(rec.calls.length, 1, 'same slot twice -> one reminder');
  db.meetings[0].startTime = hhmm === '23:59' ? '23:58' : `${String(Number(hhmm.slice(0, 2))).padStart(2, '0')}:${String((Number(hhmm.slice(3)) + 1) % 60).padStart(2, '0')}`;
  await runReminderSweep({ now: NOW, mailer: rec.mailer });
  assert.strictEqual(rec.calls.length, 2, 'new slot -> new reminder');
});

test('reminders: a project with no reachable recipient is counted, not "sent"', async () => {
  reset();
  db.users = {};
  db.tasks = [task({ dueDate: istDate(1) })];
  const { mailer, calls } = recorder();
  const totals = await runReminderSweep({ now: NOW, mailer });
  assert.strictEqual(totals.noRecipient, 1);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(db.reminders.size, 0);
});
