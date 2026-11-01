const express = require('express');
const User = require('../models/User');
const CalendarConnection = require('../models/CalendarConnection');
const { authenticate } = require('../middleware/auth');
const { integrationStatus } = require('../agentic/config');
const google = require('../agentic/tools/google');

const router = express.Router();

const WORKSPACE = { student: 'student', faculty: 'faculty', mentor: 'mentor', investor: 'investor', admin: 'admin', super_admin: 'super-admin' };

function frontendUrl(path) {
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}${path}`;
}

/**
 * Google redirects the browser here after the user approves access. There is no session on this request
 * (it comes from Google), so the signed, expiring `state` we issued is what proves who is connecting.
 */
router.get('/google/callback', async (req, res) => {
  try {
    if (req.query.error) return res.redirect(frontendUrl(`/login?calendar=cancelled`));
    const result = await google.handleCallback({ code: String(req.query.code || ''), state: String(req.query.state || '') });
    const user = await User.findById(result.userId).select('role').lean();
    return res.redirect(frontendUrl(`/workspace/${WORKSPACE[user?.role] || 'student'}/dashboard?calendar=connected`));
  } catch (error) {
    console.error('[integrations] google callback failed:', error.message);
    return res.redirect(frontendUrl(`/login?calendar=error`));
  }
});

router.use(authenticate);

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

router.get('/status', async (req, res) => {
  const connection = await CalendarConnection.findOne({ userId: String(req.user.id), provider: 'google' }).lean();
  const status = integrationStatus();
  const agentService = await agentServiceStatus();
  status.llm = { configured: agentService.llmConfigured || status.llm.configured, mode: agentService.llmConfigured || status.llm.configured ? 'live' : 'rules_only', missing: agentService.llmConfigured || status.llm.configured ? [] : ['LLM_API_KEY'] };
  res.json({
    success: true,
    data: {
      ...status,
      agentService: { reachable: agentService.reachable, linked: Boolean(process.env.INTERNAL_JWT_SECRET) },
      you: {
        googleCalendar: connection ? { connected: connection.status === 'connected', needsReconnect: connection.status === 'needs_reconnect', accountEmail: connection.accountEmail } : { connected: false },
      },
      // Missing variable NAMES are only shown to administrators who can add them.
      ...( ['admin', 'super_admin'].includes(req.user.role) ? {} : { email: { ...status.email, missing: undefined }, calendar: { ...status.calendar, missing: undefined }, llm: { ...status.llm, missing: undefined } }),
    },
  });
});

router.get('/google/connect-url', (req, res) => {
  try {
    res.json({ success: true, data: { url: google.authUrl(req.user.id) } });
  } catch (error) {
    if (error.code === 'GOOGLE_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, code: error.code, message: 'Google Calendar is not set up on this server yet. Ask an administrator to add the Google credentials.' });
    }
    res.status(500).json({ success: false, message: 'Could not start the Google connection.' });
  }
});

router.delete('/google', async (req, res) => {
  const removed = await google.disconnect(req.user.id);
  res.json({ success: true, message: removed ? 'Google Calendar was disconnected.' : 'Google Calendar was not connected.' });
});

module.exports = router;
