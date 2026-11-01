const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-student-jwt-secret';

const StartupProfile = require('../models/StartupProfile');
const MentorAllocation = require('../models/MentorAllocation');
const FacultyProject = require('../models/FacultyProject');
const User = require('../models/User');
const studentRouter = require('./student');

const OWNER = '650000000000000000000004';
const STRANGER = '650000000000000000000005';
const APP_ID = 'app-1111-2222';

// Chainable query stub: .select().sort().lean() all resolve to `result` (or reject).
function query(result, fail) {
  const chain = {
    select: () => chain,
    sort: () => chain,
    lean: () => (fail ? Promise.reject(new Error('db down')) : Promise.resolve(result)),
  };
  return chain;
}

// In-memory "database" the stubs read from.
let db;
function resetDb(overrides = {}) {
  db = {
    profiles: [{ applicationId: APP_ID, founderId: OWNER }],
    allocations: [],
    project: null,
    mentorUser: null,
    failProfile: false,
    queries: [],
    ...overrides,
  };
}
StartupProfile.findOne = (q) => {
  db.queries.push(q);
  const hit = db.profiles.find((p) => p.applicationId === q.applicationId && String(p.founderId) === String(q.founderId));
  return query(hit ? { _id: 'p1' } : null, db.failProfile);
};
MentorAllocation.findOne = (q) => query(db.allocations.find((a) => a.projectId === q.projectId) || null);
FacultyProject.findOne = () => query(db.project);
User.findOne = () => query(db.mentorUser);

function tokenFor(sub, role) {
  return jwt.sign({ sub, role }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

let server;
let base;
test.before(async () => {
  const app = express();
  app.use(cookieParser());
  app.use('/api/student', studentRouter);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

async function get(path, token) {
  const res = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, body: await res.json() };
}
const url = (id = APP_ID) => `/api/student/mentor-allocation/${id}`;

function allocation(extra) {
  return {
    projectId: APP_ID,
    status: 'requested',
    requestedExpertise: ['Edge AI'],
    recommendedMentorName: null,
    recommendedMentorOrg: null,
    allocatedMentorName: null,
    // Internal fields that must never reach the student:
    justification: 'INTERNAL justification',
    coordinatorComment: 'INTERNAL coordinator note',
    recommendedByVolunteerName: 'Internal Volunteer',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...extra,
  };
}

test('authentication: no token, bad token, and non-student roles are rejected (no dev fallback)', async () => {
  resetDb();
  assert.strictEqual((await get(url())).status, 401);
  assert.strictEqual((await get(url(), 'garbage')).status, 401);
  for (const role of ['faculty', 'mentor', 'investor', 'admin', 'super_admin']) {
    assert.strictEqual((await get(url(), tokenFor(OWNER, role))).status, 403, role);
  }
  const expired = jwt.sign({ sub: OWNER, role: 'student' }, process.env.JWT_SECRET, { expiresIn: -10 });
  assert.strictEqual((await get(url(), expired)).status, 401);
});

test('ownership: only the founder on the StartupProfile can read; others get an indistinguishable 404', async () => {
  resetDb({ allocations: [allocation({ status: 'approved', allocatedMentorName: 'Dr. K. R. Raman' })] });
  const stranger = await get(url(), tokenFor(STRANGER, 'student'));
  assert.strictEqual(stranger.status, 404);
  const missing = await get(url('no-such-app'), tokenFor(OWNER, 'student'));
  assert.strictEqual(missing.status, 404);
  assert.deepStrictEqual(stranger.body, missing.body, 'a foreign application must look the same as a missing one');
  assert.strictEqual((await get(url('bad id!'), tokenFor(OWNER, 'student'))).status, 404);
  // The ownership lookup is always scoped by the caller's own id.
  assert.ok(db.queries.every((q) => q.founderId === OWNER || q.founderId === STRANGER));
});

test('no mentor request yet: 200 with allocation null (distinct from "not yours")', async () => {
  resetDb();
  const res = await get(url(), tokenFor(OWNER, 'student'));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.allocation, null);
});

test('pending states (requested, under_review): no mentor, nothing confirmed', async () => {
  for (const status of ['requested', 'under_review']) {
    resetDb({ allocations: [allocation({ status })] });
    const { body } = await get(url(), tokenFor(OWNER, 'student'));
    assert.strictEqual(body.data.allocation.status, status);
    assert.strictEqual(body.data.allocation.mentor, null);
    assert.strictEqual(body.data.allocation.recommendation, null);
  }
});

test('recommended: shown as a recommendation, never as a confirmed mentor', async () => {
  resetDb({ allocations: [allocation({ status: 'recommended', recommendedMentorName: 'Prof. Rajiv Menon', recommendedMentorOrg: 'DBIT' })] });
  const { body } = await get(url(), tokenFor(OWNER, 'student'));
  assert.deepStrictEqual(body.data.allocation.recommendation, { name: 'Prof. Rajiv Menon', organization: 'DBIT' });
  assert.strictEqual(body.data.allocation.mentor, null);
});

test('approved/allocated: confirmed mentor from persisted data; recommendation no longer shown', async () => {
  for (const status of ['approved', 'allocated']) {
    resetDb({ allocations: [allocation({ status, allocatedMentorName: 'Dr. K. R. Raman', recommendedMentorName: 'Someone Else' })] });
    const { body } = await get(url(), tokenFor(OWNER, 'student'));
    assert.strictEqual(body.data.allocation.mentor.name, 'Dr. K. R. Raman');
    assert.strictEqual(body.data.allocation.recommendation, null);
  }
});

test('approved without a recorded mentor name: confirmed status but no invented name', async () => {
  resetDb({ allocations: [allocation({ status: 'approved' })] });
  const { body } = await get(url(), tokenFor(OWNER, 'student'));
  assert.strictEqual(body.data.allocation.status, 'approved');
  assert.strictEqual(body.data.allocation.mentor.name, null);
});

test('falls back to the project record for the mentor name when the allocation lacks it', async () => {
  resetDb({ allocations: [allocation({ status: 'approved' })], project: { allocatedMentorName: 'Prof. Ananya Sen' } });
  const { body } = await get(url(), tokenFor(OWNER, 'student'));
  assert.strictEqual(body.data.allocation.mentor.name, 'Prof. Ananya Sen');
});

test('rejected: unsuccessful, no mentor, no recommendation', async () => {
  resetDb({ allocations: [allocation({ status: 'rejected', recommendedMentorName: 'X', allocatedMentorName: 'Y' })] });
  const { body } = await get(url(), tokenFor(OWNER, 'student'));
  assert.strictEqual(body.data.allocation.status, 'rejected');
  assert.strictEqual(body.data.allocation.mentor, null);
  assert.strictEqual(body.data.allocation.recommendation, null);
});

test('mentor contact comes only from an active mentor account, whitelisted fields, confirmed only', async () => {
  resetDb({
    allocations: [allocation({ status: 'approved', allocatedMentorName: 'Dr. K. R. Raman' })],
    mentorUser: { name: 'Dr. K. R. Raman', email: 'raman@dbit.ac.in', passwordHash: 'SECRET', profile: { expertise: 'Edge AI, Vision', organization: 'DBIT', bio: 'Hi', twoFactorSecret: 'SECRET' } },
  });
  const { body } = await get(url(), tokenFor(OWNER, 'student'));
  assert.deepStrictEqual(body.data.allocation.mentor.contact, {
    email: 'raman@dbit.ac.in', organization: 'DBIT', bio: 'Hi', expertise: ['Edge AI', 'Vision'],
  });

  // A pending allocation never exposes anyone's contact details.
  resetDb({ allocations: [allocation({ status: 'recommended', recommendedMentorName: 'Dr. K. R. Raman' })], mentorUser: { email: 'raman@dbit.ac.in', profile: {} } });
  const pending = await get(url(), tokenFor(OWNER, 'student'));
  assert.ok(!JSON.stringify(pending.body).includes('raman@dbit.ac.in'));
});

test('internal coordinator/volunteer fields are never returned', async () => {
  resetDb({ allocations: [allocation({ status: 'approved', allocatedMentorName: 'Dr. K. R. Raman' })] });
  const text = JSON.stringify((await get(url(), tokenFor(OWNER, 'student'))).body);
  for (const secret of ['INTERNAL', 'coordinatorComment', 'justification', 'recommendedByVolunteerName', 'passwordHash']) {
    assert.ok(!text.includes(secret), `leaked ${secret}`);
  }
});

test('database failure is a generic 500, distinct from "no record"', async () => {
  resetDb({ failProfile: true });
  const res = await get(url(), tokenFor(OWNER, 'student'));
  assert.strictEqual(res.status, 500);
  assert.ok(!JSON.stringify(res.body).includes('db down'));
});
