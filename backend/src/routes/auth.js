const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a signed JWT for a user record. */
function issueToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** Cookie options — httpOnly, Secure in production, SameSite=Strict. */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
}

/** Return validation errors as a single formatted response. */
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Password strength validators (mirrors frontend zod rules)
// ---------------------------------------------------------------------------
const passwordValidators = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must include at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include at least one number'),
];

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Full name is required (2–80 characters)'),
    body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('role')
      .isIn(['student', 'faculty', 'mentor', 'industry', 'investor', 'startup'])
      .withMessage('A valid role is required'),
    ...passwordValidators,
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { name, email, password, role, profile } = req.body;

    try {
      // Check for duplicate email — intentionally vague error
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      const passwordHash = await User.hashPassword(password);

      // Generate email verification token (stub — real email sending wired separately)
      const emailVerifyToken = crypto.randomBytes(32).toString('hex');
      const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const user = await User.create({
        name,
        email,
        passwordHash,
        role,
        profile: profile || {},
        emailVerifyToken,
        emailVerifyExpiry,
      });

      // TODO: Send verification email via Nodemailer/SendGrid
      // For now, log the token so it's testable in dev
      console.info(`[AUTH] Verification token for ${email}: ${emailVerifyToken}`);

      return res.status(201).json({
        success: true,
        message: 'Account created. Please verify your email.',
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error('[AUTH] Register error:', err);
      return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
  }
);

const { generateSecret, verifySync } = require('otplib');
const { logAuditTrail } = require('../middleware/auditLogger');

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    body('twoFactorCode').optional().isString().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { email, password, twoFactorCode } = req.body;

    try {
      const user = await User.findOne({ email });

      // Constant-time check — don't short-circuit on missing user
      const passwordMatch = user
        ? await User.verifyPassword(password, user.passwordHash)
        : await User.verifyPassword(password, '$2b$12$invalidhashpaddingtoconstanttime');

      if (!user || !passwordMatch) {
        if (user && user.role === 'super_admin') {
          await logAuditTrail({
            userId: user._id,
            email: user.email,
            role: user.role,
            action: 'SUPER_ADMIN_LOGIN_FAILED',
            details: { reason: 'Invalid password' },
            req,
            status: 'FAILURE',
          });
        }
        // Generic message — do NOT reveal whether email exists
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your email and password.',
        });
      }

      // Check if 2FA is required (Mandatory for super_admin OR accounts with twoFactorEnabled)
      const requires2FA = user.role === 'super_admin' || user.twoFactorEnabled;

      if (requires2FA) {
        if (!twoFactorCode) {
          return res.status(200).json({
            success: false,
            require2FA: true,
            message: 'Two-factor authentication code required.',
          });
        }

        // Verify TOTP code against twoFactorSecret
        if (!user.twoFactorSecret) {
          return res.status(500).json({
            success: false,
            message: '2FA is required for this account but secret is not set up. Please contact system admin.',
          });
        }

        const isValid2FA = verifySync({
          token: twoFactorCode,
          secret: user.twoFactorSecret,
        });

        if (!isValid2FA) {
          if (user.role === 'super_admin') {
            await logAuditTrail({
              userId: user._id,
              email: user.email,
              role: user.role,
              action: 'SUPER_ADMIN_2FA_FAILED',
              details: { reason: 'Invalid 2FA code' },
              req,
              status: 'FAILURE',
            });
          }
          return res.status(401).json({
            success: false,
            message: 'Invalid 2FA authentication code. Please try again.',
          });
        }
      }

      const token = issueToken(user);

      res.cookie('aai_token', token, cookieOptions());

      if (user.role === 'super_admin') {
        await logAuditTrail({
          userId: user._id,
          email: user.email,
          role: user.role,
          action: 'SUPER_ADMIN_LOGIN_SUCCESS',
          details: { loginMethod: 'email_password_2fa' },
          req,
          status: 'SUCCESS',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        },
      });
    } catch (err) {
      console.error('[AUTH] Login error:', err);
      return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  res.clearCookie('aai_token', { path: '/' });
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me   (protected)
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -emailVerifyToken -emailVerifyExpiry');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('[AUTH] /me error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user.' });
  }
});

const QRCode = require('qrcode');

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/setup (protected)
// ---------------------------------------------------------------------------
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const secret = generateSecret();
    user.twoFactorTempSecret = secret;
    await user.save();

    const otpauthUrl = `otpauth://totp/AAI-DBITIC:${encodeURIComponent(user.email)}?secret=${secret}&issuer=AAI-DBITIC`;
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return res.status(200).json({
      success: true,
      secret,
      qrCode: qrCodeDataUrl,
      message: 'Scan QR code with your authenticator app.',
    });
  } catch (err) {
    console.error('[2FA] Setup error:', err);
    return res.status(500).json({ success: false, message: 'Failed to setup 2FA.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/verify (protected)
// ---------------------------------------------------------------------------
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || (!user.twoFactorTempSecret && !user.twoFactorSecret)) {
      return res.status(400).json({ success: false, message: 'No 2FA setup in progress.' });
    }

    const secretToTest = user.twoFactorTempSecret || user.twoFactorSecret;
    const isValid = verifySync({ token, secret: secretToTest });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid 2FA token code.' });
    }

    if (user.twoFactorTempSecret) {
      user.twoFactorSecret = user.twoFactorTempSecret;
      user.twoFactorTempSecret = null;
    }
    user.twoFactorEnabled = true;
    await user.save();

    if (user.role === 'super_admin') {
      await logAuditTrail({
        userId: user._id,
        email: user.email,
        role: user.role,
        action: 'SUPER_ADMIN_2FA_CONFIGURED',
        details: { status: 'MFA enabled' },
        req,
      });
    }

    return res.status(200).json({ success: true, message: '2FA verified and enabled successfully.' });
  } catch (err) {
    console.error('[2FA] Verify error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify 2FA.' });
  }
});

module.exports = router;
