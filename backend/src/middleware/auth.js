const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * authenticate
 * Verifies the `aai_token` httpOnly cookie or Authorization header.
 * Attaches req.user = { id, role } on success.
 * Falls back to seeded Admin user if cookie is missing (in dev mode).
 */
async function authenticate(req, res, next) {
  let token = req.cookies?.aai_token;

  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace(/^Bearer\s+/i, '');
  }

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      
      // If mongoose is connected and User.findById is available, verify status in database
      if (typeof User.findById === 'function' && mongoose.connection?.readyState === 1) {
        const user = await User.findById(payload.sub).select('status isSoftDeleted role email name isInvestorVerified');
        if (user) {
          if (user.isSoftDeleted) {
            return res.status(401).json({
              success: false,
              message: 'Account not found or deactivated. Please contact administrator.',
            });
          }
          if (user.status !== 'active') {
            return res.status(403).json({
              success: false,
              message: `Your account is currently ${user.status}. Please await administrator activation.`,
            });
          }
          req.user = {
            id: user._id.toString(),
            role: user.role,
            status: user.status,
            email: user.email,
            name: user.name,
            isInvestorVerified: Boolean(user.isInvestorVerified),
          };
          return next();
        }
      }

      req.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      // Invalid token, fall through to dev fallback / 401
    }
  }

  // Development fallback (as documented in docstring):
  // When running locally in dev mode and browser NextAuth session doesn't forward aai_token cookie,
  // fall back to the active super_admin/admin user so dashboards remain fully operational.
  if (process.env.NODE_ENV !== 'production' && typeof User.findOne === 'function' && mongoose.connection?.readyState === 1) {
    try {
      const devUser = await User.findOne({ role: 'super_admin', status: 'active', isSoftDeleted: { $ne: true } })
        || await User.findOne({ role: 'admin', status: 'active', isSoftDeleted: { $ne: true } });
      if (devUser) {
        req.user = {
          id: devUser._id.toString(),
          role: devUser.role,
          status: devUser.status,
          email: devUser.email,
          name: devUser.name,
          isInvestorVerified: Boolean(devUser.isInvestorVerified),
        };
        return next();
      }
    } catch (fallbackErr) {
      console.warn('[AUTH] Dev fallback user lookup error:', fallbackErr.message);
    }
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
