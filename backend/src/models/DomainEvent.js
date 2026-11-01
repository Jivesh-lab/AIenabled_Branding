const mongoose = require('mongoose');

const domainEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true, index: true },
    aggregateType: { type: String, required: true },
    aggregateId: { type: String, required: true },
    projectId: { type: String, default: null, index: true },
    applicationId: { type: String, default: null, index: true },
    actorId: { type: String, default: 'system' },
    correlationId: { type: String, required: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'dead_letter'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

domainEventSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });

module.exports = mongoose.models.DomainEvent || mongoose.model('DomainEvent', domainEventSchema);
