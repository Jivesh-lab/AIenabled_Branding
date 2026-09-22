const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/audit
 * Protected: super_admin & admin.
 * Retrieves paginated audit logs with search/filtering capabilities.
 */
router.get('/', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { email: searchRegex },
        { action: searchRegex },
        { resource: searchRegex },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[AUDIT API] Fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
