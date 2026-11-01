const mongoose = require('mongoose');

const monitoringReportSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true, index: true },
    projectTitle: { type: String, required: true },
    domain: { type: String, default: '' },
    stage: { type: String, default: 'Prototype' },
    leadStudent: { type: String, default: '' },
    executionStatus: {
      type: String,
      enum: ['idle', 'queued', 'running', 'completed', 'failed'],
      default: 'completed',
    },
    executedAt: { type: Date, default: Date.now },
    executedBy: { type: String, default: 'Faculty / Admin System' },
    nextScheduledMonitoring: { type: Date, default: null },
    measuredFacts: {
      milestonesTotal: { type: Number, default: 0 },
      milestonesCompleted: { type: Number, default: 0 },
      milestonesOverdue: { type: Number, default: 0 },
      milestonesPending: { type: Number, default: 0 },
      milestoneCompletionRate: { type: Number, default: 0 },
      tasksTotal: { type: Number, default: 0 },
      tasksCompleted: { type: Number, default: 0 },
      tasksPending: { type: Number, default: 0 },
      tasksOverdue: { type: Number, default: 0 },
      daysSinceLastReport: { type: Number, default: 0 },
      activeMentorshipMeetings: { type: Number, default: 0 },
    },
    aiObservation: {
      healthStatus: {
        type: String,
        enum: ['On Track', 'Needs Attention', 'At Risk', 'No Data'],
        default: 'On Track',
        index: true,
      },
      confidenceScore: { type: Number, default: 85 },
      summary: { type: String, default: '' },
      riskFactors: { type: [String], default: [] },
      strengths: { type: [String], default: [] },
      explanation: { type: String, default: '' },
    },
    recommendedInterventions: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        type: {
          type: String,
          enum: ['task', 'meeting', 'reminder', 'progress_report'],
          default: 'task',
        },
        priority: {
          type: String,
          enum: ['High', 'Medium', 'Low'],
          default: 'Medium',
        },
        description: { type: String, default: '' },
        assigned: { type: Boolean, default: false },
        workflowExecutionId: { type: String, default: null },
        assignedAt: { type: Date, default: null },
        assignedTo: { type: String, default: null },
      },
    ],
    alert: {
      active: { type: Boolean, default: false },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      acknowledged: { type: Boolean, default: false },
      acknowledgedBy: { type: String, default: null },
      acknowledgedAt: { type: Date, default: null },
      notes: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.MonitoringReport ||
  mongoose.model('MonitoringReport', monitoringReportSchema);

