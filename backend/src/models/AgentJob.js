const mongoose = require('mongoose');

/**
 * A persistent unit of agent work with an explicit state machine and deadlines.
 *
 *   pending -> running -> waiting_for_reply | waiting_for_approval | retrying | escalated | done | failed
 *
 * `nextRunAt` is the single wake-up time (a retry, a reminder, a timeout or an escalation deadline);
 * `timeoutAt` records the hard deadline the job is currently waiting against. Because both are
 * persisted, a restarted service resumes every job exactly where it left off.
 */
const STATES = ['pending', 'running', 'waiting_for_reply', 'waiting_for_approval', 'retrying', 'escalated', 'done', 'failed'];
const TERMINAL = ['done', 'failed'];

const agentJobSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    agent: { type: String, required: true, index: true },
    state: { type: String, enum: STATES, default: 'pending', index: true },
    step: { type: String, default: 'start' },
    dedupeKey: { type: String, required: true, unique: true },
    correlationId: { type: String, required: true, index: true },
    triggerEvent: { type: String, default: null },
    applicationId: { type: String, default: null, index: true },
    projectId: { type: String, default: null, index: true },
    subjectType: { type: String, default: null },
    subjectId: { type: String, default: null, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    runCount: { type: Number, default: 0 },
    nextRunAt: { type: Date, default: Date.now, index: true },
    timeoutAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    resumeState: { type: String, default: null },
    lastError: { type: String, default: null },
    escalatedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    history: {
      type: [{ at: Date, from: String, to: String, step: String, note: String, _id: false }],
      default: [],
    },
  },
  { timestamps: true }
);

agentJobSchema.index({ state: 1, nextRunAt: 1 });

const AgentJob = mongoose.models.AgentJob || mongoose.model('AgentJob', agentJobSchema);
AgentJob.STATES = STATES;
AgentJob.TERMINAL = TERMINAL;
module.exports = AgentJob;
