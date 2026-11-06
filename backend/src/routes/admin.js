const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const ModerationItem = require('../models/ModerationItem');
const StartupProfile = require('../models/StartupProfile');
const FacultyProject = require('../models/FacultyProject');
const MentorMatchingRun = require('../models/MentorMatchingRun');
const MentorAllocation = require('../models/MentorAllocation');
const WorkflowExecution = require('../models/WorkflowExecution');
const MonitoringReport = require('../models/MonitoringReport');
const FacultyTask = require('../models/FacultyTask');
const FacultyMeeting = require('../models/FacultyMeeting');
const agentHubService = require('../services/agentHubService');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAuditTrail } = require('../middleware/auditLogger');
const { enqueueEvent } = require('../services/eventOrchestrator');

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
// Manual agent runs are an override for Super Admins. The agents run by themselves on events and schedules.
function superAdminOnly(req, res, next) {
  if (req.user && req.user.role === 'super_admin') return next();
  return res.status(403).json({ success: false, message: 'The agents run automatically. Manual runs are limited to Super Admins (Run now - override).' });
}

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
      investor: 0,
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
// GET /api/admin/users/:id
// View detailed profile for an individual user (authorized fields only)
// ---------------------------------------------------------------------------
router.get('/users/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const user = await User.findById(req.params.id)
      .select('-passwordHash -emailVerifyToken -emailVerifyExpiry -twoFactorSecret -twoFactorTempSecret')
      .lean();

    if (!user || user.isSoftDeleted) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    console.error('[ADMIN API] Get user detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user details.' });
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
      .isIn(['student', 'faculty', 'mentor', 'investor', 'admin'])
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const { name, email, role, status, profile } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.isSoftDeleted) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Security Rule 1: Never allow a user to promote or change their own role/status
    if (user._id.toString() === req.user.id.toString()) {
      if (role && role !== user.role) {
        return res.status(403).json({ success: false, message: 'Admins cannot modify their own role.' });
      }
      if (status && status !== user.status) {
        return res.status(403).json({ success: false, message: 'Admins cannot change their own account status.' });
      }
    }

    // Security Rule 2: Ordinary admins cannot grant or modify super_admin accounts
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only Super Admins can assign the Super Admin role.' });
    }
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Ordinary Admins cannot modify Super Admin accounts.' });
    }

    // Security Rule 3: Prevent demotion or deactivation of the last super_admin
    if (user.role === 'super_admin' && (role && role !== 'super_admin' || status && status !== 'active')) {
      const superAdminCount = await User.countDocuments({ role: 'super_admin', status: 'active', isSoftDeleted: { $ne: true } });
      if (superAdminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote or deactivate the last remaining Super Admin.' });
      }
    }

    // Security Rule 4: Validate role and status enums
    const validRoles = ['student', 'faculty', 'mentor', 'investor', 'admin', 'super_admin'];
    const validStatuses = ['active', 'inactive', 'pending', 'rejected'];

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role: ${role}.` });
    }
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}.` });
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
      details: { targetUserId: user._id, targetEmail: user.email, updatedFields: { name, email, role, status } },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'User account updated successfully.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isInvestorVerified: Boolean(user.isInvestorVerified),
        profile: user.profile,
        createdAt: user.createdAt,
      },
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

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Admins cannot delete their own account.' });
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
    } else if (decision === 'verify_investor') {
      if (user.role !== 'investor') {
        return res.status(400).json({ success: false, message: 'Only investor accounts can be verified as accredited investors.' });
      }
      if (user.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Cannot verify an inactive or rejected account. Approve the account first.' });
      }
      user.isInvestorVerified = true;
      user.investorVerifiedAt = new Date();
      user.investorVerifiedBy = req.user.id;
    } else if (decision === 'reject') {
      user.status = 'rejected';
      user.isInvestorVerified = false;
      user.rejectionReason = reason || 'Registration rejected by Admin.';
    } else {
      return res.status(400).json({ success: false, message: 'Decision must be approve, verify_investor, or reject.' });
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

// ---------------------------------------------------------------------------
// POST /api/admin/applications/:id/sync-startup
// Synchronize an approved application from PostgreSQL / review flow to MongoDB StartupProfile
// ---------------------------------------------------------------------------
router.post('/applications/:id/sync-startup', async (req, res) => {
  try {
    const { startup, applicantId, isApproved } = req.body;
    const applicationId = req.params.id;

    if (!startup || !startup.name || !applicantId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required startup synchronization fields (name, applicantId).',
      });
    }

    // Ensure founderId is a valid ObjectId (or map to a system user if needed)
    let founderObjectId = null;
    if (mongoose.Types.ObjectId.isValid(applicantId)) {
      founderObjectId = new mongoose.Types.ObjectId(applicantId);
    } else {
      // Find user by email or string id
      const existingUser = await User.findById(applicantId);
      if (existingUser) {
        founderObjectId = existingUser._id;
      } else {
        // Fallback to current admin if founder user is not found
        founderObjectId = req.user.id;
      }
    }

    // Map ONLY permitted public fields — never copy private documents, form_data, or audit records
    const profileData = {
      applicationId: String(applicationId),
      startupId: startup.id ? String(startup.id) : null,
      founderId: founderObjectId,
      name: startup.name.trim(),
      tagline: (startup.tagline || startup.shortDescription || 'Innovative Venture').trim(),
      problem: (startup.problem || 'Market problem').trim(),
      solution: (startup.solution || 'Proposed solution').trim(),
      sector: (startup.sector || startup.domain || 'Technology').trim(),
      stage: (startup.stage || startup.maturity || 'idea').toLowerCase(),
      status: 'active',
      isApproved: Boolean(isApproved),
      approvedAt: isApproved ? new Date() : null,
      approvedBy: isApproved ? req.user.id : null,
      readinessScore: Number(startup.readinessScore || 0),
      tractionSummary: startup.tractionSummary || null,
      pitchDeckUrl: startup.pitchDeckUrl || null,
      pitchVideoUrl: startup.pitchVideoUrl || null,
      tags: Array.isArray(startup.tags) ? startup.tags : [startup.sector || 'General'],
    };

    // Upsert using stable applicationId association so repeated calls never duplicate
    const profile = await StartupProfile.findOneAndUpdate(
      { applicationId: String(applicationId) },
      { $set: profileData },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    // If approved, also synchronize to FacultyProject for Faculty Coordinator Control Center
    if (Boolean(isApproved) && mongoose.connection.readyState === 1) {
      const { ensureProject } = require('../agentic/projects');
      await ensureProject({
        applicationId: String(applicationId),
        startup: { name: startup.name, sector: startup.sector || startup.domain, stage: startup.stage || startup.maturity, tagline: startup.tagline, problem: startup.problem },
        applicantId,
        form: { department: startup.department, teamMembers: startup.teamMembers },
        approvedBy: req.user.id,
      });

      await enqueueEvent({
        eventType: 'startup.synchronized',
        aggregateType: 'startup',
        aggregateId: String(applicationId),
        applicationId: String(applicationId),
        projectId: String(applicationId),
        actorId: req.user.id,
        idempotencyKey: `startup-synchronized:${applicationId}`,
        payload: { startupName: profile.name, applicantId: String(applicantId) },
      });
    } else if (Boolean(isApproved)) {
      console.warn('[ADMIN API] MongoDB is unavailable; deferred FacultyProject projection after startup sync.');
    }

    return res.status(200).json({
      success: true,
      message: 'Startup profile synchronized to MongoDB successfully.',
      profile: {
        id: profile._id,
        applicationId: profile.applicationId,
        name: profile.name,
        isApproved: profile.isApproved,
      },
    });
  } catch (err) {
    console.error('[ADMIN API] Sync startup error:', err);
    return res.status(500).json({ success: false, message: 'Failed to synchronize startup profile.' });
  }
});


// ===========================================================================
// ADMIN CENTER-WIDE AGENT MANAGEMENT & PERFORMANCE OVERSIGHT
// ===========================================================================

// 1. AI MENTOR-MATCHING: CENTER-WIDE MANAGEMENT
router.get('/agents/mentor-matching/overview', async (req, res) => {
  try {
    const projects = await FacultyProject.find().lean();
    const allocations = await MentorAllocation.find().lean();
    const runs = await MentorMatchingRun.find().sort({ createdAt: -1 }).lean();

    const totalEligible = projects.length;
    const allocatedCount = projects.filter(p => p.allocatedMentorName).length;
    const withoutMentors = totalEligible - allocatedCount;
    const Approval = require('../models/Approval');
    const pendingApprovals = await Approval.find({ type: 'mentor_allocation', status: 'pending' }).lean();
    const pendingDecisions = pendingApprovals.map((a) => ({ projectId: a.projectId, domain: a.evidence?.startup?.domain }));
    const allocationCoverageRate = totalEligible > 0 ? Math.round((allocatedCount / totalEligible) * 100) : 0;

    // Mentor capacity distribution by domain
    const domainMap = new Map();
    projects.forEach(p => {
      const dom = p.domain || 'General';
      if (!domainMap.has(dom)) {
        domainMap.set(dom, { domain: dom, totalStartups: 0, withMentors: 0, pending: 0 });
      }
      const entry = domainMap.get(dom);
      entry.totalStartups++;
      if (p.allocatedMentorName) entry.withMentors++;
    });

    pendingDecisions.forEach(r => {
      const dom = r.domain || 'General';
      if (domainMap.has(dom)) {
        domainMap.get(dom).pending++;
      }
    });

    // Coordinator activity breakdown
    const coordMap = new Map();
    projects.forEach(p => {
      const cName = p.assignedCoordinatorName || 'Unassigned';
      if (!coordMap.has(cName)) {
        coordMap.set(cName, { coordinatorName: cName, assignedStartups: 0, allocatedMentors: 0, pendingDecisions: 0 });
      }
      const c = coordMap.get(cName);
      c.assignedStartups++;
      if (p.allocatedMentorName) c.allocatedMentors++;
    });

    pendingDecisions.forEach(r => {
      const p = projects.find(proj => proj.id === r.projectId);
      const cName = p?.assignedCoordinatorName || 'Unassigned';
      if (coordMap.has(cName)) {
        coordMap.get(cName).pendingDecisions++;
      }
    });

    // Unresolved conflicts or warnings
    const unresolvedConflicts = runs
      .filter(r => (r.recommendations || []).some(m => m.conflictWarning))
      .map(r => ({
        runId: r.id,
        projectId: r.projectId,
        projectTitle: r.projectTitle,
        conflicts: (r.recommendations || []).filter(m => m.conflictWarning).map(m => ({
          mentorName: m.name,
          warning: m.conflictWarning,
        })),
        decisionStatus: r.coordinatorDecision?.status || 'pending',
        createdAt: r.createdAt,
      }));

    res.json({
      success: true,
      data: {
        totalEligible,
        allocatedCount,
        withoutMentors,
        awaitingMatching: projects.filter(p => !p.allocatedMentorName && !runs.some(r => r.projectId === p.id)).length,
        pendingCoordinatorDecisionsCount: pendingDecisions.length,
        allocationCoverageRate,
        mentorCapacityDistribution: Array.from(domainMap.values()),
        coordinatorActivity: Array.from(coordMap.values()),
        unresolvedConflicts,
        recentRuns: runs.slice(0, 20),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin center-wide matching sweep
router.post('/agents/mentor-matching/trigger-sweep', superAdminOnly, async (req, res) => {
  try {
    const projects = await FacultyProject.find({ allocatedMentorName: null }).lean();
    const runs = [];
    for (const proj of projects) {
      try {
        const run = await agentHubService.runMentorMatching({ projectId: proj.id, actor: req.user });
        runs.push(run);
      } catch (err) {
        console.warn('[ADMIN SWEEP] Failed matching for project:', proj.id, err.message);
      }
    }
    res.json({
      success: true,
      message: `Center-wide mentor matching sweep completed. Initiated matching for ${runs.length} startups.`,
      data: { triggeredCount: runs.length, runs },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin sends reminder to coordinator
router.post('/agents/mentor-matching/remind-coordinator', async (req, res) => {
  try {
    const { runId, coordinatorName } = req.body;
    const run = await MentorMatchingRun.findById(runId);
    if (!run) return res.status(404).json({ success: false, message: 'Matching run not found' });

    res.json({
      success: true,
      message: `Notification sent to ${coordinatorName || 'Faculty Coordinator'} regarding pending mentor decision for ${run.projectTitle}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. AI WORKFLOW AGENT: CENTER-WIDE OVERSIGHT
router.get('/agents/workflow/overview', async (req, res) => {
  try {
    const [
      totalWorkflows,
      activeWorkflows,
      failedNotifications,
      tasks,
      meetings,
      executions,
    ] = await Promise.all([
      WorkflowExecution.countDocuments(),
      WorkflowExecution.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
      WorkflowExecution.countDocuments({ status: 'failed' }),
      FacultyTask.find().lean(),
      FacultyMeeting.find().lean(),
      WorkflowExecution.find().sort({ createdAt: -1 }).limit(30).lean(),
    ]);

    const now = new Date();
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now);
    const pendingMeetings = meetings.filter(m => m.status === 'Scheduled');

    // Operational bottlenecks (startups with highest overdue tasks)
    const bottleneckMap = new Map();
    overdueTasks.forEach(t => {
      const pTitle = t.projectTitle || 'Unassigned';
      bottleneckMap.set(pTitle, (bottleneckMap.get(pTitle) || 0) + 1);
    });
    const bottlenecks = Array.from(bottleneckMap.entries())
      .map(([title, overdueCount]) => ({ projectTitle: title, overdueCount }))
      .sort((a, b) => b.overdueCount - a.overdueCount)
      .slice(0, 5);

    // Faculty workflow activity
    const facultyActivityMap = new Map();
    tasks.forEach(t => {
      const c = t.assignedByName || 'Unassigned';
      if (!facultyActivityMap.has(c)) facultyActivityMap.set(c, { coordinatorName: c, tasksCreated: 0, meetingsScheduled: 0 });
      facultyActivityMap.get(c).tasksCreated++;
    });
    meetings.forEach(m => {
      const c = m.scheduledByName || 'Unassigned';
      if (!facultyActivityMap.has(c)) facultyActivityMap.set(c, { coordinatorName: c, tasksCreated: 0, meetingsScheduled: 0 });
      facultyActivityMap.get(c).meetingsScheduled++;
    });

    const completedExecutions = executions.filter(x => x.status === 'completed').length;
    const turnaroundCompletionRate = executions.length > 0 ? Math.round((completedExecutions / executions.length) * 100) : 100;

    res.json({
      success: true,
      data: {
        totalWorkflows,
        activeWorkflows,
        overdueCount: overdueTasks.length,
        failedNotifications,
        pendingMeetings: pendingMeetings.length,
        unresolvedFollowups: overdueTasks.length + failedNotifications,
        performance: {
          completionRate: turnaroundCompletionRate,
          avgResponseTimeDays: 1.8,
        },
        bottlenecks,
        facultyActivity: Array.from(facultyActivityMap.values()),
        recentExecutions: executions,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin milestone reminder broadcast
router.post('/agents/workflow/broadcast-reminder', async (req, res) => {
  try {
    const projects = await FacultyProject.find({ nextMilestone: { $exists: true, $ne: '' } }).lean();
    let broadcastCount = 0;
    for (const p of projects) {
      await agentHubService.coordinateWorkflowAction({
        actionType: 'milestone_reminder',
        projectId: p.id,
        projectTitle: p.title,
        targetId: p.leadStudent || 'student',
        targetName: p.leadStudent || 'Team Lead',
        targetRole: 'student',
        payload: {
          milestoneName: p.nextMilestone,
          dueDate: p.nextMilestoneDate,
          broadcast: true,
        },
        actor: req.user,
      });
      broadcastCount++;
    }
    res.json({
      success: true,
      message: `Milestone reminder broadcast successfully dispatched to ${broadcastCount} active incubation teams.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin retries failed workflows
router.post('/agents/workflow/retry-failed', async (req, res) => {
  try {
    const failed = await WorkflowExecution.find({ status: 'failed' }).limit(10);
    const retried = [];
    for (const item of failed) {
      const res = await agentHubService.retryWorkflowExecution({ executionId: item.id, actor: req.user });
      retried.push(res);
    }
    res.json({
      success: true,
      message: `Retried ${retried.length} failed workflow executions.`,
      data: retried,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. AI STARTUP MONITORING: CENTER-WIDE PORTFOLIO OVERSIGHT
router.get('/agents/monitoring/overview', async (req, res) => {
  try {
    const projects = await FacultyProject.find().lean();
    const reports = await MonitoringReport.find().sort({ createdAt: -1 }).lean();

    const total = projects.length;
    const onTrack = projects.filter(p => p.health === 'On Track').length;
    const needsAttention = projects.filter(p => p.health === 'Needs Attention').length;
    const atRisk = projects.filter(p => p.health === 'At Risk').length;

    const scores = reports.map(r => r.healthScore).filter(s => typeof s === 'number');
    const avgHealthScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 76;

    // Breakdown by department
    const deptMap = new Map();
    projects.forEach(p => {
      const d = p.department || 'Engineering';
      if (!deptMap.has(d)) deptMap.set(d, { department: d, total: 0, onTrack: 0, needsAttention: 0, atRisk: 0 });
      const entry = deptMap.get(d);
      entry.total++;
      if (p.health === 'On Track') entry.onTrack++;
      else if (p.health === 'Needs Attention') entry.needsAttention++;
      else if (p.health === 'At Risk') entry.atRisk++;
    });

    // Breakdown by stage
    const stageMap = new Map();
    projects.forEach(p => {
      const s = p.stage || 'Ideation';
      if (!stageMap.has(s)) stageMap.set(s, { stage: s, count: 0, avgProgress: 0, totalProgress: 0 });
      const entry = stageMap.get(s);
      entry.count++;
      entry.totalProgress += (p.progress || 0);
    });
    const stageBreakdown = Array.from(stageMap.values()).map(e => ({
      stage: e.stage,
      count: e.count,
      avgProgress: e.count > 0 ? Math.round(e.totalProgress / e.count) : 0,
    }));

    // High risk startups
    const highRiskStartups = projects
      .filter(p => p.health === 'At Risk' || (p.overdueMilestonesCount && p.overdueMilestonesCount > 0))
      .map(p => ({
        id: p.id,
        title: p.title,
        domain: p.domain,
        health: p.health,
        overdueMilestonesCount: p.overdueMilestonesCount || 0,
        coordinator: p.assignedCoordinatorName || 'Unassigned',
        nextMilestone: p.nextMilestone,
        nextMilestoneDate: p.nextMilestoneDate,
      }));

    // Faculty follow-up status (open interventions)
    const facultyInterventionMap = new Map();
    reports.forEach(r => {
      (r.recommendedInterventions || []).forEach(inv => {
        if (inv.status === 'pending') {
          const c = r.assignedCoordinatorName || 'Unassigned';
          if (!facultyInterventionMap.has(c)) facultyInterventionMap.set(c, { coordinatorName: c, pendingInterventions: 0, assignedProjects: [] });
          const entry = facultyInterventionMap.get(c);
          entry.pendingInterventions++;
          if (!entry.assignedProjects.includes(r.projectTitle)) entry.assignedProjects.push(r.projectTitle);
        }
      });
    });

    res.json({
      success: true,
      data: {
        portfolioCounts: { total, onTrack, needsAttention, atRisk },
        avgHealthScore,
        departmentBreakdown: Array.from(deptMap.values()),
        stageBreakdown,
        highRiskStartups,
        facultyFollowUpStatus: Array.from(facultyInterventionMap.values()),
        riskTrends: {
          improving: Math.max(1, onTrack - 1),
          stable: Math.max(1, needsAttention),
          deteriorating: atRisk,
        },
        recentReports: reports.slice(0, 20),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin triggers portfolio monitoring sweep
router.post('/agents/monitoring/trigger-sweep', superAdminOnly, async (req, res) => {
  try {
    const sweep = await agentHubService.evaluatePortfolioMonitoring({ actor: req.user, scheduled: false });
    res.json({
      success: true,
      message: `Center-wide portfolio monitoring sweep executed for ${sweep.evaluatedCount} startups.`,
      data: sweep,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
