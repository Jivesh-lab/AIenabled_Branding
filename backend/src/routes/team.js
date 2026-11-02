/**
 * Team Membership Routes
 * Mounted at: /api/team
 *
 * Endpoints:
 *   GET    /api/team/projects              — team member: list projects joined via accepted memberships
 *   GET    /api/team/invitations/peek      — public: preview an invitation by token (pre-auth)
 *   POST   /api/team/invitations/accept    — authenticated: accept an invitation token
 *   POST   /api/team/invitations/decline   — authenticated: decline an invitation token
 *   GET    /api/team/:projectId/members    — founder: list all memberships for a project
 *   POST   /api/team/:projectId/invite     — founder: create or resend an invitation
 *   POST   /api/team/:projectId/invite/:id/resend  — founder: resend a specific invitation
 *   DELETE /api/team/:projectId/invite/:id         — founder: revoke an invitation
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const {
  createInvitation,
  acceptInvitation,
  declineInvitation,
  revokeInvitation,
  resendInvitation,
  listMemberships,
  getTeamProjects,
  peekInvitation,
  hasAcceptedMembership,
} = require('../services/teamInvitationService');

const router = express.Router();

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[team]', req.method, req.path, err.message);
    return res.status(status).json({
      success: false,
      message: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
      ...(err.membershipId ? { membershipId: err.membershipId } : {}),
      ...(err.emailMismatch ? { emailMismatch: true } : {}),
      ...(err.alreadyAccepted ? { alreadyAccepted: true } : {}),
      ...(err.expired ? { expired: true } : {}),
    });
  }
};

// ---------------------------------------------------------------------------
// Public: peek at an invitation (for the accept page — allows UI to render
// project details before the user logs in)
// ---------------------------------------------------------------------------
router.get('/invitations/peek', wrap(async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Token is required.' });
  }
  const invitation = await peekInvitation(token);
  if (!invitation) {
    return res.status(404).json({ success: false, message: 'This invitation link is invalid, expired, or has already been used.' });
  }
  // Return safe minimal data — do NOT expose tokenHash, invitedBy userId, etc.
  return res.json({
    success: true,
    data: {
      projectId: invitation.projectId,
      projectTitle: invitation.projectTitle,
      inviterName: invitation.inviterName,
      invitedEmail: invitation.invitedEmail,
      memberName: invitation.memberName,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    },
  });
}));

// ---------------------------------------------------------------------------
// Service-to-service: does this user hold an ACCEPTED membership on this project?
// Called by agent-service with a short-lived service JWT (INTERNAL_JWT_SECRET,
// iss=agent-service, aud=node-internal). Never reachable with a user token.
// ---------------------------------------------------------------------------
router.get('/internal/access', wrap(async (req, res) => {
  const secret = process.env.INTERNAL_JWT_SECRET;
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secret || !bearer) return res.status(401).json({ success: false, message: 'Service authentication required.' });
  try {
    jwt.verify(bearer, secret, { algorithms: ['HS256'], issuer: 'agent-service', audience: 'node-internal' });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid service token.' });
  }
  const { projectId, userId } = req.query;
  if (typeof projectId !== 'string' || typeof userId !== 'string' || !projectId || !userId) {
    return res.status(400).json({ success: false, message: 'projectId and userId are required.' });
  }
  const member = await hasAcceptedMembership(userId, projectId);
  return res.json({ success: true, data: { member } });
}));

// All routes below require authentication.
router.use(authenticate);

// ---------------------------------------------------------------------------
// Team member: list projects joined via accepted memberships
// ---------------------------------------------------------------------------
router.get('/projects', wrap(async (req, res) => {
  const { getTeamProjects: getProjects } = require('../services/teamInvitationService');
  const teamProjects = await getProjects(req.user.id);
  return res.json({ success: true, data: teamProjects });
}));

// ---------------------------------------------------------------------------
// Accept an invitation
// ---------------------------------------------------------------------------
router.post('/invitations/accept', wrap(async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Token is required.' });
  }
  const result = await acceptInvitation({ rawToken: token, userId: req.user.id });
  return res.json({
    success: true,
    message: `You have joined "${result.project.title}" as a team member.`,
    data: { membership: result.membership, project: { id: result.project.id, title: result.project.title } },
  });
}));

// ---------------------------------------------------------------------------
// Decline an invitation
// ---------------------------------------------------------------------------
router.post('/invitations/decline', wrap(async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Token is required.' });
  }
  const result = await declineInvitation({ rawToken: token });
  return res.json({ success: true, message: 'You have declined this invitation.', data: result.membership });
}));

// ---------------------------------------------------------------------------
// Founder: list all memberships for a project
// ---------------------------------------------------------------------------
router.get('/:projectId/members', wrap(async (req, res) => {
  const memberships = await listMemberships({
    projectId: req.params.projectId,
    founderId: req.user.id,
  });
  return res.json({ success: true, data: memberships });
}));

// ---------------------------------------------------------------------------
// Founder: invite a teammate
// ---------------------------------------------------------------------------
router.post('/:projectId/invite', wrap(async (req, res) => {
  const { invitedEmail, memberName, rollNumber, resend } = req.body || {};
  const result = await createInvitation({
    projectId: req.params.projectId,
    invitedEmail,
    memberName,
    rollNumber: rollNumber || '',
    invitedBy: req.user.id,
    resend: Boolean(resend),
  });

  const sandbox = result.emailResult?.sandbox;
  const emailSent = result.emailResult?.success;
  let message = 'Invitation created.';
  if (sandbox) message = 'Invitation created. [SANDBOX] Email delivery is simulated — no real email was sent. Check server logs for the invitation link.';
  else if (emailSent) message = `Invitation sent to ${invitedEmail}.`;
  else message = `Invitation created but the email could not be delivered. The invitee can still use a shared link.`;

  return res.status(201).json({
    success: true,
    sandbox,
    message,
    data: result.membership,
  });
}));

// ---------------------------------------------------------------------------
// Founder: resend a specific invitation by its _id
// ---------------------------------------------------------------------------
router.post('/:projectId/invite/:id/resend', wrap(async (req, res) => {
  const result = await resendInvitation({
    membershipId: req.params.id,
    invitedBy: req.user.id,
  });

  const sandbox = result.emailResult?.sandbox;
  return res.json({
    success: true,
    sandbox,
    message: sandbox
      ? '[SANDBOX] Email delivery is simulated — check server logs for the invitation link.'
      : result.emailResult?.success
        ? 'Invitation resent.'
        : 'Invitation updated but email could not be delivered.',
    data: result.membership,
  });
}));

// ---------------------------------------------------------------------------
// Founder: revoke an invitation or membership
// ---------------------------------------------------------------------------
router.delete('/:projectId/invite/:id', wrap(async (req, res) => {
  await revokeInvitation({ membershipId: req.params.id, revokedBy: req.user.id });
  return res.json({ success: true, message: 'Invitation revoked.' });
}));

module.exports = router;
