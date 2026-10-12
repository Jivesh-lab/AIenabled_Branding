const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.JWT_SECRET = 'test-investor-jwt-secret';

const User = require('../models/User');
const StartupProfile = require('../models/StartupProfile');
const InvestorWatchlist = require('../models/InvestorWatchlist');
const InvestorIntroduction = require('../models/InvestorIntroduction');
const AuditLog = require('../models/AuditLog');

// Mock AuditLog to avoid DB connection buffering
AuditLog.create = async () => ({ _id: 'audit_mock' });

const investorsRouter = require('./investors');
const adminRouter = require('./admin');

// Helper to simulate express request through a route handler
function createMockRes(done) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      if (done) done();
      return this;
    },
  };
  return res;
}

test('Investor Workflow Unit & Integration Tests', async (t) => {
  // Test User Accounts
  const activeVerifiedInvestorId = '650000000000000000000001';
  const activeUnverifiedInvestorId = '650000000000000000000002';
  const pendingInvestorId = '650000000000000000000003';
  const rejectedInvestorId = '650000000000000000000013';
  const inactiveInvestorId = '650000000000000000000014';
  const studentUserId = '650000000000000000000004';
  const founderUserId = '650000000000000000000005';
  const adminUserId = '650000000000000000000099';

  const approvedStartupId = '660000000000000000000001';
  const unapprovedStartupId = '660000000000000000000002';

  // In-memory mock database storage
  const mockUsers = new Map([
    [
      activeVerifiedInvestorId,
      {
        _id: activeVerifiedInvestorId,
        name: 'Verified Investor',
        email: 'verified@fund.com',
        role: 'investor',
        status: 'active',
        isInvestorVerified: true,
        profile: { firmName: 'Alpha Ventures', firmType: 'vc' },
      },
    ],
    [
      activeUnverifiedInvestorId,
      {
        _id: activeUnverifiedInvestorId,
        name: 'Unverified Investor',
        email: 'unverified@fund.com',
        role: 'investor',
        status: 'active',
        isInvestorVerified: false,
        profile: {},
      },
    ],
    [
      pendingInvestorId,
      {
        _id: pendingInvestorId,
        name: 'Pending Investor',
        email: 'pending@fund.com',
        role: 'investor',
        status: 'pending',
        isInvestorVerified: false,
        profile: {},
      },
    ],
    [
      rejectedInvestorId,
      {
        _id: rejectedInvestorId,
        name: 'Rejected Investor',
        email: 'rejected@fund.com',
        role: 'investor',
        status: 'rejected',
        isInvestorVerified: false,
        profile: {},
      },
    ],
    [
      inactiveInvestorId,
      {
        _id: inactiveInvestorId,
        name: 'Inactive Investor',
        email: 'inactive@fund.com',
        role: 'investor',
        status: 'inactive',
        isInvestorVerified: false,
        profile: {},
      },
    ],
    [
      studentUserId,
      {
        _id: studentUserId,
        name: 'Student User',
        email: 'student@college.edu',
        role: 'student',
        status: 'active',
      },
    ],
    [
      adminUserId,
      {
        _id: adminUserId,
        name: 'Platform Admin',
        email: 'admin@platform.gov',
        role: 'admin',
        status: 'active',
      },
    ],
  ]);

  const mockStartups = new Map([
    [
      approvedStartupId,
      {
        _id: approvedStartupId,
        founderId: founderUserId,
        name: 'GreenAgri AI',
        tagline: 'Autonomous crop monitoring',
        problem: 'Crop yield losses',
        solution: 'Multispectral drones',
        sector: 'AgriTech',
        stage: 'prototype',
        status: 'active',
        isApproved: true,
        pitchDeckUrl: 'https://cdn.example.com/confidential-deck.pdf',
        pitchVideoUrl: 'https://vimeo.com/greenagri',
        tractionSummary: '₹12L ARR in Maharashtra',
        readinessScore: 88,
        tags: ['AgriTech', 'Drones'],
      },
    ],
    [
      unapprovedStartupId,
      {
        _id: unapprovedStartupId,
        founderId: founderUserId,
        name: 'Secret Stealth AI',
        tagline: 'Unapproved draft startup',
        problem: 'Secret problem',
        solution: 'Secret solution',
        sector: 'DeepTech',
        stage: 'idea',
        status: 'active',
        isApproved: false, // NOT approved
        pitchDeckUrl: 'https://cdn.example.com/draft-deck.pdf',
      },
    ],
  ]);

  let mockWatchlist = [];
  let mockIntroductions = [];

  // Monkey patch Mongoose models for robust, hermetic testing
  User.findById = (id) => {
    const raw = mockUsers.get(id ? id.toString() : '');
    if (!raw) return null;
    return {
      ...raw,
      lean: async () => ({ ...raw }),
      save: async function () {
        mockUsers.set(this._id.toString(), { ...this });
        return this;
      },
    };
  };

  StartupProfile.find = (filter) => ({
    select: () => ({
      sort: () => ({
        lean: async () => {
          return Array.from(mockStartups.values()).filter((s) => {
            if (filter.isApproved !== undefined && s.isApproved !== filter.isApproved) return false;
            if (filter.status !== undefined && s.status !== filter.status) return false;
            return true;
          });
        },
      }),
    }),
  });

  StartupProfile.findOne = (filter) => ({
    lean: async () => {
      const match = Array.from(mockStartups.values()).find((s) => {
        if (filter._id && s._id.toString() !== filter._id.toString()) return false;
        if (filter.isApproved !== undefined && s.isApproved !== filter.isApproved) return false;
        if (filter.status !== undefined && s.status !== filter.status) return false;
        return true;
      });
      return match || null;
    },
  });

  InvestorWatchlist.find = (filter) => ({
    select: () => ({
      lean: async () => mockWatchlist.filter((w) => w.investorId.toString() === filter.investorId.toString()),
    }),
    populate: () => ({
      sort: () => ({
        lean: async () => {
          return mockWatchlist
            .filter((w) => w.investorId.toString() === filter.investorId.toString())
            .map((w) => ({
              ...w,
              startupId: mockStartups.get(w.startupId.toString()) || null,
            }));
        },
      }),
    }),
  });

  InvestorWatchlist.findOne = async (filter) => {
    return (
      mockWatchlist.find(
        (w) =>
          w.investorId.toString() === filter.investorId.toString() &&
          w.startupId.toString() === filter.startupId.toString()
      ) || null
    );
  };

  InvestorWatchlist.findOneAndUpdate = async (filter, update) => {
    let item = mockWatchlist.find(
      (w) =>
        w.investorId.toString() === filter.investorId.toString() &&
        w.startupId.toString() === filter.startupId.toString()
    );
    if (!item) {
      item = {
        _id: `watch_${Date.now()}_${Math.random()}`,
        investorId: filter.investorId,
        startupId: filter.startupId,
        ...update.$set,
      };
      mockWatchlist.push(item);
    } else {
      Object.assign(item, update.$set);
    }
    return item;
  };

  InvestorWatchlist.findOneAndDelete = async (filter) => {
    const idx = mockWatchlist.findIndex(
      (w) =>
        w.investorId.toString() === filter.investorId.toString() &&
        w.startupId.toString() === filter.startupId.toString()
    );
    if (idx >= 0) {
      const removed = mockWatchlist[idx];
      mockWatchlist.splice(idx, 1);
      return removed;
    }
    return null;
  };

  StartupProfile.findOneAndUpdate = async (filter, update, options) => {
    let existing = null;
    if (filter.applicationId) {
      existing = Array.from(mockStartups.values()).find(
        (s) => s.applicationId && s.applicationId.toString() === filter.applicationId.toString()
      );
    }
    if (!existing && options && options.upsert) {
      const newId = `startup_sync_${Date.now()}`;
      const newDoc = {
        _id: newId,
        ...update.$set,
      };
      mockStartups.set(newId, newDoc);
      return newDoc;
    }
    if (existing) {
      Object.assign(existing, update.$set);
      return existing;
    }
    return null;
  };

  InvestorIntroduction.findOne = async (filter) => {
    return (
      mockIntroductions.find(
        (i) =>
          i.investorId.toString() === filter.investorId.toString() &&
          i.startupId.toString() === filter.startupId.toString() &&
          (filter.status?.$in ? filter.status.$in.includes(i.status) : i.status === filter.status)
      ) || null
    );
  };

  InvestorIntroduction.findById = async (id) => {
    const item = mockIntroductions.find((i) => i._id.toString() === (id ? id.toString() : ''));
    if (!item) return null;
    return {
      ...item,
      save: async function () {
        const idx = mockIntroductions.findIndex((i) => i._id.toString() === item._id.toString());
        if (idx !== -1) {
          mockIntroductions[idx] = { ...this };
        }
        return this;
      },
    };
  };

  InvestorIntroduction.create = async (doc) => {
    const item = {
      _id: `intro_${Date.now()}_${Math.random()}`,
      ...doc,
      createdAt: new Date(),
    };
    mockIntroductions.push(item);
    return item;
  };

  InvestorIntroduction.find = (filter) => {
    const chain = {
      populate: () => chain,
      sort: () => chain,
      lean: async () => {
        return mockIntroductions
          .filter((i) => {
            if (filter.status && filter.status !== 'all' && i.status !== filter.status) return false;
            if (filter.investorId && i.investorId.toString() !== filter.investorId.toString()) return false;
            return true;
          })
          .map((i) => ({
            ...i,
            investorId: mockUsers.get(i.investorId?.toString()) || null,
            startupId: mockStartups.get(i.startupId?.toString()) || null,
          }));
      },
    };
    return chain;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASES
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('1. Role Authorization: Student role is rejected from investor endpoints (403)', async () => {
    const studentToken = jwt.sign({ sub: studentUserId, role: 'student' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: studentToken },
      headers: {},
      query: {},
    };
    const res = createMockRes();

    // Call the startups directory route handler via the router
    let handled = false;
    await new Promise((resolve) => {
      investorsRouter.handle(
        { ...req, method: 'GET', url: '/startups' },
        res,
        () => { handled = true; resolve(); }
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /restricted to investors/i);
  });

  await t.test('2. Account Status Gate: Pending investor cannot access directory (403)', async () => {
    const pendingToken = jwt.sign({ sub: pendingInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: pendingToken },
      headers: {},
      query: {},
    };
    const res = createMockRes();

    await new Promise((resolve) => {
      investorsRouter.handle(
        { ...req, method: 'GET', url: '/startups' },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /pending review or inactive/i);
  });

  await t.test('3. Approved-startup visibility & sanitization: Unapproved startups are never returned', async () => {
    const verifiedToken = jwt.sign({ sub: activeVerifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: verifiedToken },
      headers: {},
      query: {},
    };
    const res = createMockRes();

    await new Promise((resolve) => {
      investorsRouter.handle(
        { ...req, method: 'GET', url: '/startups' },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    // GreenAgri AI should be present
    assert.strictEqual(res.body.startups.some((s) => s.id === approvedStartupId), true);
    // Secret Stealth AI (unapproved) MUST NOT be present
    assert.strictEqual(res.body.startups.some((s) => s.id === unapprovedStartupId), false);
  });

  await t.test('4. Unverified investor directory sanitization: pitch materials are hidden', async () => {
    const unverifiedToken = jwt.sign({ sub: activeUnverifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: unverifiedToken },
      headers: {},
      query: {},
    };
    const res = createMockRes();

    await new Promise((resolve) => {
      investorsRouter.handle(
        { ...req, method: 'GET', url: '/startups' },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.isVerified, false);
    const greenAgri = res.body.startups.find((s) => s.id === approvedStartupId);
    assert.ok(greenAgri);
    // Crucial rule: pitchDeckAvailable is false and tractionSummary is null for unverified investors
    assert.strictEqual(greenAgri.pitchDeckAvailable, false);
    assert.strictEqual(greenAgri.tractionSummary, null);
  });

  await t.test('5. Watchlist ownership: Investor A cannot see Investor B’s saved items', async () => {
    // Add item to Investor A's watchlist
    mockWatchlist = [
      {
        _id: 'watch_1',
        investorId: activeVerifiedInvestorId,
        startupId: approvedStartupId,
        interestLevel: 'high_interest',
        notes: 'Secret diligence note by Investor A',
      },
    ];

    // Investor B (unverified investor) queries their watchlist
    const investorBToken = jwt.sign({ sub: activeUnverifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: investorBToken },
      headers: {},
      query: {},
    };
    const res = createMockRes();

    await new Promise((resolve) => {
      investorsRouter.handle(
        { ...req, method: 'GET', url: '/watchlist' },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.watchlist.length, 0); // Investor B has 0 items
  });

  await t.test('6. Verification gate: Unverified investor CANNOT create an introduction/meeting request (403)', async () => {
    const unverifiedToken = jwt.sign({ sub: activeUnverifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: unverifiedToken },
      headers: {},
      body: {
        startupId: approvedStartupId,
        type: 'meeting_request',
        message: 'We would love to meet with the team next week.',
      },
    };
    const res = createMockRes();

    await new Promise((resolve) => {
      investorsRouter.handle(
        { ...req, method: 'POST', url: '/introductions' },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.verificationRequired, true);
    assert.match(res.body.message, /restricted to accredited, admin-verified/i);
  });

  await t.test('7. Introduction Review Gating: Verified investor introduction enters pending_admin_review status', async () => {
    mockIntroductions = []; // Reset
    const verifiedToken = jwt.sign({ sub: activeVerifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: verifiedToken },
      headers: {},
      body: {
        startupId: approvedStartupId,
        type: 'meeting_request',
        message: 'We would love to discuss a pre-seed ticket for your team.',
      },
    };
    await new Promise((resolve) => {
      const res = createMockRes(resolve);
      investorsRouter.handle(
        { ...req, method: 'POST', url: '/introductions' },
        res,
        () => resolve()
      );
    });

    assert.strictEqual(mockIntroductions.length, 1);
    assert.strictEqual(mockIntroductions[0].status, 'pending_admin_review');
  });

  await t.test('8. Admin Introduction Oversight: Admin forwards introduction to founder', async () => {
    // Setup introduction in pending state
    const introId = 'intro_review_test_1';
    mockIntroductions = [
      {
        _id: introId,
        investorId: activeVerifiedInvestorId,
        startupId: approvedStartupId,
        founderId: founderUserId,
        type: 'meeting_request',
        message: 'Interested in leading pre-seed.',
        status: 'pending_admin_review',
        createdAt: new Date(),
      },
    ];

    const adminToken = jwt.sign({ sub: adminUserId, role: 'admin' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: introId },
      body: {
        decision: 'forward',
        adminNotes: 'Investor verified and relevant domain expertise.',
      },
    };
    const res = createMockRes();

    await new Promise((resolve) => {
      investorsRouter.handle(
        { ...req, method: 'POST', url: `/admin/introductions/${introId}/decide` },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.introduction.status, 'forwarded_to_founder');
  });

  await t.test('9. Admin Introduction State Guard: Cannot decide an already processed introduction (400)', async () => {
    const introId = 'intro_already_decided';
    mockIntroductions = [
      {
        _id: introId,
        investorId: activeVerifiedInvestorId,
        startupId: approvedStartupId,
        founderId: founderUserId,
        type: 'meeting_request',
        message: 'Interested.',
        status: 'forwarded_to_founder', // ALREADY FORWARDED
        createdAt: new Date(),
      },
    ];

    const adminToken = jwt.sign({ sub: adminUserId, role: 'admin' }, process.env.JWT_SECRET);
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: introId },
      body: { decision: 'decline' },
    };
    const res = createMockRes();

    await new Promise((resolve) => {
      investorsRouter.handle(
        { ...req, method: 'POST', url: `/admin/introductions/${introId}/decide` },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /already in status 'forwarded_to_founder'/i);
  });

  await t.test('10. Task 1 Sync Idempotency: Application approval syncs StartupProfile without duplicates', async () => {
    const applicationId = 'app_sync_test_99';
    const syncPayload = {
      applicantId: founderUserId,
      isApproved: true,
      startup: {
        id: 'pg_startup_101',
        name: 'EcoLogix Carbon',
        tagline: 'IoT soil carbon capture verification',
        problem: 'Voluntary carbon market fraud',
        solution: 'Direct soil IoT sensors',
        sector: 'ClimateTech',
        stage: 'Seed',
        readinessScore: 92,
        tractionSummary: '5 pilot farms onboarded',
      },
    };

    const adminToken = jwt.sign({ sub: adminUserId, role: 'admin' }, process.env.JWT_SECRET);

    // Initial sync
    const res1 = createMockRes();
    await new Promise((resolve) => {
      adminRouter.handle(
        {
          method: 'POST',
          url: `/applications/${applicationId}/sync-startup`,
          cookies: { aai_token: adminToken },
          headers: {},
          params: { id: applicationId },
          body: syncPayload,
        },
        res1,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body.success, true);
    assert.strictEqual(res1.body.profile.name, 'EcoLogix Carbon');

    // Repeated sync with updated readinessScore
    const res2 = createMockRes();
    await new Promise((resolve) => {
      adminRouter.handle(
        {
          method: 'POST',
          url: `/applications/${applicationId}/sync-startup`,
          cookies: { aai_token: adminToken },
          headers: {},
          params: { id: applicationId },
          body: {
            ...syncPayload,
            startup: {
              ...syncPayload.startup,
              readinessScore: 95, // updated
            },
          },
        },
        res2,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.success, true);

    // Verify only 1 profile exists for this applicationId in mockStartups
    const matchingProfiles = Array.from(mockStartups.values()).filter(
      (s) => s.applicationId === applicationId
    );
    assert.strictEqual(matchingProfiles.length, 1);
    assert.strictEqual(matchingProfiles[0].readinessScore, 95);
  });

  await t.test('11. Task 5 Approval vs Verification: Account approval does not verify investor; verification requires active status', async () => {
    const adminToken = jwt.sign({ sub: adminUserId, role: 'admin' }, process.env.JWT_SECRET);

    // 1. Ordinary account approval
    const resApprove = createMockRes();
    await new Promise((resolve) => {
      adminRouter.handle(
        {
          method: 'POST',
          url: `/approvals/${pendingInvestorId}/decide`,
          cookies: { aai_token: adminToken },
          headers: {},
          params: { id: pendingInvestorId },
          body: { decision: 'approve' },
        },
        resApprove,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(resApprove.statusCode, 200);
    const updatedUser = mockUsers.get(pendingInvestorId);
    assert.strictEqual(updatedUser.status, 'active');
    // Ordinary approval MUST NOT automatically verify investor accreditation
    assert.strictEqual(updatedUser.isInvestorVerified, false);

    // 2. verify_investor on a student account must fail (400)
    const resVerifyStudent = createMockRes();
    await new Promise((resolve) => {
      adminRouter.handle(
        {
          method: 'POST',
          url: `/approvals/${studentUserId}/decide`,
          cookies: { aai_token: adminToken },
          headers: {},
          params: { id: studentUserId },
          body: { decision: 'verify_investor' },
        },
        resVerifyStudent,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });
    assert.strictEqual(resVerifyStudent.statusCode, 400);
    assert.match(resVerifyStudent.body.message, /only investor accounts/i);

    // 3. verify_investor on active investor succeeds
    const resVerifyInvestor = createMockRes();
    await new Promise((resolve) => {
      adminRouter.handle(
        {
          method: 'POST',
          url: `/approvals/${pendingInvestorId}/decide`,
          cookies: { aai_token: adminToken },
          headers: {},
          params: { id: pendingInvestorId },
          body: { decision: 'verify_investor' },
        },
        resVerifyInvestor,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });
    assert.strictEqual(resVerifyInvestor.statusCode, 200);
    assert.strictEqual(mockUsers.get(pendingInvestorId).isInvestorVerified, true);
  });

  await t.test('12. Account Status Matrix: Rejected and Inactive accounts are blocked with 403', async () => {
    // 1. Rejected account
    const rejectedToken = jwt.sign({ sub: rejectedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const resRejected = createMockRes();
    await new Promise((resolve) => {
      investorsRouter.handle(
        { method: 'GET', url: '/startups', cookies: { aai_token: rejectedToken }, headers: {}, query: {} },
        resRejected,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });
    assert.strictEqual(resRejected.statusCode, 403);
    assert.strictEqual(resRejected.body.success, false);
    assert.match(resRejected.body.message, /pending review or inactive/i);

    // 2. Inactive account
    const inactiveToken = jwt.sign({ sub: inactiveInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const resInactive = createMockRes();
    await new Promise((resolve) => {
      investorsRouter.handle(
        { method: 'GET', url: '/startups', cookies: { aai_token: inactiveToken }, headers: {}, query: {} },
        resInactive,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });
    assert.strictEqual(resInactive.statusCode, 403);
    assert.strictEqual(resInactive.body.success, false);
    assert.match(resInactive.body.message, /pending review or inactive/i);
  });

  await t.test('13. Client Identity Tampering: Client-supplied IDs and roles in body/headers are ignored', async () => {
    // Verified Investor A calls PUT /profile supplying someone else's ID or trying to promote role
    const tokenA = jwt.sign({ sub: activeVerifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const res = createMockRes();
    await new Promise((resolve) => {
      investorsRouter.handle(
        {
          method: 'PUT',
          url: '/profile',
          cookies: { aai_token: tokenA },
          headers: {},
          body: {
            id: '650000000000000000000999', // Attacker attempts to hijack another user
            role: 'admin',                  // Attacker attempts role elevation
            isInvestorVerified: true,       // Attacker attempts verification spoof
            details: {
              firmName: 'Updated Sovereign Fund',
            },
          },
        },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 200);
    const userA = mockUsers.get(activeVerifiedInvestorId);
    // Identity must remain intact from token
    assert.strictEqual(userA.role, 'investor');
    assert.strictEqual(userA.profile.firmName, 'Updated Sovereign Fund');
  });

  await t.test('14. Watchlist Isolation: Investor A cannot delete or modify Investor B watchlist items', async () => {
    // Setup Watchlist item belonging strictly to Investor B (activeUnverifiedInvestorId)
    mockWatchlist = [
      {
        _id: 'watch_user_b_item',
        investorId: activeUnverifiedInvestorId,
        startupId: approvedStartupId,
        interestLevel: 'high_interest',
        notes: 'Confidential thesis from investor B',
      },
    ];

    // Investor A attempts to DELETE Investor B's saved item by passing startupId
    const tokenA = jwt.sign({ sub: activeVerifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const res = createMockRes();
    await new Promise((resolve) => {
      investorsRouter.handle(
        {
          method: 'DELETE',
          url: `/watchlist/${approvedStartupId}`,
          cookies: { aai_token: tokenA },
          headers: {},
          params: { startupId: approvedStartupId },
        },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    // Must return 404 because Investor A does not own this item
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(mockWatchlist.length, 1);
    assert.strictEqual(mockWatchlist[0].investorId, activeUnverifiedInvestorId);
  });

  await t.test('15. Introduction Non-Admin Guard: Non-admin role cannot access admin introduction queue (403)', async () => {
    const investorToken = jwt.sign({ sub: activeVerifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const res = createMockRes();
    await new Promise((resolve) => {
      investorsRouter.handle(
        {
          method: 'GET',
          url: '/admin/introductions',
          cookies: { aai_token: investorToken },
          headers: {},
          query: {},
        },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /access denied/i);
  });

  await t.test('16. Introduction Duplicate Guard: Cannot submit duplicate introduction while one is active', async () => {
    // Put an existing request in pending_admin_review
    mockIntroductions = [
      {
        _id: 'intro_existing_1',
        investorId: activeVerifiedInvestorId,
        startupId: approvedStartupId,
        founderId: founderUserId,
        type: 'expression_of_interest',
        message: 'First active expression of interest',
        status: 'pending_admin_review',
        createdAt: new Date(),
      },
    ];

    const verifiedToken = jwt.sign({ sub: activeVerifiedInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    const res = createMockRes();
    await new Promise((resolve) => {
      investorsRouter.handle(
        {
          method: 'POST',
          url: '/introductions',
          cookies: { aai_token: verifiedToken },
          headers: {},
          body: {
            startupId: approvedStartupId,
            type: 'meeting_request',
            message: 'Trying to submit a duplicate meeting request while previous is pending',
          },
        },
        res,
        () => resolve()
      );
      setTimeout(resolve, 50);
    });

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /already have an active introduction request/i);
  });
});


