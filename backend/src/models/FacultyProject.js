const mongoose = require('mongoose');

const facultyProjectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    domain: { type: String, required: true },
    stage: { type: String, default: 'Ideation' },
    leadStudent: { type: String, required: true },
    // Ownership is a link to the real accounts / application, never inferred from a display name.
    ownerUserId: { type: String, default: null, index: true },
    applicationId: { type: String, default: null, index: true },
    coordinatorUserId: { type: String, default: null, index: true },
    mentorUserId: { type: String, default: null, index: true },
    isDemo: { type: Boolean, default: false },
    rollNumber: { type: String, default: '' },
    department: { type: String, default: 'Engineering' },
    teamMembers: { type: Array, default: [] },
    assignedCoordinatorName: { type: String, default: null },
    assignedVolunteerName: { type: String, default: null },
    allocatedMentorName: { type: String, default: null },
    trl: { type: Number, default: 1 },
    progress: { type: Number, default: 0 },
    health: { type: String, enum: ['On Track', 'Needs Attention', 'At Risk'], default: 'On Track' },
    overdueMilestonesCount: { type: Number, default: 0 },
    nextMilestone: { type: String, default: '' },
    nextMilestoneDate: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FacultyProject || mongoose.model('FacultyProject', facultyProjectSchema);
