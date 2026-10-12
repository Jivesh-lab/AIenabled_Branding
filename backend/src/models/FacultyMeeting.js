const mongoose = require('mongoose');

const facultyMeetingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    projectId: { type: String, required: true },
    projectTitle: { type: String, required: true },
    participants: { type: [String], default: [] },
    date: { type: String, required: true },
    startTime: { type: String, default: '14:00' },
    durationMinutes: { type: Number, default: 45 },
    timeZone: { type: String, default: 'IST (UTC+5:30)' },
    meetingType: { type: String, default: 'Milestone Review' },
    agenda: { type: String, default: '' },
    meetingProvider: { type: String, default: 'In-Person (DBITIC Lab 402)' },
    meetingLinkOrLocation: { type: String, default: 'DBIT Incubation Centre, Lab 402' },
    invitationStatus: { type: String, default: 'Sent' },
    notes: { type: String, default: '' },
    attendanceLogged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FacultyMeeting || mongoose.model('FacultyMeeting', facultyMeetingSchema);
