const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const ModerationItem = require('../models/ModerationItem');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAuditTrail } = require('../middleware/auditLogger');

const router = express.Router();

// Apply authentication and Admin role enforcement to all routes in this file
router.use(authenticate, requireRole('admin'));

// Helper for express-validator error handling
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
// GET /api/admin/stats
// Operational metrics dashboard
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      pendingUsers,
      rejectedUsers,
      roleCounts,
      pendingApprovalsCount,
      moderationItemsCount,
    ] = await Promise.all([
      User.countDocuments({ isSoftDeleted: { $ne: true } }),
      User.countDocuments({ status: 'active', isSoftDeleted: { $ne: true } }),
      User.countDocuments({ status: 'inactive', isSoftDeleted: { $ne: true } }),
      User.countDocuments({ status: 'pending', isSoftDeleted: { $ne: true } }),
      User.countDocuments({ status: 'rejected', isSoftDeleted: { $ne: true } }),
      User.aggregate([
        { $match: { isSoftDeleted: { $ne: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      User.countDocuments({ status: 'pending', isSoftDeleted: { $ne: true } }),
      ModerationItem.countDocuments({ status: 'pending' }),
    ]);

    const roleBreakdown = {
      student: 0,
      faculty: 0,
      mentor: 0,
      industry: 0,
      investor: 0,
      startup: 0,
      admin: 0,
      super_admin: 0,
    };

    roleCounts.forEach((item) => {
      if (roleBreakdown[item._id] !== undefined) {
        roleBreakdown[item._id] = item.count;
      }
    });

    const mentorCount = roleBreakdown.mentor || 1;
    const studentCount = roleBreakdown.student || 0;
    const mentorStudentRatio = (studentCount / mentorCount).toFixed(1);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        pendingUsers,
        rejectedUsers,
        roleBreakdown,
        pendingApprovalsCount,
        moderationItemsCount,
        mentorStudentRatio: `1:${mentorStudentRatio}`,
      },
    });
  } catch (err) {
    console.error('[ADMIN API] Stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch operational stats.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/users
// Searchable, filterable table of users
// ---------------------------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { isSoftDeleted: { $ne: true } };

    if (req.query.role && req.query.role !== 'all') {
      filter.role = req.query.role;
    }

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -emailVerifyToken -emailVerifyExpiry -twoFactorSecret -twoFactorTempSecret')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[ADMIN API] Get users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users list.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users
// Single user account creation by Admin with temporary password
// ---------------------------------------------------------------------------
router.post(
  '/users',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Full name is required (2–80 characters)'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('role')
      .isIn(['student', 'faculty', 'mentor', 'industry', 'investor', 'startup', 'admin'])
      .withMessage('Valid role is required'),
    body('tempPassword').optional().isLength({ min: 8 }).withMessage('Temp password must be at least 8 chars'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { name, email, role, tempPassword, profile } = req.body;

    try {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }

      // Generate secure temp password if not provided by admin
      const finalTempPassword = tempPassword || `Temp#${crypto.randomBytes(4).toString('hex')}!`;
      const passwordHash = await User.hashPassword(finalTempPassword);

      const user = await User.create({
        name,
        email,
        passwordHash,
        role,
        profile: profile || {},
        emailVerified: true,
        status: 'active',
        mustChangePassword: true,
      });

      await logAuditTrail({
        userId: req.user.id,
        email: req.user.email || 'admin@system',
        role: req.user.role,
        action: 'ADMIN_CREATE_USER',
        resource: `/api/admin/users/${user._id}`,
        workspace: 'admin',
        details: { targetUserId: user._id, targetEmail: email, targetRole: role },
        req,
      });

      return res.status(201).json({
        success: true,
        message: 'User account created successfully.',
        tempPassword: finalTempPassword,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
        },
      });
    } catch (err) {
      console.error('[ADMIN API] Create user error:', err);
      return res.status(500).json({ success: false, message: 'Failed to create user account.' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/admin/users/bulk
// Bulk user creation from parsed CSV data
// ---------------------------------------------------------------------------
router.post('/users/bulk', async (req, res) => {
  try {
    const { users: rawUsers } = req.body; // Array of { name, email, role, institution? }

    if (!Array.isArray(rawUsers) || rawUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'Payload must contain a non-empty users array.' });
    }

    const createdUsers = [];
    const skippedEmails = [];
    const errors = [];

    for (const item of rawUsers) {
      if (!item.email || !item.name || !item.role) {
        errors.push({ item, reason: 'Missing required fields (name, email, role).' });
        continue;
      }

      const emailClean = item.email.toLowerCase().trim();
      const existing = await User.findOne({ email: emailClean });
      if (existing) {
        skippedEmails.push(emailClean);
        continue;
      }

      const tempPassword = `Init#${crypto.randomBytes(4).toString('hex')}!`;
      const passwordHash = await User.hashPassword(tempPassword);

      const newUser = await User.create({
        name: item.name.trim(),
        email: emailClean,
        passwordHash,
        role: item.role,
        profile: item.profile || { institution: item.institution || 'N/A' },
        emailVerified: true,
        status: 'active',
        mustChangePassword: true,
      });

      createdUsers.push({
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tempPassword,
      });
    }

    await logAuditTrail({
      userId: req.user.id,
      email: req.user.email || 'admin@system',
      role: req.user.role,
      action: 'ADMIN_BULK_IMPORT_USERS',
      resource: '/api/admin/users/bulk',
      workspace: 'admin',
      details: { createdCount: createdUsers.length, skippedCount: skippedEmails.length },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Bulk import finished: ${createdUsers.length} created, ${skippedEmails.length} skipped duplicates.`,
      createdUsers,
      skippedEmails,
      errors,
    });
  } catch (err) {
    console.error('[ADMIN API] Bulk import error:', err);
    return res.status(500).json({ success: false, message: 'Bulk user import failed.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id
// Edit user details, status, or role reassignment
// ---------------------------------------------------------------------------
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role, status, profile } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.isSoftDeleted) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Prevent non-super_admin from modifying super_admin accounts
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot modify Super Admin accounts.' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role) user.role = role;
    if (status) user.status = status;
    if (profile) user.profile = { ...user.profile, ...profile };

    await user.save();

    await logAuditTrail({
      userId: req.user.id,
      email: req.user.email || 'admin@system',
      role: req.user.role,
      action: 'ADMIN_EDIT_USER',
      resource: `/api/admin/users/${user._id}`,
      workspace: 'admin',
      details: { targetUserId: user._id, updatedFields: { name, email, role, status } },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'User account updated successfully.',
      user,
    });
  } catch (err) {
    console.error('[ADMIN API] Edit user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user account.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/reset-password
// Update or reset password on user's behalf with custom password or auto-generated temp password
// ---------------------------------------------------------------------------
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isSoftDeleted) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const { newPassword, tempPassword, mustChangePassword } = req.body;
    const finalPassword = newPassword || tempPassword || `Reset#${crypto.randomBytes(4).toString('hex')}!`;

    if (finalPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    user.passwordHash = await User.hashPassword(finalPassword);
    user.mustChangePassword = mustChangePassword !== undefined ? Boolean(mustChangePassword) : true;
    await user.save();

    await logAuditTrail({
      userId: req.user.id,
      email: req.user.email || 'admin@system',
      role: req.user.role,
      action: 'ADMIN_RESET_USER_PASSWORD',
      resource: `/api/admin/users/${user._id}/reset-password`,
      workspace: 'admin',
      details: { targetUserId: user._id, targetEmail: user.email },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Password updated successfully for ${user.email}.`,
      tempPassword: finalPassword,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    console.error('[ADMIN API] Password update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user password.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id
// Deactivate or Soft/Hard delete user with cascading checks
// ---------------------------------------------------------------------------
router.delete('/users/:id', async (req, res) => {
  try {
    const hardDelete = req.query.hard === 'true';
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super Admin accounts cannot be deleted.' });
    }

    if (hardDelete) {
      await User.findByIdAndDelete(req.params.id);
    } else {
      user.isSoftDeleted = true;
      user.deletedAt = new Date();
      user.status = 'inactive';
      await user.save();
    }

    await logAuditTrail({
      userId: req.user.id,
      email: req.user.email || 'admin@system',
      role: req.user.role,
      action: hardDelete ? 'ADMIN_HARD_DELETE_USER' : 'ADMIN_SOFT_DELETE_USER',
      resource: `/api/admin/users/${req.params.id}`,
      workspace: 'admin',
      details: { targetUserId: req.params.id, targetEmail: user.email, hardDelete },
      req,
    });

    return res.status(200).json({
      success: true,
      message: hardDelete ? 'User permanently deleted.' : 'User deactivated and soft-deleted.',
    });
  } catch (err) {
    console.error('[ADMIN API] Delete user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/bulk-action
// Bulk deactivate or delete multiple selected users
// ---------------------------------------------------------------------------
router.post('/users/bulk-action', async (req, res) => {
  try {
    const { userIds, action } = req.body; // action: 'deactivate' | 'delete'

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds array is required.' });
    }

    if (action === 'deactivate') {
      await User.updateMany({ _id: { $in: userIds }, role: { $ne: 'super_admin' } }, { $set: { status: 'inactive' } });
    } else if (action === 'delete') {
      await User.updateMany(
        { _id: { $in: userIds }, role: { $ne: 'super_admin' } },
        { $set: { isSoftDeleted: true, status: 'inactive', deletedAt: new Date() } }
      );
    } else {
      return res.status(400).json({ success: false, message: 'Invalid bulk action type.' });
    }

    await logAuditTrail({
      userId: req.user.id,
      email: req.user.email || 'admin@system',
      role: req.user.role,
      action: `ADMIN_BULK_${action.toUpperCase()}_USERS`,
      resource: '/api/admin/users/bulk-action',
      workspace: 'admin',
      details: { targetCount: userIds.length, action },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Bulk ${action} completed for ${userIds.length} users.`,
    });
  } catch (err) {
    console.error('[ADMIN API] Bulk action error:', err);
    return res.status(500).json({ success: false, message: 'Bulk operation failed.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/approvals
// Pending user vetting & moderation queue
// ---------------------------------------------------------------------------
router.get('/approvals', async (req, res) => {
  try {
    const [pendingUsers, moderationItems] = await Promise.all([
      User.find({ status: 'pending', isSoftDeleted: { $ne: true } })
        .select('-passwordHash -emailVerifyToken -emailVerifyExpiry')
        .sort({ createdAt: -1 })
        .lean(),
      ModerationItem.find({ status: 'pending' }).sort({ createdAt: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      pendingUsers,
      moderationItems,
    });
  } catch (err) {
    console.error('[ADMIN API] Approvals error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending approvals.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/approvals/:id/decide
// Approve or reject pending signup
// ---------------------------------------------------------------------------
router.post('/approvals/:id/decide', async (req, res) => {
  try {
    const { decision, reason } = req.body; // decision: 'approve' | 'reject'
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (decision === 'approve') {
      user.status = 'active';
      user.rejectionReason = null;
    } else if (decision === 'reject') {
      user.status = 'rejected';
      user.rejectionReason = reason || 'Registration rejected by Admin.';
    } else {
      return res.status(400).json({ success: false, message: 'Decision must be approve or reject.' });
    }

    await user.save();

    await logAuditTrail({
      userId: req.user.id,
      email: req.user.email || 'admin@system',
      role: req.user.role,
      action: `ADMIN_${decision.toUpperCase()}_USER`,
      resource: `/api/admin/approvals/${user._id}/decide`,
      workspace: 'admin',
      details: { targetUserId: user._id, targetEmail: user.email, decision, reason },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `User account ${decision}d successfully.`,
      user,
    });
  } catch (err) {
    console.error('[ADMIN API] Decision error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record decision.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/impersonate
// "View as User" mode launcher with mandatory audit trail
// ---------------------------------------------------------------------------
router.post('/impersonate', async (req, res) => {
  try {
    const { targetUserId, targetEmail } = req.body;
    const query = (targetUserId || targetEmail || '').toString().trim();

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please specify a target user ID or email address.' });
    }

    let targetUser = null;

    if (mongoose.Types.ObjectId.isValid(query)) {
      targetUser = await User.findById(query).select('-passwordHash');
    }

    if (!targetUser) {
      targetUser = await User.findOne({ email: query.toLowerCase() }).select('-passwordHash');
    }

    if (!targetUser) {
      targetUser = await User.findOne({ name: new RegExp(query, 'i') }).select('-passwordHash');
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: `User "${query}" not found in database.` });
    }

    if (targetUser.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot impersonate Super Admin.' });
    }

    await logAuditTrail({
      userId: req.user.id,
      email: req.user.email || 'admin@system',
      role: req.user.role,
      action: 'ADMIN_IMPERSONATE_USER',
      resource: `/workspace/${targetUser.role}/dashboard`,
      workspace: targetUser.role,
      details: { impersonatedUserId: targetUser._id, impersonatedEmail: targetUser.email, targetRole: targetUser.role },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Impersonation session initialized for ${targetUser.name} (${targetUser.role}).`,
      targetUser: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        workspaceUrl: `/workspace/${targetUser.role}/dashboard`,
      },
    });
  } catch (err) {
    console.error('[ADMIN API] Impersonate error:', err);
    return res.status(500).json({ success: false, message: 'Impersonation failed.' });
  }
});

// ---------------------------------------------------------------------------
// GET & POST /api/admin/announcements
// Manage broadcast announcements
// ---------------------------------------------------------------------------
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, announcements });
  } catch (err) {
    console.error('[ADMIN API] Announcements fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch announcements.' });
  }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, body: contentBody, targetRole, priority } = req.body;

    if (!title || !contentBody) {
      return res.status(400).json({ success: false, message: 'Title and content body are required.' });
    }

    const item = await Announcement.create({
      title,
      body: contentBody,
      targetRole: targetRole || 'all',
      priority: priority || 'normal',
      authorId: req.user.id,
      authorName: req.user.email || 'Admin',
    });

    await logAuditTrail({
      userId: req.user.id,
      email: req.user.email || 'admin@system',
      role: req.user.role,
      action: 'ADMIN_CREATE_ANNOUNCEMENT',
      resource: `/api/admin/announcements/${item._id}`,
      workspace: 'admin',
      details: { title, targetRole, priority },
      req,
    });

    return res.status(201).json({ success: true, message: 'Announcement published.', announcement: item });
  } catch (err) {
    console.error('[ADMIN API] Announcement create error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create announcement.' });
  }
});

module.exports = router;
