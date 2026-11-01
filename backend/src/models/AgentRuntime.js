const mongoose = require('mongoose');

/** Heartbeat and counters written by the worker so Super Admin can see whether agents are actually running. */
const agentRuntimeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    workerId: { type: String, default: null },
    startedAt: { type: Date, default: null },
    lastTickAt: { type: Date, default: null },
    lastTickMs: { type: Number, default: 0 },
    lastSweepAt: { type: Date, default: null },
    tickCount: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    lastErrorAt: { type: Date, default: null },
    lastRecovery: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AgentRuntime || mongoose.model('AgentRuntime', agentRuntimeSchema);
