const crypto = require('crypto');
const mongoose = require('mongoose');

/**
 * TeamMembership — single source of truth for project team access.
 *
 * Security contract:
 *  - Being listed in a submission's teamMembers array does NOT grant access.
 *  - Access begins only after status === 'ACCEPTED' and userId is set.
 *  - Tokens are stored hashed (sha256); the raw token is only ever returned once, at creation.
 *  - Duplicate active/pending memberships (same projectId + email) are prevented at the DB level.
 *  - Only founders (role: LEAD) may manage invitations.
 */

const STATUSES = ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'DECLINED'];
const ROLES = ['LEAD', 'MEMBER'];

const teamMembershipSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    // applicationId links back to the idea submission that created the project.
    applicationId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    // The authenticated user who accepted the invitation. Null until accepted.
    userId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    // The email that was invited (normalised to lowercase). The accepting account MUST own this email.
    invitedEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    memberName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    rollNumber: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'MEMBER',
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'PENDING',
      index: true,
    },
    // The user who created this invitation (the founder).
    invitedBy: {
      type: String,
      required: true,
    },
    // sha256 hash of the raw token. Never stored in plain text.
    tokenHash: {
      type: String,
      default: null,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    declinedAt: {
      type: Date,
      default: null,
    },
    // Tracks email delivery attempts for reliability.
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'sandbox'],
      default: 'pending',
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    emailError: {
      type: String,
      default: null,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    // Snapshot of the project name at invite time (denormalised for email rendering).
    projectTitle: {
      type: String,
      default: '',
    },
    // Snapshot of the inviter's name at invite time.
    inviterName: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Only one PENDING or ACCEPTED membership per project + email at a time.
// This prevents duplicate invitations being spammed.
teamMembershipSchema.index(
  { projectId: 1, invitedEmail: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['PENDING', 'ACCEPTED'] } },
    name: 'unique_active_membership',
  }
);

// Fast look-up of all memberships a userId has accepted.
teamMembershipSchema.index({ userId: 1, status: 1 });

// Expiry sweep: find PENDING records past expiresAt.
teamMembershipSchema.index({ status: 1, expiresAt: 1 });

/**
 * Generate a cryptographically secure invitation token.
 * Returns { rawToken, tokenHash }.
 * Only rawToken is sent to the invitee (URL); only tokenHash is stored.
 */
teamMembershipSchema.statics.generateToken = function () {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
};

/**
 * Hash a raw token for look-up.
 */
teamMembershipSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
};

module.exports = mongoose.models.TeamMembership || mongoose.model('TeamMembership', teamMembershipSchema);
