const jwt = require('jsonwebtoken');

/**
 * authenticate
 * Verifies the `aai_token` httpOnly cookie.
 * Attaches req.user = { id, role } on success.
 * Returns 401 if token is missing or invalid.
 */
function authenticate(req, res, next) {
  const token = req.cookies?.aai_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid. Please sign in again.',
    });
  }
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
