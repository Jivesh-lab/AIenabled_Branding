const test = require('node:test');
const assert = require('node:assert');
const h = require('./testing/harness');
const { models } = h;
const jobs = require('./jobs');
const approvals = require('./approvals');
const { handleDomainEvent } = require('./dispatcher');
const mentorAgent = require('./agents/mentorAgent');
const workflowAgent = require('./agents/workflowAgent');
const { localParts } = require('./time');

const T0 = new Date('2026-11-02T09:00:00Z'); // Monday 14:30 IST
let n = 0;
const rows = (Model) => h.mem.store(Model);
const logs = (action) => rows(models.ActionLog).filter((l) => !action || l.action === action);
const ev = (eventType, extra) => ({ eventId: `e${++n}`, correlationId: 'c1', ...extra, eventType });
const user = (u, extra = {}) => ({ id: String(u._id), role: u.role, name: u.name, ...extra });

async function approvedStartup() {
  const student = h.person('student', 'Asha Rao');
  const admin = h.person('admin', 'Kavita Deshmukh');
  const coordinator = h.person('faculty', 'Dr Neha Sharma', { facultyRole: 'coordinator' });
  const app = h.application(student._id);
  app.status = 'APPROVED';
  await handleDomainEvent(ev('application.approved', { applicationId: app.id, aggregateId: app.id, actorId: String(admin._id), payload: {} }));
  return { student, admin, coordinator, app, project: rows(models.FacultyProject)[0] };
}

const mentorProfile = (expertise, max = 3) => ({ profile: { expertise, maxMentees: max } });
test.beforeEach(() => h.resetAll());

test('ranking: real mentors are scored on expertise, stage and capacity; full or unavailable mentors are excluded with a reason', () => {
  const project = { id: 'p', title: 'AgriSense', domain: 'AgriTech', description: 'soil sensing IoT', stage: 'Prototype' };
  const mentors = [
    { _id: 'a', name: 'Dr A (Mentor)', profile: { expertise: ['AgriTech', 'IoT'], maxMentees: 3, stages: ['Prototype'] } },
    { _id: 'b', name: 'B', profile: { expertise: ['AgriTech'], maxMentees: 3 } },
    { _id: 'c', name: 'C', profile: { expertise: ['AgriTech'], maxMentees: 1 } },
    { _id: 'd', name: 'D', profile: { expertise: ['Fintech'], maxMentees: 3 } },
    { _id: 'e', name: 'E', profile: { expertise: ['AgriTech'], availability: 'unavailable' } },
  ];
  const out = mentorAgent.rankMentors({ project, mentors, loads: { c: 1, b: 1 } });
  assert.deepStrictEqual(out.candidates.map((c) => c.mentorUserId), ['a', 'b']);
  assert.ok(out.candidates[0].score > out.candidates[1].score);
  assert.ok(out.excluded.some((x) => x.mentorUserId === 'c' && /capacity/i.test(x.reason)));
  assert.ok(out.excluded.some((x) => x.mentorUserId === 'e' && /unavailable/i.test(x.reason)));
  assert.ok(!out.candidates.some((c) => c.mentorUserId === 'd'), 'no expertise overlap means below the threshold');
  assert.strictEqual(out.candidates[0].name, 'Dr A', 'display names come from the account, without role suffixes');
});

test('mentor matching: approval starts it, a decline moves to the next mentor, an acceptance becomes ONE proposal for the coordinator', async () => {
  const mentorA = h.person('mentor', 'Dr Anil Rao', mentorProfile(['AgriTech', 'IoT']));
  const mentorB = h.person('mentor', 'Dr Bina Shah', mentorProfile(['AgriTech']));
  h.person('mentor', 'Dr Fin Mentor', mentorProfile(['Fintech']));
  const { student, coordinator, app, project } = await approvedStartup();

  // The project is linked to real accounts; the coordinator is a real faculty account, not a typed-in name.
  assert.strictEqual(project.ownerUserId, String(student._id));
  assert.strictEqual(project.coordinatorUserId, String(coordinator._id));
  assert.strictEqual(project.assignedCoordinatorName, 'Dr Neha Sharma');
  assert.ok(rows(models.StartupProfile).some((p) => p.applicationId === app.id && String(p.founderId) === String(student._id)));

  await jobs.runDueJobs({ now: T0 });
  let requests = rows(models.MentorRequest);
  assert.strictEqual(requests.length, 1);
  assert.strictEqual(requests[0].mentorUserId, String(mentorA._id));
  assert.strictEqual(rows(models.AgentJob)[0].state, 'waiting_for_reply');
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(mentorA._id) && /Mentoring request/.test(x.title)));
  assert.ok(h.published.some((e) => e.eventType === 'mentor.requested'));

  // Mentor A declines -> the agent asks Mentor B by itself.
  await mentorAgent.respond({ requestId: requests[0]._id, user: user(mentorA), decision: 'decline', note: 'At capacity this term' });
  assert.ok(h.published.some((e) => e.eventType === 'mentor.declined'));
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.hours(1)) });
  requests = rows(models.MentorRequest);
  assert.strictEqual(requests.length, 2);
  assert.strictEqual(requests[1].mentorUserId, String(mentorB._id));
  assert.strictEqual(requests[0].status, 'declined');
  assert.strictEqual(project.mentorUserId ?? null, null);

  // Mentor B accepts -> ONE proposal for the coordinator; nothing is allocated yet.
  await mentorAgent.respond({ requestId: requests[1]._id, user: user(mentorB), decision: 'accept' });
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.hours(2)) });
  const [approval] = rows(models.Approval);
  assert.strictEqual(approval.type, 'mentor_allocation');
  assert.strictEqual(approval.status, 'pending');
  assert.deepStrictEqual(approval.assignedUserIds, [String(coordinator._id)]);
  assert.strictEqual(approval.payload.mentorUserId, String(mentorB._id));
  assert.deepStrictEqual(approval.evidence.attempts.map((a) => a.outcome), ['declined', 'accepted']);
  assert.strictEqual(rows(models.FacultyProject)[0].mentorUserId ?? null, null, 'formal allocation has not happened');
  assert.strictEqual(rows(models.AgentJob)[0].state, 'waiting_for_approval');
  assert.ok(!h.published.some((e) => e.eventType === 'allocation.confirmed'));
  assert.strictEqual(await approvals.countPending({ id: coordinator._id, role: 'faculty' }, { type: 'mentor_allocation' }), 1);

  // Only the assigned coordinator may confirm. Then it is allocated and the next stage is triggered.
  const stranger = h.person('faculty', 'Dr Other');
  await assert.rejects(() => approvals.decide({ approvalId: approval._id, user: user(stranger), decision: 'approved' }), { status: 403 });
  await approvals.decide({ approvalId: approval._id, user: user(coordinator), decision: 'approved', comment: 'Good fit' });
  const confirmed = rows(models.FacultyProject)[0];
  assert.strictEqual(confirmed.mentorUserId, String(mentorB._id));
  assert.strictEqual(confirmed.allocatedMentorName, 'Dr Bina Shah');
  assert.strictEqual(rows(models.MentorAllocation)[0].status, 'approved');
  assert.ok(h.published.some((e) => e.eventType === 'allocation.confirmed' && e.payload.mentorUserId === String(mentorB._id)));
  const confirmLog = logs('mentor.confirm_allocation').find((l) => l.status === 'success');
  assert.strictEqual(confirmLog.tier, 3);
  assert.ok(confirmLog.approvalId);
});

test('mentor matching: silence times out, the next mentor is asked, and when everyone is exhausted the coordinator is told with the attempts', async () => {
  const mentorA = h.person('mentor', 'Dr Anil Rao', mentorProfile(['AgriTech']));
  const mentorB = h.person('mentor', 'Dr Bina Shah', mentorProfile(['AgriTech']));
  const { coordinator } = await approvedStartup();
  await jobs.runDueJobs({ now: T0 });
  assert.strictEqual(rows(models.MentorRequest)[0].status, 'pending');

  // Halfway through the window: a single nudge (tier 2).
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(1.6)) });
  assert.strictEqual(logs('mentor.nudge').filter((l) => l.status !== 'failed').length >= 1, true);
  const nudges = logs('mentor.nudge').length;
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(2)) });
  assert.strictEqual(logs('mentor.nudge').length, nudges, 'no repeated nudge');

  // Past the deadline: first mentor times out, second is asked.
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(4)) });
  assert.deepStrictEqual(rows(models.MentorRequest).map((r) => r.status), ['timed_out', 'pending']);
  assert.ok(h.published.some((e) => e.eventType === 'mentor.timed_out'));

  // Second also times out: nobody left, so a person is asked to step in.
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(9)) });
  assert.deepStrictEqual(rows(models.MentorRequest).map((r) => r.status), ['timed_out', 'timed_out']);
  const job = rows(models.AgentJob)[0];
  assert.strictEqual(job.state, 'escalated');
  const escalation = logs('escalation.raise')[0];
  assert.match(escalation.summary, /escalated/);
  assert.deepStrictEqual(escalation.result.tried.map((t) => t.outcome), ['no reply', 'no reply']);
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(coordinator._id) && /No mentor found/.test(x.title)));
  assert.strictEqual(rows(models.Approval).length, 0, 'no proposal exists, so nothing can be allocated by mistake');
});

test('mentor requests: wrong mentor, repeat answers and expired requests are refused with clear messages', async () => {
  const mentorA = h.person('mentor', 'Dr Anil Rao', mentorProfile(['AgriTech']));
  const other = h.person('mentor', 'Dr Other', mentorProfile(['Law']));
  await approvedStartup();
  await jobs.runDueJobs({ now: T0 });
  const [request] = rows(models.MentorRequest);
  await assert.rejects(() => mentorAgent.respond({ requestId: request._id, user: user(other), decision: 'accept' }), { status: 403 });
  await mentorAgent.respond({ requestId: request._id, user: user(mentorA), decision: 'accept' });
  await assert.rejects(() => mentorAgent.respond({ requestId: request._id, user: user(mentorA), decision: 'decline' }), { status: 409 });
  rows(models.MentorRequest)[0].status = 'pending';
  rows(models.MentorRequest)[0].dueAt = new Date(Date.now() - 1000);
  await assert.rejects(() => mentorAgent.respond({ requestId: request._id, user: user(mentorA), decision: 'accept' }), { status: 410 });
});

test('no mentor accounts at all: the agent escalates instead of inventing a mentor', async () => {
  await approvedStartup();
  await jobs.runDueJobs({ now: T0 });
  assert.strictEqual(rows(models.MentorRequest).length, 0);
  assert.strictEqual(rows(models.AgentJob)[0].state, 'escalated');
  assert.match(logs('escalation.raise')[0].summary, /no active mentor accounts/i);
});

// --------------------------------------------------------------------------
// Workflow Agent
// --------------------------------------------------------------------------
async function confirmedAllocation() {
  const mentor = h.person('mentor', 'Dr Anil Rao', mentorProfile(['AgriTech']));
  const base = await approvedStartup();
  await jobs.runDueJobs({ now: T0 });
  await mentorAgent.respond({ requestId: rows(models.MentorRequest)[0]._id, user: user(mentor), decision: 'accept' });
  await jobs.runDueJobs({ now: T0 });
  await approvals.decide({ approvalId: rows(models.Approval)[0]._id, user: user(base.coordinator), decision: 'approved' });
  const confirmedEvent = h.published.find((e) => e.eventType === 'allocation.confirmed');
  await handleDomainEvent(ev('allocation.confirmed', { projectId: confirmedEvent.projectId, applicationId: confirmedEvent.applicationId, aggregateId: confirmedEvent.projectId, payload: confirmedEvent.payload }));
  return { ...base, mentor };
}

test('workflow: after a confirmed allocation it books the onboarding meeting at a real common slot and records what the sandbox did', async () => {
  const { student, mentor, coordinator } = await confirmedAllocation();
  // The mentor is already busy on Wednesday 15:00-16:00 IST: that slot must be skipped.
  h.mem.seed(models.FacultyMeeting, { id: 'busy', title: 'Other', projectId: 'other', projectTitle: 'Other', date: '2026-11-04', startUtc: new Date('2026-11-04T09:30:00Z'), endUtc: new Date('2026-11-04T10:30:00Z'), attendeeUserIds: [String(mentor._id)], outcome: 'pending' });

  const job = rows(models.AgentJob).find((j) => j.type === 'workflow.onboarding');
  assert.ok(job, 'allocation.confirmed started the Workflow Agent with no human action');
  await jobs.runDueJobs({ now: T0 });

  const [meeting] = rows(models.FacultyMeeting).filter((m) => m.source === 'agent');
  assert.ok(meeting);
  assert.deepStrictEqual([...meeting.attendeeUserIds].sort(), [String(student._id), String(mentor._id), String(coordinator._id)].sort());
  const start = localParts(new Date(meeting.startUtc));
  assert.ok(start.dow >= 1 && start.dow <= 5, 'a weekday');
  assert.ok(start.hour >= 10 && start.hour < 17, 'inside working hours (IST)');
  assert.ok(new Date(meeting.startUtc) >= new Date(T0.getTime() + h.days(2)), 'respects the lead time');
  assert.ok(!(new Date(meeting.startUtc) < new Date('2026-11-04T10:30:00Z') && new Date(meeting.endUtc) > new Date('2026-11-04T09:30:00Z')), 'does not overlap the mentor\'s other meeting');

  assert.strictEqual(meeting.calendarMode, 'sandbox');
  assert.strictEqual(meeting.invitationStatus, 'Simulated');
  const bookLog = logs('meeting.schedule')[0];
  assert.strictEqual(bookLog.status, 'simulated');
  assert.match(bookLog.summary, /not delivered|sandbox/);
  const invite = rows(models.OutboxMessage).find((m) => m.ics);
  assert.ok(invite && /BEGIN:VCALENDAR/.test(invite.ics) && invite.status === 'simulated');
  assert.ok(invite.to.length === 3);
  assert.ok(rows(models.FacultyTask).some((t) => t.kind === 'pre_meeting_update' && t.assignedUserId === String(student._id)), 'pre-meeting update requested from the founder');
  assert.ok(rows(models.AgentDocument).some((d) => d.kind === 'onboarding_pack'));
  assert.ok(h.published.some((e) => e.eventType === 'meeting.scheduled'));
  assert.strictEqual(rows(models.AgentJob).find((j) => j.type === 'workflow.onboarding').state, 'waiting_for_reply');
});

test('workflow: a missed meeting is rescheduled (tier 2, with notice); then notes and action-item tasks follow once it is held', async () => {
  const { student, mentor } = await confirmedAllocation();
  await jobs.runDueJobs({ now: T0 });
  const meeting = () => rows(models.FacultyMeeting).find((m) => m.source === 'agent');
  const firstStart = new Date(meeting().startUtc);

  // Nobody records it as held: after the grace period it is treated as a no-show and rescheduled.
  const afterEnd = new Date(new Date(meeting().endUtc).getTime() + h.hours(3));
  await jobs.runDueJobs({ now: afterEnd });
  assert.ok(h.published.some((e) => e.eventType === 'meeting.no_show'));
  assert.strictEqual(meeting().rescheduleCount, 1);
  assert.ok(new Date(meeting().startUtc) > firstStart);
  const resched = logs('meeting.reschedule')[0];
  assert.strictEqual(resched.tier, 2);
  assert.match(resched.summary, /rescheduled/);
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(student._id) && /rescheduled/i.test(x.title)), 'tier 2 tells the people affected');

  // The meeting happens; the mentor records it with action items.
  await workflowAgent.recordOutcome({ meetingId: meeting().id, user: user(mentor), held: true, notes: 'Agreed a 6-week prototype plan.', actionItems: ['Share sensor BOM', 'Book field-test farm'] });
  await jobs.runDueJobs({ now: afterEnd });
  const job = rows(models.AgentJob).find((j) => j.type === 'workflow.onboarding');
  assert.strictEqual(job.state, 'done');
  assert.ok(h.published.some((e) => e.eventType === 'meeting.held'));
  const notes = rows(models.AgentDocument).find((d) => d.kind === 'meeting_notes');
  assert.match(notes.markdown, /6-week prototype plan/);
  assert.match(notes.markdown, /Share sensor BOM/);
  const tasks = rows(models.FacultyTask).filter((t) => t.kind === 'action_item');
  assert.deepStrictEqual(tasks.map((t) => t.title).sort(), ['Book field-test farm', 'Share sensor BOM']);
  assert.ok(tasks.every((t) => t.assignedUserId === String(student._id)));
});

test('workflow: after the reschedule limit a person is asked to step in', async () => {
  await confirmedAllocation();
  await jobs.runDueJobs({ now: T0 });
  let now = T0;
  for (let i = 0; i < 5; i += 1) {
    const m = rows(models.FacultyMeeting).find((x) => x.source === 'agent');
    now = new Date(new Date(m.endUtc).getTime() + h.hours(3));
    await jobs.runDueJobs({ now });
    if (rows(models.AgentJob).find((j) => j.type === 'workflow.onboarding').state === 'escalated') break;
  }
  const job = rows(models.AgentJob).find((j) => j.type === 'workflow.onboarding');
  assert.strictEqual(job.state, 'escalated');
  assert.strictEqual(rows(models.FacultyMeeting).find((x) => x.source === 'agent').rescheduleCount, 2);
  assert.ok(logs('escalation.raise').length >= 1);
});

test('workflow: a participant who declines the proposed time causes a reschedule; only invitees may respond; only attendees or staff record outcomes', async () => {
  const { student, mentor } = await confirmedAllocation();
  await jobs.runDueJobs({ now: T0 });
  const meeting = rows(models.FacultyMeeting).find((m) => m.source === 'agent');
  const outsider = h.person('student', 'Outsider');
  await assert.rejects(() => workflowAgent.respondToMeeting({ meetingId: meeting.id, user: user(outsider), accept: false }), { status: 403 });
  await assert.rejects(() => workflowAgent.recordOutcome({ meetingId: meeting.id, user: user(outsider), held: true }), { status: 403 });
  const before = new Date(meeting.startUtc);
  await workflowAgent.respondToMeeting({ meetingId: meeting.id, user: user(mentor), accept: false });
  await jobs.runDueJobs({ now: T0 });
  assert.strictEqual(rows(models.FacultyMeeting).find((m) => m.source === 'agent').rescheduleCount, 1);
  assert.ok(new Date(rows(models.FacultyMeeting).find((m) => m.source === 'agent').startUtc) > before);
});

test('workflow: no common free time is reported and retried, not faked; after repeated failures a person is asked', async () => {
  const { student, mentor, coordinator } = await confirmedAllocation();
  // Everyone is booked solid for the whole search window.
  for (let d = 0; d < 20; d += 1) {
    const start = new Date(T0.getTime() + h.days(d) - h.hours(10));
    h.mem.seed(models.FacultyMeeting, { id: `block${d}`, title: 'Booked', projectId: 'x', projectTitle: 'x', date: '2026-11-01', startUtc: start, endUtc: new Date(start.getTime() + h.days(1)), attendeeUserIds: [String(mentor._id)], outcome: 'pending' });
  }
  await jobs.runDueJobs({ now: T0 });
  const job = () => rows(models.AgentJob).find((j) => j.type === 'workflow.onboarding');
  assert.strictEqual(job().state, 'retrying');
  assert.strictEqual(rows(models.FacultyMeeting).filter((m) => m.source === 'agent').length, 0, 'no meeting was invented');
  assert.ok(logs('meeting.find_slots').some((l) => /no common slot/.test(l.summary)));
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(1)) });
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(2)) });
  assert.strictEqual(job().state, 'escalated');
});
