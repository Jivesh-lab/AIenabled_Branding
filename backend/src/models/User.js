const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['student', 'faculty', 'mentor', 'investor', 'admin', 'super_admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name is too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    // Google-only accounts have no password; they cannot sign in with one.
    passwordHash: {
      type: String,
      default: null,
      required: [function requiresPassword() { return this.passwordLoginEnabled !== false; }, 'Password is required'],
    },
    passwordLoginEnabled: {
      type: Boolean,
      default: true,
    },
    // Google identity: the verified OpenID Connect `sub`, the stable identifier (never the e-mail address).
    googleSub: {
      type: String,
      default: undefined,
      index: { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
    },
    authProviders: {
      type: [String],
      default: ['password'],
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Invalid role: {VALUE}' },
      required: [true, 'Role is required'],
    },
    // Sub-role for faculty differentiation ('coordinator' vs 'volunteer')
    facultyRole: {
      type: String,
      enum: ['coordinator', 'volunteer'],
      default: null,
    },
    // Role-specific profile data stored as flexible sub-document
    profile: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyToken: {
      type: String,
      default: null,
    },
    emailVerifyExpiry: {
      type: Date,
      default: null,
    },
    // Investor Accreditation & Verification Status
    isInvestorVerified: {
      type: Boolean,
      default: false,
    },
    investorVerifiedAt: {
      type: Date,
      default: null,
    },
    investorVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Mandatory / Optional Two-Factor Authentication (TOTP)
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    twoFactorTempSecret: {
      type: String,
      default: null,
    },
    // Account Status & Operations Management
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'rejected'],
      default: 'active',
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isSoftDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Never expose passwordHash or 2FA secrets in JSON responses
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.emailVerifyToken;
    delete ret.emailVerifyExpiry;
    delete ret.twoFactorSecret;
    delete ret.twoFactorTempSecret;
    return ret;
  },
});

/**
 * Hash a plain-text password.
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
userSchema.statics.hashPassword = async function (plainPassword) {
  const SALT_ROUNDS = 12;
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a plain-text password against a stored hash.
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
userSchema.statics.verifyPassword = async function (plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
