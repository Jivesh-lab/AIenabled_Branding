const test = require('node:test');
const assert = require('node:assert');
const h = require('./testing/harness');
const { models } = h;
const assistant = require('./assistant');
const access = require('./access');
const jobs = require('./jobs');
const approvals = require('./approvals');
const { record } = require('./actionLog');
const views = require('./views');

const rows = (Model) => h.mem.store(Model);
const user = (u) => ({ id: String(u._id), role: u.role, name: u.name });

function world() {
  const student = h.person('student', 'Asha Rao');
  const other = h.person('student', 'Ravi Kumar');
  const mentor = h.person('mentor', 'Dr Anil Rao', { profile: { expertise: ['AgriTech'] } });
  const coordinator = h.person('faculty', 'Dr Neha Sharma', { facultyRole: 'coordinator' });
  const otherCoordinator = h.person('faculty', 'Dr Other Coordinator', { facultyRole: 'coordinator' });
  const admin = h.person('admin', 'Kavita');
  const superAdmin = h.person('super_admin', 'Root');
  h.mem.seed(models.FacultyProject, { id: 'p1', title: 'AgriSense', domain: 'AgriTech', leadStudent: 'Asha Rao', ownerUserId: String(student._id), mentorUserId: String(mentor._id), coordinatorUserId: String(coordinator._id), applicationId: 'p1' });
  h.mem.seed(models.FacultyProject, { id: 'p2', title: 'MediTrack', domain: 'HealthTech', leadStudent: 'Ravi Kumar', ownerUserId: String(other._id), coordinatorUserId: String(otherCoordinator._id), applicationId: 'p2' });
  return { student, other, mentor, coordinator, otherCoordinator, admin, superAdmin };
}

async function log(over) {
  return record({ agent: 'Mentor-Matching Agent', action: 'mentor.request', status: 'success', summary: 'did a thing', audience: { userIds: [], roles: [] }, ...over });
}

test.beforeEach(() => h.resetAll());

test('feeds are scoped on the server: people see what concerns them and nothing else', async () => {
  const w = world();
  await log({ summary: 'for Asha', projectId: 'p1', audience: { userIds: [String(w.student._id)], roles: [] } });
  await log({ summary: 'for Ravi', projectId: 'p2', audience: { userIds: [String(w.other._id)], roles: [] } });
  await log({ summary: 'faculty note about p1', projectId: 'p1', audience: { userIds: [], roles: ['faculty'] } });
  await log({ summary: 'faculty note about p2', projectId: 'p2', audience: { userIds: [], roles: ['faculty'] } });
  await log({ summary: 'admin only', audience: { userIds: [], roles: ['admin'] } });
  const texts = async (u) => (await access.feedFor(user(u))).map((r) => r.summary).sort();

  assert.deepStrictEqual(await texts(w.student), ['for Asha']);
  assert.deepStrictEqual(await texts(w.other), ['for Ravi']);
  assert.deepStrictEqual(await texts(w.coordinator), ['faculty note about p1'], 'a coordinator sees their own startup only');
  assert.deepStrictEqual(await texts(w.otherCoordinator), ['faculty note about p2']);
  assert.strictEqual((await texts(w.admin)).length, 5, 'admins see the whole centre');
  assert.strictEqual((await access.feedFor(user(w.student), { projectId: 'p2' })).length, 0, 'asking for another startup returns nothing');
  assert.deepStrictEqual(await texts(w.mentor), [], 'a mentor sees only what is addressed to them');
});

test('open work is scoped too: a student sees their own agents, not another founder\'s', async () => {
  const w = world();
  await jobs.enqueue({ type: 'monitoring.case', agent: 'Monitoring Agent', dedupeKey: 'a', projectId: 'p1', subjectId: 'p1' });
  await jobs.enqueue({ type: 'monitoring.case', agent: 'Monitoring Agent', dedupeKey: 'b', projectId: 'p2', subjectId: 'p2' });
  assert.strictEqual((await access.jobsFor(user(w.student))).length, 1);
  assert.strictEqual((await access.jobsFor(user(w.other))).length, 1);
  assert.strictEqual((await access.jobsFor(user(w.coordinator))).length, 1);
  assert.strictEqual((await access.jobsFor(user(w.admin))).length, 2);
  assert.strictEqual(await access.canSeeProject(user(w.student), 'p2'), false);
  assert.strictEqual(await access.canSeeProject(user(w.admin), 'p2'), true);
});

test('job descriptions are plain sentences: they say who the agent is waiting for and never show ids', () => {
  const d = views.describeJob({ _id: 'abc123', type: 'application.review', agent: 'Application Agent', state: 'waiting_for_reply', step: 'waiting_info', data: { missing: ['your team size'] }, nextRunAt: new Date(Date.now() + 3 * 86400000), updatedAt: new Date() });
  assert.match(d.headline, /Waiting for you: your team size/);
  assert.strictEqual(d.waitingOn, 'you');
  assert.match(d.detail, /reminder follows in about 3 days/);
  const item = views.feedItem({ _id: 'x1', agent: 'Workflow Agent', summary: 'Booked a meeting', status: 'simulated', tier: 1, trigger: { type: 'event', ref: 'allocation.confirmed' }, createdAt: new Date() });
  assert.strictEqual(item.trigger, 'when a mentor allocation was confirmed');
  assert.match(item.statusLabel, /not delivered/);
});

test('assistant narrates from the real Action Log, only for that user', async () => {
  const w = world();
  const empty = await assistant.handle({ user: user(w.student), message: 'What did the agents do for my startup this week?' });
  assert.strictEqual(empty.handled, true);
  assert.match(empty.reply, /not recorded anything/);

  await log({ summary: 'Mentor-Matching Agent asked Dr Anil Rao to mentor AgriSense.', followUp: 'Waiting for a reply until 2026-11-05.', projectId: 'p1', audience: { userIds: [String(w.student._id)], roles: [] } });
  await log({ summary: 'SECRET about Ravi', projectId: 'p2', audience: { userIds: [String(w.other._id)], roles: [] } });
  const reply = await assistant.handle({ user: user(w.student), message: 'what did the agents do for my startup this week' });
  assert.match(reply.reply, /asked Dr Anil Rao/);
  assert.match(reply.reply, /Next: Waiting for a reply/);
  assert.ok(!/SECRET/.test(reply.reply));
});

test('assistant lists exactly what is missing from the application, from the open job', async () => {
  const w = world();
  await jobs.enqueue({ type: 'application.review', agent: 'Application Agent', dedupeKey: 'app1', applicationId: 'a1', data: { applicantId: String(w.student._id), missing: ['your team size - at least 2 team members', 'a prototype link'] } });
  const job = rows(models.AgentJob)[0];
  job.step = 'waiting_info'; job.state = 'waiting_for_reply'; job.data.missing = ['your team size - at least 2 team members', 'a prototype link'];
  const reply = await assistant.handle({ user: user(w.student), message: 'What information is missing from my application?' });
  assert.match(reply.reply, /team size/);
  assert.match(reply.reply, /prototype link/);
  const nothing = await assistant.handle({ user: user(w.other), message: 'What information is missing from my application?' });
  assert.match(nothing.reply, /Nothing is outstanding/);
});

test('assistant approvals: admins and coordinators see their own queue; other roles are told they have none', async () => {
  const w = world();
  await approvals.request({ type: 'admission', action: 'admission.decide', title: 'Admission decision: AgriSense', requestedBy: 'Application Agent', assignedRoles: ['admin'], subjectId: 'a1' });
  await approvals.request({ type: 'mentor_allocation', action: 'mentor.confirm_allocation', title: 'Confirm mentor for AgriSense', requestedBy: 'x', assignedRoles: ['faculty'], assignedUserIds: [String(w.coordinator._id)], subjectId: 'p1' });
  const admin = await assistant.handle({ user: user(w.admin), message: 'Show applications awaiting my approval' });
  assert.match(admin.reply, /Admission decision: AgriSense/);
  assert.ok(!/Confirm mentor/.test(admin.reply));
  const coordinator = await assistant.handle({ user: user(w.coordinator), message: 'show approvals' });
  assert.match(coordinator.reply, /Confirm mentor for AgriSense/);
  const otherCoordinator = await assistant.handle({ user: user(w.otherCoordinator), message: 'show approvals' });
  assert.match(otherCoordinator.reply, /Nothing is waiting/);
  const student = await assistant.handle({ user: user(w.student), message: 'show approvals' });
  assert.match(student.reply, /no approvals queue/);
});

test('assistant will not make a human decision, says so, and logs the refusal', async () => {
  const w = world();
  await approvals.request({ type: 'admission', action: 'admission.decide', title: 'Admission decision', requestedBy: 'x', assignedRoles: ['admin'], subjectId: 'a1' });
  for (const text of ['Approve the application for AgriSense', 'please confirm the mentor allocation', 'accept the introduction for me']) {
    const reply = await assistant.handle({ user: user(w.admin), message: text });
    assert.match(reply.reply, /cannot make that decision/);
    assert.match(reply.reply, /did not do anything/);
  }
  assert.strictEqual(rows(models.Approval)[0].status, 'pending');
  assert.ok(!h.service.calls.some((c) => c.path.endsWith('/decide')));
  assert.ok(rows(models.ActionLog).some((l) => l.status === 'blocked' && l.tier === 3 && l.trigger.type === 'assistant'));
});

test('assistant command: "schedule a review with my mentor next Thursday" runs the Workflow Agent and reports the logged result', async () => {
  const w = world();
  const reply = await assistant.handle({ user: user(w.student), message: 'Schedule a review with my mentor next Thursday' });
  const meeting = rows(models.FacultyMeeting).find((m) => m.source === 'agent');
  assert.ok(meeting, 'a meeting really exists');
  assert.match(reply.reply, /^Done\. The Workflow Agent booked/);
  assert.deepStrictEqual([...meeting.attendeeUserIds].sort(), [String(w.student._id), String(w.mentor._id)].sort());
  assert.ok(new Date(meeting.startUtc) >= new Date('2026-11-05T00:00:00+05:30'), 'on or after the requested Thursday');
  assert.match(reply.reply, /sandbox outbox and NOT delivered/, 'it does not claim an invitation was delivered');
  const logged = rows(models.ActionLog).find((l) => l.action === 'meeting.schedule');
  assert.strictEqual(logged.trigger.type, 'assistant');
  assert.strictEqual(reply.performed[0].status, logged.status);
});

test('assistant command: a person can be named; an ambiguous or unknown project is asked about, not guessed', async () => {
  const w = world();
  const named = await assistant.handle({ user: user(w.coordinator), message: 'Schedule a review meeting with Dr Anil on 2026-11-10' });
  assert.match(named.reply, /^Done/);
  assert.ok(rows(models.FacultyMeeting)[0].attendeeUserIds.includes(String(w.mentor._id)));
  h.resetAll();
  const w2 = world();
  h.mem.seed(models.FacultyProject, { id: 'p3', title: 'SecondOne', domain: 'x', leadStudent: 'x', ownerUserId: String(w2.student._id), coordinatorUserId: String(w2.coordinator._id) });
  const ask = await assistant.handle({ user: user(w2.admin), message: 'schedule a meeting with the mentor tomorrow' });
  assert.match(ask.reply, /Which startup do you mean\?/);
  assert.strictEqual(rows(models.FacultyMeeting).length, 0);
});

test('assistant command: a person cannot schedule for someone else\'s startup', async () => {
  const w = world();
  const reply = await assistant.handle({ user: user(w.other), message: 'Schedule a review with Dr Anil next Thursday for AgriSense' });
  assert.strictEqual(rows(models.FacultyMeeting).filter((m) => m.projectId === 'p1').length, 0);
  assert.ok(!/AgriSense.*booked/.test(reply.reply));
});

test('assistant command: when no common time exists it says nothing is booked, and does not claim success', async () => {
  const w = world();
  for (let d = 0; d < 30; d += 1) {
    const start = new Date(Date.now() + d * 86400000 - 3600000 * 12);
    h.mem.seed(models.FacultyMeeting, { id: `b${d}`, title: 'Booked', projectId: 'z', projectTitle: 'z', date: '2026-11-01', startUtc: start, endUtc: new Date(start.getTime() + 86400000), attendeeUserIds: [String(w.mentor._id)], outcome: 'pending' });
  }
  const reply = await assistant.handle({ user: user(w.student), message: 'Schedule a review with my mentor next Thursday' });
  assert.match(reply.reply, /Nothing is booked yet/);
  assert.strictEqual(rows(models.FacultyMeeting).filter((m) => m.source === 'agent').length, 0);
});

test('assistant: a startup with no mentor is told so instead of being given a fake meeting', async () => {
  const w = world();
  const reply = await assistant.handle({ user: user(w.other), message: 'Schedule a review with my mentor tomorrow' });
  assert.match(reply.reply, /no confirmed mentor yet/);
  assert.strictEqual(rows(models.FacultyMeeting).length, 0);
});

test('assistant: unknown questions are passed on (handled:false) and the response says whether an LLM is available', async () => {
  const w = world();
  const unhandled = await assistant.handle({ user: user(w.student), message: 'what is a convertible note?' });
  assert.strictEqual(unhandled.handled, false);
  assert.strictEqual(unhandled.hint, 'llm_not_configured');
});

test('assistant date parsing is deterministic', () => {
  const sunday = new Date('2026-11-01T06:00:00Z');
  assert.strictEqual(assistant.parseDate('next Thursday', sunday), '2026-11-05');
  assert.strictEqual(assistant.parseDate('tomorrow', sunday), '2026-11-02');
  assert.strictEqual(assistant.parseDate('on Sunday', sunday), '2026-11-08', 'the same weekday means next week');
  assert.strictEqual(assistant.parseDate('in 3 days', sunday), '2026-11-04');
  assert.strictEqual(assistant.parseDate('2026-12-25', sunday), '2026-12-25');
  assert.strictEqual(assistant.parseDate('whenever', sunday), null);
  assert.strictEqual(assistant.parseTime('at 4pm'), '16:00');
  assert.strictEqual(assistant.parseTime('9:30 am'), '09:30');
});
