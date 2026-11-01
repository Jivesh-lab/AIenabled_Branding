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
    // Set when an agent booked the meeting: real instants, real attendee accounts and what actually happened.
    source: { type: String, default: 'manual' },
    startUtc: { type: Date, default: null, index: true },
    endUtc: { type: Date, default: null },
    attendeeUserIds: { type: [String], default: [], index: true },
    calendarMode: { type: String, enum: ['none', 'google', 'ics_email', 'sandbox'], default: 'none' },
    googleEventId: { type: String, default: null },
    googleOrganizerUserId: { type: String, default: null },
    icsUid: { type: String, default: null },
    outcome: { type: String, enum: ['pending', 'held', 'no_show', 'cancelled'], default: 'pending' },
    outcomeAt: { type: Date, default: null },
    rescheduleCount: { type: Number, default: 0 },
    kind: { type: String, default: 'general' },
    responses: { type: mongoose.Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, default: undefined },
  },
  { timestamps: true }
);

facultyMeetingSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });

module.exports = mongoose.models.FacultyMeeting || mongoose.model('FacultyMeeting', facultyMeetingSchema);
