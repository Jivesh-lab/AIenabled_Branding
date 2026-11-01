const os = require('os');
const AgentRuntime = require('../models/AgentRuntime');
const AgentJob = require('../models/AgentJob');
const jobs = require('./jobs');
const approvals = require('./approvals');
const { getConfig } = require('./config');
const monitoringAgent = require('./agents/monitoringAgent');
const investorAgent = require('./agents/investorAgent');
const { record } = require('./actionLog');
const calendarSync = require('../services/calendarSync');

/**
 * One worker tick for the agents. It is called by the existing event poller (services/eventOrchestrator),
 * after events have been relayed and dispatched, so there is a single loop and a single heartbeat.
 *
 *   1. recover jobs a crashed worker left half-run
 *   2. run every job whose deadline has passed (reminders, timeouts, retries, escalations)
 *   3. every sweep interval: scan startups for stalls and readiness, retry failed approval executions
 */
const WORKER_ID = `${os.hostname()}:${process.pid}`;
let lastSweepAt = 0;

async function heartbeat(patch) {
  await AgentRuntime.findOneAndUpdate({ key: 'scheduler' }, { $set: { workerId: WORKER_ID, ...patch } }, { upsert: true, returnDocument: 'after' });
}

async function markStarted() {
  // The calendar index changed from one connection per user to one per Google account; drop the old index.
  await require('../models/CalendarConnection').syncIndexes().catch((error) => console.warn('[AGENTS] calendar index sync skipped:', error.message));
  await heartbeat({ startedAt: new Date() });
}

async function tick({ now = new Date(), log = console, force = false } = {}) {
  const began = Date.now();
  const out = { recovered: 0, jobs: { ran: 0, failed: 0 }, watchesRenewed: 0, sweep: null, error: null };
  try {
    out.recovered = await jobs.recoverInterrupted(now);
    out.jobs = await jobs.runDueJobs({ now });
    out.watchesRenewed = await calendarSync.renewDueWatches();
    const cfg = getConfig();
    if (force || now.getTime() - lastSweepAt >= cfg.sweepMs) {
      lastSweepAt = now.getTime();
      out.sweep = {
        monitoring: await monitoringAgent.sweep({ now }),
        investor: await investorAgent.sweep({ now }),
        approvals: (await approvals.retryFailedExecutions()).length,
      };
      await heartbeat({ lastSweepAt: now });
    }
  } catch (error) {
    out.error = error.message;
    log.error('[AGENTS] tick failed:', error.message);
    await heartbeat({ lastError: error.message.slice(0, 300), lastErrorAt: new Date() }).catch(() => null);
  }
  const prior = await AgentRuntime.findOne({ key: 'scheduler' }).lean().catch(() => null);
  await heartbeat({ lastTickAt: now, lastTickMs: Date.now() - began, tickCount: (prior?.tickCount || 0) + 1, ...(out.recovered ? { lastRecovery: { at: now, jobs: out.recovered } } : {}) }).catch(() => null);
  if (out.recovered) {
    await record({ agent: 'Scheduler', action: 'monitoring.check', tier: 1, status: 'success', trigger: { type: 'schedule', ref: 'recovery' }, summary: `The scheduler resumed ${out.recovered} job(s) that were interrupted when the service stopped.`, audience: { roles: ['super_admin'], userIds: [] } }).catch(() => null);
  }
  return out;
}

/** Counters for the Super Admin health panel. */
async function health() {
  const [runtime, states, due, failed, retrying, escalated] = await Promise.all([
    AgentRuntime.findOne({ key: 'scheduler' }).lean(),
    Promise.all(['pending', 'running', 'waiting_for_reply', 'waiting_for_approval', 'retrying', 'escalated', 'done', 'failed'].map(async (state) => [state, await AgentJob.countDocuments({ state })])),
    AgentJob.countDocuments({ state: { $in: ['pending', 'retrying', 'waiting_for_reply', 'waiting_for_approval'] }, nextRunAt: { $lte: new Date() } }),
    AgentJob.find({ state: 'failed' }).sort({ updatedAt: -1 }).limit(10).lean(),
    AgentJob.find({ state: 'retrying' }).sort({ nextRunAt: 1 }).limit(10).lean(),
    AgentJob.find({ state: 'escalated' }).sort({ escalatedAt: -1 }).limit(10).lean(),
  ]);
  const tickAgeMs = runtime?.lastTickAt ? Date.now() - new Date(runtime.lastTickAt).getTime() : null;
  const cfg = getConfig();
  return {
    scheduler: {
      status: tickAgeMs == null ? 'never_ran' : tickAgeMs < cfg.tickMs * 6 + 15000 ? 'healthy' : 'stalled',
      workerId: runtime?.workerId || null,
      startedAt: runtime?.startedAt || null,
      lastTickAt: runtime?.lastTickAt || null,
      lastTickMs: runtime?.lastTickMs ?? null,
      lastSweepAt: runtime?.lastSweepAt || null,
      tickCount: runtime?.tickCount || 0,
      lastError: runtime?.lastError || null,
      lastErrorAt: runtime?.lastErrorAt || null,
      lastRecovery: runtime?.lastRecovery || null,
      tickEveryMs: cfg.tickMs,
      sweepEveryMs: cfg.sweepMs,
    },
    jobs: { byState: Object.fromEntries(states), dueNow: due },
    failedJobs: failed.map(slimJob),
    retryingJobs: retrying.map(slimJob),
    escalatedJobs: escalated.map(slimJob),
  };
}

function slimJob(job) {
  return { id: String(job._id), type: job.type, agent: job.agent, state: job.state, step: job.step, attempts: job.attempts, lastError: job.lastError, nextRunAt: job.nextRunAt, updatedAt: job.updatedAt, projectId: job.projectId, applicationId: job.applicationId };
}

module.exports = { tick, health, markStarted, slimJob, WORKER_ID };
