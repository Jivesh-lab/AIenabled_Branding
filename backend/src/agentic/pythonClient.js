const jwt = require('jsonwebtoken');

/**
 * Server-to-server client for the Python agent service (applications, assessments, scoring).
 * Every call is made as a named actor so the service records WHO acted: an agent is
 * `agent:<name>` and a human decision carries the human's own id and role.
 */
let fetchImpl = (...args) => fetch(...args);
function setFetch(fn) {
  fetchImpl = fn;
}

const BASE = () => process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000';

const AGENT_PERMISSIONS = ['review_applications', 'view_applications'];

function agentActor(name) {
  return { id: `agent:${name}`, role: 'admin', permissions: AGENT_PERMISSIONS };
}

function humanActor(user) {
  return { id: String(user.id), role: user.role, permissions: [...AGENT_PERMISSIONS, 'submit_application'] };
}

class AgentServiceError extends Error {
  constructor(message, status, code = 'AGENT_SERVICE_ERROR') {
    super(message);
    this.name = 'AgentServiceError';
    this.status = status;
    this.code = code;
  }
}

async function call(path, { method = 'GET', body, actor, timeoutMs = 20000 } = {}) {
  const secret = process.env.INTERNAL_JWT_SECRET;
  if (!secret) throw new AgentServiceError('INTERNAL_JWT_SECRET is not configured, so the agent service cannot be reached.', 503, 'NOT_CONFIGURED');
  const token = jwt.sign({ sub: actor.id, role: actor.role, permissions: actor.permissions }, secret, {
    issuer: 'next-server',
    audience: 'fastapi-internal',
    expiresIn: '2m',
  });
  let response;
  try {
    response = await fetchImpl(`${BASE()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new AgentServiceError('The application service is not reachable right now.', 503, 'UNAVAILABLE');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : data?.detail?.message || `status ${response.status}`;
    throw new AgentServiceError(detail, response.status);
  }
  return data;
}

const getApplication = (applicationId, actor) => call(`/api/applications/${encodeURIComponent(applicationId)}`, { actor });
const getQueue = (actor, scope = 'awaiting') => call(scope === 'awaiting' ? '/api/applications/queue' : `/api/applications/queue?scope=${encodeURIComponent(scope)}`, { actor });
const requestAssessment = (applicationId, actor) => call(`/api/applications/${encodeURIComponent(applicationId)}/assessment`, { method: 'POST', actor, timeoutMs: 60000 });
const decideApplication = (applicationId, decision, comments, actor) =>
  call(`/api/applications/${encodeURIComponent(applicationId)}/decide`, { method: 'POST', body: { decision, comments }, actor });

module.exports = { call, setFetch, agentActor, humanActor, getApplication, getQueue, requestAssessment, decideApplication, AgentServiceError };
