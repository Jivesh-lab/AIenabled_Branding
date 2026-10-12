const mongoose = require('mongoose');

const facultyProjectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    domain: { type: String, required: true },
    stage: { type: String, default: 'Ideation' },
    leadStudent: { type: String, required: true },
    rollNumber: { type: String, required: true },
    department: { type: String, default: 'Engineering' },
    teamMembers: { type: Array, default: [] },
    assignedCoordinatorName: { type: String, default: 'Dr. K. R. Raman' },
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
