/**
 * Team Invitation Service
 *
 * Handles the complete invitation lifecycle:
 *   createInvitation → sendInvitationEmail → acceptInvitation → revokeInvitation
 *
 * Security guarantees:
 *   - Raw tokens are generated once and never stored. Only their sha256 hash is persisted.
 *   - Accepting requires the authenticated account's email === invitedEmail.
 *   - Duplicate PENDING/ACCEPTED memberships are blocked at the DB level.
 *   - Expired/revoked tokens are rejected atomically.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const TeamMembership = require('../models/TeamMembership');
const FacultyProject = require('../models/FacultyProject');
const StartupProfile = require('../models/StartupProfile');
const User = require('../models/User');
const { sendEmail } = require('./emailService');
const { logAuditTrail } = require('../middleware/auditLogger');

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function getProjectAndOwner(projectId) {
  const project = await FacultyProject.findOne({ id: String(projectId) }).lean();
  if (!project) throw Object.assign(new Error('Project not found.'), { status: 404 });
  return project;
}

async function assertIsFounder(project, userId) {
  if (!project.ownerUserId || String(project.ownerUserId) !== String(userId)) {
    throw Object.assign(
      new Error('Only the project founder can manage invitations.'),
      { status: 403 }
    );
  }
}

// ---------------------------------------------------------------------------
// Create or resend invitation
// ---------------------------------------------------------------------------
async function createInvitation({
  projectId,
  invitedEmail,
  memberName,
  rollNumber = '',
  invitedBy, // userId of the founder
  resend = false,
}) {
  const email = normaliseEmail(invitedEmail);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('A valid email address is required.'), { status: 400 });
  }
  if (!memberName || String(memberName).trim().length < 2) {
    throw Object.assign(new Error('Member name must be at least 2 characters.'), { status: 400 });
  }

  const project = await getProjectAndOwner(projectId);
  await assertIsFounder(project, invitedBy);

  // A founder cannot invite themselves.
  const founder = await User.findById(invitedBy).select('email name').lean();
  if (founder && normaliseEmail(founder.email) === email) {
    throw Object.assign(new Error('You cannot invite yourself.'), { status: 400 });
  }

  // Check for existing active membership.
  const existing = await TeamMembership.findOne({
    projectId: String(projectId),
    invitedEmail: email,
    status: { $in: ['PENDING', 'ACCEPTED'] },
  }).lean();

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      throw Object.assign(new Error('This person has already accepted their invitation and is a project member.'), { status: 409 });
    }
    if (!resend) {
      throw Object.assign(
        new Error('An invitation is already pending for this email address. Use resend to send a new link.'),
        { status: 409, membershipId: String(existing._id) }
      );
    }
    // Resend: issue a new token against the existing PENDING record.
    return resendInvitation({ membershipId: String(existing._id), invitedBy });
  }

  const { rawToken, tokenHash } = TeamMembership.generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const membership = await TeamMembership.create({
    projectId: String(projectId),
    applicationId: project.applicationId || null,
    invitedEmail: email,
    memberName: String(memberName).trim(),
    rollNumber: String(rollNumber).trim(),
    role: 'MEMBER',
    status: 'PENDING',
    invitedBy: String(invitedBy),
    tokenHash,
    expiresAt,
    projectTitle: project.title || '',
    inviterName: founder?.name || '',
  });

  // Fire email — never block the response on delivery failure.
  const emailResult = await _sendInviteEmail({ membership, rawToken }).catch((err) => ({ success: false, error: err.message }));
  await TeamMembership.updateOne(
    { _id: membership._id },
    {
      $set: {
        emailStatus: emailResult.sandbox ? 'sandbox' : emailResult.success ? 'sent' : 'failed',
        emailSentAt: emailResult.success || emailResult.sandbox ? new Date() : null,
        emailError: emailResult.error || null,
      },
    }
  );

  await logAuditTrail({
    userId: String(invitedBy),
    email: founder?.email || '',
    role: 'student',
    action: 'TEAM_INVITE_CREATED',
    resource: `/projects/${projectId}/team`,
    workspace: 'student',
    details: { invitedEmail: email, memberName: String(memberName).trim(), projectId, emailStatus: emailResult.success ? 'sent' : 'failed' },
  });

  return { membership: _safeView(membership), rawToken, emailResult };
}

// ---------------------------------------------------------------------------
// Resend invitation (new token, reset expiry)
// ---------------------------------------------------------------------------
async function resendInvitation({ membershipId, invitedBy }) {
  const membership = await TeamMembership.findById(membershipId).lean();
  if (!membership) throw Object.assign(new Error('Invitation not found.'), { status: 404 });
  if (membership.status !== 'PENDING') {
    throw Object.assign(new Error('Only pending invitations can be resent.'), { status: 409 });
  }

  const project = await getProjectAndOwner(membership.projectId);
  await assertIsFounder(project, invitedBy);

  const { rawToken, tokenHash } = TeamMembership.generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await TeamMembership.updateOne(
    { _id: membership._id },
    {
      $set: { tokenHash, expiresAt, emailStatus: 'pending', emailError: null },
      $inc: { resendCount: 1 },
    }
  );
  const updated = await TeamMembership.findById(membership._id).lean();

  const emailResult = await _sendInviteEmail({ membership: updated, rawToken }).catch((err) => ({ success: false, error: err.message }));
  await TeamMembership.updateOne(
    { _id: membership._id },
    {
      $set: {
        emailStatus: emailResult.sandbox ? 'sandbox' : emailResult.success ? 'sent' : 'failed',
        emailSentAt: emailResult.success || emailResult.sandbox ? new Date() : null,
        emailError: emailResult.error || null,
      },
    }
  );

  await logAuditTrail({
    userId: String(invitedBy),
    email: '',
    role: 'student',
    action: 'TEAM_INVITE_RESENT',
    resource: `/projects/${membership.projectId}/team`,
    workspace: 'student',
    details: { membershipId, invitedEmail: membership.invitedEmail, resendCount: (membership.resendCount || 0) + 1 },
  });

  return { membership: _safeView(updated), rawToken, emailResult };
}

// ---------------------------------------------------------------------------
// Accept invitation
// ---------------------------------------------------------------------------
async function acceptInvitation({ rawToken, userId }) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length > 200) {
    throw Object.assign(new Error('Invalid invitation link.'), { status: 400 });
  }

  const tokenHash = TeamMembership.hashToken(rawToken);

  // Atomically claim the membership — prevents replay attacks.
  const membership = await TeamMembership.findOneAndUpdate(
    {
      tokenHash,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    },
    { $set: { status: 'ACCEPTED', userId: String(userId), acceptedAt: new Date(), tokenHash: null } },
    { returnDocument: 'after' }
  ).lean();

  if (!membership) {
    // Distinguish expired vs invalid to give the user a helpful message.
    const existing = await TeamMembership.findOne({ tokenHash: TeamMembership.hashToken(rawToken) }).lean();
    if (existing?.status === 'ACCEPTED') {
      throw Object.assign(new Error('This invitation has already been accepted.'), { status: 409, alreadyAccepted: true });
    }
    if (existing?.status === 'REVOKED') {
      throw Object.assign(new Error('This invitation has been revoked by the project founder.'), { status: 410 });
    }
    if (existing?.expiresAt && existing.expiresAt < new Date()) {
      throw Object.assign(new Error('This invitation link has expired. Please ask the project founder for a new invitation.'), { status: 410, expired: true });
    }
    throw Object.assign(new Error('This invitation link is invalid or has already been used.'), { status: 410 });
  }

  // Verify that the logged-in account's email matches the invited email.
  const user = await User.findById(userId).select('email name').lean();
  if (!user) throw Object.assign(new Error('Your account could not be verified. Please sign in again.'), { status: 401 });

  const accountEmail = normaliseEmail(user.email);
  if (accountEmail !== membership.invitedEmail) {
    // Roll back the accept — the wrong account tried to use this token.
    await TeamMembership.updateOne(
      { _id: membership._id },
      { $set: { status: 'PENDING', userId: null, acceptedAt: null, tokenHash } }
    );
    throw Object.assign(
      new Error(
        `This invitation was sent to ${membership.invitedEmail}. You are signed in as ${accountEmail}. ` +
        `Please sign in with the correct account or ask the founder to invite your current email address.`
      ),
      { status: 403, emailMismatch: true }
    );
  }

  await logAuditTrail({
    userId: String(userId),
    email: user.email,
    role: 'student',
    action: 'TEAM_INVITE_ACCEPTED',
    resource: `/projects/${membership.projectId}/team`,
    workspace: 'student',
    details: { projectId: membership.projectId, projectTitle: membership.projectTitle, membershipId: String(membership._id) },
  });

  return { membership: _safeView(membership), project: await getProjectAndOwner(membership.projectId) };
}

// ---------------------------------------------------------------------------
// Decline invitation
// ---------------------------------------------------------------------------
async function declineInvitation({ rawToken }) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length > 200) {
    throw Object.assign(new Error('Invalid invitation link.'), { status: 400 });
  }

  const tokenHash = TeamMembership.hashToken(rawToken);

  const membership = await TeamMembership.findOneAndUpdate(
    { tokenHash, status: 'PENDING' },
    { $set: { status: 'DECLINED', declinedAt: new Date(), tokenHash: null } },
    { returnDocument: 'after' }
  ).lean();

  if (!membership) {
    throw Object.assign(new Error('This invitation link is invalid, expired, or has already been used.'), { status: 410 });
  }

  return { membership: _safeView(membership) };
}

// ---------------------------------------------------------------------------
// Revoke invitation (founder only)
// ---------------------------------------------------------------------------
async function revokeInvitation({ membershipId, revokedBy }) {
  const membership = await TeamMembership.findById(membershipId).lean();
  if (!membership) throw Object.assign(new Error('Invitation not found.'), { status: 404 });
  if (!['PENDING', 'ACCEPTED'].includes(membership.status)) {
    throw Object.assign(new Error('Only active or pending memberships can be revoked.'), { status: 409 });
  }

  const project = await getProjectAndOwner(membership.projectId);
  await assertIsFounder(project, revokedBy);

  await TeamMembership.updateOne(
    { _id: membership._id },
    { $set: { status: 'REVOKED', revokedAt: new Date(), tokenHash: null } }
  );

  await logAuditTrail({
    userId: String(revokedBy),
    email: '',
    role: 'student',
    action: 'TEAM_INVITE_REVOKED',
    resource: `/projects/${membership.projectId}/team`,
    workspace: 'student',
    details: { membershipId, invitedEmail: membership.invitedEmail, projectId: membership.projectId },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// List memberships for a project (founder view — includes all statuses)
// ---------------------------------------------------------------------------
async function listMemberships({ projectId, founderId }) {
  const project = await getProjectAndOwner(projectId);
  await assertIsFounder(project, founderId);

  const memberships = await TeamMembership.find({ projectId: String(projectId) })
    .sort({ createdAt: 1 })
    .lean();

  return memberships.map(_safeView);
}

// ---------------------------------------------------------------------------
// Get projects a user is a team member of (accepted memberships only)
// ---------------------------------------------------------------------------
async function getTeamProjects(userId) {
  const memberships = await TeamMembership.find({
    userId: String(userId),
    status: 'ACCEPTED',
  }).lean();

  return memberships.map((m) => ({
    projectId: m.projectId,
    applicationId: m.applicationId,
    projectTitle: m.projectTitle,
    role: m.role,
    acceptedAt: m.acceptedAt,
    membershipId: String(m._id),
  }));
}

// ---------------------------------------------------------------------------
// Check if a user has accepted membership for a project
// ---------------------------------------------------------------------------
async function hasAcceptedMembership(userId, projectId) {
  if (TeamMembership.findOne === mongoose.Model.findOne && mongoose.connection?.readyState !== 1) return false;
  const m = await TeamMembership.findOne({
    userId: String(userId),
    $or: [{ projectId: String(projectId) }, { applicationId: String(projectId) }],
    status: 'ACCEPTED',
  }).lean();
  return Boolean(m);
}

// ---------------------------------------------------------------------------
// User ids of every ACCEPTED teammate on a project (used to include them in meetings)
// ---------------------------------------------------------------------------
async function acceptedMemberUserIds(projectId) {
  if (TeamMembership.find === mongoose.Model.find && mongoose.connection?.readyState !== 1) return [];
  const rows = await TeamMembership.find({ projectId: String(projectId), status: 'ACCEPTED', userId: { $ne: null } }).select('userId').lean();
  return rows.map((r) => String(r.userId));
}

// ---------------------------------------------------------------------------
// Look up invitation by raw token (for the acceptance page, pre-auth)
// ---------------------------------------------------------------------------
async function peekInvitation(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length > 200) return null;
  const tokenHash = TeamMembership.hashToken(rawToken);
  return TeamMembership.findOne({ tokenHash, status: 'PENDING' })
    .select('projectId projectTitle inviterName invitedEmail memberName expiresAt status emailStatus')
    .lean();
}

// ---------------------------------------------------------------------------
// Expire stale invitations (called by a scheduled job or on-demand)
// ---------------------------------------------------------------------------
async function expireStaleInvitations() {
  const result = await TeamMembership.updateMany(
    { status: 'PENDING', expiresAt: { $lt: new Date() } },
    { $set: { status: 'EXPIRED', tokenHash: null } }
  );
  return result.modifiedCount;
}

// ---------------------------------------------------------------------------
// Create founding membership for the project lead (called on project creation)
// ---------------------------------------------------------------------------
async function ensureFounderMembership({ projectId, applicationId, founderId, founderEmail, founderName }) {
  const email = normaliseEmail(founderEmail);
  const existing = await TeamMembership.findOne({ projectId: String(projectId), invitedEmail: email }).lean();
  if (existing) return existing;

  return TeamMembership.create({
    projectId: String(projectId),
    applicationId: applicationId || null,
    userId: String(founderId),
    invitedEmail: email,
    memberName: founderName || 'Team Lead',
    role: 'LEAD',
    status: 'ACCEPTED',
    invitedBy: String(founderId),
    tokenHash: null,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year — lead never expires
    acceptedAt: new Date(),
    emailStatus: 'sandbox', // no email needed for the founder
    projectTitle: '',
    inviterName: '',
  });
}

// ---------------------------------------------------------------------------
// Invite every teammate listed on the submission roster (skips the founder, blank/invalid
// emails and anyone already PENDING/ACCEPTED). Failures are collected, never thrown.
// ---------------------------------------------------------------------------
async function inviteRosterMembers({ projectId, founderId, roster }) {
  const results = [];
  const seen = new Set();
  for (const m of Array.isArray(roster) ? roster : []) {
    const email = normaliseEmail(m?.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    try {
      const r = await createInvitation({
        projectId,
        invitedEmail: email,
        memberName: String(m.name || '').trim() || email.split('@')[0],
        rollNumber: m.rollNumber || '',
        invitedBy: founderId,
      });
      results.push({ email, status: 'invited', emailStatus: r.membership.emailStatus });
    } catch (err) {
      results.push({ email, status: 'skipped', reason: err.message });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function _safeView(m) {
  const obj = typeof m.toObject === 'function' ? m.toObject() : { ...m };
  // Never expose tokenHash in API responses.
  delete obj.tokenHash;
  return obj;
}

async function _sendInviteEmail({ membership, rawToken }) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const acceptUrl = `${frontendUrl}/workspace/student/invitations/accept?token=${encodeURIComponent(rawToken)}`;

  const isRealSmtp = Boolean(process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD));

  if (!isRealSmtp) {
    // Sandbox mode: log the link so it can be manually tested, but return success.
    console.log(`\n[TEAM INVITE — SANDBOX MODE]`);
    console.log(`  To    : ${membership.invitedEmail}`);
    console.log(`  Project: ${membership.projectTitle}`);
    console.log(`  Invited by: ${membership.inviterName}`);
    console.log(`  Accept URL: ${acceptUrl}`);
    console.log(`  Expires: ${membership.expiresAt.toISOString()}\n`);
    return { success: true, sandbox: true, acceptUrl };
  }

  const subject = `You've been invited to join "${membership.projectTitle}" on DBIT Incubation Centre`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #1e3a8a; padding: 28px 32px;">
        <h1 style="color: #fff; font-size: 20px; margin: 0;">DBIT Incubation Centre</h1>
        <p style="color: #bfdbfe; font-size: 13px; margin: 4px 0 0;">Team Collaboration Invitation</p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b;">Hi <strong>${membership.memberName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          <strong>${membership.inviterName}</strong> has invited you to join the project 
          <strong>"${membership.projectTitle}"</strong> on the DBIT Incubation Centre portal.
        </p>

        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #1e293b;"><strong>What joining allows you to do:</strong></p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.8;">
            <li>View the shared project on your own student dashboard</li>
            <li>Track milestones and project progress</li>
            <li>Receive meeting invitations and schedule updates</li>
            <li>Access project resources and documents</li>
          </ul>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          ⚠️ You must sign in (or register) with the email address <strong>${membership.invitedEmail}</strong> to accept this invitation.
        </p>

        <a href="${acceptUrl}" style="display: inline-block; margin: 20px 0; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Accept Invitation
        </a>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 12px;">
          This invitation expires on ${new Date(membership.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
          If you do not want to join, you can ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">
          DBIT Incubation Centre &mdash; Don Bosco Institute of Technology, Mumbai<br/>
          This email was sent because someone invited your email address to join a project.
        </p>
      </div>
    </div>
  `;

  return sendEmail({ to: membership.invitedEmail, subject, html });
}

module.exports = {
  acceptedMemberUserIds,
  inviteRosterMembers,
  createInvitation,
  resendInvitation,
  acceptInvitation,
  declineInvitation,
  revokeInvitation,
  listMemberships,
  getTeamProjects,
  hasAcceptedMembership,
  peekInvitation,
  expireStaleInvitations,
  ensureFounderMembership,
};
