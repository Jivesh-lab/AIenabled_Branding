const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const DomainEvent = require('../models/DomainEvent');
const agentHubService = require('./agentHubService');
const { notifyForEvent } = require('./notificationService');

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
  const notification = await notifyForEvent(event);
  if (event.eventType === 'application.approved' || event.eventType === 'startup.synchronized') {
    const result = await agentHubService.runMentorMatching({
      projectId: event.projectId || event.aggregateId,
      actor: { id: 'system', role: 'system', name: 'Lifecycle Orchestrator' },
      idempotencyKey: `mentor-match:${event.applicationId || event.aggregateId}`,
    });
    return { action: 'mentor_matching_requested', notification, result: result?.run || result };
  }

  if (event.eventType === 'mentor.allocation.approved') {
    const allocation = event.payload || {};
    const projectId = event.projectId || event.aggregateId;
    const results = [];
    results.push(await agentHubService.coordinateWorkflowAction({
      actionType: 'schedule_meeting',
      targetId: projectId,
      payload: {
        idempotencyKey: `mentor-kickoff-meeting:${event.aggregateId}`,
        projectId,
        title: `Mentor kickoff for ${allocation.projectTitle || 'startup'}`,
        agenda: 'Initial mentor onboarding and milestone planning.',
        participants: allocation.participants || ['Student Founder', allocation.allocatedMentorName || 'Assigned Mentor'],
      },
      actor: { id: 'system', role: 'system', name: 'Lifecycle Orchestrator' },
    }));
    results.push(await agentHubService.coordinateWorkflowAction({
      actionType: 'assign_task',
      targetId: projectId,
      payload: {
        idempotencyKey: `mentor-kickoff-task:${event.aggregateId}`,
        projectId,
        title: 'Complete mentor onboarding and initial milestone plan',
        assignedTo: allocation.allocatedMentorName || 'Assigned Mentor',
        assignedRole: 'mentor',
        dueDate: allocation.dueDate,
      },
      actor: { id: 'system', role: 'system', name: 'Lifecycle Orchestrator' },
    }));
    return { action: 'mentor_kickoff_coordinated', notification, results };
  }

  if (event.eventType === 'monitoring.report.created' && event.payload?.alertActive) {
    const result = await agentHubService.coordinateWorkflowAction({
      actionType: 'request_progress_report',
      projectId: event.projectId || event.aggregateId,
      targetId: event.projectId || event.aggregateId,
      targetName: event.payload.leadStudent || 'Startup Founder',
      targetRole: 'student',
      payload: {
        idempotencyKey: `monitoring-followup:${event.aggregateId}`,
        title: 'Submit an evidence-based progress update',
        description: 'Monitoring detected an active risk flag. Submit current milestone evidence and blockers.',
        priority: 'High',
      },
      actor: { id: 'system', role: 'system', name: 'Monitoring Agent' },
    });
    return { action: 'monitoring_followup_requested', notification, result };
  }

  if (event.eventType === 'task.overdue') {
    const report = await agentHubService.evaluateStartupMonitoring({
      projectId: event.projectId || event.aggregateId,
      actor: { id: 'system', role: 'system', name: 'Monitoring Agent' },
      scheduled: false,
    });
    return { action: 'overdue_task_re_evaluated', notification, reportId: report.id };
  }

  return { action: 'recorded_only', notification, eventType: event.eventType };
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
  if (env.EVENT_ORCHESTRATOR_ENABLED === 'false') return null;
  const pollMs = Math.max(1000, Number(env.EVENT_ORCHESTRATOR_POLL_MS || DEFAULT_POLL_MS));
  const monitoringMs = Math.max(15 * 60 * 1000, Number(env.MONITORING_SWEEP_MS || 60 * 60 * 1000));
  let lastMonitoringSweep = 0;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await relayPostgresEvents(log);
      while (await processOneEvent(log)) { /* drain ready events */ }
      await enqueueOverdueTaskEvents();
      if (Date.now() - lastMonitoringSweep >= monitoringMs) {
        lastMonitoringSweep = Date.now();
        await agentHubService.evaluatePortfolioMonitoring({
          actor: { id: 'system', role: 'system', name: 'Scheduled Monitoring Agent' },
          scheduled: true,
        });
      }
    } catch (error) {
      log.error('[EVENTS] poll failed:', error.message);
    } finally {
      running = false;
    }
  };
  void tick();
  return setInterval(tick, pollMs);
}

async function enqueueOverdueTaskEvents() {
  const FacultyTask = require('../models/FacultyTask');
  const tasks = await FacultyTask.find({
    dueDate: { $lt: new Date().toISOString().slice(0, 10) },
    status: { $nin: ['Completed', 'Overdue'] },
  }).select('id projectId title dueDate status').lean();
  for (const task of tasks) {
    await enqueueEvent({
      eventType: 'task.overdue',
      aggregateType: 'task',
      aggregateId: task.id,
      projectId: task.projectId,
      actorId: 'system',
      idempotencyKey: `task-overdue:${task.id}:${task.dueDate}`,
      payload: { title: task.title, dueDate: task.dueDate, status: task.status },
    });
  }
}

module.exports = { enqueueEvent, processOneEvent, startEventOrchestrator, handleEvent, relayPostgresEvents };
