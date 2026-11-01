const mongoose = require('mongoose');

const facultyTaskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    projectId: { type: String, required: true },
    projectTitle: { type: String, default: 'Incubation Project' },
    assignedTo: { type: String, default: 'Faculty Volunteer' },
    assignedRole: { type: String, default: 'volunteer' },
    dueDate: { type: String, required: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Overdue'], default: 'Pending' },
    description: { type: String, default: '' },
    assignedUserId: { type: String, default: null, index: true },
    source: { type: String, default: 'manual' },
    kind: { type: String, default: 'general' },
    createdByAgent: { type: String, default: null },
    dedupeKey: { type: String, default: undefined },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

facultyTaskSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });

module.exports = mongoose.models.FacultyTask || mongoose.model('FacultyTask', facultyTaskSchema);
