/**
 * Shared test harness: in-memory models, a fake agent service (Python), captured events, and helpers to
 * create people and advance time. Production code runs unchanged; only storage and the network are replaced.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.INTERNAL_JWT_SECRET = process.env.INTERNAL_JWT_SECRET || 'test-internal-secret';
for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_PASS', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'AGENT_DEMO_MODE']) delete process.env[key];

const jwt = require('jsonwebtoken');
const { install } = require('./memoryDb');

const models = {
  User: require('../../models/User'),
  FacultyProject: require('../../models/FacultyProject'),
  FacultyTask: require('../../models/FacultyTask'),
  FacultyMeeting: require('../../models/FacultyMeeting'),
  StartupProfile: require('../../models/StartupProfile'),
  MentorAllocation: require('../../models/MentorAllocation'),
  MentorMatchingRun: require('../../models/MentorMatchingRun'),
  MentorRequest: require('../../models/MentorRequest'),
  AgentJob: require('../../models/AgentJob'),
  ActionLog: require('../../models/ActionLog'),
  Approval: require('../../models/Approval'),
  AgentNotification: require('../../models/AgentNotification'),
  OutboxMessage: require('../../models/OutboxMessage'),
  AgentDocument: require('../../models/AgentDocument'),
  AgentRuntime: require('../../models/AgentRuntime'),
  CalendarConnection: require('../../models/CalendarConnection'),
  InvestorIntroduction: require('../../models/InvestorIntroduction'),
  DomainEvent: require('../../models/DomainEvent'),
  AuthTicket: require('../../models/AuthTicket'),
  AuditLog: require('../../models/AuditLog'),
};

const mem = install(Object.values(models), { readOnly: ['ActionLog'] });
const py = require('../pythonClient');
const orchestrator = require('../../services/eventOrchestrator');

// ---------------------------------------------------------------------------
// Captured events (what agents publish)
// ---------------------------------------------------------------------------
const published = [];
orchestrator.enqueueEvent = async (event) => {
  published.push(event);
  return { ...event, eventId: `evt-${published.length}` };
};

// ---------------------------------------------------------------------------
// Fake Python agent service
// ---------------------------------------------------------------------------
const service = { applications: new Map(), calls: [], assessmentAvailable: true, down: false };

function decodeActor(headers) {
  const token = String(headers.Authorization || '').replace(/^Bearer\s+/i, '');
  return jwt.verify(token, process.env.INTERNAL_JWT_SECRET, { audience: 'fastapi-internal', issuer: 'next-server' });
}

py.setFetch(async (url, init = {}) => {
  if (service.down) throw new Error('connect ECONNREFUSED');
  const actor = decodeActor(init.headers || {});
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const body = init.body ? JSON.parse(init.body) : null;
  service.calls.push({ path, method: init.method || 'GET', body, actor });
  const json = (status, data) => ({ ok: status < 400, status, json: async () => data });
  let m;
  if ((m = path.match(/^\/api\/applications\/queue(\?.*)?$/))) {
    return json(200, { queue: [...service.applications.values()].filter((a) => ['SUBMITTED', 'UNDER_REVIEW'].includes(a.status)).map((a) => ({ id: a.id, startupName: a.startup.name, status: a.status, applicantId: a.applicantId })) });
  }
  if ((m = path.match(/^\/api\/applications\/([^/]+)\/assessment$/))) {
    if (!service.assessmentAvailable) return json(503, { detail: 'Application Agent assessment is unavailable' });
    return json(200, { assessment: { recommendation_summary: 'Strong problem statement; validate pricing.', questions_for_reviewers: ['Who will pay first?'], preliminary_assessment: { overall_readiness_score: 72, strengths: ['Clear user'], weaknesses: ['No pricing'] } } });
  }
  if ((m = path.match(/^\/api\/applications\/([^/]+)\/decide$/))) {
    const app = service.applications.get(m[1]);
    if (!app) return json(404, { detail: 'Application not found' });
    app.status = body.decision.toUpperCase();
    app.reviewerComments = body.comments;
    return json(200, { success: true, status: body.decision });
  }
  if ((m = path.match(/^\/api\/applications\/([^/]+)\/milestones$/))) {
    const app = service.applications.get(m[1]);
    return json(200, { milestones: app?.milestones || [] });
  }
  if ((m = path.match(/^\/api\/applications\/([^/]+)$/))) {
    const app = service.applications.get(m[1]);
    if (!app) return json(404, { detail: 'Application not found' });
    return json(200, app);
  }
  return json(404, { detail: 'not found' });
});

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------
let seq = 0;
function person(role, name, extra = {}) {
  seq += 1;
  return mem.seed(models.User, { name, email: `${name.toLowerCase().replace(/[^a-z]/g, '.')}${seq}@example.edu`, passwordHash: 'x', role, status: 'active', emailVerified: true, ...extra });
}

const completeForm = (over = {}) => ({
  name: 'AgriSense', shortDescription: 'Soil moisture sensing for small farms', problem: 'Small farmers over-water crops because they cannot measure soil moisture cheaply.',
  solution: 'A low-cost sensor and an app that tells farmers when to irrigate each plot.', domain: 'AgriTech', maturity: 'PROTOTYPE', affectedUsers: 'Smallholder farmers in Maharashtra',
  currentSolutions: 'Manual checks and fixed watering schedules', differentiation: 'Costs a tenth of existing sensors', technologies: ['IoT', 'React'], githubUrl: 'https://github.com/example/agrisense', demoUrl: '',
  teamMembers: [{ name: 'Asha', rollNumber: '1', email: 'a@x.edu' }, { name: 'Ravi', rollNumber: '2', email: 'r@x.edu' }], attachments: [], declarationAccepted: true, ...over,
});

function application(applicantId, form = completeForm(), id = `app-${++seq}`, status = 'SUBMITTED') {
  const app = { id, status, applicantId: String(applicantId), startup: { name: form.name, sector: form.domain, stage: 'prototype', tagline: form.shortDescription, problem: form.problem, solution: form.solution }, formData: form, milestones: [] };
  service.applications.set(id, app);
  return app;
}

function resetAll() {
  mem.clear();
  published.length = 0;
  service.applications.clear();
  service.calls.length = 0;
  service.assessmentAvailable = true;
  service.down = false;
}

const hours = (n) => n * 60 * 60 * 1000;
const days = (n) => n * 24 * 60 * 60 * 1000;

module.exports = { models, mem, published, service, person, application, completeForm, resetAll, hours, days, py };
