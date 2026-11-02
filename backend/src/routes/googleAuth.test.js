const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const h = require('../agentic/testing/harness');
const { models } = h;
const identity = require('../services/googleIdentity');
const google = require('../agentic/tools/google');
const { OAuth2Client } = require('google-auth-library');

process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/integrations/google/callback';
process.env.INTEGRATIONS_ENCRYPTION_KEY = 'unit-test-encryption-key';
process.env.FRONTEND_URL = 'http://localhost:3000';
delete process.env.MONGO_URI;
const app = require('../app');

let server;
let base;
test.before(async () => {
  server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const rows = (Model) => h.mem.store(Model);

// ---------------------------------------------------------------------------
// A scripted Google: whatever identity is "signed in" right now
// ---------------------------------------------------------------------------
let signedIn;
function googleIs(identityClaims, { scope = 'openid email profile' } = {}) {
  signedIn = { sub: 'g-sub-1', email: 'asha@gmail.com', email_verified: true, name: 'Asha Rao', picture: 'https://example.com/a.png', ...identityClaims };
  identity.setClientFactory(() => ({
    generateAuthUrl: (o) => new OAuth2Client({ clientId: 'test-client-id', clientSecret: 'x', redirectUri: process.env.GOOGLE_REDIRECT_URI }).generateAuthUrl(o),
    getToken: async (code) => {
      if (code === 'bad-code') throw new Error('invalid_grant');
      return { tokens: { access_token: 'ya29.test-access', refresh_token: '1//test-refresh', expiry_date: Date.now() + 3600e3, scope, id_token: 'signed.id.token' } };
    },
    verifyIdToken: async () => ({ getPayload: () => signedIn }),
  }));
}

async function http(path, { method = 'GET', json, headers = {}, user } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET)}` } : {}), ...headers },
    body: json ? JSON.stringify(json) : undefined,
  });
  let body = null;
  try { body = await res.json(); } catch { /* redirects have no body */ }
  return { status: res.status, body, location: res.headers.get('location'), cookies: res.headers.getSetCookie?.() || [] };
}

/** Runs the browser round trip: /start -> Google -> callback. Returns where the browser lands. */
async function signInWithGoogle({ mode = 'login', returnTo, cookie, state: stateOverride, query = '' } = {}) {
  const start = await http(`/api/auth/google/start?mode=${mode}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`);
  assert.strictEqual(start.status, 302);
  const state = new URL(start.location).searchParams.get('state');
  const nonceCookie = (start.cookies.find((c) => c.startsWith('g_nonce=')) || '').split(';')[0];
  const callback = await http(`/api/integrations/google/callback?code=good-code&state=${encodeURIComponent(stateOverride ?? state)}${query}`, { headers: { Cookie: cookie ?? nonceCookie } });
  return { start, state, landed: callback.location, callback };
}
const ticketFrom = (location, name) => new URL(location).searchParams.get(name);

const registerBody = (ticket, over = {}) => ({ ticket, name: 'Asha Rao', role: 'student', profile: { institution: 'DBIT', department: 'Computer Engineering', yearOfStudy: 'Final year' }, ...over });

test.beforeEach(() => { h.resetAll(); googleIs({}); });

// ---------------------------------------------------------------------------
// 1-4. First-time registration, returning login, persistence, no duplicates
// ---------------------------------------------------------------------------
test('first-time Google user: nothing is created until a profile is completed; then the account is saved and signed in', async () => {
  const { start, landed } = await signInWithGoogle();
  const scopes = new URL(start.location).searchParams.get('scope').split(' ');
  assert.deepStrictEqual(scopes.sort(), ['email', 'openid', 'profile'], 'sign-in asks for identity only - no calendar access');
  assert.match(landed, /^http:\/\/localhost:3000\/signup\?googleTicket=/);
  assert.strictEqual(rows(models.User).length, 0, 'visiting does not create an account');

  const ticket = ticketFrom(landed, 'googleTicket');
  const pending = await http(`/api/auth/google/pending?ticket=${ticket}`);
  assert.deepStrictEqual(pending.body.data, { name: 'Asha Rao', email: 'asha@gmail.com', picture: 'https://example.com/a.png' }, 'prefilled from the verified identity');

  const created = await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticket) });
  assert.strictEqual(created.status, 201);
  assert.strictEqual(created.body.status, 'active');
  const [user] = rows(models.User);
  assert.strictEqual(user.googleSub, 'g-sub-1');
  assert.strictEqual(user.email, 'asha@gmail.com');
  assert.strictEqual(user.role, 'student');
  assert.strictEqual(user.status, 'active');
  assert.strictEqual(user.passwordHash, null, 'no password exists for a Google-only account');
  assert.strictEqual(user.passwordLoginEnabled, false);
  assert.deepStrictEqual(user.profile, { institution: 'DBIT', department: 'Computer Engineering', yearOfStudy: 'Final year' });

  const session = await http('/api/auth/google/exchange', { method: 'POST', json: { ticket: created.body.ticket } });
  assert.strictEqual(session.status, 200);
  assert.strictEqual(session.body.user.id, user._id);
  assert.strictEqual(session.body.user.role, 'student');
  assert.ok(session.cookies.some((c) => c.startsWith('aai_token=') && /HttpOnly/i.test(c)), 'the normal httpOnly session cookie is issued');
});

test('returning Google user: no form, no password - straight to the same account; a login ticket works exactly once', async () => {
  const first = await signInWithGoogle();
  const made = await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticketFrom(first.landed, 'googleTicket')) });
  await http('/api/auth/google/exchange', { method: 'POST', json: { ticket: made.body.ticket } });

  const again = await signInWithGoogle();
  assert.match(again.landed, /^http:\/\/localhost:3000\/login\?googleTicket=/, 'a returning user is not sent to the registration form');
  const ticket = ticketFrom(again.landed, 'googleTicket');
  const session = await http('/api/auth/google/exchange', { method: 'POST', json: { ticket } });
  assert.strictEqual(session.status, 200);
  assert.strictEqual(session.body.user.id, rows(models.User)[0]._id);
  const replay = await http('/api/auth/google/exchange', { method: 'POST', json: { ticket } });
  assert.strictEqual(replay.status, 401, 'a spent ticket cannot start a second session');
});

test('profile and identity persist across sign-outs; five sign-ins still leave exactly one account', async () => {
  const first = await signInWithGoogle();
  const made = await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticketFrom(first.landed, 'googleTicket')) });
  await http('/api/auth/google/exchange', { method: 'POST', json: { ticket: made.body.ticket } });
  const id = rows(models.User)[0]._id;
  for (let i = 0; i < 4; i += 1) {
    const flow = await signInWithGoogle();
    const session = await http('/api/auth/google/exchange', { method: 'POST', json: { ticket: ticketFrom(flow.landed, 'googleTicket') } });
    assert.strictEqual(session.body.user.id, id);
    assert.strictEqual(session.body.user.role, 'student');
  }
  assert.strictEqual(rows(models.User).length, 1);
  assert.strictEqual(rows(models.User)[0].profile.department, 'Computer Engineering', 'the saved profile is unchanged');
  assert.ok(rows(models.User)[0].lastLogin, 'last login is recorded');
});

test('registering twice with the same ticket (a double click) creates one account', async () => {
  const flow = await signInWithGoogle();
  const ticket = ticketFrom(flow.landed, 'googleTicket');
  const results = await Promise.all([1, 2, 3].map(() => http('/api/auth/google/register', { method: 'POST', json: registerBody(ticket) })));
  assert.strictEqual(results.filter((r) => r.status === 201).length, 1);
  assert.strictEqual(rows(models.User).length, 1);
});

// ---------------------------------------------------------------------------
// 5-6. Passwords keep working; linking is never automatic
// ---------------------------------------------------------------------------
function passwordUser(over = {}) {
  return h.mem.seed(models.User, { name: 'Mentor Mira', email: 'mira@gmail.com', passwordHash: bcrypt.hashSync('Str0ngPassw0rd', 4), role: 'mentor', status: 'active', emailVerified: true, ...over });
}

test('the existing e-mail and password login still works, and rejects a wrong password', async () => {
  passwordUser();
  const ok = await http('/api/auth/login', { method: 'POST', json: { email: 'mira@gmail.com', password: 'Str0ngPassw0rd' } });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.user.role, 'mentor');
  const bad = await http('/api/auth/login', { method: 'POST', json: { email: 'mira@gmail.com', password: 'wrong-password' } });
  assert.strictEqual(bad.status, 401);
});

test('a Google-only account can never be opened with a password - not even the old development passwords', async () => {
  const flow = await signInWithGoogle();
  await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticketFrom(flow.landed, 'googleTicket')) });
  for (const password of ['password', 'student', 'Student@123', '12345678', 'Student#2026!Pass', '']) {
    const res = await http('/api/auth/login', { method: 'POST', json: { email: 'asha@gmail.com', password: password || 'x' } });
    assert.strictEqual(res.status, 401, `"${password}" must not work`);
  }
});

test('an existing account with the same e-mail is NEVER linked automatically', async () => {
  passwordUser({ email: 'asha@gmail.com' });
  const flow = await signInWithGoogle();
  assert.match(flow.landed, /login\?google=link&linkTicket=/);
  assert.ok(!flow.landed.includes('googleTicket='), 'no sign-in ticket is issued');
  assert.strictEqual(rows(models.User).length, 1);
  assert.strictEqual(rows(models.User)[0].googleSub, undefined, 'nothing was linked');
});

test('linking requires the account\'s own password; it keeps the same account, role and data; later Google logins use it', async () => {
  const existing = passwordUser({ email: 'asha@gmail.com', profile: { organisation: 'Acme', expertise: 'IoT' } });
  const flow = await signInWithGoogle();
  const ticket = ticketFrom(flow.landed, 'linkTicket');

  const wrong = await http('/api/auth/google/link', { method: 'POST', json: { ticket, password: 'not-the-password' } });
  assert.strictEqual(wrong.status, 401);
  assert.strictEqual(rows(models.User)[0].googleSub, undefined);

  const linked = await http('/api/auth/google/link', { method: 'POST', json: { ticket, password: 'Str0ngPassw0rd' } });
  assert.strictEqual(linked.status, 200);
  assert.strictEqual(linked.body.linked, true);
  const user = rows(models.User)[0];
  assert.strictEqual(user._id, existing._id, 'same internal account');
  assert.strictEqual(user.role, 'mentor');
  assert.deepStrictEqual(user.profile, { organisation: 'Acme', expertise: 'IoT' });
  assert.strictEqual(user.googleSub, 'g-sub-1');
  assert.ok(user.passwordHash, 'the password still works too');
  assert.strictEqual((await http('/api/auth/google/link', { method: 'POST', json: { ticket, password: 'Str0ngPassw0rd' } })).status, 410, 'the link ticket is single-use');

  const later = await signInWithGoogle();
  assert.match(later.landed, /login\?googleTicket=/);
  const session = await http('/api/auth/google/exchange', { method: 'POST', json: { ticket: ticketFrom(later.landed, 'googleTicket') } });
  assert.strictEqual(session.body.user.id, existing._id);
  assert.strictEqual((await http('/api/auth/login', { method: 'POST', json: { email: 'asha@gmail.com', password: 'Str0ngPassw0rd' } })).status, 200);
});

test('linking is rate-limited: five wrong passwords burn the ticket', async () => {
  passwordUser({ email: 'asha@gmail.com' });
  const ticket = ticketFrom((await signInWithGoogle()).landed, 'linkTicket');
  for (let i = 0; i < 5; i += 1) assert.strictEqual((await http('/api/auth/google/link', { method: 'POST', json: { ticket, password: `guess-${i}` } })).status, 401);
  const locked = await http('/api/auth/google/link', { method: 'POST', json: { ticket, password: 'Str0ngPassw0rd' } });
  assert.strictEqual(locked.status, 429, 'even the right password is refused once the ticket is burned');
  assert.strictEqual(rows(models.User)[0].googleSub, undefined);
});

test('a privileged account with two-factor needs its authenticator code to link; a Google account already used elsewhere cannot be linked twice', async () => {
  passwordUser({ email: 'asha@gmail.com', role: 'admin', twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' });
  const ticket = ticketFrom((await signInWithGoogle()).landed, 'linkTicket');
  const noCode = await http('/api/auth/google/link', { method: 'POST', json: { ticket, password: 'Str0ngPassw0rd' } });
  assert.strictEqual(noCode.status, 401);
  assert.strictEqual(noCode.body.code, 'TWO_FACTOR_REQUIRED');
  assert.strictEqual((await http('/api/auth/google/link', { method: 'POST', json: { ticket, password: 'Str0ngPassw0rd', twoFactorCode: '123456' } })).status, 401, 'the development shortcut code is not accepted for linking');
  assert.strictEqual(rows(models.User)[0].googleSub, undefined);

  h.resetAll();
  h.mem.seed(models.User, { name: 'Taken', email: 'taken@x.edu', passwordHash: 'x', role: 'student', status: 'active', googleSub: 'g-sub-1' });
  passwordUser({ email: 'asha@gmail.com' });
  // The subject is already linked to "Taken", so a sign-in resolves to that account rather than offering to link.
  const flow = await signInWithGoogle();
  assert.match(flow.landed, /login\?googleTicket=/);
});

// ---------------------------------------------------------------------------
// 7-8. Roles come from the database; nobody can promote themselves
// ---------------------------------------------------------------------------
test('the signed-in role is read from the database, not from anything the browser sent', async () => {
  const mentor = passwordUser({ email: 'asha@gmail.com', googleSub: 'g-sub-1', authProviders: ['password', 'google'] });
  const flow = await signInWithGoogle();
  const session = await http('/api/auth/google/exchange', { method: 'POST', json: { ticket: ticketFrom(flow.landed, 'googleTicket'), role: 'super_admin', userId: 'someone-else' } });
  assert.strictEqual(session.body.user.id, mentor._id);
  assert.strictEqual(session.body.user.role, 'mentor');
});

test('role escalation is refused: admin and super admin cannot be chosen, and privileged self-sign-up waits for approval', async () => {
  const flow = await signInWithGoogle();
  const ticket = ticketFrom(flow.landed, 'googleTicket');
  for (const role of ['admin', 'super_admin', 'industry', '', undefined]) {
    const res = await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticket, { role }) });
    assert.strictEqual(res.status, 400, `role ${role}`);
  }
  assert.strictEqual(rows(models.User).length, 0);

  const sneaky = await http('/api/auth/google/register', { method: 'POST', json: { ...registerBody(ticket, { role: 'faculty', profile: { institution: 'DBIT', department: 'CSE', designation: 'Professor', role: 'admin', isInvestorVerified: true, facultyRole: 'coordinator' } }), status: 'active', isInvestorVerified: true, googleSub: 'someone-else', permissions: ['all'] } });
  assert.strictEqual(sneaky.status, 201);
  assert.strictEqual(sneaky.body.status, 'pending', 'faculty waits for an administrator');
  assert.strictEqual(sneaky.body.ticket, undefined, 'no session ticket is issued');
  const user = rows(models.User)[0];
  assert.strictEqual(user.role, 'faculty');
  assert.strictEqual(user.status, 'pending');
  assert.strictEqual(user.googleSub, 'g-sub-1', 'the identity comes from Google, not the request');
  assert.ok(!user.isInvestorVerified && !user.facultyRole, 'privileges cannot be self-granted');
  assert.deepStrictEqual(Object.keys(user.profile).sort(), ['department', 'designation', 'institution'], 'unknown profile fields are dropped');
});

// ---------------------------------------------------------------------------
// 9. Incomplete registration
// ---------------------------------------------------------------------------
test('incomplete registration keeps the person in the completion flow and creates nothing', async () => {
  const ticket = ticketFrom((await signInWithGoogle()).landed, 'googleTicket');
  const missing = await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticket, { profile: { institution: 'DBIT' } }) });
  assert.strictEqual(missing.status, 400);
  assert.match(missing.body.message, /department|complete/i);
  const noName = await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticket, { name: ' ' }) });
  assert.strictEqual(noName.status, 400);
  assert.strictEqual(rows(models.User).length, 0, 'no half-filled account exists');
  const stillOpen = await http(`/api/auth/google/pending?ticket=${ticket}`);
  assert.strictEqual(stillOpen.status, 200, 'the ticket survives a validation error so the person can fix it');
  assert.strictEqual((await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticket) })).status, 201);
});

test('an expired or unknown sign-up ticket is refused', async () => {
  assert.strictEqual((await http('/api/auth/google/pending?ticket=nope')).status, 410);
  assert.strictEqual((await http('/api/auth/google/register', { method: 'POST', json: registerBody('nope') })).status, 410);
  const ticket = ticketFrom((await signInWithGoogle()).landed, 'googleTicket');
  rows(models.AuthTicket)[0].expiresAt = new Date(Date.now() - 1000);
  assert.strictEqual((await http(`/api/auth/google/pending?ticket=${ticket}`)).status, 410);
});

// ---------------------------------------------------------------------------
// 10. Account states
// ---------------------------------------------------------------------------
test('pending, disabled and deleted accounts cannot start a session - and approval takes effect immediately', async () => {
  const flow = await signInWithGoogle();
  const made = await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticketFrom(flow.landed, 'googleTicket'), { role: 'mentor', profile: { organisation: 'Acme', expertise: 'IoT' } }) });
  assert.strictEqual(made.body.status, 'pending');
  const user = rows(models.User)[0];

  assert.match((await signInWithGoogle()).landed, /login\?google=pending_approval/);
  user.status = 'inactive';
  assert.match((await signInWithGoogle()).landed, /login\?google=account_disabled/);
  user.status = 'rejected';
  assert.match((await signInWithGoogle()).landed, /login\?google=account_disabled/);
  user.status = 'active'; user.isSoftDeleted = true;
  assert.match((await signInWithGoogle()).landed, /login\?google=account_unavailable/);
  user.isSoftDeleted = false;
  assert.match((await signInWithGoogle()).landed, /login\?googleTicket=/, 'once an administrator approves, sign-in works');
});

test('status is re-checked when the ticket is exchanged, so an account disabled in between cannot sign in', async () => {
  const first = await signInWithGoogle();
  const made = await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticketFrom(first.landed, 'googleTicket')) });
  rows(models.User)[0].status = 'inactive';
  const res = await http('/api/auth/google/exchange', { method: 'POST', json: { ticket: made.body.ticket } });
  assert.strictEqual(res.status, 403);
});

test('an administrator\'s deactivation is not undone by someone typing the e-mail into the password form', async () => {
  const flow = await signInWithGoogle();
  await http('/api/auth/google/register', { method: 'POST', json: registerBody(ticketFrom(flow.landed, 'googleTicket')) });
  rows(models.User)[0].status = 'inactive';
  await http('/api/auth/login', { method: 'POST', json: { email: 'asha@gmail.com', password: 'whatever1' } });
  assert.strictEqual(rows(models.User)[0].status, 'inactive');
});

// ---------------------------------------------------------------------------
// 16. OAuth state, CSRF, redirects
// ---------------------------------------------------------------------------
test('sign-in callbacks are rejected without the starting browser\'s cookie, with a forged state, or after Google errors', async () => {
  assert.match((await signInWithGoogle({ cookie: '' })).landed, /google=failed/, 'login-CSRF: a callback not started by this browser');
  assert.match((await signInWithGoogle({ cookie: 'g_nonce=another-browsers-nonce' })).landed, /google=failed/);
  assert.match((await signInWithGoogle({ state: 'forged.state.value' })).landed, /google=expired/);
  assert.match((await signInWithGoogle({ state: jwt.sign({ purpose: 'google-signin' }, 'not-our-secret') })).landed, /google=expired/);
  assert.match((await signInWithGoogle({ query: '&error=access_denied' })).landed, /google=cancelled/, 'the person pressed Cancel at Google');
  assert.strictEqual(rows(models.User).length, 0);
});

test('an unverified Google e-mail is refused, and a Google code that fails is a clean error', async () => {
  googleIs({ email_verified: false });
  assert.match((await signInWithGoogle()).landed, /google=email_unverified/);
  googleIs({});
  const start = await http('/api/auth/google/start');
  const state = new URL(start.location).searchParams.get('state');
  const cookie = start.cookies.find((c) => c.startsWith('g_nonce=')).split(';')[0];
  const failed = await http(`/api/integrations/google/callback?code=bad-code&state=${encodeURIComponent(state)}`, { headers: { Cookie: cookie } });
  assert.match(failed.location, /google=failed/);
  assert.ok(!failed.location.includes('bad-code'), 'the authorization code is never echoed');
});

test('redirects cannot leave the application: unsafe returnTo values are dropped', async () => {
  passwordUser({ email: 'asha@gmail.com', googleSub: 'g-sub-1' });
  for (const bad of ['https://evil.example/steal', '//evil.example', '/workspace/../etc', '/workspace/admin/users', 'javascript:alert(1)']) {
    const flow = await signInWithGoogle({ returnTo: bad });
    assert.ok(flow.landed.startsWith('http://localhost:3000/login?googleTicket='), bad);
    assert.ok(!flow.landed.includes('returnTo'), `${bad} was dropped`);
  }
  const good = await signInWithGoogle({ returnTo: '/workspace/mentor/schedule' });
  assert.match(good.landed, /returnTo=%2Fworkspace%2Fmentor%2Fschedule/);
});

test('without Google credentials the start route sends people back to the login page with a clear reason', async () => {
  const keep = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  const res = await http('/api/auth/google/start');
  assert.match(res.location, /\/login\?google=not_configured/);
  process.env.GOOGLE_CLIENT_ID = keep;
});

test('tickets are stored only as hashes, so reading the database does not reveal a usable ticket', async () => {
  const ticket = ticketFrom((await signInWithGoogle()).landed, 'googleTicket');
  assert.ok(rows(models.AuthTicket).every((t) => t.tokenHash !== ticket && !JSON.stringify(t).includes(ticket)));
});

// ---------------------------------------------------------------------------
// 11-15. Calendar: connect, disconnect, read, create, isolation, expiry, revocation
// ---------------------------------------------------------------------------
function person(role, email) {
  return h.mem.seed(models.User, { name: email.split('@')[0], email, passwordHash: bcrypt.hashSync('Str0ngPassw0rd', 4), role, status: 'active', emailVerified: true });
}

async function connectCalendar(user, claims = {}) {
  googleIs({ sub: `cal-${user._id}`, email: `${user._id}@calendar.example`, ...claims }, { scope: 'openid email https://www.googleapis.com/auth/calendar.events' });
  const url = await http('/api/integrations/google/connect-url', { user });
  assert.strictEqual(url.status, 200);
  const state = new URL(url.body.data.url).searchParams.get('state');
  return http(`/api/integrations/google/callback?code=good-code&state=${encodeURIComponent(state)}`);
}

test('connecting a calendar is separate from signing in, asks only for calendar.events, and lands the person on their own portal', async () => {
  const user = person('mentor', 'mira@gmail.com');
  const url = await http('/api/integrations/google/connect-url', { user });
  const scopes = new URL(url.body.data.url).searchParams.get('scope').split(' ');
  assert.ok(scopes.includes('https://www.googleapis.com/auth/calendar.events'));
  assert.ok(!scopes.some((s) => /calendar\.readonly|freebusy|auth\/calendar$/.test(s)));
  assert.strictEqual(new URL(url.body.data.url).searchParams.get('access_type'), 'offline');

  const landed = await connectCalendar(user);
  assert.strictEqual(landed.location, 'http://localhost:3000/workspace/mentor/dashboard?calendar=connected');
  const list = await http('/api/integrations/google/connections', { user });
  assert.strictEqual(list.body.data.length, 1);
  assert.ok(!JSON.stringify(list.body).includes('Enc') && !JSON.stringify(list.body).includes('ya29'), 'tokens never reach the browser');
  assert.strictEqual((await http('/api/integrations/google/connect-url')).status, 401, 'connecting needs a signed-in user');
});

test('declining the calendar permission, or cancelling, leaves the person with a working app and no connection', async () => {
  const user = person('student', 'sam@gmail.com');
  googleIs({}, { scope: 'openid email' });
  const url = await http('/api/integrations/google/connect-url', { user });
  const state = new URL(url.body.data.url).searchParams.get('state');
  const denied = await http(`/api/integrations/google/callback?code=good-code&state=${encodeURIComponent(state)}`);
  assert.match(denied.location, /calendar=permission/);
  const url2 = await http('/api/integrations/google/connect-url', { user });
  const cancelled = await http(`/api/integrations/google/callback?error=access_denied&state=${encodeURIComponent(new URL(url2.body.data.url).searchParams.get('state'))}`);
  assert.match(cancelled.location, /calendar=cancelled/);
  assert.strictEqual(rows(models.CalendarConnection).length, 0);
  assert.strictEqual((await http('/api/integrations/status', { user })).status, 200, 'the app keeps working');
});

test('a calendar callback with a forged or replayed state connects nothing', async () => {
  const user = person('student', 'sam@gmail.com');
  const forged = await http('/api/integrations/google/callback?code=good-code&state=forged');
  assert.match(forged.location, /google=expired/);
  await connectCalendar(user);
  const url = await http('/api/integrations/google/connect-url', { user });
  const state = new URL(url.body.data.url).searchParams.get('state');
  await http(`/api/integrations/google/callback?code=good-code&state=${encodeURIComponent(state)}`);
  const replay = await http(`/api/integrations/google/callback?code=good-code&state=${encodeURIComponent(state)}`);
  assert.match(replay.location, /calendar=error/);
});

function calendarFetch(handler) {
  const calls = [];
  google.setFetch(async (url, init = {}) => {
    calls.push({ url, init });
    const result = handler(url, init, calls.length);
    return { ok: result.status < 400, status: result.status, json: async () => result.body };
  });
  return calls;
}

test('reading existing events: the signed-in person\'s own calendar, shaped for the UI, with a bounded date range', async () => {
  const user = person('mentor', 'mira@gmail.com');
  await connectCalendar(user);
  const calls = calendarFetch(() => ({ status: 200, body: { items: [
    { id: 'e1', summary: 'Mentor call', start: { dateTime: '2026-11-05T10:00:00+05:30' }, end: { dateTime: '2026-11-05T10:45:00+05:30' }, htmlLink: 'https://calendar.google.com/e1', hangoutLink: 'https://meet.google.com/abc' },
    { id: 'e2', summary: 'Holiday', start: { date: '2026-11-06' }, end: { date: '2026-11-07' } },
    { id: 'e3', summary: 'Gone', status: 'cancelled', start: { dateTime: '2026-11-05T12:00:00Z' }, end: { dateTime: '2026-11-05T13:00:00Z' } },
  ] } }));
  const res = await http('/api/integrations/calendar/events?from=2026-11-01T00:00:00Z&to=2026-11-30T00:00:00Z', { user });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.data.map((e) => [e.id, e.allDay]), [['e1', false], ['e2', true]]);
  assert.strictEqual(calls[0].init.headers.Authorization, 'Bearer ya29.test-access');
  assert.match(calls[0].url, /singleEvents=true/);
  assert.strictEqual((await http('/api/integrations/calendar/events?from=2026-01-01T00:00:00Z&to=2026-12-31T00:00:00Z', { user })).status, 400, 'ranges over 62 days are refused');
  assert.strictEqual((await http('/api/integrations/calendar/events?from=nonsense', { user })).status, 400);
});

test('creating events: validated, and a retried request cannot create a duplicate', async () => {
  const user = person('mentor', 'mira@gmail.com');
  await connectCalendar(user);
  const good = { title: 'Review', description: 'Milestone review', date: '2026-11-10', startTime: '15:00', endTime: '15:45', timeZone: 'Asia/Kolkata', requestId: 'req-12345678' };

  for (const [patch, pattern] of [
    [{ title: '' }, /title/], [{ title: 'x'.repeat(201) }, /title/], [{ description: 'x'.repeat(2001) }, /description/], [{ timeZone: 'Mars/Base' }, /time zone/],
    [{ date: '10-11-2026' }, /YYYY-MM-DD/], [{ startTime: '25:00' }, /HH:MM/], [{ endTime: '14:00' }, /after the start/], [{ requestId: 'x' }, /request id/],
  ]) {
    const res = await http('/api/integrations/calendar/events', { method: 'POST', user, json: { ...good, ...patch } });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, pattern);
  }

  const calls = calendarFetch((url, init) => {
    if (init.method === 'POST') return { status: 200, body: { id: JSON.parse(init.body).id, htmlLink: 'https://calendar.google.com/new' } };
    return { status: 404, body: {} };
  });
  const first = await http('/api/integrations/calendar/events', { method: 'POST', user, json: good });
  assert.strictEqual(first.status, 201);
  const sent = JSON.parse(calls[0].init.body);
  assert.deepStrictEqual(sent.start, { dateTime: '2026-11-10T15:00:00', timeZone: 'Asia/Kolkata' });
  assert.match(sent.id, /^[0-9a-f]{40}$/, 'a deterministic id derived from this user and request');

  // The retry: Google answers 409 because that id exists; the API returns the existing event instead of a second one.
  calendarFetch((url, init) => (init.method === 'POST' ? { status: 409, body: { error: { message: 'duplicate' } } } : { status: 200, body: { id: sent.id, htmlLink: 'https://calendar.google.com/new' } }));
  const retry = await http('/api/integrations/calendar/events', { method: 'POST', user, json: good });
  assert.strictEqual(retry.status, 200);
  assert.strictEqual(retry.body.data.duplicate, true);
  assert.strictEqual(retry.body.data.id, sent.id);
});

test('one person can never reach another person\'s calendar credentials, even by passing their connection id', async () => {
  const alice = person('mentor', 'alice@gmail.com');
  const bob = person('student', 'bob@gmail.com');
  await connectCalendar(alice);
  const aliceConnection = (await http('/api/integrations/google/connections', { user: alice })).body.data[0].id;
  const calls = calendarFetch(() => ({ status: 200, body: { items: [{ id: 'secret', summary: 'Alice private', start: { dateTime: '2026-11-05T10:00:00Z' }, end: { dateTime: '2026-11-05T11:00:00Z' } }] } }));

  const bobConnections = await http('/api/integrations/google/connections', { user: bob });
  assert.deepStrictEqual(bobConnections.body.data, []);
  const read = await http(`/api/integrations/calendar/events?connectionId=${aliceConnection}`, { user: bob });
  assert.strictEqual(read.status, 409);
  assert.strictEqual(read.body.code, 'CALENDAR_NOT_CONNECTED');
  assert.strictEqual(calls.length, 0, 'no Google request was made with Alice\'s credentials');
  const write = await http('/api/integrations/calendar/events', { method: 'POST', user: bob, json: { title: 'x', date: '2026-11-10', startTime: '10:00', endTime: '11:00', requestId: 'req-abcdefgh', connectionId: aliceConnection } });
  assert.strictEqual(write.status, 409);
  assert.strictEqual((await http(`/api/integrations/google/connections/${aliceConnection}`, { method: 'DELETE', user: bob })).status, 404);
  assert.strictEqual((await http('/api/integrations/google/connections', { user: alice })).body.data.length, 1, 'Alice\'s connection is untouched');
});

test('expired access tokens are refreshed transparently', async () => {
  const user = person('mentor', 'mira@gmail.com');
  await connectCalendar(user);
  rows(models.CalendarConnection)[0].expiresAt = new Date(Date.now() - 1000);
  const calls = calendarFetch((url) => (url.includes('oauth2.googleapis.com/token') ? { status: 200, body: { access_token: 'ya29.refreshed', expires_in: 3600 } } : { status: 200, body: { items: [] } }));
  const res = await http('/api/integrations/calendar/events', { user });
  assert.strictEqual(res.status, 200);
  const refresh = calls.find((c) => c.url.includes('oauth2.googleapis.com/token'));
  assert.match(String(refresh.init.body), /grant_type=refresh_token/);
  assert.strictEqual(calls.find((c) => c.url.includes('/calendar/v3')).init.headers.Authorization, 'Bearer ya29.refreshed');
});

test('revoked permission: the person is told to reconnect, the connection is marked, and nothing crashes', async () => {
  const user = person('mentor', 'mira@gmail.com');
  await connectCalendar(user);
  rows(models.CalendarConnection)[0].expiresAt = new Date(Date.now() - 1000);
  calendarFetch((url) => (url.includes('oauth2.googleapis.com/token') ? { status: 400, body: { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' } } : { status: 200, body: {} }));
  const res = await http('/api/integrations/calendar/events', { user });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.code, 'CALENDAR_RECONNECT');
  assert.match(res.body.message, /reconnect/i);
  assert.strictEqual(rows(models.CalendarConnection)[0].status, 'needs_reconnect');
  const status = await http('/api/integrations/status', { user });
  assert.strictEqual(status.body.data.you.googleCalendar.connected, false);
  assert.strictEqual(status.body.data.you.googleCalendar.needsReconnect, true);
});

test('Google API failures become clear messages: missing permission, rate limits, outages', async () => {
  const user = person('mentor', 'mira@gmail.com');
  await connectCalendar(user);
  calendarFetch(() => ({ status: 403, body: { error: { message: 'Request had insufficient authentication scopes.', errors: [{ reason: 'insufficientPermissions' }] } } }));
  const denied = await http('/api/integrations/calendar/events', { user });
  assert.strictEqual(denied.status, 403);
  assert.strictEqual(denied.body.code, 'CALENDAR_PERMISSION');
  calendarFetch(() => ({ status: 429, body: {} }));
  assert.strictEqual((await http('/api/integrations/calendar/events', { user })).body.code, 'CALENDAR_UNAVAILABLE');
  calendarFetch(() => ({ status: 401, body: { error: { message: 'Invalid Credentials' } } }));
  const unauthorised = await http('/api/integrations/calendar/events', { user });
  assert.strictEqual(unauthorised.body.code, 'CALENDAR_RECONNECT');
  google.setFetch(async () => { throw new Error('ECONNRESET'); });
  rows(models.CalendarConnection)[0].status = 'connected';
  assert.strictEqual((await http('/api/integrations/calendar/events', { user })).status, 502);
});

test('disconnecting removes the stored credentials; the app keeps working without a calendar', async () => {
  const user = person('student', 'sam@gmail.com');
  await connectCalendar(user);
  calendarFetch(() => ({ status: 200, body: {} }));
  const res = await http('/api/integrations/google', { method: 'DELETE', user });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(rows(models.CalendarConnection).length, 0);
  const events = await http('/api/integrations/calendar/events', { user });
  assert.strictEqual(events.status, 409);
  assert.match(events.body.message, /not connected/i);
  assert.strictEqual((await http('/api/integrations/status', { user })).body.data.you.googleCalendar.connected, false);
});
