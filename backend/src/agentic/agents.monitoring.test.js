const test = require('node:test');
const assert = require('node:assert');
const h = require('./testing/harness');
const { models } = h;
const jobs = require('./jobs');
const approvals = require('./approvals');
const monitoring = require('./agents/monitoringAgent');
const investor = require('./agents/investorAgent');
const { handleDomainEvent } = require('./dispatcher');

const T0 = new Date('2026-11-02T09:00:00Z');
const rows = (Model) => h.mem.store(Model);
const logs = (action) => rows(models.ActionLog).filter((l) => !action || l.action === action);
const user = (u) => ({ id: String(u._id), role: u.role, name: u.name });
const at = (ms) => new Date(T0.getTime() + ms);

function startup({ ageDays = 30, mentor = true, trl = 3, progress = 40, overdue = true } = {}) {
  const student = h.person('student', 'Asha Rao');
  const mentorUser = h.person('mentor', 'Dr Anil Rao', { profile: { expertise: ['AgriTech'] } });
  const coordinator = h.person('faculty', 'Dr Neha Sharma', { facultyRole: 'coordinator' });
  const admin = h.person('admin', 'Kavita');
  const app = h.application(student._id, h.completeForm(), 'a1', 'APPROVED');
  app.milestones = overdue ? [{ title: 'Prototype', dueDate: '2026-10-20', state: 'overdue', completionPct: 20 }] : [{ title: 'Prototype', dueDate: '2026-12-20', state: 'upcoming', completionPct: 20 }];
  const project = h.mem.seed(models.FacultyProject, {
    id: 'a1', title: 'AgriSense', domain: 'AgriTech', stage: 'Prototype', leadStudent: 'Asha Rao', ownerUserId: String(student._id), applicationId: 'a1', coordinatorUserId: String(coordinator._id),
    mentorUserId: mentor ? String(mentorUser._id) : null, allocatedMentorName: mentor ? 'Dr Anil Rao' : null, trl, progress, createdAt: at(-ageDays * 86400000),
  });
  return { student, mentorUser, coordinator, admin, project };
}

test.beforeEach(() => h.resetAll());

test('stall criteria are explicit and based on recorded facts only', () => {
  const project = { createdAt: at(-30 * 86400000) };
  const stalled = monitoring.evaluateStall({ project, now: T0, tasks: [{ assignedRole: 'student', status: 'Pending', dueDate: '2026-10-20', title: 'Report', kind: 'general' }], milestones: [{ state: 'overdue', title: 'M1', dueDate: '2026-10-01' }] });
  assert.deepStrictEqual(stalled.reasons.map((r) => r.code).sort(), ['inactivity', 'missing_report', 'overdue_milestones', 'overdue_tasks']);
  const healthy = monitoring.evaluateStall({ project: { createdAt: at(-3 * 86400000) }, now: T0, tasks: [], milestones: [{ state: 'upcoming', title: 'M1' }] });
  assert.strictEqual(healthy.stalled, false);
  const untracked = monitoring.evaluateStall({ project: { createdAt: at(-3 * 86400000) }, now: T0, tasks: [], milestones: null });
  assert.deepStrictEqual(untracked.evidence.milestones, { tracked: false }, 'untracked milestones are reported as untracked, not as healthy');
  assert.strictEqual(untracked.stalled, false);
  const justDue = monitoring.evaluateStall({ project: { createdAt: at(-3 * 86400000) }, now: T0, tasks: [{ assignedRole: 'student', status: 'Pending', dueDate: '2026-11-01', title: 'x', kind: 'general' }], milestones: [] });
  assert.strictEqual(justDue.stalled, false, 'a task one day late is inside the grace period');
});

test('a healthy startup is left alone', async () => {
  startup({ ageDays: 3, overdue: false });
  const report = await monitoring.sweep({ now: T0 });
  assert.deepStrictEqual([report.checked, report.opened], [1, 0]);
  assert.strictEqual(rows(models.AgentJob).length, 0);
});

test('stall -> founder check-in -> (48h) mentor -> (48h) coordinator with evidence, each exactly once', async () => {
  const { student, mentorUser, coordinator, project } = startup();
  const report = await monitoring.sweep({ now: T0 });
  assert.strictEqual(report.opened, 1);
  await jobs.runDueJobs({ now: T0 });

  // Step 1: founder check-in
  const job = () => rows(models.AgentJob).find((j) => j.type === 'monitoring.case');
  assert.strictEqual(job().state, 'waiting_for_reply');
  assert.strictEqual(job().step, 'founder_checkin');
  const checkin = rows(models.FacultyTask).find((t) => t.kind === 'checkin');
  assert.strictEqual(checkin.assignedUserId, String(student._id));
  assert.ok(h.published.some((e) => e.eventType === 'startup.stalled' && e.payload.reasons.includes('overdue_milestones')));
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(student._id) && /check-in/i.test(x.title)));
  assert.strictEqual(rows(models.FacultyProject)[0].health, 'At Risk');
  const countNotices = () => rows(models.AgentNotification).length;
  const afterCheckin = countNotices();

  // Sweeping again (and re-checking) never duplicates the case or the reminders.
  await monitoring.sweep({ now: at(h.hours(1)) });
  await jobs.runDueJobs({ now: at(h.hours(1)) });
  assert.strictEqual(rows(models.AgentJob).filter((j) => j.type === 'monitoring.case').length, 1);
  assert.strictEqual(countNotices(), afterCheckin);
  assert.strictEqual(rows(models.FacultyTask).filter((t) => t.kind === 'checkin').length, 1);

  // Step 2: 48h with no reply -> the mentor is told (tier 2).
  await jobs.runDueJobs({ now: at(h.hours(48)) });
  assert.strictEqual(job().step, 'mentor_notified');
  const mentorNotice = logs('monitoring.notify_mentor')[0];
  assert.strictEqual(mentorNotice.tier, 2);
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(mentorUser._id) && /gone quiet/.test(x.title)));
  assert.strictEqual(logs('escalation.raise').length, 0, 'not escalated yet');

  // Step 3: 48h later -> coordinator, with an evidence brief.
  await jobs.runDueJobs({ now: at(h.hours(96)) });
  assert.strictEqual(job().state, 'escalated');
  const esc = logs('escalation.raise')[0];
  assert.match(esc.summary, /escalated .* to the coordinator/);
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(coordinator._id) && /not responding/.test(x.title)));
  const brief = rows(models.AgentDocument).find((d) => d.kind === 'escalation_brief');
  assert.match(brief.markdown, /Check-in sent to the founders/);
  assert.match(brief.markdown, /Overdue milestone: Prototype/);

  // No repeated escalation, however long it stays unresolved.
  for (const d of [5, 8, 12]) {
    await monitoring.sweep({ now: at(h.days(d)) });
    await jobs.runDueJobs({ now: at(h.days(d)) });
  }
  assert.strictEqual(logs('escalation.raise').length, 1);
  assert.strictEqual(rows(models.AgentJob).filter((j) => j.type === 'monitoring.case').length, 1);
});

test('recovery is detected, recorded with the time it took, and does not immediately reopen', async () => {
  const { student } = startup();
  await monitoring.sweep({ now: T0 });
  await jobs.runDueJobs({ now: T0 });
  await jobs.runDueJobs({ now: at(h.hours(48)) }); // mentor notified
  // The founder answers the check-in.
  const checkin = rows(models.FacultyTask).find((t) => t.kind === 'checkin');
  checkin.status = 'Completed';
  checkin.completedAt = at(h.hours(50));
  await handleDomainEvent({ eventType: 'task.completed', eventId: 't1', projectId: 'a1', payload: {} });
  await jobs.runDueJobs({ now: at(h.hours(51)) });

  const job = rows(models.AgentJob).find((j) => j.type === 'monitoring.case');
  assert.strictEqual(job.state, 'done');
  assert.strictEqual(job.step, 'recovered');
  const recovered = h.published.find((e) => e.eventType === 'startup.recovered');
  assert.strictEqual(recovered.payload.stageReached, 'mentor_notified');
  assert.strictEqual(recovered.payload.hoursToRecover, 51);
  assert.strictEqual(logs('startup.record_recovery')[0].result.hoursToRecover, 51);
  assert.strictEqual(rows(models.FacultyProject)[0].health, 'On Track');

  // The overdue milestone is still there, but a case was closed moments ago: no new case during the cooldown.
  const report = await monitoring.sweep({ now: at(h.hours(60)) });
  assert.strictEqual(report.opened, 0);
});

test('missing progress reports are requested once, not nagged', async () => {
  const { student } = startup({ ageDays: 30, overdue: false });
  rows(models.FacultyProject)[0].createdAt = at(-30 * 86400000);
  // The founder was active 3 days ago, so this is only about the report.
  h.mem.seed(models.FacultyTask, { id: 'done1', title: 'x', projectId: 'a1', dueDate: '2026-10-25', assignedRole: 'student', assignedUserId: String(student._id), status: 'Completed', completedAt: at(-3 * 86400000), kind: 'general' });
  await monitoring.sweep({ now: T0 });
  await monitoring.sweep({ now: at(h.hours(5)) });
  const reportTasks = rows(models.FacultyTask).filter((t) => t.kind === 'progress_report');
  assert.strictEqual(reportTasks.length, 1);
  assert.ok(h.published.some((e) => e.eventType === 'report.overdue'));
  assert.strictEqual(logs('report.request')[0].tier, 1);
});

test('the Monitoring Agent reads real milestones as the founder (read-only) and degrades honestly when they are unavailable', async () => {
  startup();
  await monitoring.sweep({ now: T0 });
  const read = h.service.calls.find((c) => c.path.endsWith('/milestones'));
  assert.strictEqual(read.actor.role, 'student');
  assert.deepStrictEqual(read.actor.permissions, ['view_applications']);
  h.resetAll();
  startup();
  h.service.down = true;
  await monitoring.sweep({ now: T0 });
  assert.strictEqual(rows(models.AgentJob).length, 1, 'inactivity alone still opens a case; milestones are reported as not tracked');
  assert.strictEqual(rows(models.AgentJob)[0].data.evidence.milestones.tracked, false);
});

// --------------------------------------------------------------------------
// Investor flow
// --------------------------------------------------------------------------
function investorWorld({ trl = 5, progress = 70, mentor = true } = {}) {
  const base = startup({ ageDays: 40, trl, progress, mentor, overdue: false });
  rows(models.FacultyProject)[0].createdAt = at(-40 * 86400000);
  // Recent activity so the startup is not "stalled".
  h.mem.seed(models.FacultyTask, { id: 'ok', title: 'x', projectId: 'a1', dueDate: '2026-10-30', assignedRole: 'student', assignedUserId: String(base.student._id), status: 'Completed', completedAt: at(-1 * 86400000), kind: 'progress_report' });
  base.milestones = null;
  h.service.applications.get('a1').milestones = [{ title: 'Prototype', state: 'completed', completionPct: 100 }, { title: 'Pilot', state: 'upcoming', completionPct: 40 }];
  const profile = h.mem.seed(models.StartupProfile, { applicationId: 'a1', founderId: String(base.student._id), name: 'AgriSense', tagline: 'Soil moisture sensing for small farms', problem: 'p', solution: 's', sector: 'AgriTech', stage: 'prototype', isApproved: true, status: 'active', tags: ['AgriTech'] });
  const good = h.person('investor', 'Rohit Singhania', { isInvestorVerified: true, profile: { sectors: ['AgriTech', 'ClimateTech'], stages: ['Prototype', 'MVP'], fundName: 'Horizon' } });
  const wrongSector = h.person('investor', 'Fin Investor', { isInvestorVerified: true, profile: { sectors: ['Fintech'], stages: ['Seed'] } });
  const unverified = h.person('investor', 'Unverified', { isInvestorVerified: false, profile: { sectors: ['AgriTech'], stages: ['Prototype'] } });
  return { ...base, profile, good, wrongSector, unverified };
}

test('investor readiness: a startup that does not meet the criteria triggers nothing', async () => {
  investorWorld({ trl: 2 });
  const out = await investor.sweep({ now: T0 });
  assert.deepStrictEqual([out.ready, out.introductions], [0, 0]);
  assert.strictEqual(rows(models.InvestorIntroduction).length, 0);
});

test('investor flow: ready -> verified matches only -> founder consent -> admin approval -> investor told -> meeting -> feedback', async () => {
  const { student, admin, good, wrongSector, unverified } = investorWorld();
  const out = await investor.sweep({ now: T0 });
  assert.deepStrictEqual([out.ready, out.introductions], [1, 1], 'only the verified investor whose sector and stage fit');
  assert.ok(logs('investor.build_profile').length === 1);
  assert.match(rows(models.StartupProfile)[0].tractionSummary, /1 of 2 milestones completed/);

  // Draft + consent request. Nothing has been shared with anyone.
  await jobs.runDueJobs({ now: T0 });
  const [intro] = rows(models.InvestorIntroduction);
  assert.strictEqual(intro.origin, 'agent');
  assert.strictEqual(intro.status, 'awaiting_founder_consent');
  assert.strictEqual(intro.founderConsent.status, 'pending');
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(student._id) && /May we introduce/.test(x.title)));
  assert.ok(!rows(models.AgentNotification).some((x) => x.recipientUserId === String(good._id)), 'the investor knows nothing yet');
  assert.strictEqual(rows(models.Approval).length, 0, 'no admin approval is requested until the founder consents');
  assert.ok(rows(models.AgentDocument).some((d) => d.kind === 'intro_draft'));

  // Only the founder can consent.
  await assert.rejects(() => investor.founderConsent({ introId: intro._id, user: user(good), grant: true }), { status: 403 });
  await investor.founderConsent({ introId: intro._id, user: user(student), grant: true });
  await jobs.runDueJobs({ now: at(h.hours(1)) });
  const [approval] = rows(models.Approval);
  assert.strictEqual(approval.type, 'investor_intro');
  assert.deepStrictEqual(approval.assignedRoles, ['admin']);
  assert.ok(approval.evidence.willBeShared.length > 0);
  assert.ok(!rows(models.AgentNotification).some((x) => x.recipientUserId === String(good._id)), 'still not shared: approval is pending');

  // Admin approves -> now (and only now) the investor is told.
  await approvals.decide({ approvalId: approval._id, user: user(admin), decision: 'approved', comment: 'Good fit' });
  assert.ok(rows(models.AgentNotification).some((x) => x.recipientUserId === String(good._id) && /Introduction: AgriSense/.test(x.title)));
  assert.strictEqual(rows(models.InvestorIntroduction)[0].status, 'approved');
  const sendLog = logs('investor.send_introduction').find((l) => l.status === 'success' && l.approvalId);
  assert.strictEqual(sendLog.tier, 3);
  await jobs.runDueJobs({ now: at(h.hours(2)) });

  // The investor accepts -> a meeting with both parties is booked.
  await assert.rejects(() => investor.investorRespond({ introId: intro._id, user: user(wrongSector), accept: true }), { status: 403 });
  await investor.investorRespond({ introId: intro._id, user: user(good), accept: true });
  await jobs.runDueJobs({ now: at(h.hours(3)) });
  const stored = rows(models.InvestorIntroduction)[0];
  assert.strictEqual(stored.status, 'scheduled');
  const meeting = rows(models.FacultyMeeting).find((m) => m.id === stored.meetingId);
  assert.deepStrictEqual([...meeting.attendeeUserIds].sort(), [String(good._id), String(student._id)].sort());
  assert.strictEqual(stored.scheduledMeeting.emailSentToInvestor, false, 'sandbox: the flag does not claim delivery');
  assert.ok(h.published.some((e) => e.eventType === 'intro.meeting_scheduled'));

  // After the meeting: feedback is requested, collected from both, and the job completes.
  const afterMeeting = new Date(new Date(meeting.endUtc).getTime() + h.days(1.1));
  await jobs.runDueJobs({ now: afterMeeting });
  assert.ok(logs('report.request').some((l) => /feedback/i.test(l.summary)));
  await investor.submitFeedback({ introId: intro._id, user: user(good), rating: 5, comment: 'Useful' });
  await investor.submitFeedback({ introId: intro._id, user: user(student), rating: 4, comment: 'Helpful' });
  await assert.rejects(() => investor.submitFeedback({ introId: intro._id, user: user(student), rating: 4 }), { status: 409 });
  await jobs.runDueJobs({ now: new Date(afterMeeting.getTime() + h.hours(1)) });
  assert.strictEqual(rows(models.AgentJob).find((j) => j.type === 'investor.introduction').state, 'done');
  assert.strictEqual(rows(models.InvestorIntroduction)[0].feedback.length, 2);
  assert.strictEqual(rows(models.InvestorIntroduction).length, 1);
});

test('investor flow: a founder who says no, or an admin who rejects, means nothing is ever shared', async () => {
  const { student, admin, good } = investorWorld();
  await investor.sweep({ now: T0 });
  await jobs.runDueJobs({ now: T0 });
  const intro = rows(models.InvestorIntroduction)[0];
  await investor.founderConsent({ introId: intro._id, user: user(student), grant: false });
  await jobs.runDueJobs({ now: at(h.hours(1)) });
  assert.strictEqual(rows(models.InvestorIntroduction)[0].status, 'cancelled');
  assert.strictEqual(rows(models.AgentJob).find((j) => j.type === 'investor.introduction').state, 'done');
  assert.strictEqual(rows(models.Approval).length, 0);
  assert.ok(!rows(models.AgentNotification).some((x) => x.recipientUserId === String(good._id)));
  // A second sweep does not recreate the introduction.
  await investor.sweep({ now: at(h.days(2)) });
  assert.strictEqual(rows(models.InvestorIntroduction).length, 1);
});

test('investor flow: admin rejection keeps the investor uninformed', async () => {
  const { student, admin, good } = investorWorld();
  await investor.sweep({ now: T0 });
  await jobs.runDueJobs({ now: T0 });
  await investor.founderConsent({ introId: rows(models.InvestorIntroduction)[0]._id, user: user(student), grant: true });
  await jobs.runDueJobs({ now: at(h.hours(1)) });
  await approvals.decide({ approvalId: rows(models.Approval)[0]._id, user: user(admin), decision: 'rejected', comment: 'Not now' });
  await jobs.runDueJobs({ now: at(h.hours(2)) });
  assert.strictEqual(rows(models.InvestorIntroduction)[0].status, 'declined');
  assert.ok(!rows(models.AgentNotification).some((x) => x.recipientUserId === String(good._id)));
  assert.strictEqual(rows(models.AgentJob).find((j) => j.type === 'investor.introduction').state, 'done');
});

test('investor flow: no founder answer within the window closes the request without sharing anything', async () => {
  const { student, good } = investorWorld();
  await investor.sweep({ now: T0 });
  await jobs.runDueJobs({ now: T0 });
  await jobs.runDueJobs({ now: at(h.days(2.6)) }); // one reminder
  assert.ok(rows(models.AgentNotification).some((x) => /Reminder: introduction/.test(x.title)));
  await jobs.runDueJobs({ now: at(h.days(5.1)) });
  assert.strictEqual(rows(models.InvestorIntroduction)[0].status, 'cancelled');
  assert.strictEqual(rows(models.AgentJob).find((j) => j.type === 'investor.introduction').state, 'done');
  assert.ok(!rows(models.AgentNotification).some((x) => x.recipientUserId === String(good._id)));
});
