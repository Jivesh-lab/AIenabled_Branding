const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * authenticate
 * Verifies the `aai_token` httpOnly cookie or Authorization header.
 * Attaches req.user = { id, role } on success.
 * There is no implicit identity: a request without a valid token gets a 401 unless the
 * explicit local-development fallback below is switched on.
 */
function devFallbackEnabled() {
  return process.env.NODE_ENV === 'development'
    && process.env.DEV_AUTH_FALLBACK === 'true'
    && Boolean(process.env.DEV_AUTH_FALLBACK_EMAIL);
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null;
  const cookieToken = req.cookies?.aai_token;
  const tokensToTry = [authHeader, cookieToken].filter(Boolean);

  for (const token of tokensToTry) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      
      // If mongoose is connected and User.findById is available, verify status in database
      if (typeof User.findById === 'function' && mongoose.connection?.readyState === 1 && mongoose.isValidObjectId(payload.sub)) {
        const user = await User.findById(payload.sub).select('status isSoftDeleted role facultyRole email name isInvestorVerified');
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
            facultyRole: user.facultyRole || (user.role === 'faculty' ? 'coordinator' : undefined),
            role: user.role,
            status: user.status,
            email: user.email,
            name: user.name,
            isInvestorVerified: Boolean(user.isInvestorVerified),
          };
          return next();
        }
      }

      req.user = {
        id: payload.sub,
        role: payload.role,
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.email ? { email: payload.email } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.isInvestorVerified !== undefined ? { isInvestorVerified: Boolean(payload.isInvestorVerified) } : {}),
      };
      return next();
    } catch {
      // Invalid token, fall through to dev fallback / 401
    }
  }

  // Explicit, opt-in local-development identity. It is never active by default and never
  // in production: it requires NODE_ENV=development AND DEV_AUTH_FALLBACK=true, and it uses
  // the account named by DEV_AUTH_FALLBACK_EMAIL so the identity is visible and deliberate.
  if (devFallbackEnabled() && typeof User.findOne === 'function' && mongoose.connection?.readyState === 1) {
    try {
      const devUser = await User.findOne({
        email: String(process.env.DEV_AUTH_FALLBACK_EMAIL || '').toLowerCase(),
        status: 'active',
        isSoftDeleted: { $ne: true },
      });
      if (devUser) {
        console.warn(`[AUTH] DEV_AUTH_FALLBACK active: acting as ${devUser.email} (${devUser.role}). Never enable outside local development.`);
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
