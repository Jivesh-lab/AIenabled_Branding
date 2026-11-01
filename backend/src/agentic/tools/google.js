const jwt = require('jsonwebtoken');
const CalendarConnection = require('../../models/CalendarConnection');
const { encrypt, decrypt } = require('../secretBox');
const { googleReady } = require('../config');

/**
 * Google Calendar integration (per-user OAuth). Each person connects their OWN Google account; the
 * agent then books on that person's calendar and Google sends the invitations. Everything here talks to
 * Google over plain HTTPS (no SDK). `fetchImpl` can be injected so the flow is testable without Google.
 */
const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.freebusy', 'openid', 'email'];
let fetchImpl = (...args) => fetch(...args);
function setFetch(fn) {
  fetchImpl = fn;
}

class NotConfiguredError extends Error {
  constructor() {
    super('Google Calendar is not configured on this server yet. An administrator needs to add the Google credentials.');
    this.code = 'GOOGLE_NOT_CONFIGURED';
  }
}

function secret() {
  return process.env.JWT_SECRET;
}

function authUrl(userId) {
  if (!googleReady()) throw new NotConfiguredError();
  const state = jwt.sign({ sub: String(userId), purpose: 'google-calendar-connect' }, secret(), { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: SCOPES.join(' '),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function tokenRequest(body) {
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, ...body }).toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || `Google token request failed (${response.status})`);
    error.googleError = data.error;
    throw error;
  }
  return data;
}

/** Completes the OAuth redirect: verifies our signed `state`, exchanges the code, stores encrypted tokens. */
async function handleCallback({ code, state }) {
  if (!googleReady()) throw new NotConfiguredError();
  let payload;
  try {
    payload = jwt.verify(state, secret());
  } catch {
    throw new Error('This connection link has expired. Please start again from your settings.');
  }
  if (payload.purpose !== 'google-calendar-connect') throw new Error('Invalid connection request.');
  const tokens = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: process.env.GOOGLE_REDIRECT_URI });
  let accountEmail = '';
  try {
    const info = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    accountEmail = (await info.json()).email || '';
  } catch {
    accountEmail = '';
  }
  const existing = await CalendarConnection.findOne({ userId: payload.sub, provider: 'google' }).lean();
  const refresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : existing?.refreshTokenEnc || null;
  await CalendarConnection.findOneAndUpdate(
    { userId: payload.sub, provider: 'google' },
    {
      $set: {
        accountEmail,
        accessTokenEnc: encrypt(tokens.access_token),
        refreshTokenEnc: refresh,
        expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        scope: tokens.scope || SCOPES.join(' '),
        status: 'connected',
        lastError: null,
        connectedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
  return { userId: payload.sub, accountEmail };
}

async function getConnection(userId) {
  return CalendarConnection.findOne({ userId: String(userId), provider: 'google' }).lean();
}

async function disconnect(userId) {
  const connection = await getConnection(userId);
  if (!connection) return false;
  try {
    const token = connection.refreshTokenEnc ? decrypt(connection.refreshTokenEnc) : decrypt(connection.accessTokenEnc);
    await fetchImpl(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' });
  } catch {
    // Revocation is best effort; the local connection is removed regardless.
  }
  await CalendarConnection.deleteOne({ userId: String(userId), provider: 'google' });
  return true;
}

/** A usable access token, refreshing it when it is about to expire. Marks the connection if Google rejects it. */
async function accessTokenFor(userId) {
  const connection = await getConnection(userId);
  if (!connection || connection.status !== 'connected') return null;
  if (connection.expiresAt && new Date(connection.expiresAt).getTime() - Date.now() > 60 * 1000) return decrypt(connection.accessTokenEnc);
  if (!connection.refreshTokenEnc) return null;
  try {
    const tokens = await tokenRequest({ grant_type: 'refresh_token', refresh_token: decrypt(connection.refreshTokenEnc) });
    await CalendarConnection.findOneAndUpdate(
      { userId: String(userId), provider: 'google' },
      { $set: { accessTokenEnc: encrypt(tokens.access_token), expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000), status: 'connected', lastError: null } },
      { returnDocument: 'after' }
    );
    return tokens.access_token;
  } catch (error) {
    await CalendarConnection.findOneAndUpdate(
      { userId: String(userId), provider: 'google' },
      { $set: { status: error.googleError === 'invalid_grant' ? 'needs_reconnect' : 'connected', lastError: error.message.slice(0, 200) } },
      { returnDocument: 'after' }
    );
    return null;
  }
}

async function api(userId, path, init = {}) {
  const token = await accessTokenFor(userId);
  if (!token) {
    const error = new Error('Google Calendar needs to be reconnected.');
    error.code = 'GOOGLE_RECONNECT';
    throw error;
  }
  const response = await fetchImpl(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || `Google Calendar request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

/** Creates an event (with a Google Meet link) on `userId`'s calendar and lets Google email the attendees. */
async function createEvent(userId, { title, description, startUtc, endUtc, attendees = [], requestId }) {
  const body = {
    summary: title,
    description,
    start: { dateTime: new Date(startUtc).toISOString() },
    end: { dateTime: new Date(endUtc).toISOString() },
    attendees: attendees.filter((a) => a.email).map((a) => ({ email: a.email, displayName: a.name })),
    conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }, { method: 'email', minutes: 24 * 60 }] },
  };
  const event = await api(userId, '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', { method: 'POST', body: JSON.stringify(body) });
  return { id: event.id, htmlLink: event.htmlLink, meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || null };
}

async function updateEventTime(userId, eventId, { startUtc, endUtc }) {
  return api(userId, `/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: 'PATCH',
    body: JSON.stringify({ start: { dateTime: new Date(startUtc).toISOString() }, end: { dateTime: new Date(endUtc).toISOString() } }),
  });
}

/** Busy intervals for a connected user between two instants. */
async function busy(userId, fromUtc, toUtc) {
  const data = await api(userId, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({ timeMin: new Date(fromUtc).toISOString(), timeMax: new Date(toUtc).toISOString(), items: [{ id: 'primary' }] }),
  });
  return (data.calendars?.primary?.busy || []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

module.exports = { authUrl, handleCallback, getConnection, accessTokenFor, disconnect, createEvent, updateEventTime, busy, setFetch, NotConfiguredError, SCOPES };
