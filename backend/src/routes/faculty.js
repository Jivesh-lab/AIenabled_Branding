const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// MongoDB Models
const FacultyProject = require('../models/FacultyProject');
const MentorAllocation = require('../models/MentorAllocation');
const FacultyMeeting = require('../models/FacultyMeeting');
const FacultyTask = require('../models/FacultyTask');
const SupportRequest = require('../models/SupportRequest');
const Announcement = require('../models/Announcement');
const StartupProfile = require('../models/StartupProfile');
const { logAuditTrail } = require('../middleware/auditLogger');
const { syncAgentApplications, updateAgentApplicationStatus } = require('../services/agentBridgeService');
const MentorMatchingRun = require('../models/MentorMatchingRun');
const WorkflowExecution = require('../models/WorkflowExecution');
const MonitoringReport = require('../models/MonitoringReport');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Real authentication only: the shared middleware verifies the token and the user's
// current status in the database. There is no implicit identity (see DEV_AUTH_FALLBACK in auth.js).
router.use(authenticate, requireRole('faculty', 'admin'));

// Manual agent runs are an override for Super Admins. The agents run by themselves on events and schedules.
function superAdminOnly(req, res, next) {
  if (req.user && req.user.role === 'super_admin') return next();
  return res.status(403).json({ success: false, message: 'The agents run automatically. Manual runs are limited to Super Admins (Run now - override).' });
}

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
}


    // Automatically bridge any approved startups into the active Faculty Coordinator cohort
    try {
      const StartupProfile = require('../models/StartupProfile');
      const approvedProfiles = await StartupProfile.find({ isApproved: true }).lean();
      for (const sp of approvedProfiles) {
        const exists = await FacultyProject.findOne({ id: sp.applicationId || sp.id });
        if (!exists) {
          await FacultyProject.create({
            id: sp.applicationId || sp.id,
            title: sp.companyName || sp.title || 'Supervised Student Startup',
            description: sp.problemStatement || sp.tagline || 'Active incubation cohort startup.',
            leadStudent: sp.leadStudent || sp.contactEmail || 'Student Founder',
            rollNumber: sp.rollNumber || 'INC-2026',
            domain: sp.industry || sp.domain || 'Tech & Innovation',
            stage: 'Prototype',
            progress: 75,
            trl: 6,
            health: 'On Track',
            allocatedMentorName: sp.allocatedMentorName || null,
            assignedVolunteerName: 'Prof. Ananya Sen',
            nextMilestone: 'Prototype Milestone Review',
            nextMilestoneDate: '2026-11-20',
            overdueMilestonesCount: 0,
            teamMembers: [],
          });
        }
      }
    } catch (e) {
      console.warn('[Faculty Bridge] Could not sync StartupProfiles:', e.message);
    }

// A faculty coordinator only ever sees the startups assigned to them; admins and super admins see the centre.
async function scopeFor(user) {
  if (user.role !== 'faculty') return { project: {}, byProjectId: {} };
  const owned = await FacultyProject.find({ coordinatorUserId: String(user.id) }).select('id').lean();
  const ids = owned.map((p) => p.id);
  return { project: { id: { $in: ids } }, byProjectId: { projectId: { $in: ids } } };
}

// ---------------------------------------------------------------------------
// GET /api/faculty/overview
// ---------------------------------------------------------------------------
router.get('/overview', async (req, res) => {
  try {

    const scope = await scopeFor(req.user);
    const [projects, mentorRequests, meetings, tasks] = await Promise.all([
      FacultyProject.find(scope.project).sort({ updatedAt: -1, createdAt: -1 }).lean(),
      MentorAllocation.find(scope.byProjectId).lean(),
      FacultyMeeting.find(scope.byProjectId).lean(),
      FacultyTask.find(scope.byProjectId).lean(),
    ]);

    const metrics = {
      activeProjects: projects.length,
      totalStudents: projects.reduce((acc, p) => acc + (p.teamMembers ? p.teamMembers.length : 1), 0),
      pendingMentorRequests: mentorRequests.filter(m => m.status === 'requested' || m.status === 'recommended' || m.status === 'under_review').length,
      pendingMentorDecisions: await require('../agentic/approvals').countPending(req.user, { type: 'mentor_allocation' }),
      upcomingMeetings: meetings.filter(m => m.invitationStatus !== 'Completed').length,
      pendingTasks: tasks.filter(t => t.status !== 'Completed').length,
      overdueMilestones: projects.reduce((acc, p) => acc + (p.overdueMilestonesCount || 0), 0),
    };

    res.json({
      success: true,
      data: {
        metrics,
        projects,
        mentorRequests,
        meetings,
        tasks,
      },
    });
  } catch (err) {
    console.error('[Faculty API] Overview error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving faculty overview' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/faculty/volunteers - volunteer faculty accounts and how many of the visible startups each advises
// ---------------------------------------------------------------------------
router.get('/volunteers', async (req, res) => {
  try {
    const User = require('../models/User');
    const scope = await scopeFor(req.user);
    const [people, projects] = await Promise.all([
      User.find({ role: 'faculty', facultyRole: 'volunteer', status: 'active', isSoftDeleted: { $ne: true } }).select('_id name profile').lean(),
      FacultyProject.find(scope.project).select('assignedVolunteerName').lean(),
    ]);
    const clean = (name) => String(name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    res.json({
      success: true,
      data: people.map((u) => {
        const active = projects.filter((p) => clean(p.assignedVolunteerName).toLowerCase() === clean(u.name).toLowerCase()).length;
        return {
          id: String(u._id),
          name: clean(u.name),
          dept: u.profile?.department || '',
          activeProjects: active,
          specialization: Array.isArray(u.profile?.researchAreas) ? u.profile.researchAreas.join(', ') : u.profile?.specialization || '',
          workloadStatus: active >= 4 ? 'Full' : active >= 2 ? 'Optimal' : 'Available',
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/faculty/projects
// ---------------------------------------------------------------------------
router.get('/projects', async (req, res) => {
  try {
    await ensureSeedData();
    const scope = await scopeFor(req.user);
    const projects = await FacultyProject.find(scope.project).sort({ updatedAt: -1, createdAt: -1 }).lean();
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/faculty/projects/:id/decision
// Direct project review decision by Coordinator / Faculty
// ---------------------------------------------------------------------------
router.put(
  '/projects/:id/decision',
  [
    body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const proj = await FacultyProject.findOne({ id: req.params.id });
      if (!proj) {
        return res.status(404).json({ success: false, message: 'Faculty project not found.' });
      }

      if (req.body.decision === 'approved') {
        const mentorName = req.body.allocatedMentorName || proj.allocatedMentorName || null;
        proj.stage = 'Prototype';
        proj.progress = mentorName ? 75 : 60;
        proj.health = 'On Track';
        if (mentorName) proj.allocatedMentorName = mentorName;
        await proj.save();

        await StartupProfile.updateOne(
          { applicationId: proj.id },
          { $set: { isApproved: true, status: 'active', stage: 'prototype' } }
        );

        updateAgentApplicationStatus(
          proj.id,
          'approved',
          req.user?.id || 'faculty-coordinator',
          req.body.comment || 'Application approved by Faculty Coordinator'
        );
      } else {
        proj.health = 'At Risk';
        await proj.save();
        updateAgentApplicationStatus(
          proj.id,
          'rejected',
          req.user?.id || 'faculty-coordinator',
          req.body.comment || 'Application rejected by Faculty'
        );
      }

      res.json({ success: true, message: `Project ${req.body.decision} successfully.`, data: proj });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/faculty/projects/:id/assign-volunteer
// Coordinator assigns or reassigns supervising faculty volunteer
// ---------------------------------------------------------------------------
router.put(
  '/projects/:id/assign-volunteer',
  [
    body('volunteerName').notEmpty().withMessage('Volunteer name is required'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const proj = await FacultyProject.findOneAndUpdate(
        { id: req.params.id },
        { $set: { assignedVolunteerName: req.body.volunteerName } },
        { new: true }
      );
      if (!proj) return res.status(404).json({ success: false, message: 'Faculty project not found.' });
      res.json({ success: true, message: `Volunteer ${req.body.volunteerName} assigned to project.`, data: proj });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/faculty/mentor-allocations
// ---------------------------------------------------------------------------
router.get('/mentor-allocations', async (req, res) => {
  try {
    const scope = await scopeFor(req.user);
    const allocations = await MentorAllocation.find(scope.byProjectId).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: allocations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/faculty/mentor-allocations
// ---------------------------------------------------------------------------
router.post(
  '/mentor-allocations',
  [
    body('projectId').notEmpty().withMessage('Project ID is required'),
    body('justification').isLength({ min: 5 }).withMessage('Justification must be at least 5 chars'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const proj = await FacultyProject.findOne({ id: req.body.projectId });

      const newRecord = new MentorAllocation({
        id: `mr-${Date.now()}`,
        projectId: req.body.projectId,
        projectTitle: proj?.title || 'Incubation Project',
        studentName: proj?.leadStudent || req.body.studentName || '',
        studentRollNo: proj?.rollNumber || '',
        domain: proj?.domain || '',
        requestedExpertise: req.body.requestedExpertise || [],
        justification: req.body.justification,
        recommendedMentorName: req.body.recommendedMentorName || null,
        recommendedMentorOrg: req.body.recommendedMentorOrg || null,
        recommendedByVolunteerName: req.body.recommendedByVolunteerName || 'Faculty Volunteer',
        status: req.body.recommendedMentorName ? 'recommended' : 'requested',
      });

      await newRecord.save();

      logAuditTrail({
        userId: req.user.id,
        email: req.user.email || '',
        role: req.user.role,
        action: 'CREATE_MENTOR_ALLOCATION_REQUEST',
        resource: 'mentor_allocations',
        details: { requestId: newRecord.id, projectTitle: newRecord.projectTitle },
      });

      res.status(201).json({
        success: true,
        message: 'Mentor allocation request submitted successfully to MongoDB.',
        data: newRecord,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/faculty/mentor-allocations/:id/decide
// Coordinator-only decision endpoint
// ---------------------------------------------------------------------------
router.put(
  '/mentor-allocations/:id/decide',
  [
    body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const item = await MentorAllocation.findOne({ id: req.params.id });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Mentor allocation request not found.' });
      }

      item.status = req.body.decision;
      item.coordinatorComment = req.body.comment || '';
      const assigned = req.body.allocatedMentorName || item.recommendedMentorName || item.allocatedMentorName || 'Vikramaditya Rao';

      if (req.body.decision === 'approved') {
        item.allocatedMentorName = assigned;

        // 1. Update associated FacultyProject
        await FacultyProject.updateOne(
          { id: item.projectId },
          {
            $set: {
              allocatedMentorName: assigned,
              stage: 'Prototype',
              progress: 75,
              health: 'On Track',
              nextMilestone: 'Prototype Milestone & Mentor Review',
              nextMilestoneDate: '2026-11-20',
            },
          }
        );

        // 2. Update StartupProfile
        await StartupProfile.updateOne(
          { applicationId: item.projectId },
          { $set: { isApproved: true, status: 'active', stage: 'prototype' } }
        );

        // 3. Update agent-service / SQLite applications so student workspace sees APPROVED
        updateAgentApplicationStatus(
          item.projectId,
          'approved',
          req.user?.id || 'faculty-coordinator',
          req.body.comment || 'Mentor allocated and application approved by Faculty Coordinator'
        );
      } else if (req.body.decision === 'rejected') {
        await FacultyProject.updateOne(
          { id: item.projectId },
          { $set: { allocatedMentorName: null } }
        );
      }
      await item.save();

      if (req.body.decision === 'approved') {
        await enqueueEvent({
          eventType: 'mentor.allocation.approved',
          aggregateType: 'mentor_allocation',
          aggregateId: item.id,
          projectId: item.projectId,
          actorId: req.user.id,
          idempotencyKey: `mentor-allocation-approved:${item.id}`,
          payload: {
            projectTitle: item.projectTitle,
            allocatedMentorName: item.allocatedMentorName,
            participants: [item.studentName, item.allocatedMentorName].filter(Boolean),
          },
        });
      }

      logAuditTrail({
        userId: req.user.id,
        email: req.user.email || '',
        role: req.user.role,
        action: req.body.decision === 'approved' ? 'AUTHORIZE_MENTOR_ALLOCATION' : 'REJECT_MENTOR_ALLOCATION',
        resource: 'mentor_allocations',
        details: { id: item.id, decision: req.body.decision, comment: req.body.comment },
      });

      res.json({
        success: true,
        message: `Mentor allocation request ${req.body.decision} successfully in MongoDB.`,
        data: item,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET & POST /api/faculty/meetings
// ---------------------------------------------------------------------------
router.get('/meetings', async (req, res) => {
  try {
    const scope = await scopeFor(req.user);
    const meetings = await FacultyMeeting.find(scope.byProjectId).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  '/meetings',
  [
    body('title').notEmpty().withMessage('Meeting title is required'),
    body('projectId').notEmpty().withMessage('Project ID is required'),
    body('date').notEmpty().withMessage('Meeting date is required'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const proj = await FacultyProject.findOne({ id: req.body.projectId });

      const newMeeting = new FacultyMeeting({
        id: `meet-${Date.now()}`,
        title: req.body.title,
        projectId: req.body.projectId,
        projectTitle: proj?.title || 'Incubation Project',
        participants: req.body.participants || ['Faculty Coordinator', proj?.leadStudent || 'Student'],
        date: req.body.date,
        startTime: req.body.startTime || '14:00',
        durationMinutes: req.body.durationMinutes || 45,
        meetingType: req.body.meetingType || 'Milestone Review',
        agenda: req.body.agenda || '',
        meetingProvider: req.body.meetingProvider || 'In-Person (DBITIC Lab 402)',
        meetingLinkOrLocation: req.body.meetingLinkOrLocation || 'DBIT Incubation Centre, Lab 402',
        invitationStatus: 'Sent',
      });

      await newMeeting.save();
      await enqueueEvent({
        eventType: 'meeting.confirmed',
        aggregateType: 'meeting',
        aggregateId: newMeeting.id,
        projectId: newMeeting.projectId,
        actorId: req.user.id,
        idempotencyKey: `meeting-confirmed:${newMeeting.id}`,
        payload: { title: newMeeting.title, date: newMeeting.date, startTime: newMeeting.startTime },
      });

      res.status(201).json({
        success: true,
        message: 'Meeting scheduled and saved in MongoDB.',
        data: newMeeting,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/faculty/meetings/:id
// Update meeting review notes, attendance, or status
// ---------------------------------------------------------------------------
router.put('/meetings/:id', async (req, res) => {
  try {
    const meeting = await FacultyMeeting.findOne({ id: req.params.id });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found.' });
    }
    if (req.body.notes !== undefined) meeting.notes = req.body.notes;
    if (req.body.attendanceLogged !== undefined) meeting.attendanceLogged = req.body.attendanceLogged;
    if (req.body.invitationStatus) meeting.invitationStatus = req.body.invitationStatus;
    await meeting.save();
    res.json({ success: true, message: 'Meeting updated in MongoDB.', data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET & POST /api/faculty/tasks
// ---------------------------------------------------------------------------
router.get('/tasks', async (req, res) => {
  try {
    const scope = await scopeFor(req.user);
    const tasks = await FacultyTask.find(scope.byProjectId).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  '/tasks',
  [
    body('title').notEmpty().withMessage('Task title is required'),
    body('projectId').notEmpty().withMessage('Project ID is required'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const proj = await FacultyProject.findOne({ id: req.body.projectId });

      const newTask = new FacultyTask({
        id: `task-${Date.now()}`,
        title: req.body.title,
        projectId: req.body.projectId,
        projectTitle: proj?.title || 'Incubation Project',
        assignedTo: req.body.assignedTo || 'Faculty Volunteer',
        assignedRole: req.body.assignedRole || 'volunteer',
        dueDate: req.body.dueDate || '2026-10-31',
        priority: req.body.priority || 'Medium',
        status: 'Pending',
        description: req.body.description || '',
      });

      await newTask.save();
      await enqueueEvent({
        eventType: 'task.created',
        aggregateType: 'task',
        aggregateId: newTask.id,
        projectId: newTask.projectId,
        actorId: req.user.id,
        idempotencyKey: `task-created:${newTask.id}`,
        payload: { title: newTask.title, assignedTo: newTask.assignedTo, dueDate: newTask.dueDate },
      });

      res.status(201).json({
        success: true,
        message: 'Task created and stored in MongoDB.',
        data: newTask,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.put('/tasks/:id/status', async (req, res) => {
  try {
    const task = await FacultyTask.findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    task.status = req.body.status || 'Completed';
    await task.save();
    await enqueueEvent({
      eventType: task.status === 'Completed' ? 'task.completed' : 'task.updated',
      aggregateType: 'task',
      aggregateId: task.id,
      projectId: task.projectId,
      actorId: req.user.id,
      idempotencyKey: `task-status:${task.id}:${task.status}:${task.updatedAt?.getTime?.() || Date.now()}`,
      payload: { status: task.status, title: task.title },
    });
    res.json({ success: true, message: 'Task status updated.', data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET & RESPOND /api/faculty/support-requests
// ---------------------------------------------------------------------------
router.get('/support-requests', async (req, res) => {
  try {
    const requests = await SupportRequest.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/support-requests/:id/respond', async (req, res) => {
  try {
    const item = await SupportRequest.findOne({ id: req.params.id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inquiry not found.' });
    }
    item.status = 'Resolved';
    item.volunteerResponse = req.body.response;
    await item.save();

    res.json({ success: true, message: 'Advisory guidance response saved.', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/faculty/announcements
// ---------------------------------------------------------------------------
router.post(
  '/announcements',
  [
    body('title').notEmpty().withMessage('Announcement title is required'),
    body('body').notEmpty().withMessage('Announcement body is required'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const authorId = mongoose.Types.ObjectId.isValid(req.user.id)
        ? req.user.id
        : new mongoose.Types.ObjectId();

      const ann = new Announcement({
        title: req.body.title,
        body: req.body.body,
        targetRole: req.body.targetRole || 'all',
        priority: req.body.priority || 'normal',
        authorId,
        authorName: req.user.name || 'Faculty Coordinator',
      });

      await ann.save();

      res.status(201).json({
        success: true,
        message: 'Announcement published successfully to MongoDB.',
        data: ann,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


// ===========================================================================
// AI AGENT HUBS: MENTOR-MATCHING, WORKFLOW AUTOMATION, STARTUP MONITORING
// ===========================================================================
const agentHubService = require('../services/agentHubService');
const { enqueueEvent } = require('../services/eventOrchestrator');
const DomainEvent = require('../models/DomainEvent');

// 1. AI MENTOR MATCHING
router.get('/agent-events', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.projectId && req.query.projectId !== 'all') filter.projectId = req.query.projectId;

    if (req.user.role === 'faculty') {
      const assigned = await FacultyProject.find({ assignedCoordinatorName: req.user.name }).select('id').lean();
      filter.projectId = { $in: assigned.map((project) => project.id) };
    }

    const events = await DomainEvent.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.post('/agent-events/:id/reprocess', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await DomainEvent.findOne({
      $or: [{ eventId: id }, ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])],
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    if (!['failed', 'dead_letter'].includes(event.status)) {
      return res.status(400).json({ success: false, message: `Only failed or dead_letter events can be reprocessed (current: ${event.status})` });
    }

    event.status = 'pending';
    event.attempts = 0;
    event.nextAttemptAt = new Date();
    event.lastError = null;
    await event.save();

    const { processOneEvent } = require('../services/eventOrchestrator');
    const result = await processOneEvent();

    const updated = await DomainEvent.findById(event._id).lean();
    return res.json({ success: true, message: 'Event reprocessed successfully', event: updated, processResult: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/mentor-matching/startups', async (req, res) => {
  try {
    let startups = await agentHubService.getStartupsForMatching();
    if (req.user.role === 'faculty') {
      const coordinatorName = req.user.name || 'Faculty';
      const lastName = coordinatorName.split(' ').pop().toLowerCase();
      startups = startups.filter(s => 
        !s.assignedCoordinatorName || 
        s.assignedCoordinatorName.toLowerCase().includes(lastName) ||
        s.assignedCoordinatorName === coordinatorName
      );
    }
    res.json({ success: true, data: startups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/mentor-matching/run', superAdminOnly, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }
    if (req.user.role === 'faculty') {
      const project = await FacultyProject.findOne({ id: projectId });
      if (project && project.assignedCoordinatorName) {
        const coordinatorName = req.user.name || 'Faculty';
        const lastName = coordinatorName.split(' ').pop().toLowerCase();
        if (!project.assignedCoordinatorName.toLowerCase().includes(lastName)) {
          return res.status(403).json({ success: false, message: 'Access denied: You are not the assigned coordinator for this startup.' });
        }
      }
    }
    const run = await agentHubService.runMentorMatching({ projectId, actor: req.user });
    res.status(201).json({ success: true, data: run });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/mentor-matching/runs', async (req, res) => {
  try {
    const runs = await agentHubService.getMentorMatchingRuns(req.query.projectId);
    res.json({ success: true, data: runs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/mentor-matching/runs/:id/decide', async (req, res) => {
  try {
    // Only Faculty Coordinators can confirm mentor allocations
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Mentor allocation approvals are restricted to authorized Faculty Coordinators.',
      });
    }
    const { decision, selectedMentorId, selectedMentorName, comments } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
    }
    const updated = await agentHubService.decideMentorRecommendation({
      runId: req.params.id,
      decision,
      selectedMentorId,
      selectedMentorName,
      comments,
      actor: req.user,
    });
    res.json({ success: true, message: `Recommendation successfully ${decision}.`, data: updated });
  } catch (err) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. AI WORKFLOW AUTOMATION
router.get('/workflow/executions', async (req, res) => {
  try {
    const { projectId, actionType, status } = req.query;
    if (req.user.role === 'faculty' && !projectId) {
      const coordinatorName = req.user.name || 'Faculty';
      const lastName = coordinatorName.split(' ').pop().toLowerCase();
      const myProjects = await FacultyProject.find({
        $or: [
          { assignedCoordinatorName: { $regex: lastName, $options: 'i' } },
          { assignedCoordinatorName: coordinatorName }
        ]
      }).select('id').lean();
      const myProjectIds = myProjects.map(p => p.id);
      const executions = await WorkflowExecution.find({
        ...(myProjectIds.length > 0 ? { projectId: { $in: myProjectIds } } : {}),
        ...(actionType ? { actionType } : {}),
        ...(status ? { status } : {}),
      }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: executions });
    }
    const executions = await agentHubService.getWorkflowExecutions({ projectId, actionType, status });
    res.json({ success: true, data: executions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/workflow/coordinate', async (req, res) => {
  try {
    const { action_type, project_id, project_title, target_id, target_name, target_role, target_email, payload } = req.body;
    if (!action_type || !target_id) {
      return res.status(400).json({ success: false, message: 'action_type and target_id are required' });
    }
    const exec = await agentHubService.coordinateWorkflowAction({
      actionType: action_type,
      projectId: project_id,
      projectTitle: project_title,
      targetId: target_id,
      targetName: target_name,
      targetRole: target_role,
      targetEmail: target_email,
      payload: payload || {},
      actor: req.user,
    });
    res.status(201).json({ success: true, message: 'Workflow action coordinated and confirmed.', data: exec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/workflow/executions/:id/retry', async (req, res) => {
  try {
    const exec = await agentHubService.retryWorkflowExecution({
      executionId: req.params.id,
      actor: req.user,
    });
    res.json({ success: true, message: 'Workflow action retried successfully.', data: exec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/workflow/executions/:id/cancel', async (req, res) => {
  try {
    const exec = await agentHubService.cancelWorkflowExecution({
      executionId: req.params.id,
      actor: req.user,
    });
    res.json({ success: true, message: 'Workflow action cancelled.', data: exec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. AI STARTUP MONITORING
router.get('/monitoring/overview', async (req, res) => {
  try {
    let overview = await agentHubService.getMonitoringOverview();
    if (req.user.role === 'faculty') {
      const coordinatorName = req.user.name || 'Faculty';
      const lastName = coordinatorName.split(' ').pop().toLowerCase();
      const myProjects = await FacultyProject.find({
        $or: [
          { assignedCoordinatorName: { $regex: lastName, $options: 'i' } },
          { assignedCoordinatorName: coordinatorName }
        ]
      }).lean();
      const myProjectIds = new Set(myProjects.map(p => p.id));
      
      const filteredReports = (overview.reports || []).filter(r => myProjectIds.has(r.projectId));
      overview = {
        totalStartups: myProjects.length,
        onTrackCount: myProjects.filter(p => p.health === 'On Track').length,
        needsAttentionCount: myProjects.filter(p => p.health === 'Needs Attention').length,
        atRiskCount: myProjects.filter(p => p.health === 'At Risk').length,
        activeAlertsCount: filteredReports.filter(r => r.healthStatus !== 'On Track').length,
        reports: filteredReports,
      };
    }
    res.json({ success: true, data: overview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/monitoring/reports', async (req, res) => {
  try {
    const { projectId, healthStatus } = req.query;
    if (req.user.role === 'faculty' && !projectId) {
      const coordinatorName = req.user.name || 'Faculty';
      const lastName = coordinatorName.split(' ').pop().toLowerCase();
      const myProjects = await FacultyProject.find({
        $or: [
          { assignedCoordinatorName: { $regex: lastName, $options: 'i' } },
          { assignedCoordinatorName: coordinatorName }
        ]
      }).select('id').lean();
      const myProjectIds = myProjects.map(p => p.id);
      const reports = await MonitoringReport.find({
        ...(myProjectIds.length > 0 ? { projectId: { $in: myProjectIds } } : {}),
        ...(healthStatus ? { healthStatus } : {}),
      }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: reports });
    }
    const reports = await agentHubService.getMonitoringReports({ projectId, healthStatus });
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/monitoring/evaluate', superAdminOnly, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }
    const report = await agentHubService.evaluateStartupMonitoring({
      projectId,
      actor: req.user,
    });
    res.status(201).json({ success: true, message: 'Startup health evaluation completed.', data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/monitoring/portfolio', superAdminOnly, async (req, res) => {
  try {
    const result = await agentHubService.evaluatePortfolioMonitoring({ actor: req.user });
    res.json({ success: true, message: 'Portfolio-wide monitoring evaluation completed.', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/monitoring/reports/:id/acknowledge', async (req, res) => {
  try {
    const report = await agentHubService.acknowledgeMonitoringAlert({
      reportId: req.params.id,
      actor: req.user,
      notes: req.body.notes,
    });
    res.json({ success: true, message: 'Alert acknowledged.', data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/monitoring/reports/:id/intervene', async (req, res) => {
  try {
    const { interventionId, assignedTo, customTitle } = req.body;
    if (!interventionId) {
      return res.status(400).json({ success: false, message: 'interventionId is required' });
    }
    const result = await agentHubService.assignMonitoringIntervention({
      reportId: req.params.id,
      interventionId,
      assignedTo,
      customTitle,
      actor: req.user,
    });
    res.status(201).json({ success: true, message: 'Intervention coordinated and workflow task created.', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

