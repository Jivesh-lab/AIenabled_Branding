const mongoose = require('mongoose');

/**
 * Immutable record of everything an agent did (or was stopped from doing).
 * Rows are append-only: any attempt to update or delete one throws. Human-facing feeds are
 * built from this collection, so what users read is exactly what the system recorded.
 */
const actionLogSchema = new mongoose.Schema(
  {
    agent: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    tool: { type: String, default: null },
    tier: { type: Number, enum: [1, 2, 3], required: true },
    status: {
      type: String,
      enum: ['success', 'simulated', 'failed', 'pending_approval', 'blocked', 'skipped'],
      required: true,
      index: true,
    },
    trigger: {
      type: { type: String, enum: ['event', 'schedule', 'user', 'assistant', 'override'], default: 'event' },
      ref: { type: String, default: null },
    },
    summary: { type: String, required: true },
    inputSummary: { type: String, default: '' },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    followUp: { type: String, default: null },
    correlationId: { type: String, default: null, index: true },
    jobId: { type: String, default: null },
    approvalId: { type: String, default: null },
    applicationId: { type: String, default: null, index: true },
    projectId: { type: String, default: null, index: true },
    // Who may read this row in a feed: the people it concerns, plus whole roles.
    audience: {
      userIds: { type: [String], default: [], index: true },
      roles: { type: [String], default: [] },
    },
    // Set only for rows whose effect is final, so a retried action can never run twice.
    successKey: { type: String, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

actionLogSchema.index({ successKey: 1 }, { unique: true, partialFilterExpression: { successKey: { $type: 'string' } } });

function immutable() {
  throw new Error('ActionLog rows are immutable');
}
['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove'].forEach((op) => {
  actionLogSchema.pre(op, immutable);
});
actionLogSchema.pre('save', function onSave() {
  if (!this.isNew) immutable();
});

module.exports = mongoose.models.ActionLog || mongoose.model('ActionLog', actionLogSchema);
