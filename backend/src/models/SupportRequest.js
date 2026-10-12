const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true },
    projectTitle: { type: String, required: true },
    studentName: { type: String, required: true },
    category: { type: String, default: 'General' },
    question: { type: String, required: true },
    submittedAt: { type: String, default: 'Recent' },
    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },
    volunteerResponse: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SupportRequest || mongoose.model('SupportRequest', supportRequestSchema);
