// Test harness: runs the REAL backend/src/routes/student.js (the actual route code) with the Mongoose
// models replaced by in-memory data, so the student portal can be exercised end to end without MongoDB.
// A control endpoint (POST /__db) sets what the "database" contains; everything else is production code.
//
//   JWT_SECRET=e2e-jwt node scripts/e2e-express-stub.cjs 5055
const path = require('node:path');
const { createRequire } = require('node:module');

const backendRoot = path.resolve(__dirname, '..', '..', 'backend');
const req = createRequire(path.join(backendRoot, 'package.json'));
const express = req('express');
const cookieParser = req('cookie-parser');

const StartupProfile = req('./src/models/StartupProfile');
const MentorAllocation = req('./src/models/MentorAllocation');
const FacultyProject = req('./src/models/FacultyProject');
const FacultyMeeting = req('./src/models/FacultyMeeting');
const FacultyTask = req('./src/models/FacultyTask');
const ReminderLog = req('./src/models/ReminderLog');
const User = req('./src/models/User');
const studentRouter = req('./src/routes/student');

const emptyDb = () => ({
  profiles: [], allocations: [], project: null, mentorUser: null, meetings: [], tasks: [], reminders: [], users: {}, forceStatus: null,
});
let db = emptyDb();

function query(result) {
  const chain = { select: () => chain, sort: () => chain, lean: () => Promise.resolve(result) };
  return chain;
}
const inList = (value, spec) => !spec || !spec.$in || spec.$in.includes(value);

StartupProfile.findOne = (q) =>
  query(db.profiles.find((p) => p.applicationId === q.applicationId && String(p.founderId) === String(q.founderId)) ? { _id: 'p' } : null);
StartupProfile.find = (q) => query(db.profiles.filter((p) => String(p.founderId) === String(q.founderId)));
MentorAllocation.findOne = (q) => query(db.allocations.find((a) => a.projectId === q.projectId) || null);
FacultyProject.findOne = () => query(db.project || { title: 'Test project' });
User.findOne = () => query(db.mentorUser);
User.findById = (id) => query(db.users[id] || null);

FacultyMeeting.find = (q = {}) => query(db.meetings.filter((m) => inList(m.projectId, q.projectId)));
FacultyMeeting.findOne = (q) =>
  query(db.meetings.find((m) => m.projectId === q.projectId && m.date === q.date && m.startTime === q.startTime && m.invitationStatus === q.invitationStatus) || null);
FacultyMeeting.countDocuments = async (q) => db.meetings.filter((m) => m.projectId === q.projectId && m.invitationStatus === q.invitationStatus).length;
FacultyMeeting.prototype.save = async function save() {
  db.meetings.push(this.toObject());
  return this;
};

FacultyTask.find = (q = {}) => query(db.tasks.filter((t) => inList(t.projectId, q.projectId) && (!q.assignedRole || t.assignedRole === q.assignedRole)));
FacultyTask.findOne = async (q) => {
  const hit = db.tasks.find((t) => t.id === q.id && t.assignedRole === q.assignedRole && inList(t.projectId, q.projectId));
  return hit ? Object.assign(hit, { save: async function save() { return this; } }) : null;
};
ReminderLog.find = (q) => query(db.reminders.filter((r) => r.kind === q.kind && q.refId.$in.includes(r.refId)));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.post('/__db', (request, response) => {
  db = { ...emptyDb(), ...request.body };
  response.json({ ok: true });
});
app.get('/__db', (_request, response) => response.json(db));
// Simulates a backend fault on the student routes only.
app.use('/api/student', (request, response, next) =>
  db.forceStatus ? response.status(db.forceStatus).json({ success: false, message: 'forced' }) : next()
);
app.use('/api/student', studentRouter);
// The admin decide flow calls this after approval; the stub has no profile sync, so it reports "not synced".
app.post('/api/admin/applications/:id/sync-startup', (_request, response) => response.status(404).json({ success: false }));

const port = Number(process.argv[2] || 5055);
app.listen(port, '127.0.0.1', () => console.log(`express stub (real student router) on ${port}`));
