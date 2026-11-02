const express = require('express');
const googleSignIn = require('../services/googleSignIn');
const authRoutes = require('./auth');

const router = express.Router();
const { GoogleAuthError } = googleSignIn;

// ---------------------------------------------------------------------------
// Small per-address limiter for the public POST routes (guessing a ticket is infeasible, but be polite anyway)
// ---------------------------------------------------------------------------
const hits = new Map();
function limited(limit = 30, windowMs = 10 * 60 * 1000) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) return res.status(429).json({ success: false, message: 'Too many attempts. Please wait a few minutes and try again.' });
    recent.push(now);
    hits.set(key, recent);
    return next();
  };
}

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    console.error('[google-auth]', req.method, req.path, error.message);
    return res.status(500).json({ success: false, message: 'Google sign-in could not be completed. Please try again.' });
  }
};

// Browser navigation: send the person to Google. The nonce cookie ties the later redirect to THIS browser.
router.get('/start', (req, res) => {
  try {
    const { url, nonce } = googleSignIn.startFlow({ mode: req.query.mode, returnTo: req.query.returnTo });
    res.cookie('g_nonce', nonce, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000, path: '/api/integrations/google' });
    return res.redirect(url);
  } catch (error) {
    const reason = error.code === 'GOOGLE_NOT_CONFIGURED' ? 'not_configured' : 'failed';
    return res.redirect(googleSignIn.frontendUrl(`/login?google=${reason}`));
  }
});

// Prefill for the sign-up form. Returns only what Google verified about the holder of this ticket.
router.get('/pending', limited(60), wrap(async (req, res) => {
  const data = await googleSignIn.pendingRegistration(String(req.query.ticket || ''));
  res.json({ success: true, data });
}));

router.post('/register', limited(20), wrap(async (req, res) => {
  const { ticket, name, role, profile } = req.body || {};
  const result = await googleSignIn.register({ ticket, name, role, profile });
  res.status(201).json({
    success: true,
    status: result.status,
    ticket: result.ticket,
    message: result.status === 'pending' ? 'Your account was created and is waiting for administrator approval. You will be able to sign in with Google once it is approved.' : 'Your account is ready.',
  });
}));

router.post('/link', limited(20), wrap(async (req, res) => {
  const { ticket, password, twoFactorCode } = req.body || {};
  const result = await googleSignIn.link({ ticket, password, twoFactorCode });
  if (result.status !== 'active') {
    const message = result.status === 'pending_approval' ? 'Google is linked, but the account is still waiting for administrator approval.' : 'Google is linked, but this account cannot sign in right now.';
    return res.json({ success: true, linked: true, status: result.status, message });
  }
  return res.json({ success: true, linked: true, status: 'active', ticket: result.ticket, message: 'Google is now linked to your account.' });
}));

// Called by the Next.js server (NextAuth's credentials provider). Same response shape as the password login.
router.post('/exchange', limited(60), wrap(async (req, res) => {
  const user = await googleSignIn.exchange({ ticket: (req.body || {}).ticket });
  const token = authRoutes.issueToken(user);
  res.cookie('aai_token', token, authRoutes.cookieOptions());
  res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: {
      id: user._id, name: user.name, email: user.email, role: user.role, facultyRole: user.facultyRole || null,
      emailVerified: user.emailVerified, twoFactorEnabled: user.twoFactorEnabled, isInvestorVerified: Boolean(user.isInvestorVerified),
    },
  });
}));

module.exports = router;
