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
  },
  { timestamps: true }
);

module.exports = mongoose.models.FacultyTask || mongoose.model('FacultyTask', facultyTaskSchema);
