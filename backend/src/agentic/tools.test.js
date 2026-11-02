const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const identity = require('../services/googleIdentity');
const h = require('./testing/harness');
const { models } = h;
const email = require('./tools/email');
const { notify } = require('./tools/notify');
const google = require('./tools/google');
const { scheduleMeeting } = require('./tools/calendar');
const { findCommonSlots } = require('./tools/slots');
const { runAction } = require('./actionLog');
const { encrypt, decrypt } = require('./secretBox');

const rows = (Model) => h.mem.store(Model);
const ctx = { agent: 'Workflow Agent', trigger: { type: 'event', ref: 'allocation.confirmed' }, correlationId: 'c', jobId: null, projectId: 'p1', applicationId: null };

function configureLive() {
  process.env.SMTP_HOST = 'smtp.example.com'; process.env.SMTP_USER = 'agent@example.com'; process.env.SMTP_PASSWORD = 'secret'; process.env.EMAIL_FROM = 'incubation@example.com';
}
function configureGoogle() {
  process.env.GOOGLE_CLIENT_ID = 'cid'; process.env.GOOGLE_CLIENT_SECRET = 'csecret'; process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/integrations/google/callback'; process.env.INTEGRATIONS_ENCRYPTION_KEY = 'unit-test-key';
}
function clearEnv() {
  ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'AGENT_DEMO_MODE'].forEach((k) => delete process.env[k]);
  email.resetTransporter();
  google.setFetch((...a) => fetch(...a));
}

test.beforeEach(() => { h.resetAll(); clearEnv(); identity.resetClientFactory(); });
test.after(clearEnv);

test('email, sandbox: without SMTP the message is recorded as simulated and nothing is sent', async () => {
  const out = await email.sendEmail({ to: 'a@x.edu', subject: 'Hello', text: 'Body' });
  assert.strictEqual(out.status, 'simulated');
  const [row] = rows(models.OutboxMessage);
  assert.deepStrictEqual([row.mode, row.status, row.channel], ['sandbox', 'simulated', 'email']);
});

test('email, live: with SMTP configured it is delivered through the same path and recorded as sent', async () => {
  configureLive();
  const sent = [];
  email.setTransporter({ sendMail: async (m) => { sent.push(m); return { messageId: '<id-1@example.com>' }; } });
  const out = await email.sendEmail({ to: ['a@x.edu', 'b@x.edu'], subject: 'Invite', text: 'T', ics: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n' });
  assert.strictEqual(out.status, 'sent');
  assert.strictEqual(sent[0].to, 'a@x.edu, b@x.edu');
  assert.match(sent[0].from, /incubation@example\.com/);
  assert.ok(sent[0].icalEvent.content.includes('VCALENDAR'));
  assert.deepStrictEqual([rows(models.OutboxMessage)[0].mode, rows(models.OutboxMessage)[0].status], ['live', 'sent']);
});

test('email: demo mode forces the sandbox even when credentials exist', async () => {
  configureLive();
  process.env.AGENT_DEMO_MODE = 'true';
  email.setTransporter({ sendMail: async () => { throw new Error('must not be called'); } });
  const out = await email.sendEmail({ to: 'a@x.edu', subject: 'S', text: 'T' });
  assert.strictEqual(out.status, 'simulated');
});

test('email: a delivery failure is recorded and raised, a repeated send with the same key is not duplicated', async () => {
  configureLive();
  email.setTransporter({ sendMail: async () => { throw new Error('535 auth failed'); } });
  await assert.rejects(() => email.sendEmail({ to: 'a@x.edu', subject: 'S', text: 'T', dedupeKey: 'k' }), (e) => e.code === 'EMAIL_FAILED');
  assert.strictEqual(rows(models.OutboxMessage)[0].status, 'failed');
  let calls = 0;
  email.setTransporter({ sendMail: async () => { calls += 1; return { messageId: 'm' }; } });
  await email.sendEmail({ to: 'a@x.edu', subject: 'S', text: 'T', dedupeKey: 'k' });
  const again = await email.sendEmail({ to: 'a@x.edu', subject: 'S', text: 'T', dedupeKey: 'k' });
  assert.strictEqual(calls, 1);
  assert.strictEqual(again.deduped, true);
  assert.deepStrictEqual((await email.sendEmail({ to: [], subject: 'S' })).status, 'skipped');
});

test('notify: the in-app notice is delivered even if the email fails, and the log says so plainly', async () => {
  configureLive();
  email.setTransporter({ sendMail: async () => { throw new Error('smtp down'); } });
  const student = h.person('student', 'Asha');
  const out = await notify(ctx, { key: 'n1', userIds: [student._id], title: 'Hello', message: 'World' });
  assert.strictEqual(rows(models.AgentNotification).length, 1);
  assert.strictEqual(rows(models.AgentNotification)[0].recipientUserId, String(student._id));
  assert.match(out.summary, /could not be delivered; the in-app notice was delivered/);
  assert.strictEqual(rows(models.ActionLog)[0].status, 'success');
});

test('notify: a repeated notification with the same key is delivered once; people without an email get the in-app notice only', async () => {
  const student = h.person('student', 'Asha', { email: '' });
  rows(models.User)[0].email = '';
  await notify(ctx, { key: 'n2', userIds: [student._id], title: 'T', message: 'M' });
  await notify(ctx, { key: 'n2', userIds: [student._id], title: 'T', message: 'M' });
  assert.strictEqual(rows(models.AgentNotification).length, 1);
  assert.strictEqual(rows(models.OutboxMessage).length, 0);
});

test('notify: only active accounts receive notices', async () => {
  const gone = h.person('student', 'Gone', { status: 'suspended' });
  const ok = h.person('student', 'Ok');
  await notify(ctx, { key: 'n3', userIds: [gone._id, ok._id], title: 'T', message: 'M' });
  assert.deepStrictEqual(rows(models.AgentNotification).map((n) => n.recipientUserId), [String(ok._id)]);
});

// --------------------------------------------------------------------------
// Google Calendar
// --------------------------------------------------------------------------
test('google: not configured -> a clear, friendly error and no connection URL', async () => {
  await assert.rejects(() => google.authUrl('u1'), (e) => e.code === 'GOOGLE_NOT_CONFIGURED' && /not configured/i.test(e.message));
});

test('google: the connect URL asks only for calendar.events (offline), with a signed single-use state', async () => {
  configureGoogle();
  const url = new URL(await google.authUrl('user-42'));
  assert.strictEqual(url.hostname, 'accounts.google.com');
  assert.strictEqual(url.searchParams.get('client_id'), 'cid');
  const scopes = url.searchParams.get('scope').split(' ');
  assert.ok(scopes.includes('https://www.googleapis.com/auth/calendar.events'));
  assert.ok(!scopes.some((s) => /calendar$|calendar\.readonly|freebusy/.test(s)), 'no broader calendar scope than needed');
  assert.strictEqual(url.searchParams.get('access_type'), 'offline');
  assert.strictEqual(jwt.verify(url.searchParams.get('state'), process.env.JWT_SECRET).sub, 'user-42');
});

function fakeGoogle({ scope = 'openid email https://www.googleapis.com/auth/calendar.events', sub = 'sub-1', email = 'asha@gmail.com', refresh = '1//refresh', failExchange = false } = {}) {
  const { OAuth2Client } = require('google-auth-library');
  identity.setClientFactory(() => ({
    generateAuthUrl: (options) => new OAuth2Client({ clientId: 'cid', clientSecret: 'csecret', redirectUri: process.env.GOOGLE_REDIRECT_URI }).generateAuthUrl(options),
    getToken: async () => {
      if (failExchange) throw new Error('invalid_grant');
      return { tokens: { access_token: 'ya29.access', refresh_token: refresh, expiry_date: Date.now() + 3600e3, scope, id_token: 'id.token' } };
    },
    verifyIdToken: async () => ({ getPayload: () => ({ sub, email, email_verified: true, name: 'Asha' }) }),
  }));
}

test('google: the callback stores ENCRYPTED tokens against the user who started the flow, once', async () => {
  configureGoogle();
  fakeGoogle();
  const state = new URL(await google.authUrl('user-42')).searchParams.get('state');
  const result = await google.handleCallback({ code: 'auth-code', state });
  assert.deepStrictEqual(result, { userId: 'user-42', accountEmail: 'asha@gmail.com' });
  const [conn] = rows(models.CalendarConnection);
  assert.strictEqual(conn.userId, 'user-42');
  assert.strictEqual(conn.accountSub, 'sub-1');
  assert.strictEqual(conn.isPrimary, true);
  assert.ok(!conn.accessTokenEnc.includes('ya29') && !conn.refreshTokenEnc.includes('refresh'), 'tokens are encrypted at rest');
  assert.strictEqual(decrypt(conn.refreshTokenEnc), '1//refresh');
  await assert.rejects(() => google.handleCallback({ code: 'auth-code', state }), (e) => e.code === 'STATE_INVALID', 'a replayed state is refused');
});

test('google: forged, mismatched and wrong-purpose states are refused', async () => {
  configureGoogle();
  fakeGoogle();
  await assert.rejects(() => google.handleCallback({ code: 'x', state: 'forged.state.value' }), (e) => e.code === 'STATE_INVALID');
  const wrongPurpose = jwt.sign({ sub: 'u', purpose: 'google-signin' }, process.env.JWT_SECRET);
  await assert.rejects(() => google.handleCallback({ code: 'x', state: wrongPurpose }), (e) => e.code === 'STATE_INVALID');
  const noNonce = jwt.sign({ sub: 'u', purpose: 'google-calendar', t: 'never-issued' }, process.env.JWT_SECRET);
  await assert.rejects(() => google.handleCallback({ code: 'x', state: noNonce }), (e) => e.code === 'STATE_INVALID');
  assert.strictEqual(rows(models.CalendarConnection).length, 0);
});

test('google: a state issued for one user cannot connect a calendar for another', async () => {
  configureGoogle();
  fakeGoogle();
  const state = new URL(await google.authUrl('user-A')).searchParams.get('state');
  const forged = jwt.sign({ ...jwt.decode(state), sub: 'user-B' }, process.env.JWT_SECRET);
  await assert.rejects(() => google.handleCallback({ code: 'x', state: forged }), (e) => e.code === 'STATE_INVALID');
  assert.strictEqual(rows(models.CalendarConnection).length, 0);
});

test('google: if the person unticks the calendar permission, nothing is connected and they are told why', async () => {
  configureGoogle();
  fakeGoogle({ scope: 'openid email' });
  const state = new URL(await google.authUrl('user-42')).searchParams.get('state');
  await assert.rejects(() => google.handleCallback({ code: 'x', state }), (e) => e.code === 'PERMISSION_DENIED' && /tick the calendar permission/.test(e.message));
  assert.strictEqual(rows(models.CalendarConnection).length, 0);
});

test('google: a code Google rejects fails cleanly', async () => {
  configureGoogle();
  fakeGoogle({ failExchange: true });
  const state = new URL(await google.authUrl('user-42')).searchParams.get('state');
  await assert.rejects(() => google.handleCallback({ code: 'bad', state }), (e) => e.code === 'GOOGLE_CODE_REJECTED');
});

test('google: one person can connect two Google accounts; each is its own connection and only the owner sees them', async () => {
  configureGoogle();
  fakeGoogle({ sub: 'sub-1', email: 'work@gmail.com' });
  await google.handleCallback({ code: 'c1', state: new URL(await google.authUrl('user-42')).searchParams.get('state') });
  fakeGoogle({ sub: 'sub-2', email: 'personal@gmail.com', refresh: '1//refresh-2' });
  await google.handleCallback({ code: 'c2', state: new URL(await google.authUrl('user-42')).searchParams.get('state') });
  fakeGoogle({ sub: 'sub-9', email: 'other@gmail.com' });
  await google.handleCallback({ code: 'c3', state: new URL(await google.authUrl('user-77')).searchParams.get('state') });

  const mine = await google.listConnections('user-42');
  assert.deepStrictEqual(mine.map((c) => c.accountEmail).sort(), ['personal@gmail.com', 'work@gmail.com']);
  assert.strictEqual(mine.filter((c) => c.isPrimary).length, 1);
  assert.ok(!JSON.stringify(mine).includes('Enc'), 'no token fields are ever returned');
  assert.deepStrictEqual((await google.listConnections('user-77')).map((c) => c.accountEmail), ['other@gmail.com']);

  // Disconnecting someone else's connection by id does nothing.
  const theirs = (await google.listConnections('user-77'))[0].id;
  assert.strictEqual(await google.disconnect('user-42', theirs), 0);
  assert.strictEqual((await google.listConnections('user-77')).length, 1);
  // Disconnecting the primary promotes the other one.
  const primary = mine.find((c) => c.isPrimary).id;
  assert.strictEqual(await google.disconnect('user-42', primary), 1);
  const left = await google.listConnections('user-42');
  assert.strictEqual(left.length, 1);
  assert.strictEqual(left[0].isPrimary, true);
});

test('google: an expired access token is refreshed; a revoked grant marks the connection for reconnecting', async () => {
  configureGoogle();
  h.mem.seed(models.CalendarConnection, { userId: 'u1', accountEmail: 'a@gmail.com', accessTokenEnc: encrypt('old'), refreshTokenEnc: encrypt('refresh-1'), expiresAt: new Date(Date.now() - 1000), status: 'connected' });
  google.setFetch(async (u, init) => {
    assert.match(String(init.body), /grant_type=refresh_token/);
    return { ok: true, json: async () => ({ access_token: 'new-token', expires_in: 3600 }) };
  });
  assert.strictEqual(await google.accessTokenFor('u1'), 'new-token');
  rows(models.CalendarConnection)[0].expiresAt = new Date(Date.now() - 1000);
  google.setFetch(async () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant', error_description: 'Token has been revoked' }) }));
  assert.strictEqual(await google.accessTokenFor('u1'), null);
  assert.strictEqual(rows(models.CalendarConnection)[0].status, 'needs_reconnect');
});

test('calendar, google: when someone has connected Google the event (with Meet) is created on their calendar and Google invites the rest', async () => {
  configureGoogle();
  const mentor = h.person('mentor', 'Dr Anil Rao');
  const student = h.person('student', 'Asha');
  h.mem.seed(models.CalendarConnection, { userId: String(mentor._id), accountEmail: 'anil@gmail.com', accessTokenEnc: encrypt('tok'), refreshTokenEnc: encrypt('r'), expiresAt: new Date(Date.now() + h.hours(1)), status: 'connected' });
  const calls = [];
  google.setFetch(async (u, init) => {
    calls.push({ u, init });
    return { ok: true, json: async () => ({ id: 'gcal-1', htmlLink: 'https://calendar.google.com/e', hangoutLink: 'https://meet.google.com/abc-defg-hij' }) };
  });
  const start = new Date('2026-11-05T10:30:00Z');
  const out = await scheduleMeeting(ctx, { key: 'g1', projectId: 'p1', projectTitle: 'AgriSense', title: 'Onboarding', startUtc: start, endUtc: new Date(start.getTime() + 45 * 60000), attendees: [{ userId: String(mentor._id), name: 'Dr Anil Rao', email: mentor.email }, { userId: String(student._id), name: 'Asha', email: student.email }] });
  assert.strictEqual(out.status, 'success');
  assert.strictEqual(out.result.calendarMode, 'google');
  assert.strictEqual(out.result.link, 'https://meet.google.com/abc-defg-hij');
  const create = calls.find((c) => c.u.includes('/calendars/primary/events'));
  assert.match(create.u, /sendUpdates=all/);
  assert.match(create.u, /conferenceDataVersion=1/);
  const body = JSON.parse(create.init.body);
  assert.deepStrictEqual(body.attendees.map((a) => a.email), [student.email], 'the organiser is the connected person; others are invited');
  assert.strictEqual(create.init.headers.Authorization, 'Bearer tok');
  const meeting = rows(models.FacultyMeeting)[0];
  assert.strictEqual(meeting.calendarMode, 'google');
  assert.strictEqual(meeting.googleEventId, 'gcal-1');
  assert.strictEqual(rows(models.OutboxMessage).length, 0, 'Google sends the invitations, so no duplicate email');
});

test('calendar, fallback: if Google fails the invitation is emailed as .ics and the log says what happened', async () => {
  configureGoogle(); configureLive();
  email.setTransporter({ sendMail: async () => ({ messageId: 'm1' }) });
  const mentor = h.person('mentor', 'Dr Anil Rao');
  h.mem.seed(models.CalendarConnection, { userId: String(mentor._id), accessTokenEnc: encrypt('tok'), refreshTokenEnc: encrypt('r'), expiresAt: new Date(Date.now() + h.hours(1)), status: 'connected' });
  google.setFetch(async () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'backend error' } }) }));
  const start = new Date('2026-11-05T10:30:00Z');
  const out = await scheduleMeeting(ctx, { key: 'g2', projectId: 'p1', projectTitle: 'AgriSense', title: 'Onboarding', startUtc: start, endUtc: new Date(start.getTime() + 45 * 60000), attendees: [{ userId: String(mentor._id), name: 'Mentor', email: mentor.email }] });
  assert.strictEqual(out.result.calendarMode, 'ics_email');
  assert.match(out.summary, /Google Calendar could not be used/);
  assert.strictEqual(rows(models.OutboxMessage)[0].status, 'sent');
});

test('calendar, idempotent: scheduling the same meeting twice books it once', async () => {
  const a = h.person('student', 'A');
  const b = h.person('mentor', 'B');
  const params = { key: 'dup', projectId: 'p1', projectTitle: 'X', title: 'Sync', startUtc: new Date('2026-11-05T10:30:00Z'), endUtc: new Date('2026-11-05T11:15:00Z'), attendees: [{ userId: String(a._id), name: 'A', email: a.email }, { userId: String(b._id), name: 'B', email: b.email }] };
  await scheduleMeeting(ctx, params);
  const again = await scheduleMeeting(ctx, params);
  assert.strictEqual(again.deduped, true);
  assert.strictEqual(rows(models.FacultyMeeting).length, 1);
});

test('slots: only working hours on weekdays, never over an existing meeting, and honest about whose Google calendar was consulted', async () => {
  const a = h.person('student', 'A');
  const b = h.person('mentor', 'B');
  h.mem.seed(models.FacultyMeeting, { id: 'm', title: 'Busy', projectId: 'z', projectTitle: 'z', date: '2026-11-05', startUtc: new Date('2026-11-05T04:30:00Z'), endUtc: new Date('2026-11-05T07:30:00Z'), attendeeUserIds: [String(b._id)], outcome: 'pending' });
  const from = new Date('2026-11-02T00:00:00Z');
  const out = await findCommonSlots({ userIds: [String(a._id), String(b._id)], from, count: 40, leadDays: 2 });
  assert.ok(out.slots.length > 10);
  out.slots.forEach((s) => {
    const day = new Date(s.startUtc.getTime() + 5.5 * 3600000);
    assert.ok(day.getUTCDay() >= 1 && day.getUTCDay() <= 5);
    assert.ok(day.getUTCHours() >= 10 && s.endUtc.getTime() - s.startUtc.getTime() === 45 * 60000);
    assert.ok(!(s.startUtc < new Date('2026-11-05T07:30:00Z') && s.endUtc > new Date('2026-11-05T04:30:00Z')));
  });
  assert.deepStrictEqual(out.googleConsulted, [], 'no Google calendar was consulted');
});

test('every external action leaves an action-log row; a failed one is logged as failed', async () => {
  await assert.rejects(() => runAction({ agent: 'Workflow Agent', action: 'email.send', summary: 's', exec: async () => { throw new Error('boom'); } }), /boom/);
  assert.strictEqual(rows(models.ActionLog)[0].status, 'failed');
  assert.match(rows(models.ActionLog)[0].summary, /could not complete/);
});
