const AuditLog = require('../models/AuditLog');

/**
 * Record an entry into the system audit log.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.email
 * @param {string} params.role
 * @param {string} params.action
 * @param {string} [params.resource]
 * @param {string} [params.workspace]
 * @param {Object} [params.details]
 * @param {Object} [params.req] - Express request object for IP and User Agent extraction
 * @param {string} [params.status] - SUCCESS | FAILURE | WARNING
 */
async function logAuditTrail({
  userId,
  email,
  role,
  action,
  resource = '/',
  workspace = 'super-admin',
  details = {},
  req = null,
  status = 'SUCCESS',
}) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown') : 'unknown';
    const userAgent = req ? (req.headers['user-agent'] || 'unknown') : 'unknown';

    await AuditLog.create({
      userId,
      email,
      role,
      action,
      resource,
      workspace,
      details,
      ip: Array.isArray(ip) ? ip[0] : ip,
      userAgent,
      status,
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR] Failed to record audit trail:', err);
  }
}

/**
 * Express middleware to automatically log request actions by Super Admin.
 */
function auditSuperAdmin(actionName) {
  return async (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
      const action = actionName || `${req.method} ${req.originalUrl}`;
      const workspace = req.headers['x-workspace-context'] || 'super-admin';
      
      res.on('finish', () => {
        // Only log after response finishes
        logAuditTrail({
          userId: req.user.id,
          email: req.user.email || 'superadmin@system',
          role: req.user.role,
          action,
          resource: req.originalUrl,
          workspace,
          details: {
            method: req.method,
            query: req.query,
            statusCode: res.statusCode,
          },
          req,
          status: res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS',
        });
      });
    }
    next();
  };
}

module.exports = { logAuditTrail, auditSuperAdmin };
