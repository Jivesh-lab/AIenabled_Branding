const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { integrationStatus } = require('../agentic/config');
const google = require('../agentic/tools/google');
const googleSignIn = require('../services/googleSignIn');

const router = express.Router();

const WORKSPACE = { student: 'student', faculty: 'faculty', mentor: 'mentor', investor: 'investor', admin: 'admin', super_admin: 'super-admin' };
const frontendUrl = googleSignIn.frontendUrl;

function readCookie(req, name) {
  return req.cookies?.[name] || null;
}

/**
 * The ONE callback registered with Google (/api/integrations/google/callback) serves two separate flows, told apart by
 * the signed `state`: signing in with Google, and connecting a calendar. Neither trusts anything from the URL:
 * the state is signed and single-use, and sign-in is additionally bound to the browser that started it.
 * Nothing sensitive is ever placed in the redirect; only one-time tickets and short reason codes.
 */
router.get('/google/callback', async (req, res) => {
  let purpose = null;
  try {
    purpose = jwt.verify(String(req.query.state || ''), process.env.JWT_SECRET).purpose;
  } catch {
    purpose = null;
  }
  try {
    if (purpose === 'google-signin') {
      const nonce = readCookie(req, 'g_nonce');
      res.clearCookie('g_nonce', { path: '/api/integrations/google' });
      const path = await googleSignIn.handleCallback({ code: req.query.code, state: req.query.state, error: req.query.error, cookieNonce: nonce });
      return res.redirect(frontendUrl(path));
    }
    if (purpose === 'google-calendar') {
      if (req.query.error) return res.redirect(frontendUrl('/login?calendar=cancelled'));
      const result = await google.handleCallback({ code: req.query.code, state: req.query.state });
      const user = await User.findById(result.userId).select('role').lean();
      return res.redirect(frontendUrl(`/workspace/${WORKSPACE[user?.role] || 'student'}/dashboard?calendar=connected`));
    }
  } catch (error) {
    // Log the reason code only: never the authorization code, tokens or the raw provider response.
    console.error('[integrations] google callback failed:', error.code || error.name);
    if (purpose === 'google-calendar') {
      const reason = error.code === 'PERMISSION_DENIED' ? 'permission' : 'error';
      return res.redirect(frontendUrl(`/login?calendar=${reason}`));
    }
    return res.redirect(frontendUrl('/login?google=failed'));
  }
  return res.redirect(frontendUrl('/login?google=expired'));
});

router.use(authenticate);

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof google.GoogleCalendarError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    console.error('[integrations]', req.method, req.path, error.code || error.name);
    return res.status(500).json({ success: false, message: 'Something went wrong on our side. Please try again.' });
  }
};

/** Ask the Python service whether it is up and whether the AI model key is configured there (the key lives there). */
async function agentServiceStatus() {
  try {
    const response = await fetch(`${process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000'}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { reachable: false, llmConfigured: false };
    const body = await response.json();
    return { reachable: true, llmConfigured: Boolean(body?.llm?.configured) };
  } catch {
    return { reachable: false, llmConfigured: false };
  }
}

router.get('/status', wrap(async (req, res) => {
  const connections = await google.listConnections(req.user.id);
  const status = integrationStatus();
  const agentService = await agentServiceStatus();
  status.llm = { configured: agentService.llmConfigured || status.llm.configured, mode: agentService.llmConfigured || status.llm.configured ? 'live' : 'rules_only', missing: agentService.llmConfigured || status.llm.configured ? [] : ['LLM_API_KEY'] };
  const primary = connections.find((c) => c.isPrimary && c.status === 'connected') || connections.find((c) => c.status === 'connected');
  const needsReconnect = !primary && connections.some((c) => c.needsReconnect);
  res.json({
    success: true,
    data: {
      ...status,
      agentService: { reachable: agentService.reachable, linked: Boolean(process.env.INTERNAL_JWT_SECRET) },
      you: {
        googleCalendar: primary
          ? { connected: true, needsReconnect: false, accountEmail: primary.accountEmail, accounts: connections.length }
          : { connected: false, needsReconnect, accounts: connections.length },
      },
      // Missing variable NAMES are only shown to administrators who can add them.
      ...(['admin', 'super_admin'].includes(req.user.role) ? {} : { email: { ...status.email, missing: undefined }, calendar: { ...status.calendar, missing: undefined }, llm: { ...status.llm, missing: undefined } }),
    },
  });
}));

// ---------------------------------------------------------------------------
// Connecting and disconnecting (the signed-in user's own connections only)
// ---------------------------------------------------------------------------
router.get('/google/connect-url', wrap(async (req, res) => {
  try {
    res.json({ success: true, data: { url: await google.authUrl(req.user.id) } });
  } catch (error) {
    if (error.code === 'GOOGLE_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, code: error.code, message: 'Google Calendar is not set up on this server yet. Ask an administrator to add the Google credentials.' });
    }
    throw error;
  }
}));

router.get('/google/connections', wrap(async (req, res) => {
  res.json({ success: true, data: await google.listConnections(req.user.id) });
}));

router.delete('/google/connections/:id', wrap(async (req, res) => {
  const removed = await google.disconnect(req.user.id, req.params.id);
  if (!removed) return res.status(404).json({ success: false, message: 'That calendar connection was not found.' });
  res.json({ success: true, message: 'That Google account was disconnected.' });
}));

router.delete('/google', wrap(async (req, res) => {
  const removed = await google.disconnect(req.user.id);
  res.json({ success: true, message: removed ? 'Google Calendar was disconnected.' : 'Google Calendar was not connected.' });
}));

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const MAX_RANGE_DAYS = 62;

function validZone(zone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

router.get('/calendar/events', wrap(async (req, res) => {
  const from = new Date(String(req.query.from || new Date().toISOString()));
  const to = new Date(String(req.query.to || new Date(Date.now() + 14 * 86400000).toISOString()));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return res.status(400).json({ success: false, message: 'Choose a valid date range.' });
  if ((to - from) / 86400000 > MAX_RANGE_DAYS) return res.status(400).json({ success: false, message: `Choose a range of ${MAX_RANGE_DAYS} days or fewer.` });
  const events = await google.listEvents(req.user.id, { from, to, connectionId: req.query.connectionId || null });
  res.json({ success: true, data: events });
}));

router.post('/calendar/events', wrap(async (req, res) => {
  const { title, description = '', date, startTime, endTime, timeZone = 'Asia/Kolkata', requestId, connectionId = null } = req.body || {};
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (cleanTitle.length < 1 || cleanTitle.length > 200) return res.status(400).json({ success: false, message: 'Give the event a title (up to 200 characters).' });
  if (typeof description !== 'string' || description.length > 2000) return res.status(400).json({ success: false, message: 'Keep the description under 2000 characters.' });
  if (typeof timeZone !== 'string' || !validZone(timeZone)) return res.status(400).json({ success: false, message: 'That time zone is not recognised.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(startTime)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(endTime))) {
    return res.status(400).json({ success: false, message: 'Enter the date as YYYY-MM-DD and the times as HH:MM.' });
  }
  if (endTime <= startTime) return res.status(400).json({ success: false, message: 'The end time must be after the start time.' });
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) return res.status(400).json({ success: false, message: 'A request id (8-64 letters, numbers, - or _) is required so a retry cannot create a duplicate.' });

  // Deterministic id per (user, request): Google refuses the second insert, so a retried request cannot duplicate the event.
  const eventId = crypto.createHash('sha256').update(`${req.user.id}:${requestId}`).digest('hex').slice(0, 40);
  const created = await google.createEvent(req.user.id, {
    title: cleanTitle,
    description,
    startLocal: `${date}T${startTime}:00`,
    endLocal: `${date}T${endTime}:00`,
    timeZone,
    eventId,
    meet: false,
    connectionId,
  });
  res.status(created.duplicate ? 200 : 201).json({ success: true, message: created.duplicate ? 'That event was already created.' : 'The event was added to your calendar.', data: { id: created.id, link: created.htmlLink, duplicate: created.duplicate } });
}));

module.exports = router;
