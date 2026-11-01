const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const StartupProfile = require('../models/StartupProfile');
const InvestorWatchlist = require('../models/InvestorWatchlist');
const InvestorIntroduction = require('../models/InvestorIntroduction');
const InvestorPortfolio = require('../models/InvestorPortfolio');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAuditTrail } = require('../middleware/auditLogger');
const { sendMeetingScheduledEmails } = require('../services/emailService');
const { enqueueEvent } = require('../services/eventOrchestrator');

const router = express.Router();

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
// Middleware: requireActiveInvestor
// Enforces:
// 1. Authenticated user
// 2. Role is 'investor' (or super_admin)
// 3. Account status is 'active'
// ---------------------------------------------------------------------------
async function requireActiveInvestor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  // Fetch full user to verify account status and investor accreditation
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user || user.isSoftDeleted) {
      return res.status(401).json({ success: false, message: 'Account not found or inactive.' });
    }

    if (user.role !== 'investor' && user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access restricted to investors.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending review or inactive. Please contact support.',
      });
    }

    // Attach fresh user details to request
    req.investorUser = user;
    next();
  } catch (err) {
    console.error('[INVESTOR AUTH] Error loading user:', err);
    return res.status(500).json({ success: false, message: 'Internal authorization error.' });
  }
}

// ---------------------------------------------------------------------------
// Middleware: requireVerifiedInvestor
// Enforces:
// 1. Passes requireActiveInvestor
// 2. isInvestorVerified === true (or super_admin)
// ---------------------------------------------------------------------------
function requireVerifiedInvestor(req, res, next) {
  if (req.user?.role === 'super_admin') {
    return next();
  }

  if (!req.investorUser || !req.investorUser.isInvestorVerified) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to accredited, admin-verified investors.',
      verificationRequired: true,
    });
  }

  next();
}

// ===========================================================================
// 1. INVESTOR PROFILE ENDPOINTS
// ===========================================================================

// GET /api/investors/profile
// Get authenticated investor's profile and verification status
router.get('/profile', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const user = req.investorUser;
    return res.status(200).json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        isInvestorVerified: Boolean(user.isInvestorVerified),
        investorVerifiedAt: user.investorVerifiedAt,
        details: user.profile || {},
      },
    });
  } catch (err) {
    console.error('[INVESTOR API] Profile fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch investor profile.' });
  }
});

// PUT /api/investors/profile
// Update authenticated investor's profile criteria/thesis
router.put('/profile', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const { details } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Sanitize updates - cannot self-verify
    if (details && typeof details === 'object') {
      user.profile = {
        ...user.profile,
        firmName: details.firmName || user.profile?.firmName || '',
        firmType: details.firmType || user.profile?.firmType || 'angel',
        investmentThesis: details.investmentThesis || user.profile?.investmentThesis || '',
        ticketSizeMin: details.ticketSizeMin || user.profile?.ticketSizeMin || 0,
        ticketSizeMax: details.ticketSizeMax || user.profile?.ticketSizeMax || 0,
        preferredSectors: Array.isArray(details.preferredSectors) ? details.preferredSectors : (user.profile?.preferredSectors || []),
        preferredStages: Array.isArray(details.preferredStages) ? details.preferredStages : (user.profile?.preferredStages || []),
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Investor profile updated successfully.',
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        isInvestorVerified: Boolean(user.isInvestorVerified),
        details: user.profile,
      },
    });
  } catch (err) {
    console.error('[INVESTOR API] Profile update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update investor profile.' });
  }
});

// ===========================================================================
// 2. APPROVED STARTUP DIRECTORY ENDPOINTS (SANITIZED)
// ===========================================================================

// GET /api/investors/startups
// Searchable, filterable list of approved, active startups
// Unverified investors see sanitized overview.
router.get('/startups', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const { sector, stage, search } = req.query;
    const filter = { isApproved: true, status: 'active' };

    if (sector && sector !== 'all') {
      filter.sector = sector;
    }
    if (stage && stage !== 'all') {
      filter.stage = stage;
    }
    if (search) {
      const searchRegex = new RegExp(search.toString().trim(), 'i');
      filter.$or = [{ name: searchRegex }, { tagline: searchRegex }, { sector: searchRegex }];
    }

    const isVerified = req.user.role === 'super_admin' || Boolean(req.investorUser.isInvestorVerified);

    // Select ONLY safe, non-confidential fields
    let projection = 'name tagline problem solution sector stage status readinessScore tags createdAt';
    if (isVerified) {
      projection += ' tractionSummary pitchDeckUrl pitchVideoUrl';
    }

    const startups = await StartupProfile.find(filter)
      .select(projection)
      .sort({ readinessScore: -1, createdAt: -1 })
      .lean();

    // Check which ones are in this investor's watchlist
    const watchlistEntries = await InvestorWatchlist.find({ investorId: req.user.id })
      .select('startupId interestLevel')
      .lean();
    const watchlistMap = new Map();
    watchlistEntries.forEach((w) => watchlistMap.set(w.startupId.toString(), w.interestLevel));

    const sanitizedStartups = startups.map((s) => ({
      id: s._id,
      name: s.name,
      tagline: s.tagline,
      problem: s.problem,
      solution: s.solution,
      sector: s.sector,
      stage: s.stage,
      status: s.status,
      readinessScore: s.readinessScore,
      tags: s.tags || [],
      isSaved: watchlistMap.has(s._id.toString()),
      interestLevel: watchlistMap.get(s._id.toString()) || null,
      // Restricted to verified investors:
      pitchDeckAvailable: isVerified ? Boolean(s.pitchDeckUrl) : false,
      pitchVideoAvailable: isVerified ? Boolean(s.pitchVideoUrl) : false,
      pitchDeckUrl: isVerified ? (s.pitchDeckUrl || null) : null,
      pitchVideoUrl: isVerified ? (s.pitchVideoUrl || null) : null,
      tractionSummary: isVerified ? s.tractionSummary : null,
    }));

    return res.status(200).json({
      success: true,
      isVerified,
      startups: sanitizedStartups,
    });
  } catch (err) {
    console.error('[INVESTOR API] Startups list error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch startups directory.' });
  }
});

// GET /api/investors/startups/:id
// Sanitized detail profile of an approved startup
router.get('/startups/:id', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const isVerified = req.user.role === 'super_admin' || Boolean(req.investorUser.isInvestorVerified);

    const startup = await StartupProfile.findOne({
      _id: req.params.id,
      isApproved: true,
      status: 'active',
    }).lean();

    if (!startup) {
      return res.status(404).json({ success: false, message: 'Approved startup not found.' });
    }

    // Check watchlist status
    const watchItem = await InvestorWatchlist.findOne({
      investorId: req.user.id,
      startupId: startup._id,
    }).lean();

    const result = {
      id: startup._id,
      name: startup.name,
      tagline: startup.tagline,
      problem: startup.problem,
      solution: startup.solution,
      sector: startup.sector,
      stage: startup.stage,
      readinessScore: startup.readinessScore,
      tags: startup.tags || [],
      isSaved: Boolean(watchItem),
      interestLevel: watchItem?.interestLevel || null,
      notes: watchItem?.notes || null,
      // Restricted fields
      restrictedAccess: !isVerified,
      pitchDeckUrl: isVerified ? startup.pitchDeckUrl : null,
      pitchVideoUrl: isVerified ? startup.pitchVideoUrl : null,
      tractionSummary: isVerified ? startup.tractionSummary : null,
    };

    return res.status(200).json({ success: true, startup: result });
  } catch (err) {
    console.error('[INVESTOR API] Startup detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch startup profile.' });
  }
});

// ===========================================================================
// 3. WATCHLIST ENDPOINTS
// ===========================================================================

// GET /api/investors/watchlist
// List the authenticated investor's saved startups
router.get('/watchlist', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const items = await InvestorWatchlist.find({ investorId: req.user.id })
      .populate({
        path: 'startupId',
        match: { isApproved: true, status: 'active' },
        select: 'name tagline sector stage readinessScore tags tractionSummary pitchDeckUrl pitchVideoUrl',
      })
      .sort({ updatedAt: -1 })
      .lean();

    const isVerified = req.user.role === 'super_admin' || Boolean(req.investorUser.isInvestorVerified);

    // Filter out any startup that was unapproved or removed
    const validItems = items
      .filter((item) => item.startupId != null)
      .map((item) => ({
        id: item._id,
        startupId: item.startupId._id,
        startupName: item.startupId.name,
        tagline: item.startupId.tagline,
        sector: item.startupId.sector,
        stage: item.startupId.stage,
        readinessScore: item.startupId.readinessScore,
        tags: item.startupId.tags || [],
        interestLevel: item.interestLevel,
        notes: item.notes,
        savedAt: item.createdAt,
        pitchDeckUrl: isVerified ? item.startupId.pitchDeckUrl : null,
        pitchVideoUrl: isVerified ? item.startupId.pitchVideoUrl : null,
      }));

    return res.status(200).json({
      success: true,
      watchlist: validItems,
    });
  } catch (err) {
    console.error('[INVESTOR API] Watchlist fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch watchlist.' });
  }
});

// POST /api/investors/watchlist
// Save or update startup in authenticated investor's watchlist
router.post(
  '/watchlist',
  authenticate,
  requireActiveInvestor,
  [
    body('startupId').isMongoId().withMessage('Valid startupId is required'),
    body('interestLevel').optional().isIn(['watching', 'high_interest', 'passed']).withMessage('Invalid interest level'),
    body('notes').optional().isString().isLength({ max: 3000 }).withMessage('Notes cannot exceed 3000 characters'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    try {
      const { startupId, interestLevel, notes } = req.body;

      // Ensure target startup is approved and active
      const startup = await StartupProfile.findOne({ _id: startupId, isApproved: true, status: 'active' });
      if (!startup) {
        return res.status(404).json({ success: false, message: 'Approved startup not found.' });
      }

      // Upsert into authenticated investor's watchlist
      const watchItem = await InvestorWatchlist.findOneAndUpdate(
        { investorId: req.user.id, startupId },
        {
          $set: {
            interestLevel: interestLevel || 'watching',
            notes: notes !== undefined ? notes : '',
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Startup saved to watchlist.',
        watchItem: {
          id: watchItem._id,
          startupId: watchItem.startupId,
          interestLevel: watchItem.interestLevel,
          notes: watchItem.notes,
        },
      });
    } catch (err) {
      console.error('[INVESTOR API] Watchlist save error:', err);
      return res.status(500).json({ success: false, message: 'Failed to save to watchlist.' });
    }
  }
);

// DELETE /api/investors/watchlist/:startupId
// Remove startup from authenticated investor's watchlist
router.delete('/watchlist/:startupId', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const deleted = await InvestorWatchlist.findOneAndDelete({
      investorId: req.user.id,
      startupId: req.params.startupId,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item not found in watchlist.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Startup removed from watchlist.',
    });
  } catch (err) {
    console.error('[INVESTOR API] Watchlist delete error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove from watchlist.' });
  }
});

// ===========================================================================
// 4. INTRODUCTIONS & MEETING REQUESTS (VERIFIED INVESTORS ONLY)
// ===========================================================================

// POST /api/investors/introductions
// Create EOI or Meeting Request (must be verified investor, defaults to pending_admin_review)
router.post(
  '/introductions',
  authenticate,
  requireActiveInvestor,
  requireVerifiedInvestor,
  [
    body('startupId').isMongoId().withMessage('Valid startupId is required'),
    body('type')
      .isIn(['expression_of_interest', 'meeting_request'])
      .withMessage('Type must be expression_of_interest or meeting_request'),
    body('message').trim().isLength({ min: 20, max: 2000 }).withMessage('Message must be between 20 and 2000 characters'),
    body('proposedTimes').optional().isArray().withMessage('Proposed times must be an array'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    try {
      const { startupId, type, message, proposedTimes } = req.body;

      // Verify startup exists, is approved and active
      const startup = await StartupProfile.findOne({ _id: startupId, isApproved: true, status: 'active' });
      if (!startup) {
        return res.status(404).json({ success: false, message: 'Approved startup not found.' });
      }

      // Check for existing pending request from this investor
      const existing = await InvestorIntroduction.findOne({
        investorId: req.user.id,
        startupId,
        status: { $in: ['pending_admin_review', 'forwarded_to_founder'] },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'You already have an active introduction request for this startup.',
        });
      }

      const intro = await InvestorIntroduction.create({
        investorId: req.user.id,
        startupId,
        founderId: startup.founderId,
        type,
        message,
        proposedTimes: proposedTimes || [],
        status: 'pending_admin_review', // Strict business rule: enters pending_admin_review
      });

      await enqueueEvent({
        eventType: 'investor.introduction_requested',
        aggregateType: 'investor_introduction',
        aggregateId: String(intro._id),
        projectId: String(startupId),
        actorId: req.user.id,
        idempotencyKey: `investor-introduction-requested:${intro._id}`,
        payload: { type, status: intro.status, startupId: String(startupId) },
      });

      await logAuditTrail({
        userId: req.user.id,
        email: req.investorUser.email,
        role: req.user.role,
        action: `INVESTOR_SUBMIT_${type.toUpperCase()}`,
        resource: `/api/investors/introductions/${intro._id}`,
        workspace: 'investor',
        details: { startupId, startupName: startup.name, type },
        req,
      });

      return res.status(201).json({
        success: true,
        message: 'Introduction request submitted for admin review.',
        introduction: {
          id: intro._id,
          startupId: intro.startupId,
          type: intro.type,
          status: intro.status,
          createdAt: intro.createdAt,
        },
      });
    } catch (err) {
      console.error('[INVESTOR API] Introduction submission error:', err);
      return res.status(500).json({ success: false, message: 'Failed to submit introduction request.' });
    }
  }
);

// GET /api/investors/introductions
// List the authenticated investor's own introduction requests
router.get('/introductions', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const intros = await InvestorIntroduction.find({ investorId: req.user.id })
      .populate('startupId', 'name sector stage pitchDeckUrl')
      .populate('founderId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = intros.map((item) => ({
      id: item._id,
      startupId: item.startupId?._id || item.startupId,
      startupName: item.startupId?.name || 'Startup',
      sector: item.startupId?.sector,
      stage: item.startupId?.stage,
      type: item.type,
      message: item.message,
      proposedTimes: item.proposedTimes,
      status: item.status,
      adminNotes: item.status === 'declined' ? item.adminNotes : null,
      founderName: item.founderId?.name || 'Student Founder',
      founderEmail: item.founderId?.email || null,
      scheduledMeeting: item.scheduledMeeting || null,
      createdAt: item.createdAt,
    }));

    return res.status(200).json({
      success: true,
      introductions: formatted,
    });
  } catch (err) {
    console.error('[INVESTOR API] Introductions list error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch introductions.' });
  }
});

// ===========================================================================
// 5. ADMIN INTRODUCTION OVERSIGHT & DECISION
// ===========================================================================

// GET /api/investors/admin/introductions
// Admin lists all investor introduction requests
router.get('/admin/introductions', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const intros = await InvestorIntroduction.find(filter)
      .populate('investorId', 'name email profile isInvestorVerified')
      .populate('startupId', 'name sector stage pitchDeckUrl')
      .populate('founderId', 'name email')
      .populate('founderId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      introductions: intros,
    });
  } catch (err) {
    console.error('[ADMIN INVESTOR API] Fetch introductions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch introductions.' });
  }
});

// POST /api/investors/admin/introductions/:id/decide
// Admin forwards request to founder or declines it
router.post(
  '/admin/introductions/:id/decide',
  authenticate,
  requireRole('admin'),
  [
    body('decision').isIn(['forward', 'decline']).withMessage('Decision must be forward or decline'),
    body('adminNotes').optional().isString().withMessage('Admin notes must be a string'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    try {
      const { decision, adminNotes } = req.body;
      const intro = await InvestorIntroduction.findById(req.params.id);

      if (!intro) {
        return res.status(404).json({ success: false, message: 'Introduction request not found.' });
      }

      if (intro.status !== 'pending_admin_review') {
        return res.status(400).json({
          success: false,
          message: `Cannot decide an introduction that is already in status '${intro.status}'.`,
        });
      }

      if (decision === 'forward') {
        intro.status = 'forwarded_to_founder';
      } else {
        intro.status = 'declined';
      }

      intro.adminNotes = adminNotes || null;
      intro.reviewedBy = req.user.id;
      intro.reviewedAt = new Date();
      await intro.save();

      await enqueueEvent({
        eventType: decision === 'forward' ? 'investor.introduction_approved' : 'investor.introduction_declined',
        aggregateType: 'investor_introduction',
        aggregateId: String(intro._id),
        projectId: String(intro.startupId),
        actorId: req.user.id,
        idempotencyKey: `investor-introduction-decision:${intro._id}:${decision}`,
        payload: { decision, status: intro.status },
      });

      await logAuditTrail({
        userId: req.user.id,
        email: req.user.email || 'admin@system',
        role: req.user.role,
        action: `ADMIN_${decision.toUpperCase()}_INVESTOR_INTRO`,
        resource: `/api/investors/admin/introductions/${intro._id}`,
        workspace: 'admin',
        details: { introId: intro._id, decision, adminNotes },
        req,
      });

      return res.status(200).json({
        success: true,
        message: `Introduction request successfully ${decision === 'forward' ? 'forwarded to founder' : 'declined'}.`,
        introduction: intro,
      });
    } catch (err) {
      console.error('[ADMIN INVESTOR API] Decide error:', err);
      return res.status(500).json({ success: false, message: 'Failed to process decision.' });
    }
  }
);

// ===========================================================================
// 6. AI AGENT MEETING SCHEDULING & FOUNDER RESPONSE WORKFLOW
// ===========================================================================

// POST /api/investors/schedule-meet
// An investor asks to meet a founder. Investor introductions need a human decision (Tier 3), so this records a
// request for the administrators. Nothing is booked, no link is invented and no email is claimed.
router.post(
  '/schedule-meet',
  authenticate,
  requireActiveInvestor,
  requireVerifiedInvestor,
  [
    body('startupId').isMongoId().withMessage('Valid startupId is required'),
    body('preferredDate').optional().isString().trim(),
    body('preferredTimeSlot').optional().isString().trim(),
    body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    try {
      const { startupId, preferredDate, preferredTimeSlot, message } = req.body;

      const startup = await StartupProfile.findOne({ _id: startupId, isApproved: true, status: 'active' }).populate('founderId', 'name');
      if (!startup) {
        return res.status(404).json({ success: false, message: 'Approved startup not found.' });
      }
      const founder = startup.founderId;
      if (!founder) {
        return res.status(404).json({ success: false, message: 'Startup founder account not found.' });
      }

      const proposed = preferredDate ? [{ date: preferredDate, time: preferredTimeSlot || '', timeZone: 'IST' }] : [];
      let intro = await InvestorIntroduction.findOne({
        investorId: req.user.id,
        startupId,
        status: { $in: ['pending_admin_review', 'forwarded_to_founder', 'scheduled', 'approved'] },
      });
      const alreadyOpen = Boolean(intro);
      if (!intro) {
        intro = new InvestorIntroduction({
          investorId: req.user.id,
          startupId,
          founderId: founder._id,
          type: 'meeting_request',
          message,
          proposedTimes: proposed,
          status: 'pending_admin_review',
        });
        await intro.save();
        await enqueueEvent({
          eventType: 'investor.introduction_requested',
          aggregateType: 'investor_introduction',
          aggregateId: String(intro._id),
          projectId: String(intro.startupId),
          actorId: req.user.id,
          idempotencyKey: `investor-meeting-request:${intro._id}`,
          payload: { type: 'meeting_request', startupName: startup.name },
        });
        await logAuditTrail({
          userId: req.user.id,
          email: req.investorUser.email,
          role: req.user.role,
          action: 'INVESTOR_REQUEST_MEETING',
          resource: '/api/investors/schedule-meet',
          workspace: 'investor',
          details: { introId: intro._id, startupId, startupName: startup.name },
          req,
        });
      }

      return res.status(alreadyOpen ? 200 : 201).json({
        success: true,
        message: alreadyOpen
          ? 'You already have an open request for this startup.'
          : 'Your meeting request was sent to the incubation administrators for approval. The founder is contacted only after they approve it.',
        meeting: {
          id: intro._id,
          startupId: startup._id,
          startupName: startup.name,
          founderName: founder.name,
          date: preferredDate || null,
          time: preferredTimeSlot || null,
          timeZone: 'IST',
          status: intro.status === 'pending_admin_review' ? 'pending_approval' : intro.status,
        },
      });
    } catch (err) {
      console.error('[INVESTOR API] Meeting request error:', err);
      return res.status(500).json({ success: false, message: 'Failed to submit the meeting request.' });
    }
  }
);

// GET /api/investors/founder/introductions
// Founder (student/faculty) retrieves all investor meetings and introduction requests for their startups
router.get('/founder/introductions', authenticate, async (req, res) => {
  try {
    const intros = await InvestorIntroduction.find({ founderId: req.user.id })
      .populate('investorId', 'name email profile isInvestorVerified')
      .populate('startupId', 'name sector stage tagline')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      introductions: intros,
    });
  } catch (err) {
    console.error('[FOUNDER INVESTOR API] Fetch introductions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch founder introductions.' });
  }
});

// ===========================================================================
// 7. INVESTOR PORTFOLIO & TRACTION TELEMETRY ENDPOINTS
// ===========================================================================

// GET /api/investors/portfolio
// List authenticated investor's portfolio companies and aggregate statistics
router.get('/portfolio', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const portfolio = await InvestorPortfolio.find({ investorId: req.user.id })
      .populate('startupId', 'name tagline sector stage readinessScore pitchDeckUrl tractionSummary problem solution')
      .sort({ createdAt: -1 })
      .lean();

    const totalInvested = portfolio.reduce((sum, item) => sum + (item.investmentAmount || 0), 0);
    const totalValuation = portfolio.reduce((sum, item) => sum + (item.currentValuation || 0), 0);
    const avgEquity = portfolio.length > 0
      ? Number((portfolio.reduce((sum, item) => sum + (item.equityPercentage || 0), 0) / portfolio.length).toFixed(1))
      : 0;
    const activeVentures = portfolio.filter((item) => item.status === 'active' || item.status === 'term_sheet_signed').length;

    return res.status(200).json({
      success: true,
      portfolio,
      stats: {
        totalInvested,
        totalValuation,
        avgEquity,
        activeVentures,
        totalHoldings: portfolio.length,
      },
    });
  } catch (err) {
    console.error('[INVESTOR API] Portfolio fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch investor portfolio.' });
  }
});

// POST /api/investors/portfolio
// Add or update an investment holding in authenticated investor's portfolio
router.post(
  '/portfolio',
  authenticate,
  requireActiveInvestor,
  requireVerifiedInvestor,
  [
    body('startupId').isMongoId().withMessage('Valid startupId is required'),
    body('round').optional().isString().trim(),
    body('investmentAmount').isFloat({ min: 1000 }).withMessage('Investment amount must be at least 1000'),
    body('equityPercentage').isFloat({ min: 0.1, max: 100 }).withMessage('Equity percentage must be between 0.1% and 100%'),
    body('currentValuation').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['active', 'term_sheet_signed', 'exit_profitable', 'written_off']),
    body('governanceNotes').optional().isString().isLength({ max: 3000 }),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    try {
      const {
        startupId,
        round = 'Seed',
        investmentAmount,
        equityPercentage,
        currentValuation,
        status = 'active',
        governanceNotes = '',
      } = req.body;

      const startup = await StartupProfile.findById(startupId);
      if (!startup) {
        return res.status(404).json({ success: false, message: 'Startup profile not found.' });
      }

      // Default valuation if not provided: calculate based on equity percentage
      const computedValuation = currentValuation && Number(currentValuation) > 0
        ? Number(currentValuation)
        : Math.round((investmentAmount / (equityPercentage / 100)));

      // Generate default sample monthly metrics if creating new
      const defaultMetrics = [
        {
          month: '2026-08',
          mrr: Math.round(investmentAmount * 0.04),
          activeUsers: 140,
          burnRate: Math.round(investmentAmount * 0.05),
          runwayMonths: 18,
          keyMilestone: 'Lab prototype & bench testing validation complete.',
          trlLevel: 6,
        },
        {
          month: '2026-09',
          mrr: Math.round(investmentAmount * 0.06),
          activeUsers: 280,
          burnRate: Math.round(investmentAmount * 0.048),
          runwayMonths: 17,
          keyMilestone: 'Pilot deployment with 3 academic and corporate partners.',
          trlLevel: 7,
        },
        {
          month: '2026-10',
          mrr: Math.round(investmentAmount * 0.085),
          activeUsers: 450,
          burnRate: Math.round(investmentAmount * 0.045),
          runwayMonths: 16,
          keyMilestone: 'Pre-commercial beta testing and patent claim filed.',
          trlLevel: 7,
        },
      ];

      const item = await InvestorPortfolio.findOneAndUpdate(
        { investorId: req.user.id, startupId },
        {
          $set: {
            startupName: startup.name,
            sector: startup.sector,
            stage: startup.stage,
            round,
            investmentAmount: Number(investmentAmount),
            equityPercentage: Number(equityPercentage),
            currentValuation: computedValuation,
            status,
            governanceNotes,
          },
          $setOnInsert: {
            investmentDate: new Date(),
            monthlyMetrics: defaultMetrics,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      await logAuditTrail({
        userId: req.user.id,
        email: req.investorUser.email,
        role: req.user.role,
        action: 'INVESTOR_RECORD_PORTFOLIO_HOLDING',
        resource: `/api/investors/portfolio/${item._id}`,
        workspace: 'investor',
        details: { startupId, startupName: startup.name, round, investmentAmount, equityPercentage },
        req,
      });

      return res.status(200).json({
        success: true,
        message: 'Portfolio holding saved successfully.',
        holding: item,
      });
    } catch (err) {
      console.error('[INVESTOR API] Portfolio record error:', err);
      return res.status(500).json({ success: false, message: 'Failed to record portfolio investment.' });
    }
  }
);

// DELETE /api/investors/portfolio/:id
// Remove portfolio holding
router.delete('/portfolio/:id', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const deleted = await InvestorPortfolio.findOneAndDelete({
      _id: req.params.id,
      investorId: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Portfolio holding not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Portfolio holding successfully removed.',
    });
  } catch (err) {
    console.error('[INVESTOR API] Portfolio delete error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove portfolio holding.' });
  }
});

// GET /api/investors/traction
// Aggregate operational & financial telemetry across portfolio and DBIT incubation benchmark
router.get('/traction', authenticate, requireActiveInvestor, async (req, res) => {
  try {
    const portfolio = await InvestorPortfolio.find({ investorId: req.user.id })
      .populate('startupId', 'name sector stage readinessScore')
      .lean();

    // Months timeline
    const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

    // If investor has portfolio companies, aggregate their telemetry
    let aggregateMrrTrend = months.map((m) => ({ month: m, totalMrr: 0, activeUsers: 0, averageBurn: 0 }));
    let ventureTelemetry = [];

    if (portfolio.length > 0) {
      ventureTelemetry = portfolio.map((p) => ({
        id: p._id,
        startupId: p.startupId?._id || p.startupId,
        startupName: p.startupName,
        sector: p.sector,
        stage: p.stage,
        round: p.round,
        investmentAmount: p.investmentAmount,
        equityPercentage: p.equityPercentage,
        currentValuation: p.currentValuation,
        status: p.status,
        monthlyMetrics: p.monthlyMetrics || [],
        latestMetrics: p.monthlyMetrics && p.monthlyMetrics.length > 0
          ? p.monthlyMetrics[p.monthlyMetrics.length - 1]
          : { mrr: 0, activeUsers: 0, burnRate: 0, runwayMonths: 12, trlLevel: 6, keyMilestone: 'Early validation' },
      }));

      // Compute aggregate MRR
      aggregateMrrTrend = months.map((m) => {
        let totalMrr = 0;
        let totalUsers = 0;
        let totalBurn = 0;
        let count = 0;
        portfolio.forEach((p) => {
          const match = (p.monthlyMetrics || []).find((met) => met.month === m);
          if (match) {
            totalMrr += match.mrr || 0;
            totalUsers += match.activeUsers || 0;
            totalBurn += match.burnRate || 0;
            count++;
          }
        });
        return {
          month: m,
          totalMrr,
          activeUsers: totalUsers,
          averageBurn: count > 0 ? Math.round(totalBurn / count) : 0,
        };
      });
    }

    // Cohort benchmark from all approved startups
    const allApproved = await StartupProfile.find({ isApproved: true, status: 'active' })
      .select('name sector stage readinessScore createdAt')
      .lean();

    const sectorDistribution = {};
    allApproved.forEach((s) => {
      sectorDistribution[s.sector] = (sectorDistribution[s.sector] || 0) + 1;
    });

    const avgReadiness = allApproved.length > 0
      ? Math.round(allApproved.reduce((acc, s) => acc + (s.readinessScore || 0), 0) / allApproved.length)
      : 0;

    return res.status(200).json({
      success: true,
      hasPortfolio: portfolio.length > 0,
      portfolioCount: portfolio.length,
      aggregateMrrTrend,
      ventureTelemetry,
      cohortBenchmark: {
        totalApproved: allApproved.length,
        averageReadinessScore: avgReadiness,
        sectorDistribution,
      },
    });
  } catch (err) {
    console.error('[INVESTOR API] Traction fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch traction telemetry.' });
  }
});

module.exports = router;

