const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const h = require('./testing/harness');
const { models } = h;
const jobs = require('./jobs');
const approvals = require('./approvals');
const { handleDomainEvent } = require('./dispatcher');
const { checkCompleteness, detectFlags } = require('./agents/applicationAgent');

const T0 = new Date('2026-11-02T09:00:00Z');
let n = 0;
const event = (eventType, app, extra = {}) => ({ eventType, eventId: `e${++n}`, applicationId: app.id, aggregateId: app.id, correlationId: `c-${app.id}`, actorId: extra.actorId || app.applicantId, payload: { applicant_id: app.applicantId, ...(extra.payload || {}) } });
const rows = (Model) => h.mem.store(Model);
const logs = (action) => rows(models.ActionLog).filter((l) => !action || l.action === action);
const decodeSub = (call) => call.actor.sub;

function world() {
  const student = h.person('student', 'Asha Rao');
  const admin = h.person('admin', 'Kavita Deshmukh');
  const coordinator = h.person('faculty', 'Dr Neha Sharma', { facultyRole: 'coordinator' });
  return { student, admin, coordinator };
}

test.beforeEach(() => h.resetAll());

test('completeness rules name exactly what is missing and respect the configured team size', () => {
  const missing = checkCompleteness(h.completeForm({ technologies: [], githubUrl: '', demoUrl: '', attachments: [], teamMembers: [{ name: 'Solo' }], currentSolutions: '' }));
  assert.strictEqual(missing.complete, false);
  assert.strictEqual(missing.missing.length, 4);
  assert.ok(missing.missing.some((m) => /team size.*at least 2/.test(m)));
  assert.strictEqual(checkCompleteness(h.completeForm()).complete, true);
  assert.strictEqual(checkCompleteness(h.completeForm({ teamMembers: [{ name: 'Solo' }] }), { minTeamSize: 1 }).complete, true, 'the team-size rule is configurable');
});

test('flags: spam-like text and near-duplicate applications are FLAGGED, never silently removed', () => {
  const spam = detectFlags({ name: 'x', problem: 'buy buy buy buy buy buy buy buy buy buy buy buy buy buy', solution: 'buy buy buy buy buy buy buy buy buy buy', shortDescription: 'buy buy buy' });
  assert.ok(spam.some((f) => f.kind === 'spam'));
  const form = h.completeForm();
  const dup = detectFlags({ ...form }, [{ id: 'other', name: 'AgriSense', problem: form.problem, solution: form.solution }]);
  assert.ok(dup.some((f) => f.kind === 'duplicate' && f.otherApplicationId === 'other'));
  assert.deepStrictEqual(detectFlags({ ...form }, [{ id: 'z', name: 'Totally different thing', problem: 'Hospitals lose track of oxygen cylinders', solution: 'RFID tags' }]), []);
});

test('missing information: the agent asks for exactly what is missing, waits, reminds after 3 days and escalates to Admin after 7', async () => {
  const { student, admin } = world();
  const app = h.application(student._id, h.completeForm({ technologies: [], githubUrl: '', teamMembers: [{ name: 'Asha', rollNumber: '1', email: 'a@x.edu' }] }));

  await handleDomainEvent(event('application.submitted', app));
  assert.strictEqual(rows(models.AgentJob).length, 1);
  await jobs.runDueJobs({ now: T0 });

  // It asked the student, through the real service, as the agent (never as a human).
  const decide = h.service.calls.find((c) => c.path.endsWith('/decide'));
  assert.strictEqual(decide.body.decision, 'revision_requested');
  assert.strictEqual(decodeSub(decide), 'agent:application');
  assert.match(decide.body.comments, /technologies/);
  assert.match(decide.body.comments, /team size/);
  assert.match(decide.body.comments, /prototype/);

  const job = rows(models.AgentJob)[0];
  assert.strictEqual(job.state, 'waiting_for_reply');
  assert.strictEqual(job.step, 'waiting_info');
  assert.strictEqual(job.data.missing.length, 3);
  assert.ok(job.timeoutAt && job.nextRunAt);

  const notice = rows(models.AgentNotification).find((x) => x.recipientUserId === String(student._id));
  assert.match(notice.message, /technologies/);
  assert.ok(rows(models.OutboxMessage).every((m) => m.mode === 'sandbox' && m.status === 'simulated'), 'no SMTP configured: the email is a labelled sandbox record');
  assert.ok(h.published.some((e) => e.eventType === 'application.info_requested' && e.payload.missing.length === 3));
  const requestLog = logs('application.request_info').find((l) => /asked the applicant/.test(l.summary));
  const noticeLog = logs('application.request_info').find((l) => /sent the applicant a message/.test(l.summary));
  assert.strictEqual(noticeLog.status, 'simulated', 'the email half is a labelled sandbox record, not a delivery');
  assert.strictEqual(requestLog.agent, 'Application Agent');
  assert.strictEqual(requestLog.tier, 1);
  assert.strictEqual(requestLog.status, 'success');
  assert.match(requestLog.summary, /asked the applicant/);

  // Nothing happens before the deadline.
  assert.strictEqual((await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(1)) })).ran, 0);

  // Day 3: a single reminder.
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(3)) });
  assert.strictEqual(logs('application.remind').length, 1);
  assert.strictEqual(rows(models.AgentJob)[0].state, 'waiting_for_reply');
  assert.strictEqual((await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(4)) })).ran, 0, 'no second reminder');

  // Day 7: escalate to Admin, exactly once.
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(7)) });
  const escalated = rows(models.AgentJob)[0];
  assert.strictEqual(escalated.state, 'escalated');
  assert.strictEqual(logs('escalation.raise').length, 1);
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(admin._id) && /No reply/.test(x.title)));
  assert.strictEqual((await jobs.runDueJobs({ now: new Date(T0.getTime() + h.days(20)) })).ran, 0, 'an escalated job does not repeat itself');
});

test('reply: when the student resubmits, the agent re-assesses on its own and the application reaches the admin queue', async () => {
  const { student, admin } = world();
  const app = h.application(student._id, h.completeForm({ technologies: [] }));
  await handleDomainEvent(event('application.submitted', app));
  await jobs.runDueJobs({ now: T0 });
  assert.strictEqual(rows(models.AgentJob)[0].state, 'waiting_for_reply');

  // The student adds the technologies and resubmits (the Python service emits application.resubmitted).
  app.formData.technologies = ['IoT'];
  app.status = 'SUBMITTED';
  await handleDomainEvent(event('application.resubmitted', app));
  assert.ok(h.published.some((e) => e.eventType === 'application.info_received'));
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.hours(2)) });

  const job = rows(models.AgentJob)[0];
  assert.strictEqual(job.state, 'waiting_for_approval');
  const [approval] = rows(models.Approval);
  assert.strictEqual(approval.type, 'admission');
  assert.strictEqual(approval.status, 'pending');
  assert.deepStrictEqual(approval.assignedRoles, ['admin']);
  assert.deepStrictEqual(approval.evidence.reviewerQuestions, ['Who will pay first?']);
  assert.strictEqual(approval.evidence.completeness.complete, true);
  assert.ok(approval.evidence.summaryDocumentId);
  assert.ok(logs('application.queue_for_decision').length === 1);
  assert.strictEqual(await approvals.countPending({ id: admin._id, role: 'admin' }), 1);
  // No admission decision was made by the agent.
  assert.ok(!h.service.calls.some((c) => c.path.endsWith('/decide') && /approved|rejected/.test(c.body.decision)));
});

test('assessment still reaches the admin queue, honestly labelled, when the AI assessment is unavailable (no LLM key)', async () => {
  const { student } = world();
  h.service.assessmentAvailable = false;
  const app = h.application(student._id);
  await handleDomainEvent(event('application.submitted', app));
  await jobs.runDueJobs({ now: T0 });
  const [approval] = rows(models.Approval);
  assert.strictEqual(approval.evidence.aiAssessed, false);
  assert.match(approval.evidence.assessmentNote, /not available/);
  assert.deepStrictEqual(approval.evidence.reviewerQuestions, [], 'no reviewer questions are invented');
});

test('Tier 3: an admin approval is the only thing that decides the application, and it is made as that admin', async () => {
  const { student, admin } = world();
  const app = h.application(student._id);
  await handleDomainEvent(event('application.submitted', app));
  await jobs.runDueJobs({ now: T0 });
  const [approval] = rows(models.Approval);

  await assert.rejects(() => approvals.decide({ approvalId: approval._id, user: { id: student._id, role: 'student' }, decision: 'approved' }), { status: 403 });
  assert.ok(!h.service.calls.some((c) => c.path.endsWith('/decide')), 'a student cannot trigger the decision');

  await approvals.decide({ approvalId: approval._id, user: { id: admin._id, role: 'admin', name: 'Kavita Deshmukh' }, decision: 'approved', comment: 'Strong team' });
  const decide = h.service.calls.find((c) => c.path.endsWith('/decide'));
  assert.strictEqual(decide.body.decision, 'approved');
  assert.strictEqual(decodeSub(decide), String(admin._id), 'the decision is recorded under the human approver');
  assert.strictEqual(decide.actor.role, 'admin');
  const decided = logs('admission.decide').find((l) => l.status === 'success');
  assert.ok(decided);
  assert.strictEqual(decided.tier, 3);
  assert.ok(decided.approvalId);
  const stored = rows(models.Approval)[0];
  assert.strictEqual(stored.decidedBy, String(admin._id));
  assert.strictEqual(stored.decisionComment, 'Strong team');
});

test('a decision taken on the existing review screen also closes the approval and the job', async () => {
  const { student, admin } = world();
  const app = h.application(student._id);
  await handleDomainEvent(event('application.submitted', app));
  await jobs.runDueJobs({ now: T0 });
  await handleDomainEvent(event('application.rejected', app, { actorId: String(admin._id), payload: { comments: 'Out of scope' } }));
  assert.strictEqual(rows(models.Approval)[0].status, 'rejected');
  await jobs.runDueJobs({ now: new Date(T0.getTime() + h.hours(1)) });
  assert.strictEqual(rows(models.AgentJob)[0].state, 'done');
});

test('duplicate events do not create duplicate jobs, requests or notifications', async () => {
  const { student } = world();
  const app = h.application(student._id, h.completeForm({ technologies: [] }));
  const e = event('application.submitted', app);
  await handleDomainEvent(e);
  await handleDomainEvent(e);
  await handleDomainEvent({ ...e, eventId: 'another-delivery' });
  assert.strictEqual(rows(models.AgentJob).length, 1);
  await jobs.runDueJobs({ now: T0 });
  await jobs.runDueJobs({ now: T0 });
  assert.strictEqual(h.service.calls.filter((c) => c.path.endsWith('/decide')).length, 1);
  assert.strictEqual(rows(models.AgentNotification).filter((x) => x.recipientUserId === String(student._id)).length, 1);
});

test('likely duplicates are flagged to the admins and still go through for a human to judge', async () => {
  const { student, admin } = world();
  const other = h.person('student', 'Ravi K');
  const first = h.application(other._id, h.completeForm());
  const second = h.application(student._id, h.completeForm());
  await handleDomainEvent(event('application.submitted', second));
  await jobs.runDueJobs({ now: T0 });
  const flag = logs('application.flag')[0];
  assert.ok(flag, 'a flag was recorded');
  assert.match(flag.summary, /duplicate/);
  assert.match(flag.summary, /not removed|stays in the queue/);
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(admin._id) && /Flagged/.test(x.title)));
  assert.ok(!h.service.calls.some((c) => c.path.endsWith('/decide') && c.body.decision === 'rejected'), 'nothing was rejected or deleted');
  assert.strictEqual(rows(models.Approval).length, 1, 'it still reaches the human queue');
});

test('when the application service is down the job retries with backoff and nothing is lost', async () => {
  const { student } = world();
  const app = h.application(student._id);
  await handleDomainEvent(event('application.submitted', app));
  h.service.down = true;
  await jobs.runDueJobs({ now: T0 });
  let job = rows(models.AgentJob)[0];
  assert.strictEqual(job.state, 'retrying');
  assert.match(job.lastError, /not reachable/);
  h.service.down = false;
  await jobs.runDueJobs({ now: new Date(job.nextRunAt.getTime() + 1000) });
  job = rows(models.AgentJob)[0];
  assert.strictEqual(job.state, 'waiting_for_approval');
  assert.strictEqual(job.attempts, 0, 'a recovered job starts its next step with a clean attempt count');
});

test('restart recovery: a review interrupted mid-run resumes and finishes without acting twice', async () => {
  const { student } = world();
  const app = h.application(student._id, h.completeForm({ technologies: [] }));
  await handleDomainEvent(event('application.submitted', app));
  await jobs.runDueJobs({ now: T0 }); // asks for info, now waiting
  const job = rows(models.AgentJob)[0];
  // The worker dies while the job is mid-run after the student's reply.
  job.state = 'running'; job.resumeState = 'waiting_for_reply'; job.lockedAt = new Date(T0.getTime() - h.hours(1)); job.data.signals = [{ name: 'resubmitted', payload: {}, at: T0.toISOString() }];
  app.formData.technologies = ['IoT']; app.status = 'SUBMITTED';
  assert.strictEqual(await jobs.recoverInterrupted(T0), 1);
  await jobs.runDueJobs({ now: T0 });
  assert.strictEqual(rows(models.AgentJob)[0].state, 'waiting_for_approval');
  assert.strictEqual(rows(models.Approval).length, 1);
});

test('the integrity guard: an approval event not made by a person does not start mentor matching', async () => {
  const { student } = world();
  const app = h.application(student._id);
  await handleDomainEvent(event('application.approved', app, { actorId: 'agent:application' }));
  assert.strictEqual(rows(models.AgentJob).filter((j) => j.type === 'mentor.matching').length, 0);
  assert.strictEqual(rows(models.FacultyProject).length, 0);
  assert.ok(logs('mentor.request').some((l) => l.status === 'blocked'));
});
