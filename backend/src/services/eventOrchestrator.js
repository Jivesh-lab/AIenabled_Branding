const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const DomainEvent = require('../models/DomainEvent');
const { notifyForEvent } = require('./notificationService');
const { handleDomainEvent } = require('../agentic/dispatcher');
const agentScheduler = require('../agentic/scheduler');

const MAX_ATTEMPTS = 5;
const DEFAULT_POLL_MS = 5000;

function correlationId(prefix = 'evt') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
}

async function enqueueEvent({ eventType, aggregateType, aggregateId, projectId = null, applicationId = null, actorId = 'system', payload = {}, correlationId: suppliedCorrelationId, idempotencyKey, eventId: suppliedEventId }) {
  if (!eventType || !aggregateType || !aggregateId || !idempotencyKey) {
    throw new Error('eventType, aggregateType, aggregateId and idempotencyKey are required');
  }
  // Event publication must never turn an already-persisted business mutation into
  // a 500 when Mongo is unavailable. The durable event is retried by the next
  // state transition or scheduler once the store is connected.
  if (mongoose.connection.readyState !== 1) return null;

  const event = await DomainEvent.findOneAndUpdate(
    { idempotencyKey },
    {
      $setOnInsert: {
        eventId: suppliedEventId || correlationId('event'),
        eventType,
        aggregateType,
        aggregateId: String(aggregateId),
        projectId: projectId == null ? null : String(projectId),
        applicationId: applicationId == null ? null : String(applicationId),
        actorId: String(actorId || 'system'),
        correlationId: suppliedCorrelationId || correlationId('corr'),
        idempotencyKey,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        nextAttemptAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return event;
}

function relayToken() {
  const secret = process.env.INTERNAL_JWT_SECRET;
  if (!secret) return null;
  return jwt.sign(
    { sub: 'express-event-relay', role: 'system', permissions: ['event_relay'] },
    secret,
    { issuer: 'next-server', audience: 'fastapi-internal', expiresIn: '2m' }
  );
}

async function relayPostgresEvents(log = console) {
  const token = relayToken();
  if (!token) return { claimed: 0, delivered: 0, skipped: true };
  const baseUrl = process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000';
  let response;
  try {
    response = await fetch(`${baseUrl}/api/events/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ limit: 50 }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    log.warn('[EVENT RELAY] PostgreSQL claim unavailable:', error.message);
    return { claimed: 0, delivered: 0, unavailable: true };
  }
  if (!response.ok) return { claimed: 0, delivered: 0, unavailable: true };
  const body = await response.json();
  const events = Array.isArray(body.events) ? body.events : [];
  let delivered = 0;
  for (const event of events) {
    let success = false;
    try {
      success = Boolean(await enqueueEvent({
        eventId: event.event_id,
        eventType: event.event_type,
        aggregateType: event.aggregate_type,
        aggregateId: event.aggregate_id,
        projectId: event.project_id,
        applicationId: event.application_id,
        actorId: event.actor_id,
        correlationId: event.correlation_id,
        idempotencyKey: event.idempotency_key,
        payload: event.payload || {},
      }));
      if (success) delivered += 1;
    } finally {
      await fetch(`${baseUrl}/api/events/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event_id: event.event_id, success, error: success ? null : 'Mongo event store unavailable' }),
      }).catch((error) => log.warn('[EVENT RELAY] PostgreSQL acknowledgement failed:', error.message));
    }
  }
  return { claimed: events.length, delivered };
}

async function claimNextEvent() {
  return DomainEvent.findOneAndUpdate(
    {
      status: { $in: ['pending', 'failed'] },
      nextAttemptAt: { $lte: new Date() },
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    },
    { $set: { status: 'processing', lockedAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  );
}

async function handleEvent(event) {
  // People are told about the event first (role- and ownership-scoped), then the agents act on it.
  const notification = await notifyForEvent(event);
  const dispatched = await handleDomainEvent(event);
  return { action: dispatched.handledBy.length ? `handled_by_${dispatched.handledBy.join('+')}` : 'recorded_only', notification, handledBy: dispatched.handledBy, eventType: event.eventType };
}

async function processOneEvent(log = console) {
  const event = await claimNextEvent();
  if (!event) return null;
  try {
    const result = await handleEvent(event);
    await DomainEvent.updateOne(
      { _id: event._id, status: 'processing' },
      { $set: { status: 'completed', processedAt: new Date(), lockedAt: null, lastError: null, result } }
    );
    return { eventId: event.eventId, status: 'completed', result };
  } catch (error) {
    const terminal = event.attempts >= event.maxAttempts;
    const delayMs = Math.min(60 * 60 * 1000, 1000 * (2 ** Math.max(0, event.attempts - 1)));
    await DomainEvent.updateOne(
      { _id: event._id, status: 'processing' },
      {
        $set: {
          status: terminal ? 'dead_letter' : 'failed',
          lockedAt: null,
          lastError: String(error.message || error).slice(0, 1000),
          nextAttemptAt: new Date(Date.now() + delayMs),
        },
      }
    );
    log.error(`[EVENTS] ${event.eventType} failed (attempt ${event.attempts}/${event.maxAttempts}):`, error.message);
    return { eventId: event.eventId, status: terminal ? 'dead_letter' : 'failed' };
  }
}

function startEventOrchestrator(env = process.env, log = console) {
  // On by default: the agents work without anyone logged in. Set EVENT_ORCHESTRATOR_ENABLED=false to pause them.
  if (env.EVENT_ORCHESTRATOR_ENABLED === 'false') return null;
  const pollMs = Math.max(1000, Number(env.EVENT_ORCHESTRATOR_POLL_MS || DEFAULT_POLL_MS));
  if (!env.INTERNAL_JWT_SECRET) {
    log.warn('[AGENTS] INTERNAL_JWT_SECRET is not set: the agents cannot receive application events from the application service and cannot call it. Set the same value in backend/.env, agent-service/.env and frontend/.env.local.');
  }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await relayPostgresEvents(log);
      while (await processOneEvent(log)) { /* drain ready events */ }
      await agentScheduler.tick({ log });
    } catch (error) {
      log.error('[EVENTS] poll failed:', error.message);
    } finally {
      running = false;
    }
  };
  agentScheduler.markStarted().catch(() => null);
  void tick();
  return setInterval(tick, pollMs);
}

module.exports = { enqueueEvent, processOneEvent, startEventOrchestrator, handleEvent, relayPostgresEvents };
