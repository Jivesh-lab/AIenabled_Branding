const mongoose = require('mongoose');

const workflowExecutionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    actionType: {
      type: String,
      enum: ['assign_task', 'schedule_meeting', 'send_reminder', 'request_progress_report'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled'],
      default: 'completed',
      index: true,
    },
    projectId: { type: String, default: 'general', index: true },
    projectTitle: { type: String, default: 'Incubation General' },
    actorId: { type: String, default: 'system' },
    actorRole: { type: String, default: 'faculty_coordinator' },
    actorName: { type: String, default: 'Coordinator' },
    targetId: { type: String, required: true },
    targetName: { type: String, default: '' },
    targetRole: { type: String, default: 'student' },
    targetEmail: { type: String, default: '' },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    idempotencyKey: { type: String, required: true, index: true },
    deliveryStatus: {
      type: String,
      enum: ['queued', 'delivered', 'failed', 'acknowledged'],
      default: 'delivered',
    },
    deliveryTimestamp: { type: Date, default: Date.now },
    deliveryReceipt: { type: String, default: 'In-app notification and database record persisted' },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    errorMessage: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: Date.now },
    linkedRecord: {
      modelName: { type: String, default: null },
      recordId: { type: String, default: null },
    },
    linkedMonitoringReportId: { type: String, default: null },
    linkedMentorMatchingRunId: { type: String, default: null },
    executionLogs: {
      type: [
        {
          timestamp: { type: Date, default: Date.now },
          message: String,
          level: { type: String, default: 'info' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.WorkflowExecution ||
  mongoose.model('WorkflowExecution', workflowExecutionSchema);

