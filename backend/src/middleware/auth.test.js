const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Mock User model to prevent mongoose connection errors in unit test
const mockUser = {
  findOne: async () => null,
};
require.cache[require.resolve('../models/User')] = {
  exports: mockUser
};

const { authenticate } = require('./auth');

test('Auth Middleware', async (t) => {
  // Mock JWT secret for tests
  process.env.JWT_SECRET = 'test-secret';

  await t.test('Missing token returns 401', async () => {
    const req = { cookies: {}, headers: {} };
    let statusCode, jsonData;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonData = data; }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await authenticate(req, res, next);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonData.success, false);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(req.user, undefined);
  });

  await t.test('Invalid or expired token returns 401', async () => {
    const req = { cookies: { aai_token: 'invalid.token.here' }, headers: {} };
    let statusCode, jsonData;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonData = data; }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await authenticate(req, res, next);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonData.success, false);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(req.user, undefined);
  });

  await t.test('A valid token authenticates the correct user', async () => {
    const token = jwt.sign({ sub: 'user123', role: 'student' }, process.env.JWT_SECRET);
    const req = { cookies: {}, headers: { authorization: `Bearer ${token}` } };
    let statusCode, jsonData;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonData = data; }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await authenticate(req, res, next);
    assert.strictEqual(nextCalled, true);
    assert.deepStrictEqual(req.user, { id: 'user123', role: 'student' });
  });

  await t.test('An unauthenticated request cannot become an administrator', async () => {
    const req = { cookies: {}, headers: {} };
    let statusCode, jsonData;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonData = data; }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await authenticate(req, res, next);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(req.user, undefined); // Ensure user is not set to admin
  });
});
