const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const StartupProfile = require('../models/StartupProfile');
const MentorAllocation = require('../models/MentorAllocation');
const FacultyProject = require('../models/FacultyProject');
const User = require('../models/User');

const router = express.Router();

// ---------------------------------------------------------------------------
// Strict student authentication.
//
// Unlike middleware/auth.js and the faculty router, there is NO development fallback here: a request
// without a valid student token is rejected, never treated as an admin/faculty user. Super-admin is
// not given a bypass either - these endpoints return a student's own private records.
// ---------------------------------------------------------------------------
function studentOnly(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, message: 'Server authentication is not configured.' });
  }

  let token = req.cookies?.aai_token;
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace(/^Bearer\s+/i, '');
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    return res.status(401).json({ success: false, message: 'Your session is invalid or has expired.' });
  }

  if (payload.role !== 'student' || !payload.sub) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  req.user = { id: String(payload.sub), role: 'student' };
  return next();
}

const CONFIRMED_STATUSES = ['approved', 'allocated'];
const RECOMMENDATION_STATUSES = ['recommended', 'under_review'];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whitelisted, student-safe view of an allocated mentor's account profile (if they have one). */
async function mentorContact(name) {
  if (!name) return null;
  const user = await User.findOne({
    role: 'mentor',
    name: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i'),
    status: 'active',
    isSoftDeleted: { $ne: true },
  })
    .select('name email profile')
    .lean();
  if (!user) return null;

  const profile = user.profile || {};
  const expertise = Array.isArray(profile.expertise)
    ? profile.expertise.filter((e) => typeof e === 'string')
    : typeof profile.expertise === 'string'
      ? profile.expertise.split(',').map((e) => e.trim()).filter(Boolean)
      : [];
  return {
    email: user.email || null,
    organization: typeof profile.organization === 'string' ? profile.organization : null,
    bio: typeof profile.bio === 'string' ? profile.bio : null,
    expertise,
  };
}

// ---------------------------------------------------------------------------
// GET /api/student/mentor-allocation/:applicationId
//
// The caller must be the founder recorded on the synced StartupProfile for that application.
// 404 means "no mentoring record is reachable for you" (missing OR not yours - indistinguishable on
// purpose). 200 with allocation:null means the project is yours but no mentor request exists yet.
// ---------------------------------------------------------------------------
router.get('/mentor-allocation/:applicationId', studentOnly, async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!/^[A-Za-z0-9-]{1,64}$/.test(applicationId) || !mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(404).json({ success: false, message: 'No mentoring record is available for this application.' });
    }

    const owned = await StartupProfile.findOne({ applicationId, founderId: req.user.id }).select('_id').lean();
    if (!owned) {
      return res.status(404).json({ success: false, message: 'No mentoring record is available for this application.' });
    }

    const [record, project] = await Promise.all([
      MentorAllocation.findOne({ projectId: applicationId }).sort({ updatedAt: -1 }).lean(),
      FacultyProject.findOne({ id: applicationId }).select('allocatedMentorName').lean(),
    ]);

    if (!record) {
      return res.json({ success: true, data: { applicationId, allocation: null } });
    }

    const confirmed = CONFIRMED_STATUSES.includes(record.status);
    const mentorName = confirmed ? record.allocatedMentorName || project?.allocatedMentorName || null : null;
    const contact = mentorName ? await mentorContact(mentorName) : null;

    return res.json({
      success: true,
      data: {
        applicationId,
        allocation: {
          status: record.status,
          requestedExpertise: record.requestedExpertise || [],
          // A recommendation is only a proposal until the coordinator approves it.
          recommendation:
            RECOMMENDATION_STATUSES.includes(record.status) && record.recommendedMentorName
              ? { name: record.recommendedMentorName, organization: record.recommendedMentorOrg || null }
              : null,
          mentor: confirmed ? { name: mentorName, contact } : null,
          updatedAt: record.updatedAt || null,
        },
      },
    });
  } catch (err) {
    console.error('[student] mentor-allocation error:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to load mentor allocation.' });
  }
});

// ===========================================================================
// Tasks, meetings and meeting requests
//
// Meetings and tasks live in the faculty collections (FacultyMeeting / FacultyTask), keyed by projectId, which
// equals the application id of an approved project. A student sees a record only if its projectId belongs to a
// StartupProfile they founded; there is no other way in.
// ===========================================================================
const FacultyMeeting = require('../models/FacultyMeeting');
const FacultyTask = require('../models/FacultyTask');
const ReminderLog = require('../models/ReminderLog');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const STUDENT_TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
const TASK_RANK = { Pending: 0, Overdue: 0, 'In Progress': 1, Completed: 2 };
const MAX_OPEN_REQUESTS_PER_PROJECT = 5;

async function ownedProjectIds(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return [];
  const profiles = await StartupProfile.find({ founderId: userId }).select('applicationId').lean();
  return profiles.map((p) => p.applicationId).filter(Boolean);
}

/** Latest reminder outcome per record. Only what was recorded: absence means "no reminder was attempted". */
async function reminderStates(kind, refIds) {
  if (refIds.length === 0) return {};
  const rows = await ReminderLog.find({ kind, refId: { $in: refIds } }).sort({ updatedAt: -1 }).lean();
  const states = {};
  for (const row of rows) {
    if (!states[row.refId]) states[row.refId] = { status: row.status, at: row.sentAt || row.updatedAt || null };
  }
  return states;
}

function meetingView(m, reminder) {
  return {
    id: m.id,
    title: m.title,
    projectId: m.projectId,
    projectTitle: m.projectTitle,
    date: m.date,
    startTime: m.startTime,
    durationMinutes: m.durationMinutes,
    timeZone: m.timeZone,
    meetingType: m.meetingType,
    agenda: m.agenda || '',
    provider: m.meetingProvider || '',
    location: m.meetingLinkOrLocation || '',
    invitationStatus: m.invitationStatus || '',
    participants: m.participants || [],
    // Notes are only released once the host has logged the meeting as held.
    notes: m.attendanceLogged ? m.notes || '' : null,
    attendanceLogged: Boolean(m.attendanceLogged),
    reminder: reminder || null,
  };
}

function taskView(t, reminder) {
  return {
    id: t.id,
    title: t.title,
    description: t.description || '',
    projectId: t.projectId,
    projectTitle: t.projectTitle,
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status,
    reminder: reminder || null,
  };
}

// GET /api/student/meetings - meetings of the caller's own projects
router.get('/meetings', studentOnly, async (req, res) => {
  try {
    const ids = await ownedProjectIds(req.user.id);
    if (ids.length === 0) return res.json({ success: true, data: [] });
    const meetings = await FacultyMeeting.find({ projectId: { $in: ids } }).sort({ date: 1, startTime: 1 }).lean();
    const reminders = await reminderStates('meeting', meetings.map((m) => m.id));
    return res.json({ success: true, data: meetings.map((m) => meetingView(m, reminders[m.id])) });
  } catch (err) {
    console.error('[student] meetings error:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to load meetings.' });
  }
});

// GET /api/student/tasks - tasks assigned to students on the caller's own projects
router.get('/tasks', studentOnly, async (req, res) => {
  try {
    const ids = await ownedProjectIds(req.user.id);
    if (ids.length === 0) return res.json({ success: true, data: [] });
    const tasks = await FacultyTask.find({ projectId: { $in: ids }, assignedRole: 'student' }).sort({ dueDate: 1 }).lean();
    const reminders = await reminderStates('task', tasks.map((t) => t.id));
    return res.json({ success: true, data: tasks.map((t) => taskView(t, reminders[t.id])) });
  } catch (err) {
    console.error('[student] tasks error:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to load tasks.' });
  }
});

// PUT /api/student/tasks/:id/status - progress a task that is assigned to the student's own project
router.put('/tasks/:id/status', studentOnly, async (req, res) => {
  try {
    const next = req.body?.status;
    if (!STUDENT_TASK_STATUSES.includes(next)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STUDENT_TASK_STATUSES.join(', ')}.` });
    }
    const ids = await ownedProjectIds(req.user.id);
    const task = ids.length ? await FacultyTask.findOne({ id: req.params.id, assignedRole: 'student', projectId: { $in: ids } }) : null;
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const current = task.status;
    if (current === next) return res.json({ success: true, data: taskView(task) }); // idempotent repeat
    if ((TASK_RANK[next] ?? 0) < (TASK_RANK[current] ?? 0)) {
      return res.status(409).json({ success: false, message: `A ${current} task cannot be moved back to ${next}. Ask your coordinator to reopen it.` });
    }
    task.status = next;
    await task.save();
    return res.json({ success: true, data: taskView(task) });
  } catch (err) {
    console.error('[student] task status error:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to update the task.' });
  }
});

// POST /api/student/meeting-requests - ask for a meeting on an owned project. Creates an UNCONFIRMED request
// (invitationStatus "Requested") in the existing meeting collection; the host schedules it.
router.post('/meeting-requests', studentOnly, async (req, res) => {
  try {
    const { projectId, date, startTime = '', agenda = '' } = req.body || {};
    const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
    const limit = new Date(Date.now() + 5.5 * 3600000 + 365 * 86400000).toISOString().slice(0, 10);

    if (typeof projectId !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(projectId)) {
      return res.status(400).json({ success: false, message: 'Choose a project.' });
    }
    if (typeof date !== 'string' || !ISO_DATE.test(date) || date < today || date > limit) {
      return res.status(400).json({ success: false, message: 'Choose a preferred date from today to one year ahead.' });
    }
    if (startTime !== '' && !CLOCK.test(startTime)) {
      return res.status(400).json({ success: false, message: 'Enter the time as HH:MM.' });
    }
    if (typeof agenda !== 'string' || agenda.length > 500) {
      return res.status(400).json({ success: false, message: 'Keep the agenda under 500 characters.' });
    }

    const ids = await ownedProjectIds(req.user.id);
    if (!ids.includes(projectId)) {
      return res.status(404).json({ success: false, message: 'No mentoring record is available for this project.' });
    }

    const duplicate = await FacultyMeeting.findOne({ projectId, date, startTime, invitationStatus: 'Requested' }).lean();
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'You have already requested a meeting for that date and time.' });
    }
    const open = await FacultyMeeting.countDocuments({ projectId, invitationStatus: 'Requested' });
    if (open >= MAX_OPEN_REQUESTS_PER_PROJECT) {
      return res.status(429).json({ success: false, message: 'You have too many open meeting requests for this project. Wait for them to be scheduled.' });
    }

    const [project, user] = await Promise.all([
      FacultyProject.findOne({ id: projectId }).select('title').lean(),
      User.findById(req.user.id).select('name').lean(),
    ]);

    const meeting = new FacultyMeeting({
      id: `meet-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: 'Meeting request',
      projectId,
      projectTitle: project?.title || 'Incubation Project',
      participants: user?.name ? [user.name] : [],
      date,
      startTime,
      meetingType: 'Student request',
      agenda: agenda.trim(),
      meetingProvider: 'To be confirmed',
      meetingLinkOrLocation: '',
      invitationStatus: 'Requested',
    });
    await meeting.save();
    return res.status(201).json({ success: true, data: meetingView(meeting) });
  } catch (err) {
    console.error('[student] meeting request error:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to send the meeting request.' });
  }
});

module.exports = router;
module.exports.studentOnly = studentOnly;
