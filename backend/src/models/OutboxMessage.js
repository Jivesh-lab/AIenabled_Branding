const mongoose = require('mongoose');

/**
 * Every outbound communication an agent attempts, live or sandbox, goes through the same code path
 * and is recorded here. `mode: 'sandbox'` rows were NOT delivered to anyone and are always labelled so.
 */
const outboxSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['email', 'calendar', 'notification'], required: true, index: true },
    mode: { type: String, enum: ['live', 'sandbox'], required: true },
    status: { type: String, enum: ['sent', 'simulated', 'failed'], required: true, index: true },
    dedupeKey: { type: String, default: undefined },
    to: { type: [String], default: [] },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    ics: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    providerMessageId: { type: String, default: null },
    error: { type: String, default: null },
    correlationId: { type: String, default: null },
  },
  { timestamps: true }
);

outboxSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });

module.exports = mongoose.models.OutboxMessage || mongoose.model('OutboxMessage', outboxSchema);
