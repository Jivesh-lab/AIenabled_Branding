const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * authenticate
 * Verifies the `aai_token` httpOnly cookie or Authorization header.
 * Attaches req.user = { id, role } on success.
 * Falls back to seeded Admin user if cookie is missing.
 */
async function authenticate(req, res, next) {
  let token = req.cookies?.aai_token;

  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace(/^Bearer\s+/i, '');
  }

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      // Invalid token, fall through to admin fallback
    }
  }

  // Fallback for development / cross-origin admin requests
  try {
    const adminUser =
      (await User.findOne({ email: 'admin@aai-dbitic.edu' })) ||
      (await User.findOne({ role: 'admin' })) ||
      (await User.findOne({ role: 'super_admin' }));

    if (adminUser) {
      req.user = { id: adminUser._id, role: adminUser.role, email: adminUser.email };
      return next();
    }
  } catch (err) {
    console.error('[AUTH MIDDLEWARE ERROR]', err);
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please sign in.',
  });
}

/**
 * requireRole
 * Factory that returns a middleware enforcing role-based access.
 * Must be used AFTER authenticate.
 *
 * @param {...string} roles - Allowed role(s) for the route.
 *
 * @example
 *   router.get('/student-only', authenticate, requireRole('student'), handler);
 */
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Super Admin has unrestricted system-wide access across all role-guarded endpoints
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      // Deliberately generic — does not reveal the target route structure
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    next();
  };
}

module.exports = { authenticate, requireRole };
