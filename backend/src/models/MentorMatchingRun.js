const mongoose = require('mongoose');

const mentorRecommendationSchema = new mongoose.Schema(
  {
    mentor_id: { type: String, required: true },
    name: { type: String, required: true },
    domain: { type: String, default: '' },
    company: { type: String, default: '' },
    role: { type: String, default: '' },
    email: { type: String, default: '' },
    match_score: { type: Number, required: true },
    score_breakdown: {
      domain_match: { type: Number, default: 0 },
      skills_match: { type: Number, default: 0 },
      availability: { type: Number, default: 0 },
    },
    explanation: { type: String, default: '' },
    matched_skills: { type: [String], default: [] },
    duplicate_allocation_warning: { type: Boolean, default: false },
    capacity_conflict_warning: { type: Boolean, default: false },
    current_load: { type: Number, default: 0 },
    max_load: { type: Number, default: 3 },
  },
  { _id: false }
);

const mentorMatchingRunSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true, index: true },
    projectTitle: { type: String, required: true },
    domain: { type: String, default: '' },
    stage: { type: String, default: 'Prototype' },
    challenges: { type: String, default: '' },
    requestedExpertise: { type: [String], default: [] },
    executionStatus: {
      type: String,
      enum: ['idle', 'queued', 'running', 'completed', 'failed'],
      default: 'completed',
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: Date.now },
    evaluatedMentorsCount: { type: Number, default: 0 },
    recommendations: { type: [mentorRecommendationSchema], default: [] },
    warnings: { type: [String], default: [] },
    coordinatorDecision: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      selectedMentorId: { type: String, default: null },
      selectedMentorName: { type: String, default: null },
      decidedBy: { type: String, default: null },
      decidedAt: { type: Date, default: null },
      comments: { type: String, default: '' },
    },
    linkedAllocationId: { type: String, default: null },
    linkedWorkflowExecutionId: { type: String, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.MentorMatchingRun ||
  mongoose.model('MentorMatchingRun', mentorMatchingRunSchema);

