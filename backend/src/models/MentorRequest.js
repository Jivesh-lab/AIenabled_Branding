const mongoose = require('mongoose');

/** One request sent to one real mentor account for one startup. Its fate is always recorded. */
const mentorRequestSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, index: true },
    applicationId: { type: String, default: null },
    projectTitle: { type: String, default: '' },
    mentorUserId: { type: String, required: true, index: true },
    mentorName: { type: String, default: '' },
    mentorEmail: { type: String, default: '' },
    rank: { type: Number, default: 1 },
    score: { type: Number, default: 0 },
    reasons: { type: [String], default: [] },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'timed_out', 'withdrawn'], default: 'pending', index: true },
    requestedAt: { type: Date, default: Date.now },
    dueAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
    responseNote: { type: String, default: '' },
    jobId: { type: String, default: null },
  },
  { timestamps: true }
);

mentorRequestSchema.index({ projectId: 1, mentorUserId: 1 }, { unique: true });

module.exports = mongoose.models.MentorRequest || mongoose.model('MentorRequest', mentorRequestSchema);
