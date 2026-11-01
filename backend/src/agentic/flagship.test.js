/**
 * The flagship loop, end to end, with simulated time and the real agents, jobs, approvals, tools and event dispatcher.
 * Only the stand-ins are fake: storage (in-memory models) and the Python service (a scripted double).
 *
 * People act exactly where the design says they must: the student replies once, the admin approves the
 * admission (human click 1), a mentor answers the request, the coordinator confirms the allocation (human click 2),
 * and the mentor records the meeting. Everything else below happens with nobody logged in.
 */
const test = require('node:test');
const assert = require('node:assert');
const h = require('./testing/harness');
const { models } = h;
const jobs = require('./jobs');
const approvals = require('./approvals');
const { handleDomainEvent } = require('./dispatcher');
const mentorAgent = require('./agents/mentorAgent');
const workflowAgent = require('./agents/workflowAgent');
const monitoring = require('./agents/monitoringAgent');
const access = require('./access');
const scheduler = require('./scheduler');

const rows = (Model) => h.mem.store(Model);
const user = (u) => ({ id: String(u._id), role: u.role, name: u.name });
const T0 = new Date('2026-11-02T09:00:00Z');
const at = (ms) => new Date(T0.getTime() + ms);
let n = 0;

/** Deliver what the Python service would relay for the latest state change. */
const deliver = (eventType, app, actorId, payload = {}) =>
  handleDomainEvent({ eventId: `ev${++n}`, correlationId: `corr-${app.id}`, eventType, applicationId: app.id, aggregateId: app.id, actorId: String(actorId), payload: { applicant_id: app.applicantId, ...payload } });

/** Run the worker the way the service does: events are already dispatched; this advances every due job. */
async function tick(now) {
  await scheduler.tick({ now, force: true, log: { error: () => {}, warn: () => {} } });
}
/** Domain events the agents published are relayed back into the dispatcher, as the durable store would. */
async function relayPublished(from) {
  for (const e of h.published.slice(from)) {
    if (['allocation.confirmed'].includes(e.eventType)) {
      await handleDomainEvent({ eventId: `ev${++n}`, correlationId: e.correlationId, eventType: e.eventType, applicationId: e.applicationId, projectId: e.projectId, aggregateId: e.aggregateId, actorId: e.actorId, payload: e.payload });
    }
  }
}

test.beforeEach(() => h.resetAll());

test('FLAGSHIP: application -> chase -> admission (human) -> mentor ask/decline/accept -> allocation (human) -> meeting -> no-show -> notes -> stall -> escalation -> recovery', async () => {
  const student = h.person('student', 'Asha Rao');
  const teammate = 'Ravi Kumar';
  const admin = h.person('admin', 'Kavita Deshmukh');
  const coordinator = h.person('faculty', 'Dr Neha Sharma', { facultyRole: 'coordinator' });
  const mentorA = h.person('mentor', 'Dr Anil Deshpande', { profile: { expertise: ['AgriTech', 'IoT'], maxMentees: 3 } });
  const mentorB = h.person('mentor', 'Dr Bina Shah', { profile: { expertise: ['AgriTech'], maxMentees: 2 } });
  const superAdmin = h.person('super_admin', 'Root');

  // ---- 1. The student submits an application that is missing a few things ------------------------------
  const app = h.application(student._id, h.completeForm({ technologies: [], githubUrl: '', teamMembers: [{ name: 'Asha', rollNumber: '1', email: 'a@x.edu' }] }), 'app-flagship');
  await deliver('application.submitted', app, student._id);
  await tick(T0); // <- nobody is logged in from here
  assert.strictEqual(rows(models.AgentJob).find((j) => j.type === 'application.review').state, 'waiting_for_reply', 'the Application Agent asked for the missing items and is waiting');
  assert.ok(h.service.calls.some((c) => c.path.endsWith('/decide') && c.body.decision === 'revision_requested'));

  // ---- 2. Silence: reminder on day 3 ------------------------------------------------------------------
  await tick(at(h.days(3)));
  assert.ok(rows(models.ActionLog).some((l) => l.action === 'application.remind'));

  // ---- 3. The student finally replies; the agent re-assesses by itself and queues it for the admin -------
  app.formData.technologies = ['IoT', 'React'];
  app.formData.githubUrl = 'https://github.com/example/agrisense';
  app.formData.teamMembers.push({ name: teammate, rollNumber: '2', email: 'r@x.edu' });
  app.status = 'SUBMITTED';
  await deliver('application.resubmitted', app, student._id);
  await tick(at(h.days(4)));
  const admission = rows(models.Approval).find((a) => a.type === 'admission');
  assert.ok(admission && admission.status === 'pending', 'it reached the admin approvals queue with its evidence');

  // ---- 4. HUMAN CLICK 1: the admin approves the admission ----------------------------------------------
  await approvals.decide({ approvalId: admission._id, user: user(admin), decision: 'approved', comment: 'Strong team' });
  assert.strictEqual(app.status, 'APPROVED', 'the decision was carried out through the application service as the admin');
  await deliver('application.approved', app, admin._id, { decision: 'approved' }); // the service emits this event
  await tick(at(h.days(4) + h.hours(1)));
  assert.strictEqual(rows(models.FacultyProject).length, 1, 'the startup record exists, linked to the founder and coordinator');
  assert.strictEqual(rows(models.FacultyProject)[0].ownerUserId, String(student._id));

  // ---- 5. Mentor matching runs unprompted: A is asked and declines, B is asked and accepts -------------
  const request = () => rows(models.MentorRequest).find((r) => r.status === 'pending');
  assert.strictEqual(request().mentorUserId, String(mentorA._id));
  await mentorAgent.respond({ requestId: request()._id, user: user(mentorA), decision: 'decline', note: 'Overbooked' });
  await tick(at(h.days(4) + h.hours(2)));
  assert.strictEqual(request().mentorUserId, String(mentorB._id), 'the next candidate was asked automatically');
  await mentorAgent.respond({ requestId: request()._id, user: user(mentorB), decision: 'accept' });
  await tick(at(h.days(4) + h.hours(3)));
  const proposal = rows(models.Approval).find((a) => a.type === 'mentor_allocation');
  assert.strictEqual(proposal.status, 'pending');
  assert.strictEqual(rows(models.FacultyProject)[0].mentorUserId ?? null, null, 'nothing is allocated until a person confirms');

  // ---- 6. HUMAN CLICK 2: the coordinator confirms ------------------------------------------------------
  const before = h.published.length;
  await approvals.decide({ approvalId: proposal._id, user: user(coordinator), decision: 'approved' });
  await relayPublished(before);
  assert.strictEqual(rows(models.FacultyProject)[0].mentorUserId, String(mentorB._id));

  // ---- 7. The Workflow Agent finds a slot and books the onboarding meeting by itself -------------------
  await tick(at(h.days(4) + h.hours(4)));
  const meeting = rows(models.FacultyMeeting).find((m) => m.source === 'agent');
  assert.ok(meeting, 'a meeting was booked with no one asking');
  assert.strictEqual(meeting.calendarMode, 'sandbox', 'no calendar credentials: honestly a sandbox record');
  assert.ok(rows(models.OutboxMessage).some((m) => m.ics && m.status === 'simulated'));

  // ---- 8. Nobody records it: no-show -> automatic reschedule; then the mentor records the real one -----
  await tick(new Date(new Date(meeting.endUtc).getTime() + h.hours(3)));
  assert.strictEqual(rows(models.FacultyMeeting).find((m) => m.source === 'agent').rescheduleCount, 1);
  const rescheduled = rows(models.FacultyMeeting).find((m) => m.source === 'agent');
  await workflowAgent.recordOutcome({ meetingId: rescheduled.id, user: user(mentorB), held: true, notes: 'Plan agreed.', actionItems: ['Share sensor BOM'] });
  const heldAt = new Date(new Date(rescheduled.endUtc).getTime() + h.hours(3));
  await tick(heldAt);
  assert.ok(rows(models.AgentDocument).some((d) => d.kind === 'meeting_notes'));
  assert.ok(rows(models.FacultyTask).some((t) => t.kind === 'action_item' && t.title === 'Share sensor BOM'));

  // ---- 9. A month of silence. The Monitoring Agent notices, chases, informs the mentor, escalates -------
  const quiet = new Date(heldAt.getTime() + h.days(30));
  await tick(quiet);
  const caseJob = () => rows(models.AgentJob).find((j) => j.type === 'monitoring.case');
  assert.ok(caseJob(), 'a monitoring case opened on the schedule');
  await tick(new Date(quiet.getTime() + h.hours(1)));
  assert.strictEqual(caseJob().step, 'founder_checkin');
  await tick(new Date(quiet.getTime() + h.hours(50)));
  assert.strictEqual(caseJob().step, 'mentor_notified');
  await tick(new Date(quiet.getTime() + h.hours(100)));
  assert.strictEqual(caseJob().state, 'escalated');
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(coordinator._id) && /not responding/.test(x.title)));

  // ---- 10. The founder answers; recovery is recorded -----------------------------------------------------
  const checkin = rows(models.FacultyTask).find((t) => t.kind === 'checkin');
  checkin.status = 'Completed'; checkin.completedAt = new Date(quiet.getTime() + h.hours(110));
  await handleDomainEvent({ eventId: `ev${++n}`, eventType: 'task.completed', projectId: checkin.projectId, payload: {} });
  await tick(new Date(quiet.getTime() + h.hours(111)));
  assert.strictEqual(caseJob().state, 'done');
  assert.ok(h.published.some((e) => e.eventType === 'startup.recovered'));

  // ================= what the feeds say now (this is what each role would see) ====================================
  const humanActions = rows(models.Approval).filter((a) => a.decidedBy).length;
  assert.strictEqual(humanActions, 2, 'exactly two human approvals were needed in the whole loop');
  const log = rows(models.ActionLog);
  const byAgent = (agent) => log.filter((l) => l.agent === agent).length;
  ['Application Agent', 'Mentor-Matching Agent', 'Workflow Agent', 'Monitoring Agent'].forEach((agent) => assert.ok(byAgent(agent) >= 3, `${agent} acted on its own`));
  assert.ok(!log.some((l) => l.status === 'failed'), 'no action failed');
  assert.ok(log.filter((l) => l.tier === 3 && l.status === 'success').every((l) => l.approvalId), 'every tier-3 action was gated by an approval');
  assert.ok(!log.some((l) => /Raman|Ananya/.test(l.summary)), 'no invented people');

  const studentFeed = await access.feedFor(user(student), { limit: 100 });
  const adminFeed = await access.feedFor(user(admin), { limit: 100 });
  const coordinatorFeed = await access.feedFor(user(coordinator), { limit: 100 });
  const superFeed = await access.feedFor(user(superAdmin), { limit: 100 });
  assert.ok(studentFeed.length > 5 && adminFeed.length >= studentFeed.length && superFeed.length === log.length);
  assert.ok(coordinatorFeed.length > 0 && coordinatorFeed.every((r) => r.projectId === rows(models.FacultyProject)[0].id || r.audience.userIds.includes(String(coordinator._id))));

  if (process.env.SHOW_FEED) {
    console.log('\n--- Action Log, oldest first (what the feeds are built from) ---');
    [...log].forEach((l) => console.log(`[tier ${l.tier}] [${l.status.padEnd(16)}] ${l.agent}: ${l.summary}`));
  }
});
