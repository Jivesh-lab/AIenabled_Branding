const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const CalendarConnection = require('../../models/CalendarConnection');
const { encrypt, decrypt } = require('../secretBox');
const { googleReady } = require('../config');
const identity = require('../../services/googleIdentity');
const { createTicket, consumeTicket } = require('../../services/googleSignIn');

/**
 * Google Calendar integration (per-user OAuth, separate from Google sign-in).
 *
 * - Each connection belongs to ONE application user and ONE Google account (`accountSub`). A person may connect
 *   several Google accounts; every lookup is scoped by the authenticated user id, so a request parameter can
 *   never reach somebody else's credentials.
 * - Tokens are encrypted at rest (AES-256-GCM) and never returned by any API or written to logs.
 * - The OAuth `state` is signed AND single-use (a server-side nonce is spent on the callback), so it cannot be replayed.
 * - Only the `calendar.events` scope is requested.
 */
const SCOPE_EVENTS = 'https://www.googleapis.com/auth/calendar.events';
const WATCH_LEAD_MS = 24 * 60 * 60 * 1000;
let fetchImpl = (...args) => fetch(...args);
function setFetch(fn) {
  fetchImpl = fn;
}

class GoogleCalendarError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.name = 'GoogleCalendarError';
    this.code = code;
    this.status = status;
  }
}

class NotConfiguredError extends GoogleCalendarError {
  constructor() {
    super('Google Calendar is not configured on this server yet. An administrator needs to add the Google credentials.', 'GOOGLE_NOT_CONFIGURED', 503);
  }
}

const secret = () => process.env.JWT_SECRET;

// ---------------------------------------------------------------------------
// Connecting
// ---------------------------------------------------------------------------
async function authUrl(userId) {
  if (!googleReady()) throw new NotConfiguredError();
  const nonce = await createTicket({ purpose: 'oauth-state', userId, ttlMs: 10 * 60 * 1000 });
  const state = jwt.sign({ purpose: 'google-calendar', sub: String(userId), t: nonce }, secret(), { expiresIn: 10 * 60 });
  return identity.authUrl({ scopes: identity.CALENDAR_SCOPES, state, offline: true });
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

/** Completes the redirect: verifies and spends our state, exchanges the code, stores encrypted tokens for that user. */
async function handleCallback({ code, state }) {
  if (!googleReady()) throw new NotConfiguredError();
  let payload;
  try {
    payload = jwt.verify(String(state || ''), secret());
  } catch {
    throw new GoogleCalendarError('This connection link has expired. Please start again from your profile menu.', 'STATE_INVALID', 400);
  }
  if (payload.purpose !== 'google-calendar') throw new GoogleCalendarError('Invalid connection request.', 'STATE_INVALID', 400);
  // Single use: a replayed or forged state finds no nonce to spend.
  const spent = await consumeTicket(payload.t, 'oauth-state');
  if (!spent || String(spent.userId) !== String(payload.sub)) throw new GoogleCalendarError('This connection link was already used or has expired. Please start again.', 'STATE_INVALID', 400);

  let result;
  try {
    result = await identity.exchange(String(code || ''));
  } catch (error) {
    throw new GoogleCalendarError(error.message, error.code || 'GOOGLE_EXCHANGE_FAILED', 400);
  }
  const { tokens, claims } = result;
  // Google lets people untick individual permissions on the consent screen; connecting is pointless without this one.
  if (!String(tokens.scope || '').split(/\s+/).includes(SCOPE_EVENTS)) {
    throw new GoogleCalendarError('Calendar access was not granted, so nothing was connected. You can try again and tick the calendar permission.', 'PERMISSION_DENIED', 403);
  }

  const userId = String(payload.sub);
  const existing = await CalendarConnection.findOne({ userId, provider: 'google', accountSub: claims.sub }).lean();
  const others = await CalendarConnection.countDocuments({ userId, provider: 'google', status: 'connected', accountSub: { $ne: claims.sub } });
  const saved = await CalendarConnection.findOneAndUpdate(
    { userId, provider: 'google', accountSub: claims.sub },
    {
      $set: {
        accountEmail: claims.email,
        accessTokenEnc: encrypt(tokens.access_token),
        refreshTokenEnc: tokens.refresh_token ? encrypt(tokens.refresh_token) : existing?.refreshTokenEnc || null,
        expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        scope: String(tokens.scope || ''),
        status: 'connected',
        lastError: null,
        connectedAt: new Date(),
        syncStatus: 'pending',
        syncError: null,
        isPrimary: existing ? existing.isPrimary : others === 0,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
  try {
    await registerWatch(userId, saved || await CalendarConnection.findOne({ userId, provider: 'google', accountSub: claims.sub }).lean());
  } catch (error) {
    await CalendarConnection.updateOne({ _id: saved?._id || (await CalendarConnection.findOne({ userId, provider: 'google', accountSub: claims.sub }).select('_id').lean())._id }, { $set: { syncStatus: 'failed', syncError: String(error.message).slice(0, 200) } });
  }
  return { userId, accountEmail: claims.email };
}

// ---------------------------------------------------------------------------
// Looking up connections (always scoped by the application user)
// ---------------------------------------------------------------------------
async function getConnection(userId, connectionId = null) {
  const filter = { userId: String(userId), provider: 'google' };
  if (connectionId) filter._id = String(connectionId);
  const rows = await CalendarConnection.find(filter).lean();
  if (!rows.length) return null;
  return rows.find((r) => r.isPrimary && r.status === 'connected') || rows.find((r) => r.status === 'connected') || rows[0];
}

async function listConnections(userId) {
  const rows = await CalendarConnection.find({ userId: String(userId), provider: 'google' }).lean();
  return rows.map((r) => ({ id: String(r._id), accountEmail: r.accountEmail, status: r.status, connectedAt: r.connectedAt, isPrimary: Boolean(r.isPrimary), needsReconnect: r.status === 'needs_reconnect' }));
}

async function disconnect(userId, connectionId = null) {
  const filter = { userId: String(userId), provider: 'google' };
  if (connectionId) filter._id = String(connectionId);
  const rows = await CalendarConnection.find(filter).lean();
  for (const row of rows) {
    await stopWatch(userId, row).catch(() => null);
    try {
      const token = row.refreshTokenEnc ? decrypt(row.refreshTokenEnc) : decrypt(row.accessTokenEnc);
      await fetchImpl(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' });
    } catch {
      // Revocation is best effort; the local connection is removed regardless.
    }
    await CalendarConnection.deleteOne({ _id: row._id, userId: String(userId) });
  }
  if (connectionId && rows.length) {
    const remaining = await CalendarConnection.find({ userId: String(userId), provider: 'google', status: 'connected' }).lean();
    if (remaining.length && !remaining.some((r) => r.isPrimary)) await CalendarConnection.updateOne({ _id: remaining[0]._id }, { $set: { isPrimary: true } });
  }
  return rows.length;
}

/** A usable access token, refreshed when it is about to expire. Marks the connection when Google rejects the refresh. */
async function accessTokenFor(userId, connectionId = null) {
  const connection = await getConnection(userId, connectionId);
  if (!connection || connection.status !== 'connected') return null;
  if (connection.expiresAt && new Date(connection.expiresAt).getTime() - Date.now() > 60 * 1000) return decrypt(connection.accessTokenEnc);
  if (!connection.refreshTokenEnc) {
    await CalendarConnection.updateOne({ _id: connection._id }, { $set: { status: 'needs_reconnect', lastError: 'No refresh token is stored.' } });
    return null;
  }
  try {
    const tokens = await tokenRequest({ grant_type: 'refresh_token', refresh_token: decrypt(connection.refreshTokenEnc) });
    await CalendarConnection.updateOne(
      { _id: connection._id },
      { $set: { accessTokenEnc: encrypt(tokens.access_token), expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000), status: 'connected', lastError: null } }
    );
    return tokens.access_token;
  } catch (error) {
    // invalid_grant = the person revoked access (or the refresh token expired): they need to connect again.
    const revoked = error.googleError === 'invalid_grant';
    await CalendarConnection.updateOne({ _id: connection._id }, { $set: { status: revoked ? 'needs_reconnect' : 'connected', lastError: String(error.message).slice(0, 200) } });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Calendar API calls
// ---------------------------------------------------------------------------
async function api(userId, path, init = {}, connectionId = null) {
  const connection = await getConnection(userId, connectionId);
  if (!connection) throw new GoogleCalendarError('Google Calendar is not connected. Connect it from your profile menu first.', 'CALENDAR_NOT_CONNECTED', 409);
  const token = await accessTokenFor(userId, connection._id);
  if (!token) throw new GoogleCalendarError('Google no longer allows access to this calendar. Please reconnect it from your profile menu.', 'CALENDAR_RECONNECT', 409);
  let response;
  try {
    response = await fetchImpl(`https://www.googleapis.com/calendar/v3${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  } catch {
    throw new GoogleCalendarError('Google Calendar could not be reached. Please try again in a moment.', 'CALENDAR_UNAVAILABLE', 502);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = response.status;
    const reason = data.error?.errors?.[0]?.reason || data.error?.status || '';
    if (status === 401) {
      await CalendarConnection.updateOne({ _id: connection._id }, { $set: { status: 'needs_reconnect', lastError: 'Google rejected the access token.' } });
      throw new GoogleCalendarError('Google no longer allows access to this calendar. Please reconnect it from your profile menu.', 'CALENDAR_RECONNECT', 409);
    }
    if (status === 403 && /insufficient|PERMISSION|forbidden/i.test(`${reason} ${data.error?.message || ''}`)) {
      throw new GoogleCalendarError('This calendar connection does not allow that action. Disconnect and connect again, and tick the calendar permission.', 'CALENDAR_PERMISSION', 403);
    }
    if (status === 404) throw new GoogleCalendarError('That calendar event was not found.', 'CALENDAR_NOT_FOUND', 404);
    if (status === 409) throw new GoogleCalendarError('That event already exists.', 'CALENDAR_CONFLICT', 409);
    if (status === 429 || status >= 500) throw new GoogleCalendarError('Google Calendar is busy right now. Please try again in a moment.', 'CALENDAR_UNAVAILABLE', 502);
    throw new GoogleCalendarError(data.error?.message || `Google Calendar rejected the request (${status}).`, 'CALENDAR_REJECTED', 400);
  }
  return data;
}

function publicApiUrl() {
  return String(process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
}

async function registerWatch(userId, connection) {
  if (!connection || !publicApiUrl() || String(process.env.CALENDAR_SYNC_MODE || 'live').toLowerCase() === 'sandbox') return null;
  const token = crypto.randomBytes(24).toString('base64url');
  const channelId = crypto.randomUUID();
  const accessToken = await accessTokenFor(userId, connection._id);
  if (!accessToken) throw new GoogleCalendarError('Calendar access must be refreshed before synchronization can start.', 'CALENDAR_RECONNECT', 409);
  const response = await fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events/watch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: channelId, type: 'web_hook', address: `${publicApiUrl()}/api/integrations/google/webhook`, token, params: { ttl: String(7 * 24 * 60 * 60) } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.resourceId) throw new GoogleCalendarError(data.error?.message || 'Google Calendar watch registration failed.', 'WATCH_REGISTRATION_FAILED', 502);
  await CalendarConnection.updateOne({ _id: connection._id }, {
    $set: {
      watchChannelId: channelId,
      watchResourceId: data.resourceId,
      watchExpiresAt: new Date(Number(data.expiration || Date.now() + 7 * 86400000)),
      watchTokenEnc: encrypt(token),
      syncStatus: 'active',
      syncError: null,
    },
  });
  return data;
}

async function stopWatch(userId, connection) {
  if (!connection?.watchChannelId || !connection.watchResourceId) return;
  const token = await accessTokenFor(userId, connection._id);
  if (!token) return;
  await fetchImpl('https://www.googleapis.com/calendar/v3/channels/stop', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: connection.watchChannelId, resourceId: connection.watchResourceId }),
  });
}

async function renewWatch(userId, connection) {
  if (!connection || !publicApiUrl() || String(process.env.CALENDAR_SYNC_MODE || 'live').toLowerCase() === 'sandbox') return null;
  if (connection.watchExpiresAt && new Date(connection.watchExpiresAt).getTime() - Date.now() > WATCH_LEAD_MS) return connection;
  await stopWatch(userId, connection).catch(() => null);
  return registerWatch(userId, connection);
}

async function listChangedEvents(userId, connection, { full = false } = {}) {
  const token = await accessTokenFor(userId, connection._id);
  if (!token) throw new GoogleCalendarError('Calendar access needs to be renewed.', 'CALENDAR_RECONNECT', 409);
  const query = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true', maxResults: '250' });
  if (full || !connection.syncToken) query.set('timeMin', new Date(Date.now() - 180 * 86400000).toISOString());
  else query.set('syncToken', connection.syncToken);
  const events = [];
  let nextPageToken = null;
  let nextSyncToken = null;
  do {
    if (nextPageToken) query.set('pageToken', nextPageToken);
    const response = await fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 410) return listChangedEvents(userId, { ...connection, syncToken: null }, { full: true });
    if (!response.ok) throw new GoogleCalendarError(data.error?.message || 'Calendar synchronization failed.', 'CALENDAR_SYNC_FAILED', 502);
    events.push(...(data.items || []));
    nextPageToken = data.nextPageToken || null;
    nextSyncToken = data.nextSyncToken || nextSyncToken;
  } while (nextPageToken);
  return { events, syncToken: nextSyncToken };
}

function shapeEvent(event) {
  const allDay = Boolean(event.start?.date && !event.start?.dateTime);
  return {
    id: event.id,
    title: event.summary || '(no title)',
    description: event.description || '',
    location: event.location || '',
    start: event.start?.dateTime || event.start?.date || null,
    end: event.end?.dateTime || event.end?.date || null,
    allDay,
    status: event.status || 'confirmed',
    link: event.htmlLink || null,
    meetLink: event.hangoutLink || null,
  };
}

/** Events between two instants on a chosen connection of this user (recurring events are expanded). */
async function listEvents(userId, { from, to, connectionId = null, max = 100 }) {
  const query = new URLSearchParams({ timeMin: new Date(from).toISOString(), timeMax: new Date(to).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: String(Math.min(max, 250)) });
  const data = await api(userId, `/calendars/primary/events?${query.toString()}`, {}, connectionId);
  return (data.items || []).filter((e) => e.status !== 'cancelled').map(shapeEvent);
}

/**
 * Creates an event. With `eventId` the request is idempotent: Google rejects a second insert with the same id, and we
 * then return the event that already exists instead of creating a duplicate.
 */
async function createEvent(userId, { title, description, startUtc, endUtc, startLocal, endLocal, timeZone, attendees = [], requestId, eventId, connectionId = null, meet = true }) {
  const body = {
    summary: title,
    description,
    start: startLocal ? { dateTime: startLocal, timeZone } : { dateTime: new Date(startUtc).toISOString() },
    end: endLocal ? { dateTime: endLocal, timeZone } : { dateTime: new Date(endUtc).toISOString() },
    attendees: attendees.filter((a) => a.email).map((a) => ({ email: a.email, displayName: a.name })),
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }, { method: 'email', minutes: 24 * 60 }] },
  };
  if (eventId) body.id = eventId;
  if (meet) body.conferenceData = { createRequest: { requestId: requestId || eventId || crypto.randomBytes(8).toString('hex'), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
  const sendUpdates = attendees.length ? 'all' : 'none';
  let event;
  let duplicate = false;
  try {
    event = await api(userId, `/calendars/primary/events?conferenceDataVersion=${meet ? 1 : 0}&sendUpdates=${sendUpdates}`, { method: 'POST', body: JSON.stringify(body) }, connectionId);
  } catch (error) {
    if (error.code === 'CALENDAR_CONFLICT' && eventId) {
      event = await api(userId, `/calendars/primary/events/${encodeURIComponent(eventId)}`, {}, connectionId);
      duplicate = true;
    } else {
      throw error;
    }
  }
  return { id: event.id, htmlLink: event.htmlLink, meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || null, duplicate };
}

async function updateEventTime(userId, eventId, { startUtc, endUtc }) {
  return api(userId, `/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: 'PATCH',
    body: JSON.stringify({ start: { dateTime: new Date(startUtc).toISOString() }, end: { dateTime: new Date(endUtc).toISOString() } }),
  });
}

async function updateEvent(userId, eventId, patch, connectionId = null) {
  return api(userId, `/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: 'PATCH', body: JSON.stringify(patch) }, connectionId);
}

async function deleteEvent(userId, eventId, connectionId = null) {
  return api(userId, `/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: 'DELETE' }, connectionId);
}

/** Busy intervals for slot finding, from the events themselves (works with the single calendar.events scope). */
async function busy(userId, fromUtc, toUtc) {
  const events = await listEvents(userId, { from: fromUtc, to: toUtc, max: 250 });
  return events
    .filter((e) => !e.allDay && e.start && e.end)
    .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));
}

module.exports = {
  authUrl, handleCallback, getConnection, listConnections, accessTokenFor, disconnect, listEvents, createEvent, updateEventTime, updateEvent, deleteEvent, busy,
  registerWatch, renewWatch, stopWatch, listChangedEvents, WATCH_LEAD_MS,
  setFetch, NotConfiguredError, GoogleCalendarError, SCOPE_EVENTS,
};
