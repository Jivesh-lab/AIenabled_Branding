const test = require('node:test');
const assert = require('node:assert');
const h = require('./testing/harness');
const { models } = h;
const { runAction, ApprovalRequiredError } = require('./actionLog');
const { tierFor, TIER, integrationStatus } = require('./config');
const jobs = require('./jobs');
const approvals = require('./approvals');
const events = require('./events');
const { buildInvite } = require('./ics');
const { zonedToUtc, localParts } = require('./time');
const { encrypt, decrypt } = require('./secretBox');

test.beforeEach(() => h.resetAll());

// --------------------------------------------------------------------------
// Autonomy tiers
// --------------------------------------------------------------------------
test('tiers: routine actions are tier 1, nudges tier 2, decisions tier 3, and unknown actions fail closed to tier 3', () => {
  assert.strictEqual(tierFor('email.send'), TIER.ACT_FREELY);
  assert.strictEqual(tierFor('meeting.reschedule'), TIER.ACT_THEN_NOTIFY);
  assert.strictEqual(tierFor('admission.decide'), TIER.HUMAN_APPROVES);
  assert.strictEqual(tierFor('mentor.confirm_allocation'), TIER.HUMAN_APPROVES);
  assert.strictEqual(tierFor('investor.send_introduction'), TIER.HUMAN_APPROVES);
  assert.strictEqual(tierFor('something.nobody.classified'), TIER.HUMAN_APPROVES);
});

test('tier 3: an action does not execute without an approved approval, and the refusal is logged', async () => {
  let executed = 0;
  const attempt = (approvalId) => runAction({ agent: 'Application Agent', action: 'admission.decide', approvalId, summary: 'decided', exec: async () => { executed += 1; return {}; } });

  await assert.rejects(() => attempt(undefined), (e) => e instanceof ApprovalRequiredError);
  assert.strictEqual(executed, 0);

  const { approval } = await approvals.request({ type: 'admission', action: 'admission.decide', title: 'Decide', requestedBy: 'Application Agent', assignedRoles: ['admin'], subjectId: 'app-1' });
  await assert.rejects(() => attempt(approval._id), (e) => e instanceof ApprovalRequiredError, 'a pending approval must not unlock the action');
  assert.strictEqual(executed, 0);

  const logs = h.mem.store(models.ActionLog);
  assert.ok(logs.some((l) => l.status === 'blocked'), 'the refusal is recorded');
  assert.ok(logs.some((l) => l.status === 'pending_approval'), 'the request for a human decision is recorded');

  h.mem.store(models.Approval)[0].status = 'approved';
  await attempt(approval._id);
  assert.strictEqual(executed, 1);
});

test('tier 3: an approval for a different action cannot be used to unlock another action', async () => {
  const { approval } = await approvals.request({ type: 'investor_intro', action: 'investor.send_introduction', title: 'x', requestedBy: 'Investor Agent', assignedRoles: ['admin'], subjectId: 'i-1' });
  h.mem.store(models.Approval)[0].status = 'approved';
  await assert.rejects(() => runAction({ agent: 'x', action: 'admission.decide', approvalId: approval._id, summary: 's', exec: async () => ({}) }), ApprovalRequiredError);
});

test('action log: idempotency key makes a repeated action run once and return the first result', async () => {
  let runs = 0;
  const go = () => runAction({ agent: 'Workflow Agent', action: 'email.send', idempotencyKey: 'k1', summary: 'sent', exec: async () => { runs += 1; return { result: { n: runs } }; } });
  const first = await go();
  const second = await go();
  assert.strictEqual(runs, 1);
  assert.strictEqual(second.deduped, true);
  assert.deepStrictEqual(second.result, first.result);
});

test('action log: a failed action is recorded as failed and may be retried', async () => {
  let n = 0;
  const go = () => runAction({ agent: 'Workflow Agent', action: 'email.send', idempotencyKey: 'k2', summary: 'sent', exec: async () => { n += 1; if (n === 1) throw new Error('smtp down'); return {}; } });
  await assert.rejects(go, /smtp down/);
  await go();
  const rows = h.mem.store(models.ActionLog);
  assert.deepStrictEqual(rows.map((r) => r.status), ['failed', 'success']);
});

test('action log rows are immutable (update and delete are refused)', async () => {
  await assert.rejects(() => models.ActionLog.updateOne({}, { $set: { summary: 'tampered' } }), /immutable/);
  await assert.rejects(() => models.ActionLog.deleteMany({}), /immutable/);
});

test('a sandbox result is labelled simulated in the log summary, never "delivered"', async () => {
  await runAction({ agent: 'Workflow Agent', action: 'email.send', summary: 'Emailed the founder', exec: async () => ({ status: 'simulated' }) });
  const row = h.mem.store(models.ActionLog)[0];
  assert.strictEqual(row.status, 'simulated');
  assert.match(row.summary, /sandbox: not delivered/);
});

// --------------------------------------------------------------------------
// Events
// --------------------------------------------------------------------------
test('events: known events validate their payload; unknown events pass through; duplicates share an idempotency key', async () => {
  await assert.rejects(() => events.emit('mentor.requested', { aggregateId: 'p1', payload: {} }), /mentorUserId/);
  await events.emit('mentor.requested', { aggregateId: 'p1', payload: { mentorUserId: 'm1' }, dedupe: 'm1' });
  await events.emit('mentor.requested', { aggregateId: 'p1', payload: { mentorUserId: 'm1' }, dedupe: 'm1' });
  assert.strictEqual(h.published.length, 2);
  assert.strictEqual(h.published[0].idempotencyKey, h.published[1].idempotencyKey, 'the durable store dedupes on this key');
  assert.strictEqual(events.validate('legacy.event', {}).known, false);
});

// --------------------------------------------------------------------------
// Jobs: state machine, retry with backoff, restart recovery
// --------------------------------------------------------------------------
test('jobs: enqueue is idempotent on the dedupe key', async () => {
  const a = await jobs.enqueue({ type: 't', agent: 'A', dedupeKey: 'same' });
  const b = await jobs.enqueue({ type: 't', agent: 'A', dedupeKey: 'same' });
  assert.strictEqual(a.created, true);
  assert.strictEqual(b.created, false);
  assert.strictEqual(h.mem.store(models.AgentJob).length, 1);
});

test('jobs: a successful handler moves the job to its directed state; waiting jobs wake only at their deadline', async () => {
  jobs.registerJobHandler('t.wait', async (job, { now }) => ({ state: 'waiting_for_reply', step: 'asked', nextRunAt: new Date(now.getTime() + h.days(3)), timeoutAt: new Date(now.getTime() + h.days(7)) }));
  const t0 = new Date('2026-11-02T09:00:00Z');
  await jobs.enqueue({ type: 't.wait', agent: 'A', dedupeKey: 'w1', nextRunAt: t0 });
  const first = await jobs.runDueJobs({ now: t0 });
  assert.strictEqual(first.ran, 1);
  const job = h.mem.store(models.AgentJob)[0];
  assert.strictEqual(job.state, 'waiting_for_reply');
  assert.ok(job.timeoutAt && job.nextRunAt);
  assert.strictEqual((await jobs.runDueJobs({ now: new Date(t0.getTime() + h.days(1)) })).ran, 0, 'not due yet');
  assert.strictEqual((await jobs.runDueJobs({ now: new Date(t0.getTime() + h.days(3)) })).ran, 1, 'due at the deadline');
});

test('jobs: failures retry with growing backoff and become "failed" after the attempt limit', async () => {
  jobs.registerJobHandler('t.boom', async () => { throw new Error('upstream down'); });
  const t0 = new Date('2026-11-02T09:00:00Z');
  await jobs.enqueue({ type: 't.boom', agent: 'A', dedupeKey: 'b1', nextRunAt: t0, maxAttempts: 3 });
  let now = t0;
  const waits = [];
  for (let i = 0; i < 3; i += 1) {
    await jobs.runDueJobs({ now });
    const j = h.mem.store(models.AgentJob)[0];
    if (j.state === 'failed') break;
    assert.strictEqual(j.state, 'retrying');
    assert.strictEqual(j.attempts, i + 1);
    waits.push(j.nextRunAt.getTime() - now.getTime());
    now = new Date(j.nextRunAt.getTime() + 1000);
  }
  const job = h.mem.store(models.AgentJob)[0];
  assert.strictEqual(job.state, 'failed');
  assert.strictEqual(job.attempts, 3);
  assert.match(job.lastError, /upstream down/);
  assert.ok(waits[1] > waits[0], 'the second wait is longer than the first (exponential backoff)');
  assert.strictEqual(jobs.backoffMs(1, { baseMs: 1000, maxMs: 60000 }), 1000);
  assert.strictEqual(jobs.backoffMs(4, { baseMs: 1000, maxMs: 60000 }), 8000);
  assert.strictEqual(jobs.backoffMs(20, { baseMs: 1000, maxMs: 60000 }), 60000);
});

test('jobs: an illegal state transition is rejected and the job is retried rather than corrupted', async () => {
  jobs.registerJobHandler('t.bad', async () => ({ state: 'pending' }));
  await jobs.enqueue({ type: 't.bad', agent: 'A', dedupeKey: 'bad1', nextRunAt: new Date(0) });
  const out = await jobs.runDueJobs({ now: new Date() });
  assert.ok(out.ran === 1);
});

test('jobs: a job left "running" by a crashed worker is recovered and resumes from where it was', async () => {
  let runs = 0;
  jobs.registerJobHandler('t.resume', async () => { runs += 1; return { state: 'done' }; });
  const { job } = await jobs.enqueue({ type: 't.resume', agent: 'A', dedupeKey: 'r1', nextRunAt: new Date(0) });
  // Simulate a crash: claimed (state=running, locked) but never finished.
  const row = h.mem.store(models.AgentJob)[0];
  row.state = 'running';
  row.resumeState = 'waiting_for_reply';
  row.lockedAt = new Date(Date.now() - h.hours(1));
  assert.strictEqual((await jobs.runDueJobs({ now: new Date() })).ran, 0, 'a running job is not picked up twice');
  assert.strictEqual(await jobs.recoverInterrupted(new Date()), 1);
  assert.strictEqual(row.state, 'waiting_for_reply');
  await jobs.runDueJobs({ now: new Date() });
  assert.strictEqual(runs, 1);
  assert.strictEqual(row.state, 'done');
  assert.ok(row.history.some((h2) => /Recovered/.test(h2.note)));
});

test('jobs: a signal wakes a waiting job immediately and is consumed exactly once', async () => {
  const seen = [];
  jobs.registerJobHandler('t.sig', async (job, ctx) => { seen.push(ctx.signals.map((s) => s.name)); return ctx.signals.length ? { state: 'done' } : { state: 'waiting_for_reply', nextRunAt: new Date(Date.now() + h.days(5)) }; });
  const { job } = await jobs.enqueue({ type: 't.sig', agent: 'A', dedupeKey: 's1', nextRunAt: new Date(0) });
  await jobs.runDueJobs({ now: new Date() });
  await jobs.signal(job._id, 'reply', { x: 1 });
  await jobs.runDueJobs({ now: new Date() });
  assert.deepStrictEqual(seen, [[], ['reply']]);
  assert.strictEqual(h.mem.store(models.AgentJob)[0].state, 'done');
  assert.strictEqual(await jobs.signal(job._id, 'late', {}), null, 'finished jobs ignore signals');
});

// --------------------------------------------------------------------------
// Approvals: who may decide, and when
// --------------------------------------------------------------------------
test('approvals: only the assigned role decides; a coordinator only decides their own startups; a decision happens once', async () => {
  const coordinator = h.person('faculty', 'Dr Neha Sharma', { facultyRole: 'coordinator' });
  const other = h.person('faculty', 'Dr Other');
  const admin = h.person('admin', 'Kavita');
  const student = h.person('student', 'Asha');
  let executed = 0;
  approvals.registerApprovalHandler('mentor_allocation', { async approve() { executed += 1; } });
  const { approval } = await approvals.request({ type: 'mentor_allocation', action: 'mentor.confirm_allocation', title: 'Confirm', requestedBy: 'Mentor-Matching Agent', assignedRoles: ['faculty'], assignedUserIds: [coordinator._id], subjectId: 'p1' });

  await assert.rejects(() => approvals.decide({ approvalId: approval._id, user: { id: student._id, role: 'student' }, decision: 'approved' }), { status: 403 });
  await assert.rejects(() => approvals.decide({ approvalId: approval._id, user: { id: other._id, role: 'faculty' }, decision: 'approved' }), { status: 403 });
  await assert.rejects(() => approvals.decide({ approvalId: approval._id, user: { id: admin._id, role: 'admin' }, decision: 'approved' }), { status: 403 });
  assert.strictEqual(executed, 0, 'nothing ran for any unauthorised attempt');

  const result = await approvals.decide({ approvalId: approval._id, user: { id: coordinator._id, role: 'faculty', name: 'Dr Neha Sharma' }, decision: 'approved', comment: 'ok' });
  assert.strictEqual(result.approval.status, 'approved');
  assert.strictEqual(executed, 1);
  await assert.rejects(() => approvals.decide({ approvalId: approval._id, user: { id: coordinator._id, role: 'faculty' }, decision: 'approved' }), { status: 409 });
  assert.strictEqual(executed, 1);
});

test('approvals: the pending counter is one source of truth, scoped to the viewer', async () => {
  const c1 = h.person('faculty', 'Coord One');
  const c2 = h.person('faculty', 'Coord Two');
  await approvals.request({ type: 'mentor_allocation', action: 'mentor.confirm_allocation', title: 'a', requestedBy: 'x', assignedRoles: ['faculty'], assignedUserIds: [c1._id], subjectId: 'p1' });
  await approvals.request({ type: 'mentor_allocation', action: 'mentor.confirm_allocation', title: 'b', requestedBy: 'x', assignedRoles: ['faculty'], assignedUserIds: [c2._id], subjectId: 'p2' });
  await approvals.request({ type: 'admission', action: 'admission.decide', title: 'c', requestedBy: 'x', assignedRoles: ['admin'], subjectId: 'a1' });
  assert.strictEqual(await approvals.countPending({ id: c1._id, role: 'faculty' }), 1);
  assert.strictEqual(await approvals.countPending({ id: c2._id, role: 'faculty' }), 1);
  assert.strictEqual(await approvals.countPending({ id: 'x', role: 'admin' }), 1);
  assert.strictEqual(await approvals.countPending({ id: 'x', role: 'super_admin' }), 3);
  assert.strictEqual(await approvals.countPending({ id: 'x', role: 'student' }), 0);
});

test('approvals: requesting twice for the same subject creates one pending item (idempotent)', async () => {
  const a = await approvals.request({ type: 'admission', action: 'admission.decide', title: 'a', requestedBy: 'x', assignedRoles: ['admin'], subjectId: 'a1' });
  const b = await approvals.request({ type: 'admission', action: 'admission.decide', title: 'a', requestedBy: 'x', assignedRoles: ['admin'], subjectId: 'a1' });
  assert.strictEqual(a.created, true);
  assert.strictEqual(b.created, false);
  assert.strictEqual(h.mem.store(models.Approval).length, 1);
});

test('approvals: a rejection runs the reject hook and never the approve action', async () => {
  const admin = h.person('admin', 'Kavita');
  let approved = 0; let rejected = 0;
  approvals.registerApprovalHandler('investor_intro', { async approve() { approved += 1; }, async reject() { rejected += 1; } });
  const { approval } = await approvals.request({ type: 'investor_intro', action: 'investor.send_introduction', title: 'i', requestedBy: 'x', assignedRoles: ['admin'], subjectId: 'i1' });
  await approvals.decide({ approvalId: approval._id, user: { id: admin._id, role: 'admin' }, decision: 'rejected' });
  assert.deepStrictEqual([approved, rejected], [0, 1]);
});

test('approvals: if carrying out an approved decision fails, the decision is kept and the failure is retried later', async () => {
  const admin = h.person('admin', 'Kavita');
  let attempts = 0;
  approvals.registerApprovalHandler('admission', { async approve() { attempts += 1; if (attempts === 1) throw new Error('agent service down'); } });
  const { approval } = await approvals.request({ type: 'admission', action: 'admission.decide', title: 'a', requestedBy: 'x', assignedRoles: ['admin'], subjectId: 'a9' });
  const out = await approvals.decide({ approvalId: approval._id, user: { id: admin._id, role: 'admin' }, decision: 'approved' });
  assert.match(out.executionError, /agent service down/);
  assert.strictEqual(h.mem.store(models.Approval)[0].executionStatus, 'failed');
  await approvals.retryFailedExecutions();
  assert.strictEqual(h.mem.store(models.Approval)[0].executionStatus, 'done');
  assert.strictEqual(attempts, 2);
});

// --------------------------------------------------------------------------
// Small building blocks
// --------------------------------------------------------------------------
test('ics: produces a valid calendar invitation with UTC times, attendees and escaped text', () => {
  const ics = buildInvite({ uid: 'u1@x', title: 'Kick-off; with, commas', description: 'Line1\nLine2', location: 'Lab', startUtc: new Date('2026-11-05T10:30:00Z'), endUtc: new Date('2026-11-05T11:15:00Z'), organizer: { name: 'DBIT', email: 'o@x.edu' }, attendees: [{ name: 'Asha', email: 'a@x.edu' }] });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261105T103000Z/);
  assert.match(ics, /DTEND:20261105T111500Z/);
  assert.match(ics, /SUMMARY:Kick-off\\; with\\, commas/);
  assert.match(ics, /DESCRIPTION:Line1\\nLine2/);
  assert.match(ics.replace(/\r\n /g, ''), /ATTENDEE;CN=Asha[^\r]*mailto:a@x\.edu/);
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
  ics.split('\r\n').forEach((line) => assert.ok(Buffer.byteLength(line) <= 75, `line too long: ${line}`));
});

test('time: IST wall-clock converts to the right UTC instant and back', () => {
  const utc = zonedToUtc('2026-11-05', '16:00', 'Asia/Kolkata');
  assert.strictEqual(utc.toISOString(), '2026-11-05T10:30:00.000Z');
  const p = localParts(utc, 'Asia/Kolkata');
  assert.deepStrictEqual([p.hour, p.minute, p.dow], [16, 0, 4]); // Thursday
});

test('secret box: tokens round-trip, are not stored in clear, and tampering is detected', () => {
  process.env.INTEGRATIONS_ENCRYPTION_KEY = 'a-long-random-test-key';
  const blob = encrypt('ya29.secret-access-token');
  assert.ok(!blob.includes('secret-access-token'));
  assert.strictEqual(decrypt(blob), 'ya29.secret-access-token');
  const parts = blob.split('.');
  parts[2] = Buffer.from('tampered').toString('base64');
  assert.throws(() => decrypt(parts.join('.')));
});

test('integration status: nothing configured means every integration is a labelled sandbox, and secrets are never echoed', () => {
  const status = integrationStatus();
  assert.strictEqual(status.email.mode, 'sandbox');
  assert.strictEqual(status.calendar.mode, 'sandbox');
  assert.strictEqual(status.llm.mode, 'rules_only');
  assert.ok(status.email.missing.includes('SMTP_HOST'));
  process.env.SMTP_HOST = 'smtp.example.com'; process.env.SMTP_USER = 'u'; process.env.SMTP_PASSWORD = 'p';
  assert.strictEqual(integrationStatus().email.mode, 'live');
  process.env.AGENT_DEMO_MODE = 'true';
  assert.strictEqual(integrationStatus().email.mode, 'sandbox', 'demo mode forces sandbox even with credentials');
  delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMTP_PASSWORD; delete process.env.AGENT_DEMO_MODE;
  assert.ok(!JSON.stringify(integrationStatus()).includes('smtp.example.com'));
});
