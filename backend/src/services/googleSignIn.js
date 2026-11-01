const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { verifySync } = require('otplib');
const User = require('../models/User');
const AuthTicket = require('../models/AuthTicket');
const identity = require('./googleIdentity');
const { googleSignInReady } = require('../agentic/config');
const { logAuditTrail } = require('../middleware/auditLogger');

/**
 * Google sign-in, registration and account linking on top of the EXISTING session mechanism.
 *
 * Google only proves "this person controls this verified Google account". Everything else - which application
 * account that is, its role, status and permissions - comes from our database. A role is never read from the
 * request except to choose among the roles self-registration already offers, and anything but a student
 * waits for an administrator's approval (the existing approvals screen).
 */
const TICKET_TTL_MS = 2 * 60 * 1000;
const REGISTER_TTL_MS = 15 * 60 * 1000;
const STATE_TTL_SECONDS = 10 * 60;
const MAX_LINK_ATTEMPTS = 5;

const SELF_REGISTER_ROLES = ['student', 'faculty', 'mentor', 'investor'];
const ROLE_FIELDS = {
  student: ['institution', 'department', 'yearOfStudy'],
  faculty: ['institution', 'department', 'designation'],
  mentor: ['organisation', 'expertise'],
  investor: ['firmName', 'investmentFocus'],
};
const OPTIONAL_FIELDS = ['linkedIn'];

class GoogleAuthError extends Error {
  constructor(message, status = 400, code = 'GOOGLE_AUTH_ERROR') {
    super(message);
    this.name = 'GoogleAuthError';
    this.status = status;
    this.code = code;
  }
}

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------
async function createTicket({ purpose, userId = null, claims = null, meta = null, ttlMs = TICKET_TTL_MS }) {
  const token = newToken();
  await AuthTicket.create({ tokenHash: sha256(token), purpose, userId: userId ? String(userId) : null, claims, meta, expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

async function peekTicket(token, purpose) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
  return AuthTicket.findOne({ tokenHash: sha256(token), purpose, usedAt: null, expiresAt: { $gt: new Date() } }).lean();
}

/** Atomically spends a ticket: of any number of simultaneous attempts, exactly one wins. */
async function consumeTicket(token, purpose) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
  return AuthTicket.findOneAndUpdate(
    { tokenHash: sha256(token), purpose, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { returnDocument: 'after' }
  ).lean();
}

// ---------------------------------------------------------------------------
// Redirect safety
// ---------------------------------------------------------------------------
function frontendUrl(path = '') {
  return `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;
}

/** Only same-site workspace paths survive; anything else (absolute URLs, //host, backslashes) is dropped. */
function safeReturnTo(value) {
  if (typeof value !== 'string') return null;
  if (!/^\/workspace\/[A-Za-z0-9/_-]{1,120}$/.test(value)) return null;
  if (value.includes('//') || value.startsWith('/workspace/admin') || value.startsWith('/workspace/super-admin')) return null;
  return value;
}

// ---------------------------------------------------------------------------
// Starting the flow (browser -> Google)
// ---------------------------------------------------------------------------
function startFlow({ mode = 'login', returnTo } = {}) {
  if (!googleSignInReady()) throw new GoogleAuthError('Google sign-in is not set up on this server yet.', 503, 'GOOGLE_NOT_CONFIGURED');
  const nonce = crypto.randomBytes(24).toString('base64url');
  const state = jwt.sign(
    { purpose: 'google-signin', mode: mode === 'signup' ? 'signup' : 'login', nh: sha256(nonce), rt: safeReturnTo(returnTo) },
    process.env.JWT_SECRET,
    { expiresIn: STATE_TTL_SECONDS }
  );
  return { url: identity.authUrl({ scopes: identity.SIGN_IN_SCOPES, state }), nonce };
}

// ---------------------------------------------------------------------------
// Account state
// ---------------------------------------------------------------------------
/** Returns a reason code when this account may not sign in, otherwise null. */
function accountProblem(user) {
  if (!user || user.isSoftDeleted) return 'account_unavailable';
  if (user.status === 'pending') return 'pending_approval';
  if (user.status !== 'active') return 'account_disabled';
  return null;
}

async function audit(user, action, details = {}) {
  try {
    await logAuditTrail({ userId: user._id, email: user.email, role: user.role, action, details });
  } catch {
    // Auditing must never block a sign-in.
  }
}

// ---------------------------------------------------------------------------
// Callback (Google -> us). Returns the frontend path to send the browser to; it never throws.
// ---------------------------------------------------------------------------
async function handleCallback({ code, state, error, cookieNonce }) {
  let payload;
  try {
    payload = jwt.verify(String(state || ''), process.env.JWT_SECRET);
  } catch {
    return '/login?google=expired';
  }
  if (payload.purpose !== 'google-signin') return '/login?google=failed';
  // Binds the redirect to the browser that started it, so a victim cannot be signed in with someone else's code.
  if (!cookieNonce || sha256(cookieNonce) !== payload.nh) return '/login?google=failed';
  if (error) return '/login?google=cancelled';
  if (!code) return '/login?google=failed';

  let claims;
  try {
    ({ claims } = await identity.exchange(String(code)));
  } catch {
    return '/login?google=failed';
  }
  if (!claims.emailVerified || !claims.email) return '/login?google=email_unverified';

  const suffix = payload.rt ? `&returnTo=${encodeURIComponent(payload.rt)}` : '';

  // 1. A returning Google user: matched by the stable Google subject, never by e-mail.
  const linked = await User.findOne({ googleSub: claims.sub });
  if (linked) {
    const problem = accountProblem(linked);
    if (problem) return `/login?google=${problem}`;
    const ticket = await createTicket({ purpose: 'login', userId: linked._id });
    return `/login?googleTicket=${ticket}${suffix}`;
  }

  // 2. An account with this e-mail exists but is not linked: NEVER link automatically.
  const sameEmail = await User.findOne({ email: claims.email });
  if (sameEmail) {
    const ticket = await createTicket({ purpose: 'link', userId: sameEmail._id, claims, ttlMs: REGISTER_TTL_MS });
    return `/login?google=link&linkTicket=${ticket}&email=${encodeURIComponent(claims.email)}${suffix}`;
  }

  // 3. A new person: finish a profile first. No account exists until they do.
  const ticket = await createTicket({ purpose: 'register', claims, ttlMs: REGISTER_TTL_MS });
  return `/signup?googleTicket=${ticket}`;
}

// ---------------------------------------------------------------------------
// Completing first-time registration
// ---------------------------------------------------------------------------
async function pendingRegistration(ticket) {
  const found = await peekTicket(ticket, 'register');
  if (!found) throw new GoogleAuthError('This Google sign-up link has expired. Please start again.', 410, 'TICKET_EXPIRED');
  return { name: found.claims.name || '', email: found.claims.email, picture: found.claims.picture || null };
}

function cleanProfile(role, input) {
  const profile = {};
  for (const key of ROLE_FIELDS[role]) {
    const value = typeof input?.[key] === 'string' ? input[key].trim() : '';
    if (value.length < (key === 'yearOfStudy' ? 1 : 2) || value.length > 200) throw new GoogleAuthError(`Please complete "${key}" for the ${role} profile.`, 400, 'PROFILE_INCOMPLETE');
    profile[key] = value;
  }
  for (const key of OPTIONAL_FIELDS) {
    const value = typeof input?.[key] === 'string' ? input[key].trim() : '';
    if (value) {
      if (!/^https?:\/\/[^\s]{3,190}$/.test(value)) throw new GoogleAuthError('The LinkedIn address must be a full web link.', 400, 'PROFILE_INVALID');
      profile[key] = value;
    }
  }
  return profile;
}

async function register({ ticket, name, role, profile }) {
  if (!SELF_REGISTER_ROLES.includes(role)) throw new GoogleAuthError('Please choose one of the roles offered at sign-up.', 400, 'ROLE_NOT_ALLOWED');
  const displayName = typeof name === 'string' ? name.trim() : '';
  if (displayName.length < 2 || displayName.length > 80) throw new GoogleAuthError('Please enter your full name (2-80 characters).', 400, 'NAME_INVALID');
  // Validate everything BEFORE spending the ticket, so a typo does not force the person to start over.
  const cleaned = cleanProfile(role, profile);
  if (!(await peekTicket(ticket, 'register'))) throw new GoogleAuthError('This Google sign-up link has expired. Please start again.', 410, 'TICKET_EXPIRED');

  const spent = await consumeTicket(ticket, 'register');
  if (!spent) throw new GoogleAuthError('This Google sign-up link has already been used or has expired.', 410, 'TICKET_EXPIRED');
  const claims = spent.claims;

  if ((await User.findOne({ googleSub: claims.sub })) || (await User.findOne({ email: claims.email }))) {
    throw new GoogleAuthError('An account for this Google identity or e-mail already exists. Please sign in instead.', 409, 'ACCOUNT_EXISTS');
  }

  // Students are active at once, exactly as with the e-mail sign-up. Every other role waits for an administrator.
  const status = role === 'student' ? 'active' : 'pending';
  const user = await User.create({
    name: displayName,
    email: claims.email,
    passwordHash: null,
    passwordLoginEnabled: false,
    googleSub: claims.sub,
    authProviders: ['google'],
    avatarUrl: claims.picture,
    role,
    status,
    emailVerified: true,
    profile: cleaned,
  });
  await audit(user, 'GOOGLE_ACCOUNT_REGISTERED', { role, status });
  if (status === 'pending') return { status: 'pending', user: { id: String(user._id), role, name: user.name, email: user.email } };
  const loginTicket = await createTicket({ purpose: 'login', userId: user._id });
  return { status: 'active', ticket: loginTicket };
}

// ---------------------------------------------------------------------------
// Linking Google to an account that already exists (proves ownership with the account's own credentials)
// ---------------------------------------------------------------------------
function requiresTwoFactor(user) {
  return user.role === 'super_admin' || (user.role !== 'student' && user.twoFactorEnabled === true);
}

function checkTwoFactor(user, code) {
  if (!user.twoFactorSecret || !code) return false;
  try {
    const secret = user.twoFactorSecret.length < 32 ? user.twoFactorSecret.padEnd(32, 'A') : user.twoFactorSecret;
    const result = verifySync({ token: String(code), secret });
    return typeof result === 'boolean' ? result : Boolean(result?.valid);
  } catch {
    return false;
  }
}

async function link({ ticket, password, twoFactorCode }) {
  const found = await peekTicket(ticket, 'link');
  if (!found) throw new GoogleAuthError('This link request has expired. Please choose "Continue with Google" again.', 410, 'TICKET_EXPIRED');
  const user = await User.findOne({ _id: found.userId });
  const genericFailure = new GoogleAuthError('That password is not correct for this account.', 401, 'LINK_DENIED');
  if (!user) throw genericFailure;

  // Limit guessing: five wrong passwords burn the ticket.
  if ((found.attempts || 0) >= MAX_LINK_ATTEMPTS) {
    await consumeTicket(ticket, 'link');
    throw new GoogleAuthError('Too many attempts. Please start again.', 429, 'TOO_MANY_ATTEMPTS');
  }
  const failAttempt = async () => {
    await AuthTicket.updateOne({ tokenHash: sha256(ticket) }, { $inc: { attempts: 1 } });
    return genericFailure;
  };

  if (!user.passwordHash || user.passwordLoginEnabled === false) throw new GoogleAuthError('This account has no password. Sign in with Google instead.', 400, 'NO_PASSWORD');
  if (typeof password !== 'string' || !password || !(await User.verifyPassword(password, user.passwordHash))) throw await failAttempt();
  if (requiresTwoFactor(user)) {
    if (!twoFactorCode) throw new GoogleAuthError('Enter your authenticator code to link this account.', 401, 'TWO_FACTOR_REQUIRED');
    if (!checkTwoFactor(user, twoFactorCode)) throw await failAttempt();
  }
  if (user.googleSub && user.googleSub !== found.claims.sub) throw new GoogleAuthError('A different Google account is already linked to this account.', 409, 'DIFFERENT_GOOGLE_LINKED');
  if (await User.findOne({ googleSub: found.claims.sub, _id: { $ne: user._id } })) throw new GoogleAuthError('That Google account is already linked to another account.', 409, 'GOOGLE_IN_USE');

  const spent = await consumeTicket(ticket, 'link');
  if (!spent) throw new GoogleAuthError('This link request has already been used or has expired.', 410, 'TICKET_EXPIRED');

  await User.updateOne(
    { _id: user._id },
    { $set: { googleSub: found.claims.sub, emailVerified: true, avatarUrl: user.avatarUrl || found.claims.picture || null }, $addToSet: { authProviders: 'google' } }
  );
  await audit(user, 'GOOGLE_ACCOUNT_LINKED', {});
  const problem = accountProblem(user);
  if (problem) return { status: problem };
  return { status: 'active', ticket: await createTicket({ purpose: 'login', userId: user._id }) };
}

// ---------------------------------------------------------------------------
// Turning a login ticket into the application's normal session (called by NextAuth's credentials provider)
// ---------------------------------------------------------------------------
async function exchange({ ticket }) {
  const spent = await consumeTicket(ticket, 'login');
  if (!spent) throw new GoogleAuthError('This sign-in has expired. Please try again.', 401, 'TICKET_EXPIRED');
  const user = await User.findOne({ _id: spent.userId });
  const problem = accountProblem(user);
  if (problem) throw new GoogleAuthError(problem === 'pending_approval' ? 'Your account is waiting for administrator approval.' : 'This account cannot sign in right now.', 403, problem.toUpperCase());
  await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
  await audit(user, 'GOOGLE_LOGIN_SUCCESS', {});
  return user;
}

module.exports = {
  startFlow, handleCallback, pendingRegistration, register, link, exchange, createTicket, peekTicket, consumeTicket,
  safeReturnTo, frontendUrl, accountProblem, GoogleAuthError, SELF_REGISTER_ROLES, sha256,
};
