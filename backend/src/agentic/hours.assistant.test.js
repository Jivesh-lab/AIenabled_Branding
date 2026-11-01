const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const h = require('./testing/harness');
const { models } = h;
const assistant = require('./assistant');
const { findCommonSlots } = require('./tools/slots');
const { validateWindows, windowsFor, fits } = require('./tools/workingHours');
const { localParts } = require('./time');

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

const rows = (Model) => h.mem.store(Model);
const user = (u) => ({ id: String(u._id), role: u.role, name: u.name });
const api = async (path, u, init = {}) => {
  const res = await fetch(`${base}/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ sub: String(u._id), role: u.role }, process.env.JWT_SECRET)}` }, body: init.json ? JSON.stringify(init.json) : undefined });
  return { status: res.status, body: await res.json().catch(() => null) };
};

function world() {
  const student = h.person('student', 'Asha Rao');
  const mentor = h.person('mentor', 'Dr Anil Rao');
  const admin = h.person('admin', 'Kavita');
  const coordinator = h.person('faculty', 'Dr Neha Sharma', { facultyRole: 'coordinator' });
  h.mem.seed(models.FacultyProject, { id: 'p1', title: 'AgriSense', domain: 'AgriTech', leadStudent: 'Asha Rao', ownerUserId: String(student._id), mentorUserId: String(mentor._id), coordinatorUserId: String(coordinator._id), applicationId: 'p1' });
  return { student, mentor, admin, coordinator };
}

// ---------------------------------------------------------------------------
// Assistant: more ways of asking
// ---------------------------------------------------------------------------
test('assistant: natural ways of asking for a meeting are understood and really book one', async () => {
  for (const phrase of ['Can we do a sync with my mentor tomorrow?', "Let's set up a call with Dr Anil on 2026-11-10", 'I want a catch up with my mentor next Monday', 'Could we arrange a 1:1 with my mentor in 3 days', 'organise a demo session with my mentor tomorrow']) {
    h.resetAll();
    const w = world();
    const reply = await assistant.handle({ user: user(w.student), message: phrase });
    assert.strictEqual(reply.handled, true, phrase);
    assert.match(reply.reply, /^Done\. The Workflow Agent booked/, phrase);
    assert.strictEqual(rows(models.FacultyMeeting).filter((m) => m.source === 'agent').length, 1, phrase);
  }
});

test('assistant: questions about existing meetings are answered, not turned into new bookings', async () => {
  const w = world();
  for (const phrase of ["What's on my agenda?", 'What meetings do I have?', "What's my schedule?", 'any upcoming sessions?', 'when is my next call']) {
    const reply = await assistant.handle({ user: user(w.student), message: phrase });
    assert.strictEqual(reply.handled, true, phrase);
    assert.match(reply.reply, /no upcoming meetings|Upcoming meetings/, phrase);
  }
  assert.strictEqual(rows(models.FacultyMeeting).length, 0, 'nothing was booked by asking');
});

test('assistant: other everyday phrasings reach the right answer', async () => {
  const w = world();
  h.mem.seed(models.FacultyTask, { id: 't1', title: 'Share BOM', projectId: 'p1', dueDate: '2026-11-10', assignedUserId: String(w.student._id), status: 'Pending' });
  h.mem.seed(models.Approval, { type: 'admission', action: 'admission.decide', title: 'Decide AgriSense', requestedBy: 'x', assignedRoles: ['admin'], subjectId: 'a1' });
  const ask = async (u, m) => (await assistant.handle({ user: user(u), message: m })).reply;
  assert.match(await ask(w.student, 'Do I have anything left to submit?'), /Nothing is outstanding|waiting for/);
  assert.match(await ask(w.student, 'what is due this week'), /Share BOM/);
  assert.match(await ask(w.student, 'what should I work on next'), /Share BOM/);
  assert.match(await ask(w.student, 'any updates?'), /not recorded anything|agents did/);
  assert.match(await ask(w.student, 'catch me up'), /not recorded anything|agents did/);
  assert.match(await ask(w.student, 'how is my startup going'), /agents|working on/);
  assert.match(await ask(w.admin, 'what needs my decision?'), /Decide AgriSense/);
  assert.match(await ask(w.admin, 'anything pending for my approval'), /Decide AgriSense/);
});

test('assistant: decisions are still refused however they are phrased, and unrelated chat is passed on', async () => {
  const w = world();
  for (const phrase of ['Please sign off the mentor allocation', 'go ahead and confirm the introduction', 'admit the startup AgriSense']) {
    const reply = await assistant.handle({ user: user(w.admin), message: phrase });
    assert.match(reply.reply, /cannot make that decision/, phrase);
  }
  assert.strictEqual((await assistant.handle({ user: user(w.student), message: 'explain what a SAFE note is' })).handled, false);
});

// ---------------------------------------------------------------------------
// Per-person working hours
// ---------------------------------------------------------------------------
test('working hours: input is validated with messages a person can act on', () => {
  assert.throws(() => validateWindows('nope'), /list of windows/);
  assert.throws(() => validateWindows([{ days: [], start: '17:00', end: '20:00' }]), /choose at least one day/);
  assert.throws(() => validateWindows([{ days: [9], start: '17:00', end: '20:00' }]), /choose at least one day/);
  assert.throws(() => validateWindows([{ days: [1], start: '5pm', end: '20:00' }]), /look like 17:00/);
  assert.throws(() => validateWindows([{ days: [1], start: '17:00', end: '17:10' }]), /30 minutes/);
  assert.deepStrictEqual(validateWindows([{ days: [3, 1, 1], start: '17:00', end: '20:00' }]), [{ days: [1, 3], start: '17:00', end: '20:00' }]);
  assert.deepStrictEqual(windowsFor({}), [{ days: [1, 2, 3, 4, 5], start: 600, end: 1020 }], 'default is the centre hours');
});

test('working hours: a slot must sit wholly inside a window, on one day', () => {
  const profile = { workingHours: [{ days: [1, 2, 3, 4, 5], start: '17:00', end: '20:00' }] };
  const at = (iso) => new Date(iso);
  assert.strictEqual(fits(profile, at('2026-11-02T12:00:00Z'), at('2026-11-02T12:45:00Z')), true); // Mon 17:30-18:15 IST
  assert.strictEqual(fits(profile, at('2026-11-02T04:30:00Z'), at('2026-11-02T05:15:00Z')), false, 'Mon 10:00 IST is outside');
  assert.strictEqual(fits(profile, at('2026-11-02T14:00:00Z'), at('2026-11-02T14:45:00Z')), false, 'ends after 20:00 IST');
  assert.strictEqual(fits(profile, at('2026-11-07T12:00:00Z'), at('2026-11-07T12:45:00Z')), false, 'Saturday is not listed');
});

test('working hours: an evening mentor and an evening founder get evening slots; everyone default gets office hours', async () => {
  const w = world();
  const evenings = { workingHours: [{ days: [1, 2, 3, 4, 5], start: '17:00', end: '20:00' }] };
  rows(models.User).find((u) => u._id === String(w.mentor._id)).profile = evenings;
  rows(models.User).find((u) => u._id === String(w.student._id)).profile = evenings;
  const from = new Date('2026-11-02T00:00:00Z');
  const evening = await findCommonSlots({ userIds: [String(w.mentor._id), String(w.student._id)], from, count: 12, leadDays: 2 });
  assert.ok(evening.slots.length >= 6);
  evening.slots.forEach((s) => {
    const a = localParts(s.startUtc);
    const e = localParts(new Date(s.endUtc.getTime() - 1));
    assert.ok(a.hour >= 17 && (e.hour < 20 || (e.hour === 20 && e.minute === 0)) && a.dow >= 1 && a.dow <= 5);
  });
  const office = await findCommonSlots({ userIds: [String(w.coordinator._id), String(w.admin._id)], from, count: 12, leadDays: 2 });
  office.slots.forEach((s) => assert.ok(localParts(s.startUtc).hour >= 10 && localParts(new Date(s.endUtc.getTime() - 1)).hour < 17));
});

test('working hours: when two people have no hours in common there are no slots (and nothing is invented)', async () => {
  const w = world();
  rows(models.User).find((u) => u._id === String(w.mentor._id)).profile = { workingHours: [{ days: [1, 2, 3, 4, 5], start: '17:00', end: '20:00' }] };
  const out = await findCommonSlots({ userIds: [String(w.mentor._id), String(w.student._id)], from: new Date('2026-11-02T00:00:00Z'), count: 5, leadDays: 2 });
  assert.deepStrictEqual(out.slots, []);
});

test('working hours: weekend-only mentors are respected', async () => {
  const w = world();
  const weekend = { workingHours: [{ days: [6], start: '10:00', end: '14:00' }] };
  rows(models.User).find((u) => u._id === String(w.mentor._id)).profile = weekend;
  rows(models.User).find((u) => u._id === String(w.student._id)).profile = weekend;
  const out = await findCommonSlots({ userIds: [String(w.mentor._id), String(w.student._id)], from: new Date('2026-11-02T00:00:00Z'), count: 5, leadDays: 2 });
  assert.ok(out.slots.length > 0);
  out.slots.forEach((s) => assert.strictEqual(localParts(s.startUtc).dow, 6));
});

test('the Workflow Agent books inside everyone\'s hours, for real, through the assistant', async () => {
  const w = world();
  const evenings = { workingHours: [{ days: [1, 2, 3, 4, 5], start: '17:00', end: '20:00' }] };
  rows(models.User).find((u) => u._id === String(w.mentor._id)).profile = evenings;
  rows(models.User).find((u) => u._id === String(w.student._id)).profile = evenings;
  const reply = await assistant.handle({ user: user(w.student), message: 'Schedule a review with my mentor next Thursday' });
  assert.match(reply.reply, /^Done/);
  const meeting = rows(models.FacultyMeeting).find((m) => m.source === 'agent');
  assert.ok(localParts(new Date(meeting.startUtc)).hour >= 17);
});

test('working hours API: save, read back, validate and clear - for the signed-in person only', async () => {
  const w = world();
  const fresh = await api('/agentic/me/working-hours', w.mentor);
  assert.strictEqual(fresh.status, 200);
  assert.strictEqual(fresh.body.data.custom, false);
  assert.strictEqual(fresh.body.data.defaultWindows[0].start, '10:00');

  const bad = await api('/agentic/me/working-hours', w.mentor, { method: 'PUT', json: { windows: [{ days: [1], start: '20:00', end: '17:00' }] } });
  assert.strictEqual(bad.status, 400);
  assert.match(bad.body.message, /30 minutes/);

  const saved = await api('/agentic/me/working-hours', w.mentor, { method: 'PUT', json: { windows: [{ days: [1, 2, 3], start: '17:00', end: '20:00' }] } });
  assert.strictEqual(saved.status, 200);
  assert.deepStrictEqual(rows(models.User).find((u) => u._id === String(w.mentor._id)).profile.workingHours, [{ days: [1, 2, 3], start: '17:00', end: '20:00' }]);
  assert.strictEqual(rows(models.User).find((u) => u._id === String(w.student._id)).profile?.workingHours, undefined, 'nobody else was changed');
  assert.strictEqual((await api('/agentic/me/working-hours', w.mentor)).body.data.custom, true);

  const cleared = await api('/agentic/me/working-hours', w.mentor, { method: 'PUT', json: { windows: [] } });
  assert.match(cleared.body.message, /cleared/);
  assert.strictEqual((await api('/agentic/me/working-hours', w.mentor)).body.data.custom, false);
});
