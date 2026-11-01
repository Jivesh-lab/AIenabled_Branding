const crypto = require('crypto');
const AgentJob = require('../models/AgentJob');
const { getConfig } = require('./config');

/**
 * Persistent job engine for the agents.
 *
 * A job handler is a function (job, ctx) => directive. The directive names the next state and when the
 * job should wake up again. Nothing lives in memory: every wait, deadline and retry is a row in
 * AgentJob, so a restart simply resumes whatever was due.
 */

const WAITING = ['waiting_for_reply', 'waiting_for_approval'];
const RUNNABLE = ['pending', 'retrying', ...WAITING, 'escalated'];

const ALLOWED = {
  pending: ['running'],
  running: ['waiting_for_reply', 'waiting_for_approval', 'retrying', 'escalated', 'done', 'failed', 'pending'],
  waiting_for_reply: ['running', 'escalated', 'done', 'failed', 'pending'],
  waiting_for_approval: ['running', 'escalated', 'done', 'failed', 'pending'],
  retrying: ['running', 'failed', 'pending'],
  escalated: ['running', 'done', 'failed', 'pending'],
  done: [],
  failed: [],
};

const handlers = new Map();
function registerJobHandler(type, fn) {
  handlers.set(type, fn);
}

function newCorrelationId(prefix = 'corr') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function backoffMs(attempt, cfg = getConfig().retry) {
  return Math.min(cfg.maxMs, cfg.baseMs * 2 ** Math.max(0, attempt - 1));
}

function historyEntry(from, to, step, note) {
  return { at: new Date(), from, to, step: step || null, note: note || null };
}

/** Create a job unless one with the same dedupeKey already exists (idempotent). */
async function enqueue({ type, agent, dedupeKey, correlationId, triggerEvent = null, applicationId = null, projectId = null, subjectType = null, subjectId = null, data = {}, nextRunAt = new Date(), maxAttempts }) {
  if (!type || !agent || !dedupeKey) throw new Error('type, agent and dedupeKey are required to enqueue a job');
  const existing = await AgentJob.findOne({ dedupeKey }).lean();
  if (existing) return { job: existing, created: false };
  try {
    const job = await AgentJob.create({
      type,
      agent,
      dedupeKey,
      correlationId: correlationId || newCorrelationId('job'),
      triggerEvent,
      applicationId,
      projectId,
      subjectType,
      subjectId,
      data,
      maxAttempts: maxAttempts || getConfig().retry.maxAttempts,
      nextRunAt,
      state: 'pending',
      history: [historyEntry(null, 'pending', 'start', `Created${triggerEvent ? ` by ${triggerEvent}` : ''}`)],
    });
    return { job: toPlain(job), created: true };
  } catch (error) {
    if (error && (error.code === 11000 || /duplicate/i.test(error.message))) {
      return { job: await AgentJob.findOne({ dedupeKey }).lean(), created: false };
    }
    throw error;
  }
}

function toPlain(doc) {
  return doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
}

/** Atomically take the next due job (only one worker can win a row). Remembers the state it was claimed from. */
async function claimWithPrevious(now, opts) {
  const filter = { state: { $in: RUNNABLE }, nextRunAt: { $lte: now }, lockedAt: null };
  if (opts?.types) filter.type = { $in: opts.types };
  const candidate = await AgentJob.findOne(filter).sort({ nextRunAt: 1 }).lean();
  if (!candidate) return null;
  const claimed = await AgentJob.findOneAndUpdate(
    { _id: candidate._id, state: candidate.state, lockedAt: null },
    { $set: { lockedAt: now, state: 'running', resumeState: candidate.state }, $inc: { runCount: 1 } },
    { returnDocument: 'after' }
  ).lean();
  return claimed;
}

async function apply(job, directive = {}) {
  const to = directive.state || 'done';
  const from = job.state;
  if (!ALLOWED[from] || !ALLOWED[from].includes(to)) {
    throw new Error(`Illegal job transition ${from} -> ${to} for ${job.type}`);
  }
  const set = {
    state: to,
    step: directive.step || job.step,
    lockedAt: null,
    lastError: null,
    attempts: 0,
  };
  // A waiting job with no wake-up time is parked until a signal arrives; it must never re-fire on its stale time.
  set.nextRunAt = 'nextRunAt' in directive ? directive.nextRunAt : (to === 'pending' ? new Date() : null);
  if ('timeoutAt' in directive) set.timeoutAt = directive.timeoutAt;
  if (to === 'done' || to === 'failed') {
    set.resolvedAt = new Date();
    set.nextRunAt = null;
    set.timeoutAt = null;
  }
  if (to === 'escalated') set.escalatedAt = job.escalatedAt || new Date();
  if (directive.data) {
    Object.entries(directive.data).forEach(([key, value]) => {
      set[`data.${key}`] = value;
    });
  }
  const update = {
    $set: set,
    $push: { history: { $each: [historyEntry(from, to, set.step, directive.note)], $slice: -60 } },
  };
  return AgentJob.findOneAndUpdate({ _id: job._id }, update, { returnDocument: 'after' }).lean();
}

/** A handler threw: back off and retry, or give up and mark the job failed for human attention. */
async function fail(job, error, now = new Date()) {
  const attempts = (job.attempts || 0) + 1;
  const terminal = attempts >= (job.maxAttempts || getConfig().retry.maxAttempts);
  const to = terminal ? 'failed' : 'retrying';
  const message = String(error?.message || error).slice(0, 500);
  const set = {
    state: to,
    attempts,
    lockedAt: null,
    lastError: message,
    nextRunAt: terminal ? null : new Date(now.getTime() + backoffMs(attempts)),
  };
  if (terminal) set.resolvedAt = new Date();
  return AgentJob.findOneAndUpdate(
    { _id: job._id },
    {
      $set: set,
      $push: { history: { $each: [historyEntry(job.state, to, job.step, `Attempt ${attempts} failed: ${message}`)], $slice: -60 } },
    },
    { returnDocument: 'after' }
  ).lean();
}

/**
 * Return jobs a crashed worker left in `running` to the state they were claimed from, so they run again.
 * Handlers are idempotent (actions carry idempotency keys), so re-running a half-finished step is safe.
 */
async function recoverInterrupted(now = new Date()) {
  const cutoff = new Date(now.getTime() - getConfig().jobLeaseMs);
  const stale = await AgentJob.find({ state: 'running', lockedAt: { $lte: cutoff } }).lean();
  let recovered = 0;
  for (const job of stale) {
    const back = job.resumeState && RUNNABLE.includes(job.resumeState) ? job.resumeState : 'pending';
    await AgentJob.findOneAndUpdate(
      { _id: job._id, state: 'running', lockedAt: job.lockedAt },
      {
        $set: { state: back, lockedAt: null, nextRunAt: now },
        $push: { history: { $each: [historyEntry('running', back, job.step, 'Recovered after the worker stopped mid-run')], $slice: -60 } },
      },
      { returnDocument: 'after' }
    ).lean();
    recovered += 1;
  }
  return recovered;
}

/** Deliver an external signal (a reply, an approval, a response) and wake the job immediately. */
async function signal(jobId, name, payload = {}) {
  const job = await AgentJob.findOne({ _id: jobId }).lean();
  if (!job || job.state === 'done' || job.state === 'failed') return null;
  const entry = { name, payload, at: new Date().toISOString() };
  const signals = [...(job.data?.signals || []), entry].slice(-20);
  const wake = { 'data.signals': signals, nextRunAt: new Date() };
  if (job.state === 'running') return AgentJob.findOneAndUpdate({ _id: jobId }, { $set: wake }, { returnDocument: 'after' }).lean();
  return AgentJob.findOneAndUpdate({ _id: jobId, state: { $in: [...RUNNABLE] } }, { $set: wake }, { returnDocument: 'after' }).lean();
}

async function findOpen(type, subjectId) {
  return AgentJob.findOne({ type, subjectId: String(subjectId), state: { $nin: ['done', 'failed'] } }).lean();
}

/** Run ONE job immediately (e.g. a request made through the assistant) and return its updated row. */
async function runJobNow(jobId, { now = new Date(), trigger = { type: 'user', ref: 'assistant' } } = {}) {
  const job = await AgentJob.findOne({ _id: jobId }).lean();
  if (!job) return null;
  await AgentJob.updateOne({ _id: job._id, lockedAt: null }, { $set: { nextRunAt: now } });
  const candidate = await AgentJob.findOne({ _id: job._id, state: { $in: RUNNABLE }, lockedAt: null }).lean();
  if (!candidate) return job;
  const claimed = await AgentJob.findOneAndUpdate(
    { _id: candidate._id, state: candidate.state, lockedAt: null },
    { $set: { lockedAt: now, state: 'running', resumeState: candidate.state }, $inc: { runCount: 1 } },
    { returnDocument: 'after' }
  ).lean();
  if (!claimed) return AgentJob.findOne({ _id: jobId }).lean();
  const handler = handlers.get(claimed.type);
  try {
    if (!handler) throw new Error(`No handler registered for job type ${claimed.type}`);
    const seen = (claimed.data?.signals || []).length;
    const directive = (await handler({ ...claimed, previousState: claimed.resumeState }, { now, config: getConfig(), trigger, signals: claimed.data?.signals || [] })) || {};
    const fresh = await AgentJob.findOne({ _id: claimed._id }).lean();
    directive.data = { ...(directive.data || {}), signals: (fresh?.data?.signals || []).slice(seen) };
    return await apply(claimed, directive);
  } catch (error) {
    return fail({ ...claimed, state: 'running' }, error, now);
  }
}

/** Run every job that is due. Returns a small report. */
async function runDueJobs({ now = new Date(), limit = 25, trigger = { type: 'schedule', ref: 'worker' } } = {}) {
  const report = { ran: 0, failed: 0, jobs: [] };
  for (let i = 0; i < limit; i += 1) {
    const claimed = await claimWithPrevious(now, {});
    if (!claimed) break;
    const handler = handlers.get(claimed.type);
    report.ran += 1;
    if (!handler) {
      await fail({ ...claimed, state: 'running' }, new Error(`No handler registered for job type ${claimed.type}`), now);
      report.failed += 1;
      continue;
    }
    // Handlers see the state the job was in before this wake-up, and any unread signals.
    const job = { ...claimed, previousState: claimed.resumeState };
    try {
      const seen = (job.data?.signals || []).length;
      const directive = (await handler(job, { now, config: getConfig(), trigger, signals: job.data?.signals || [] })) || {};
      // Consume only the signals this run actually saw; one that arrived mid-run stays for the next wake-up.
      const fresh = await AgentJob.findOne({ _id: claimed._id }).lean();
      directive.data = { ...(directive.data || {}), signals: (fresh?.data?.signals || []).slice(seen) };
      const next = await apply(claimed, directive);
      report.jobs.push({ id: String(claimed._id), type: claimed.type, to: next.state });
    } catch (error) {
      const next = await fail({ ...claimed, state: 'running' }, error, now);
      report.failed += 1;
      report.jobs.push({ id: String(claimed._id), type: claimed.type, to: next.state, error: error.message });
    }
  }
  return report;
}

module.exports = {
  registerJobHandler,
  enqueue,
  claimWithPrevious,
  apply,
  fail,
  recoverInterrupted,
  signal,
  findOpen,
  runDueJobs,
  runJobNow,
  backoffMs,
  newCorrelationId,
  ALLOWED,
  RUNNABLE,
};
