const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// MongoDB Models
const FacultyProject = require('../models/FacultyProject');
const MentorAllocation = require('../models/MentorAllocation');
const FacultyMeeting = require('../models/FacultyMeeting');
const FacultyTask = require('../models/FacultyTask');
const SupportRequest = require('../models/SupportRequest');
const Announcement = require('../models/Announcement');
const { logAuditTrail } = require('../middleware/auditLogger');

const router = express.Router();

// Role-aware authentication with development fallback
router.use((req, res, next) => {
  let token = req.cookies?.aai_token;

  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace(/^Bearer\s+/i, '');
  }

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      if (['faculty', 'admin', 'super_admin'].includes(payload.role)) {
        req.user = {
          id: payload.sub,
          role: payload.role,
          email: payload.email || 'dr.raman@dbit.ac.in',
          name: payload.name || 'Faculty Coordinator',
        };
        return next();
      }
      return res.status(403).json({ success: false, message: 'Access denied: faculty or admin role required.' });
    } catch {
      // Token invalid or expired, continue to dev fallback
    }
  }

  // Development / Local incubation environment fallback so that faculty hub is immediately usable
  if (process.env.NODE_ENV !== 'production') {
    req.user = {
      id: new mongoose.Types.ObjectId('64d000000000000000000001'),
      role: 'faculty',
      email: 'dr.raman@dbit.ac.in',
      name: 'Dr. K. R. Raman',
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please sign in.',
  });
});

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

// ---------------------------------------------------------------------------
// DB Auto-Seeding Helper (Initializes DBITIC sample cohort if collections empty)
// ---------------------------------------------------------------------------
async function ensureSeedData() {
  try {
    const projectCount = await FacultyProject.countDocuments();
    if (projectCount === 0) {
      await FacultyProject.insertMany([
        {
          id: "proj-1",
          title: "AI-Driven Crop Disease Detection using CNNs",
          domain: "AgriTech / ML",
          stage: "Prototype",
          leadStudent: "Priya Sharma",
          rollNumber: "CSE21B042",
          department: "Computer Science",
          teamMembers: [
            { name: "Priya Sharma", rollNumber: "CSE21B042", email: "priya@student.dbit.ac.in", role: "Lead" },
            { name: "Siddharth Rao", rollNumber: "CSE21B049", email: "siddharth@student.dbit.ac.in", role: "ML Dev" },
          ],
          assignedCoordinatorName: "Dr. K. R. Raman",
          assignedVolunteerName: "Prof. Ananya Sen",
          allocatedMentorName: "Dr. Vikram Malhotra",
          trl: 5,
          progress: 74,
          health: "On Track",
          overdueMilestonesCount: 0,
          nextMilestone: "Field Pilot Validation in Nashik",
          nextMilestoneDate: "15 Nov 2026",
          description: "Edge deep convolutional network for visual plant leaf disease classification.",
        },
        {
          id: "proj-2",
          title: "Sugarcane Bagasse Biodegradable Packaging Formulation",
          domain: "GreenTech / Materials",
          stage: "Research",
          leadStudent: "Arjun Mehta",
          rollNumber: "CHEM22A018",
          department: "Chemical Tech",
          teamMembers: [
            { name: "Arjun Mehta", rollNumber: "CHEM22A018", email: "arjun@student.dbit.ac.in", role: "Materials" },
          ],
          assignedCoordinatorName: "Dr. K. R. Raman",
          assignedVolunteerName: "Prof. Ananya Sen",
          allocatedMentorName: null,
          trl: 3,
          progress: 38,
          health: "Needs Attention",
          overdueMilestonesCount: 1,
          nextMilestone: "ASTM Biodegradation Tests",
          nextMilestoneDate: "28 Oct 2026",
          description: "Composite natural binder packaging achieving 180-day biodegradation cycle.",
        },
        {
          id: "proj-3",
          title: "Smart IoT Water Quality Monitor with Edge Sensing",
          domain: "IoT / Environment",
          stage: "Validation",
          leadStudent: "Kavita Nair",
          rollNumber: "ECE21C077",
          department: "Electronics",
          teamMembers: [
            { name: "Kavita Nair", rollNumber: "ECE21C077", email: "kavita@student.dbit.ac.in", role: "Hardware" },
          ],
          assignedCoordinatorName: "Dr. K. R. Raman",
          assignedVolunteerName: "Prof. Rajiv Menon",
          allocatedMentorName: "Sanjay Singhal",
          trl: 6,
          progress: 88,
          health: "On Track",
          overdueMilestonesCount: 0,
          nextMilestone: "Municipal Water Board Commercial Trial",
          nextMilestoneDate: "10 Dec 2026",
          description: "Embedded signal processing sensor node for industrial effluent water safety assessment.",
        },
        {
          id: "proj-4",
          title: "Decentralized Electronic Health Records on Hyperledger",
          domain: "HealthTech / Blockchain",
          stage: "Ideation",
          leadStudent: "Rohan Das",
          rollNumber: "IT22D031",
          department: "Information Technology",
          teamMembers: [
            { name: "Rohan Das", rollNumber: "IT22D031", email: "rohan@student.dbit.ac.in", role: "Architecture" },
          ],
          assignedCoordinatorName: "Dr. K. R. Raman",
          assignedVolunteerName: "Prof. Ananya Sen",
          allocatedMentorName: null,
          trl: 2,
          progress: 20,
          health: "At Risk",
          overdueMilestonesCount: 2,
          nextMilestone: "Smart Contract POC Specification",
          nextMilestoneDate: "20 Oct 2026",
          description: "Zero-knowledge proof rollup health data sovereign records architecture.",
        },
      ]);
    }

    const mentorCount = await MentorAllocation.countDocuments();
    if (mentorCount === 0) {
      await MentorAllocation.insertMany([
        {
          id: "mr-1",
          projectId: "proj-2",
          projectTitle: "Sugarcane Bagasse Biodegradable Packaging Formulation",
          studentName: "Arjun Mehta",
          studentRollNo: "CHEM22A018",
          domain: "GreenTech / Materials",
          requestedExpertise: ["Biopolymer Scale-up", "Industrial Extrusion Tooling"],
          justification: "Team needs industry guidance on transitioning from 50g bench-scale samples to 5kg pilot runs.",
          recommendedMentorName: "Dr. Sunita Kapoor",
          recommendedMentorOrg: "Biopack Innovations Ltd.",
          recommendedByVolunteerName: "Prof. Ananya Sen",
          status: "recommended",
          coordinatorComment: "Reviewing company NDA before issuing official letter of mentorship.",
        },
        {
          id: "mr-2",
          projectId: "proj-4",
          projectTitle: "Decentralized Electronic Health Records on Hyperledger",
          studentName: "Rohan Das",
          studentRollNo: "IT22D031",
          domain: "HealthTech / Web3",
          requestedExpertise: ["Health Data Compliance (DISHA/HIPAA)", "Private Permissioned Blockchain Architecture"],
          justification: "Student is struggling to structure cryptographic keys across hospital and patient nodes.",
          status: "under_review",
        },
      ]);
    }

    const meetingCount = await FacultyMeeting.countDocuments();
    if (meetingCount === 0) {
      await FacultyMeeting.insertMany([
        {
          id: "meet-1",
          title: "Stage-3 Milestone Review: AgriTech Edge Accuracy",
          projectId: "proj-1",
          projectTitle: "AI-Driven Crop Disease Detection using CNNs",
          participants: ["Dr. K. R. Raman", "Prof. Ananya Sen", "Priya Sharma"],
          date: "2026-10-18",
          startTime: "14:00",
          durationMinutes: 45,
          meetingType: "Milestone Review",
          agenda: "Review benchmark confusion matrix across 10,000 leaf images.",
          meetingProvider: "In-Person (DBITIC Lab 402)",
          meetingLinkOrLocation: "DBIT Incubation Centre, Lab 402",
          invitationStatus: "Confirmed",
          notes: "Prior lab report accepted. Hardware verified.",
          attendanceLogged: true,
        },
      ]);
    }

    const taskCount = await FacultyTask.countDocuments();
    if (taskCount === 0) {
      await FacultyTask.insertMany([
        {
          id: "task-1",
          title: "Verify ASTM Biodegradation Lab Certificate",
          projectId: "proj-2",
          projectTitle: "Sugarcane Bagasse Biodegradable Packaging Formulation",
          assignedTo: "Prof. Ananya Sen",
          assignedRole: "volunteer",
          dueDate: "2026-10-20",
          priority: "High",
          status: "In Progress",
          description: "Check if testing facility complies with ISO 17025 accreditation.",
        },
      ]);
    }

    const supportCount = await SupportRequest.countDocuments();
    if (supportCount === 0) {
      await SupportRequest.insertMany([
        {
          id: "sr-1",
          projectId: "proj-4",
          projectTitle: "Decentralized Electronic Health Records",
          studentName: "Rohan Das",
          category: "Cloud Architecture",
          question: "We need access to the college server rack to deploy our 3-node Hyperledger test network.",
          submittedAt: "Yesterday at 11:20 AM",
          status: "Open",
        },
      ]);
    }
  } catch (err) {
    console.error('[Faculty Seed] Seed check error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// GET /api/faculty/overview
// ---------------------------------------------------------------------------
router.get('/overview', async (req, res) => {
  try {
    await ensureSeedData();

    const [projects, mentorRequests, meetings, tasks] = await Promise.all([
      FacultyProject.find().lean(),
      MentorAllocation.find().lean(),
      FacultyMeeting.find().lean(),
      FacultyTask.find().lean(),
    ]);

    const metrics = {
      activeProjects: projects.length,
      totalStudents: projects.reduce((acc, p) => acc + (p.teamMembers ? p.teamMembers.length : 1), 0),
      pendingMentorRequests: mentorRequests.filter(m => m.status === 'requested' || m.status === 'recommended' || m.status === 'under_review').length,
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
// GET /api/faculty/projects
// ---------------------------------------------------------------------------
router.get('/projects', async (req, res) => {
  try {
    await ensureSeedData();
    const projects = await FacultyProject.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/faculty/mentor-allocations
// ---------------------------------------------------------------------------
router.get('/mentor-allocations', async (req, res) => {
  try {
    await ensureSeedData();
    const allocations = await MentorAllocation.find().sort({ createdAt: -1 }).lean();
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
        studentName: proj?.leadStudent || req.body.studentName || 'Student Founder',
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
        email: req.user.email || 'faculty@dbit.ac.in',
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
      if (req.body.decision === 'approved' && req.body.allocatedMentorName) {
        item.allocatedMentorName = req.body.allocatedMentorName;
        // Update associated project
        await FacultyProject.updateOne(
          { id: item.projectId },
          { $set: { allocatedMentorName: req.body.allocatedMentorName } }
        );
      }
      await item.save();

      logAuditTrail({
        userId: req.user.id,
        email: req.user.email || 'faculty@dbit.ac.in',
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
    await ensureSeedData();
    const meetings = await FacultyMeeting.find().sort({ createdAt: -1 }).lean();
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
// GET & POST /api/faculty/tasks
// ---------------------------------------------------------------------------
router.get('/tasks', async (req, res) => {
  try {
    await ensureSeedData();
    const tasks = await FacultyTask.find().sort({ createdAt: -1 }).lean();
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
    await ensureSeedData();
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

module.exports = router;
