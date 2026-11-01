const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.INTERNAL_JWT_SECRET = 'node_test_internal_secret';
process.env.JWT_SECRET = 'node_test_user_secret';

const TeamMembership = require('../models/TeamMembership');
const teamRouter = require('./team');

// Fake store: only ACCEPTED rows are returned, mirroring the real query's status filter.
const rows = [
  { userId: 'mate', projectId: 'p1', applicationId: 'p1', status: 'ACCEPTED' },
  { userId: 'pending', projectId: 'p1', applicationId: 'p1', status: 'PENDING' },
  { userId: 'revoked', projectId: 'p1', applicationId: 'p1', status: 'REVOKED' },
];
TeamMembership.findOne = (q) => ({
  lean: async () => rows.find((r) => r.userId === q.userId && r.status === q.status
    && q.$or.some((c) => (c.projectId && c.projectId === r.projectId) || (c.applicationId && c.applicationId === r.applicationId))) || null,
});

const serviceToken = (over = {}, secret = process.env.INTERNAL_JWT_SECRET) =>
  jwt.sign({ sub: 'agent-service', iss: 'agent-service', aud: 'node-internal', ...over }, secret, { expiresIn: 60 });

async function get(path, token) {
  const app = express();
  app.use('/api/team', teamRouter);
  const server = http.createServer(app).listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/team${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

test('accepted member is reported as a member', async () => {
  const r = await get('/internal/access?projectId=p1&userId=mate', serviceToken());
  assert.equal(r.status, 200);
  assert.equal(r.body.data.member, true);
});

test('pending, revoked, unknown users and other projects are not members', async () => {
  for (const q of ['userId=pending&projectId=p1', 'userId=revoked&projectId=p1', 'userId=ghost&projectId=p1', 'userId=mate&projectId=p2']) {
    const r = await get(`/internal/access?${q}`, serviceToken());
    assert.equal(r.status, 200);
    assert.equal(r.body.data.member, false, q);
  }
});

test('requests without a valid service token are rejected', async () => {
  const q = '/internal/access?projectId=p1&userId=mate';
  assert.equal((await get(q)).status, 401);
  assert.equal((await get(q, serviceToken({}, 'wrong secret'))).status, 401);
  assert.equal((await get(q, serviceToken({ aud: 'something-else' }))).status, 401);
  // A normal user token (signed with the user JWT secret) must not work here.
  assert.equal((await get(q, jwt.sign({ sub: 'mate', role: 'student' }, process.env.JWT_SECRET))).status, 401);
});

test('missing parameters are rejected', async () => {
  assert.equal((await get('/internal/access?projectId=p1', serviceToken())).status, 400);
});
