const mongoose = require('mongoose');

/**
 * A Tier-3 item: something an agent has prepared and a human must approve before it executes.
 * The agent writes the evidence; the decision (who, when, why) is recorded on the same row.
 * Both the faculty and the admin "pending decisions" counters are computed from this collection.
 */
const approvalSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['admission', 'mentor_allocation', 'investor_intro'], required: true, index: true },
    action: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    requestedBy: { type: String, required: true }, // agent name
    // Roles that may decide, and (optionally) the specific people responsible.
    assignedRoles: { type: [String], default: [] },
    assignedUserIds: { type: [String], default: [] },
    applicationId: { type: String, default: null, index: true },
    projectId: { type: String, default: null, index: true },
    subjectId: { type: String, default: null, index: true },
    correlationId: { type: String, default: null },
    jobId: { type: String, default: null },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    decidedBy: { type: String, default: null },
    decidedByName: { type: String, default: null },
    decidedByRole: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    decisionComment: { type: String, default: '' },
    executionStatus: { type: String, enum: ['not_started', 'done', 'failed'], default: 'not_started' },
    executionError: { type: String, default: null },
    lastRemindedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

approvalSchema.index({ status: 1, type: 1, createdAt: -1 });
approvalSchema.index({ type: 1, subjectId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.models.Approval || mongoose.model('Approval', approvalSchema);
