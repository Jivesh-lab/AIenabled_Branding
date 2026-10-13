const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Test JWT secret
process.env.JWT_SECRET = 'test-admin-jwt-secret';

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Mock AuditLog to prevent database buffering
AuditLog.create = async () => ({ _id: 'mock_audit_id' });

const adminRouter = require('./admin');

// Helper to simulate express request through router
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

function runRoute(req, method, url) {
  return new Promise((resolve) => {
    let settled = false;
    let res;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve(res);
      }
    };
    res = createMockRes(finish);
    adminRouter.handle({ ...req, method, url }, res, () => finish());
    setTimeout(finish, 60);
  });
}

test('Admin User Management & Security Tests', async (t) => {
  const adminId = '650000000000000000000099';
  const superAdminId = '650000000000000000000098';
  const superAdmin2Id = '650000000000000000000097';
  const studentId = '650000000000000000000001';
  const pendingUserId = '650000000000000000000002';
  const investorId = '650000000000000000000003';

  const mockUsers = new Map([
    [
      adminId,
      {
        _id: adminId,
        name: 'Platform Admin',
        email: 'admin@platform.gov',
        role: 'admin',
        status: 'active',
        isSoftDeleted: false,
      },
    ],
    [
      superAdminId,
      {
        _id: superAdminId,
        name: 'Super Admin 1',
        email: 'super1@platform.gov',
        role: 'super_admin',
        status: 'active',
        isSoftDeleted: false,
      },
    ],
    [
      superAdmin2Id,
      {
        _id: superAdmin2Id,
        name: 'Super Admin 2',
        email: 'super2@platform.gov',
        role: 'super_admin',
        status: 'active',
        isSoftDeleted: false,
      },
    ],
    [
      studentId,
      {
        _id: studentId,
        name: 'Aarav Student',
        email: 'aarav@student.edu',
        role: 'student',
        status: 'active',
        isSoftDeleted: false,
      },
    ],
    [
      pendingUserId,
      {
        _id: pendingUserId,
        name: 'Pending Applicant',
        email: 'pending@applicant.edu',
        role: 'student',
        status: 'pending',
        isSoftDeleted: false,
      },
    ],
    [
      investorId,
      {
        _id: investorId,
        name: 'Angel Investor',
        email: 'angel@invest.com',
        role: 'investor',
        status: 'active',
        isInvestorVerified: false,
        isSoftDeleted: false,
      },
    ],
  ]);

  // Patch User model
  User.findById = (id) => {
    const raw = mockUsers.get(id ? id.toString() : '');
    if (!raw) return null;
    return {
      ...raw,
      select: function () {
        return this;
      },
      lean: async function () {
        return { ...raw };
      },
      save: async function () {
        mockUsers.set(this._id.toString(), { ...this });
        return this;
      },
    };
  };

  User.find = (filter) => ({
    select: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => {
              return Array.from(mockUsers.values()).filter((u) => {
                if (filter.isSoftDeleted?.$ne && u.isSoftDeleted) return false;
                if (filter.role && u.role !== filter.role) return false;
                if (filter.status && u.status !== filter.status) return false;
                return true;
              });
            },
          }),
        }),
      }),
    }),
  });

  User.countDocuments = async (filter) => {
    return Array.from(mockUsers.values()).filter((u) => {
      if (filter.isSoftDeleted?.$ne && u.isSoftDeleted) return false;
      if (filter.role && u.role !== filter.role) return false;
      if (filter.status && u.status !== filter.status) return false;
      return true;
    }).length;
  };

  const adminToken = jwt.sign({ sub: adminId, role: 'admin' }, process.env.JWT_SECRET);
  const studentToken = jwt.sign({ sub: studentId, role: 'student' }, process.env.JWT_SECRET);
  const superAdminToken = jwt.sign({ sub: superAdminId, role: 'super_admin' }, process.env.JWT_SECRET);

  await t.test('1. Role Guard: Student is rejected from admin user listing (403)', async () => {
    const req = {
      cookies: { aai_token: studentToken },
      headers: {},
      query: {},
    };
    const res = await runRoute(req, 'GET', '/users');
    assert.strictEqual(res.statusCode, 403);
  });

  await t.test('2. User Listing: Admin can fetch paginated users', async () => {
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      query: { page: '1', limit: '10' },
    };
    const res = await runRoute(req, 'GET', '/users');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.users));
    assert.ok(res.body.users.length >= 4);
  });

  await t.test('3. User Detail: Admin can fetch individual user details without credentials leak', async () => {
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: studentId },
    };
    const res = await runRoute(req, 'GET', `/users/${studentId}`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.name, 'Aarav Student');
    assert.strictEqual(res.body.user.passwordHash, undefined);
  });

  await t.test('4. Self-Modification Prevention: Admin cannot change their own role or status', async () => {
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: adminId },
      body: { role: 'super_admin' },
    };
    const res = await runRoute(req, 'PUT', `/users/${adminId}`);
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /Admins cannot modify their own role/i);
  });

  await t.test('5. Privilege Escalation Prevention: Ordinary admin cannot promote anyone to super_admin', async () => {
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: studentId },
      body: { role: 'super_admin' },
    };
    const res = await runRoute(req, 'PUT', `/users/${studentId}`);
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /Only Super Admins can assign the Super Admin role/i);
  });

  await t.test('6. Self-Deletion Prevention: Admin cannot delete their own account', async () => {
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: adminId },
      query: {},
    };
    const res = await runRoute(req, 'DELETE', `/users/${adminId}`);
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /Admins cannot delete their own account/i);
  });

  await t.test('7. Super Admin Protection: Ordinary admin cannot modify or delete super_admin accounts', async () => {
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: superAdminId },
      body: { name: 'Compromised Name' },
    };
    const res = await runRoute(req, 'PUT', `/users/${superAdminId}`);
    assert.strictEqual(res.statusCode, 403);
  });

  await t.test('8. Status Transition & Approval: Admin can approve a pending applicant', async () => {
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: pendingUserId },
      body: { decision: 'approve' },
    };
    const res = await runRoute(req, 'POST', `/approvals/${pendingUserId}/decide`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.user.status, 'active');
  });

  await t.test('9. Investor Verification Separation: Verifying investor requires active status and investor role', async () => {
    const req = {
      cookies: { aai_token: adminToken },
      headers: {},
      params: { id: investorId },
      body: { decision: 'verify_investor' },
    };
    const res = await runRoute(req, 'POST', `/approvals/${investorId}/decide`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.user.isInvestorVerified, true);
  });

  await t.test('10. Last Active Super Admin Protection: Cannot demote or deactivate the last super_admin (400)', async () => {
    // When only 1 active super_admin exists in database:
    User.countDocuments = async (filter) => {
      if (filter.role === 'super_admin' && filter.status === 'active') return 1;
      return 1;
    };

    const req = {
      cookies: { aai_token: superAdminToken },
      headers: {},
      params: { id: superAdmin2Id },
      body: { status: 'inactive' },
    };
    const res = await runRoute(req, 'PUT', `/users/${superAdmin2Id}`);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /Cannot demote or deactivate the last remaining Super Admin/i);
  });
});
