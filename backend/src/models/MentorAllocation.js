const mongoose = require('mongoose');

const mentorAllocationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true },
    projectTitle: { type: String, required: true },
    studentName: { type: String, default: '' },
    studentRollNo: { type: String, default: '' },
    domain: { type: String, default: '' },
    requestedExpertise: { type: [String], default: [] },
    justification: { type: String, default: '' },
    recommendedMentorName: { type: String, default: null },
    recommendedMentorOrg: { type: String, default: null },
    recommendedByVolunteerName: { type: String, default: null },
    status: {
      type: String,
      enum: ['requested', 'under_review', 'recommended', 'approved', 'rejected', 'allocated'],
      default: 'requested',
    },
    coordinatorComment: { type: String, default: '' },
    allocatedMentorName: { type: String, default: null },
    allocatedMentorUserId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MentorAllocation || mongoose.model('MentorAllocation', mentorAllocationSchema);
