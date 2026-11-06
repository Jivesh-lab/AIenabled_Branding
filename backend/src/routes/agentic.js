const express = require('express');
const FacultyProject = require('../models/FacultyProject');
const FacultyMeeting = require('../models/FacultyMeeting');
const FacultyTask = require('../models/FacultyTask');
const MentorRequest = require('../models/MentorRequest');
const AgentNotification = require('../models/AgentNotification');
const AgentJob = require('../models/AgentJob');
const ActionLog = require('../models/ActionLog');
const DomainEvent = require('../models/DomainEvent');
const OutboxMessage = require('../models/OutboxMessage');
const InvestorIntroduction = require('../models/InvestorIntroduction');
const AgentDocument = require('../models/AgentDocument');
const Approval = require('../models/Approval');
const { authenticate, requireRole } = require('../middleware/auth');
const approvals = require('../agentic/approvals');
const access = require('../agentic/access');
const views = require('../agentic/views');
const jobs = require('../agentic/jobs');
const scheduler = require('../agentic/scheduler');
const mentorAgent = require('../agentic/agents/mentorAgent');
const workflowAgent = require('../agentic/agents/workflowAgent');
const investorAgent = require('../agentic/agents/investorAgent');
const monitoringAgent = require('../agentic/agents/monitoringAgent');
const assistant = require('../agentic/assistant');
const { integrationStatus } = require('../agentic/config');
const User = require('../models/User');
const { validateWindows, windowsFor } = require('../agentic/tools/workingHours');
const googleCalendar = require('../agentic/tools/google');
const { notify } = require('../agentic/tools/notify');
const { record } = require('../agentic/actionLog');
const py = require('../agentic/pythonClient');

const router = express.Router();
router.use(authenticate);

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    const status = error.status || (error.code === 'APPROVAL_REQUIRED' ? 403 : 500);
    if (status >= 500) console.error('[agentic]', req.method, req.path, error);
    res.status(status).json({ success: false, message: status >= 500 ? 'Something went wrong on our side. Please try again.' : error.message });
  }
};

function approvalView(a) {
  return {
    id: String(a._id), type: a.type, title: a.title, summary: a.summary, requestedBy: a.requestedBy, status: a.status, createdAt: a.createdAt, evidence: a.evidence,
    decidedByName: a.decidedByName, decidedAt: a.decidedAt, decisionComment: a.decisionComment, executionStatus: a.executionStatus, executionError: a.executionError, projectId: a.projectId,
  };
}

// ---------------------------------------------------------------------------
// Work feed pieces shared by every role home screen
// ---------------------------------------------------------------------------
router.get('/feed', wrap(async (req, res) => {
  const rows = await access.feedFor(req.user, { limit: req.query.limit, projectId: req.query.projectId, before: req.query.before });
  res.json({ success: true, data: rows.map(views.feedItem) });
}));

router.get('/approvals', wrap(async (req, res) => {
  const pending = await approvals.listPending(req.user, { type: req.query.type });
  res.json({ success: true, data: pending.map(approvalView) });
}));

router.post('/approvals/:id/decide', wrap(async (req, res) => {
  const { decision, comment } = req.body || {};
  const result = await approvals.decide({ approvalId: req.params.id, user: req.user, decision, comment });
  if (result.executionError) {
    return res.status(202).json({ success: true, partial: true, message: 'Your decision was saved, but carrying it out did not finish. It will be retried automatically.', data: approvalView(result.approval) });
  }
  res.json({ success: true, message: decision === 'approved' ? 'Approved. The agent is carrying it out.' : 'Rejected. Nothing was done.', data: approvalView(result.approval) });
}));

router.get('/attention', wrap(async (req, res) => {
  const states = ['escalated', 'failed', 'retrying'];
  const ids = await access.projectIdsFor(req.user);
  const filter = { state: { $in: states } };
  if (ids !== null) filter.projectId = { $in: ids };
  if (['student', 'mentor', 'investor'].includes(req.user.role)) return res.json({ success: true, data: [] });
  const found = await AgentJob.find(filter).sort({ updatedAt: -1 }).limit(30).lean();
  const items = [];
  for (const job of found) {
    const log = job.correlationId ? await ActionLog.find({ correlationId: job.correlationId }).sort({ createdAt: -1 }).limit(8).lean() : [];
    const project = job.projectId ? await FacultyProject.findOne({ id: job.projectId }).select('title').lean() : null;
    items.push({
      ...views.describeJob(job),
      startup: project?.title || null,
      problem: job.lastError ? 'The agent could not finish this step.' : views.describeJob(job).headline,
      attempts: log.map(views.feedItem).reverse(),
      state: job.state,
    });
  }
  res.json({ success: true, data: items });
}));

router.get('/my-agents', wrap(async (req, res) => {
  const open = await access.jobsFor(req.user);
  res.json({ success: true, data: open.map(views.describeJob) });
}));

router.get('/counts', wrap(async (req, res) => {
  const uid = String(req.user.id);
  const [unread, pendingApprovals, mentorRequests, openTasks] = await Promise.all([
    AgentNotification.countDocuments({ recipientUserId: uid, readAt: null }),
    approvals.countPending(req.user),
    req.user.role === 'mentor' ? MentorRequest.countDocuments({ mentorUserId: uid, status: 'pending' }) : 0,
    req.user.role === 'student' ? FacultyTask.countDocuments({ assignedUserId: uid, status: { $ne: 'Completed' } }) : 0,
  ]);
  const needsAttention = ['faculty', 'admin', 'super_admin'].includes(req.user.role)
    ? (await access.jobsFor(req.user, { states: ['escalated', 'failed'] })).length
    : 0;
  res.json({ success: true, data: { unreadNotifications: unread, pendingApprovals, mentorRequests, openTasks, needsAttention } });
}));

router.get('/timeline/:projectId', wrap(async (req, res) => {
  if (!(await access.canSeeProject(req.user, req.params.projectId))) return res.status(404).json({ success: false, message: 'Startup not found.' });
  const project = await FacultyProject.findOne({ id: req.params.projectId }).select('id title').lean();
  const rows = await ActionLog.find({ projectId: req.params.projectId }).sort({ createdAt: -1 }).limit(100).lean();
  const open = await AgentJob.find({ projectId: req.params.projectId, state: { $nin: ['done', 'failed'] } }).lean();
  res.json({ success: true, data: { startup: project?.title || null, items: rows.map(views.feedItem), openWork: open.map(views.describeJob) } });
}));

router.get('/documents', wrap(async (req, res) => {
  const uid = String(req.user.id);
  const filter = ['admin', 'super_admin'].includes(req.user.role) ? {} : { $or: [{ 'audience.userIds': uid }, { 'audience.roles': req.user.role }] };
  if (req.query.projectId) filter.projectId = String(req.query.projectId);
  if (req.user.role === 'faculty') {
    const ids = await access.projectIdsFor(req.user);
    filter.projectId = filter.projectId ? filter.projectId : { $in: ids };
  }
  const docs = await AgentDocument.find(filter).sort({ createdAt: -1 }).limit(30).lean();
  res.json({ success: true, data: docs.map((d) => ({ id: String(d._id), kind: d.kind, title: d.title, markdown: d.markdown, generatedBy: d.generatedBy, createdAt: d.createdAt })) });
}));

// ---------------------------------------------------------------------------
// Mentor
// ---------------------------------------------------------------------------
router.get('/mentor/requests', requireRole('mentor'), wrap(async (req, res) => {
  const rows = await MentorRequest.find({ mentorUserId: String(req.user.id) }).sort({ requestedAt: -1 }).limit(50).lean();
  const projects = await FacultyProject.find({ id: { $in: rows.map((r) => r.projectId) } }).lean();
  const byId = new Map(projects.map((p) => [p.id, p]));
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: String(r._id), status: r.status, projectTitle: r.projectTitle, domain: byId.get(r.projectId)?.domain, stage: byId.get(r.projectId)?.stage, description: byId.get(r.projectId)?.description,
      why: r.reasons, requestedAt: r.requestedAt, dueAt: r.dueAt, respondedAt: r.respondedAt, expired: r.status === 'pending' && new Date(r.dueAt) < new Date(),
    })),
  });
}));

router.post('/mentor/requests/:id/respond', requireRole('mentor'), wrap(async (req, res) => {
  const { decision, note } = req.body || {};
  if (!['accept', 'decline'].includes(decision)) return res.status(400).json({ success: false, message: 'Choose accept or decline.' });
  const updated = await mentorAgent.respond({ requestId: req.params.id, user: req.user, decision, note });
  res.json({ success: true, message: decision === 'accept' ? 'Thank you. The coordinator will confirm the allocation.' : 'Understood. The next mentor will be asked.', data: { status: updated.status } });
}));

router.get('/mentor/startups', requireRole('mentor'), wrap(async (req, res) => {
  const projects = await FacultyProject.find({ mentorUserId: String(req.user.id) }).lean();
  const out = [];
  for (const p of projects) {
    const nextMeeting = await FacultyMeeting.findOne({ projectId: p.id, outcome: 'pending', startUtc: { $gte: new Date() } }).sort({ startUtc: 1 }).lean();
    const prep = await AgentDocument.findOne({ projectId: p.id, kind: 'onboarding_pack' }).sort({ createdAt: -1 }).lean();
    out.push({ id: p.id, title: p.title, domain: p.domain, stage: p.stage, health: p.health, founder: p.leadStudent, nextMeeting: nextMeeting ? { id: nextMeeting.id, title: nextMeeting.title, startUtc: nextMeeting.startUtc } : null, prepSummary: prep?.markdown || null });
  }
  res.json({ success: true, data: out });
}));

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------
router.get('/meetings', wrap(async (req, res) => {
  const filter = ['admin', 'super_admin'].includes(req.user.role) ? { source: 'agent' } : { attendeeUserIds: String(req.user.id) };
  const rows = await FacultyMeeting.find(filter).sort({ startUtc: -1 }).limit(50).lean();
  res.json({ success: true, data: rows.map((m) => ({ id: m.id, title: m.title, projectTitle: m.projectTitle, startUtc: m.startUtc, endUtc: m.endUtc, outcome: m.outcome, calendarMode: m.calendarMode, link: m.meetingLinkOrLocation, invitation: m.invitationStatus, response: m.responses?.[String(req.user.id)] || null })) });
}));

function canManageMeeting(user, meeting) {
  return ['admin', 'super_admin', 'faculty'].includes(user.role) || String(meeting.googleOrganizerUserId || '') === String(user.id);
}

function meetingTimes(body) {
  const start = new Date(String(body.startUtc || ''));
  const end = new Date(String(body.endUtc || ''));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    const error = new Error('Choose a valid start and end time.');
    error.status = 400;
    throw error;
  }
  const duration = (end - start) / 60000;
  if (duration < 5 || duration > 480) {
    const error = new Error('Meeting duration must be between 5 minutes and 8 hours.');
    error.status = 400;
    throw error;
  }
  return { start, end, duration };
}

router.post('/meetings/:id/cancel', wrap(async (req, res) => {
  const meeting = await FacultyMeeting.findOne({ id: req.params.id }).lean();
  if (!meeting) return res.status(404).json({ success: false, message: 'This meeting was not found.' });
  if (!canManageMeeting(req.user, meeting)) return res.status(403).json({ success: false, message: 'You do not have permission to cancel this meeting.' });
  if (meeting.outcome === 'cancelled') return res.json({ success: true, message: 'This meeting was already cancelled.', data: { id: meeting.id, outcome: 'cancelled', calendarSyncStatus: meeting.calendarSyncStatus } });

  let syncStatus = meeting.googleEventId && meeting.googleOrganizerUserId ? 'pending' : 'not_applicable';
  let syncError = null;
  if (meeting.googleEventId && meeting.googleOrganizerUserId) {
    try {
      await googleCalendar.deleteEvent(meeting.googleOrganizerUserId, meeting.googleEventId);
      syncStatus = 'synced';
    } catch (error) {
      syncStatus = 'failed';
      syncError = String(error.message).slice(0, 200);
    }
  }
  await FacultyMeeting.updateOne(
    { id: meeting.id, outcome: { $ne: 'cancelled' } },
    { $set: { outcome: 'cancelled', outcomeAt: new Date(), cancelledAt: new Date(), cancelledBy: String(req.user.id), invitationStatus: 'Cancelled', calendarSyncStatus: syncStatus, calendarSyncError: syncError } }
  );
  await record({ agent: 'Portal', action: 'meeting.cancel', tool: 'meeting', trigger: { type: 'user', ref: String(req.user.id) }, projectId: meeting.projectId, status: 'success', summary: `Meeting "${meeting.title}" was cancelled.`, result: { meetingId: meeting.id, calendarSyncStatus: syncStatus } });
  await notify({ agent: 'Portal', trigger: { type: 'user', ref: String(req.user.id) }, projectId: meeting.projectId }, {
    key: `meeting-cancel:${meeting.id}`,
    userIds: meeting.attendeeUserIds || [],
    title: 'Meeting cancelled',
    message: `"${meeting.title}" was cancelled.${syncStatus === 'failed' ? ' Google Calendar still needs attention.' : ''}`,
    kind: 'meeting',
    email: false,
  });
  res.json({ success: true, message: syncStatus === 'failed' ? 'Meeting cancelled here, but Google Calendar could not be updated.' : 'Meeting cancelled.', data: { id: meeting.id, outcome: 'cancelled', calendarSyncStatus: syncStatus, calendarSyncError: syncError } });
}));

router.patch('/meetings/:id', wrap(async (req, res) => {
  const meeting = await FacultyMeeting.findOne({ id: req.params.id }).lean();
  if (!meeting) return res.status(404).json({ success: false, message: 'This meeting was not found.' });
  if (!canManageMeeting(req.user, meeting)) return res.status(403).json({ success: false, message: 'You do not have permission to edit this meeting.' });
  if (['cancelled', 'held', 'no_show'].includes(meeting.outcome)) return res.status(409).json({ success: false, message: 'Only upcoming meetings can be edited.' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : meeting.title;
  const agenda = typeof req.body?.agenda === 'string' ? req.body.agenda.trim() : meeting.agenda;
  const location = typeof req.body?.location === 'string' ? req.body.location.trim() : meeting.meetingLinkOrLocation;
  if (!title || title.length > 200 || agenda.length > 4000 || location.length > 500) return res.status(400).json({ success: false, message: 'Meeting details are too long or incomplete.' });
  const times = meetingTimes({ startUtc: req.body?.startUtc || meeting.startUtc, endUtc: req.body?.endUtc || meeting.endUtc });
  let syncStatus = meeting.googleEventId && meeting.googleOrganizerUserId ? 'pending' : 'not_applicable';
  let syncError = null;
  if (meeting.googleEventId && meeting.googleOrganizerUserId) {
    try {
      await googleCalendar.updateEvent(meeting.googleOrganizerUserId, meeting.googleEventId, {
        summary: title,
        description: agenda,
        location,
        start: { dateTime: times.start.toISOString() },
        end: { dateTime: times.end.toISOString() },
      });
      syncStatus = 'synced';
    } catch (error) {
      syncStatus = 'failed';
      syncError = String(error.message).slice(0, 200);
    }
  }
  await FacultyMeeting.updateOne({ id: meeting.id }, {
    $set: {
      title, agenda, meetingLinkOrLocation: location, startUtc: times.start, endUtc: times.end,
      date: times.start.toISOString().slice(0, 10), startTime: times.start.toISOString().slice(11, 16),
      durationMinutes: times.duration, invitationStatus: syncStatus === 'failed' ? 'Update pending' : meeting.invitationStatus,
      calendarSyncStatus: syncStatus, calendarSyncError: syncError,
    },
  });
  const requestId = typeof req.body?.requestId === 'string' ? req.body.requestId : `${meeting.id}:${times.start.toISOString()}:${title}`;
  await record({ agent: 'Portal', action: 'meeting.edit', tool: 'meeting', trigger: { type: 'user', ref: String(req.user.id) }, projectId: meeting.projectId, status: 'success', summary: `Meeting "${title}" was edited.`, result: { meetingId: meeting.id, calendarSyncStatus: syncStatus } });
  await notify({ agent: 'Portal', trigger: { type: 'user', ref: String(req.user.id) }, projectId: meeting.projectId }, {
    key: `meeting-edit:${meeting.id}:${requestId}`,
    userIds: meeting.attendeeUserIds || [],
    title: 'Meeting updated',
    message: `"${title}" was updated.${syncStatus === 'failed' ? ' Google Calendar still needs attention.' : ''}`,
    kind: 'meeting',
    email: false,
  });
  res.json({ success: true, message: syncStatus === 'failed' ? 'Meeting updated here, but Google Calendar could not be updated.' : 'Meeting updated.', data: { id: meeting.id, calendarSyncStatus: syncStatus, calendarSyncError: syncError } });
}));

router.post('/meetings/:id/outcome', wrap(async (req, res) => {
  const { held, notes, actionItems } = req.body || {};
  const result = await workflowAgent.recordOutcome({ meetingId: req.params.id, user: req.user, held: Boolean(held), notes, actionItems });
  res.json({ success: true, message: held ? 'Recorded. Notes and action items are being prepared.' : 'Recorded as missed. The agent will try to reschedule.', data: result });
}));

router.post('/meetings/:id/respond', wrap(async (req, res) => {
  const result = await workflowAgent.respondToMeeting({ meetingId: req.params.id, user: req.user, accept: req.body?.accept !== false });
  res.json({ success: true, message: result.response === 'accepted' ? 'Thanks, your attendance is noted.' : 'Understood. The agent will look for another time.', data: result });
}));

// ---------------------------------------------------------------------------
// Investor introductions (founder consent / investor response / feedback)
// ---------------------------------------------------------------------------
router.get('/introductions', wrap(async (req, res) => {
  const uid = String(req.user.id);
  const filter = req.user.role === 'investor' ? { investorId: uid, origin: 'agent', status: { $ne: 'awaiting_founder_consent' } } : { founderId: uid, origin: 'agent' };
  if (['admin', 'super_admin'].includes(req.user.role)) delete filter.founderId;
  const rows = await InvestorIntroduction.find(filter).populate('startupId', 'name sector stage tagline').populate('investorId', 'name profile').sort({ createdAt: -1 }).limit(30).lean();
  res.json({
    success: true,
    data: rows.map((i) => ({
      id: String(i._id), startup: i.startupId?.name, sector: i.startupId?.sector, stage: i.startupId?.stage, tagline: i.startupId?.tagline,
      investor: req.user.role === 'investor' ? undefined : i.investorId?.name, fund: req.user.role === 'investor' ? undefined : i.investorId?.profile?.fundName,
      status: i.status, consent: i.founderConsent?.status, investorResponse: i.investorResponse, why: i.matchReasons, matchScore: i.matchScore,
      meetingId: i.meetingId, meeting: i.scheduledMeeting?.scheduledAt ? i.scheduledMeeting : null, feedbackGiven: (i.feedback || []).some((f) => f.byUserId === uid),
    })),
  });
}));

router.post('/introductions/:id/consent', requireRole('student'), wrap(async (req, res) => {
  const result = await investorAgent.founderConsent({ introId: req.params.id, user: req.user, grant: Boolean(req.body?.grant) });
  res.json({ success: true, message: result.consent === 'granted' ? 'Thank you. An administrator will review it before anything is shared.' : 'Understood. Nothing will be shared.', data: result });
}));

router.post('/introductions/:id/respond', requireRole('investor'), wrap(async (req, res) => {
  const result = await investorAgent.investorRespond({ introId: req.params.id, user: req.user, accept: Boolean(req.body?.accept) });
  res.json({ success: true, message: result.response === 'accepted' ? 'Thank you. A meeting time is being arranged.' : 'Understood. The introduction was closed.', data: result });
}));

router.post('/introductions/:id/feedback', wrap(async (req, res) => {
  const result = await investorAgent.submitFeedback({ introId: req.params.id, user: req.user, rating: req.body?.rating, comment: req.body?.comment });
  res.json({ success: true, message: 'Thank you for the feedback.', data: result });
}));

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
router.post('/notifications/read-all', wrap(async (req, res) => {
  await AgentNotification.updateMany({ recipientUserId: String(req.user.id), readAt: null }, { $set: { readAt: new Date() } });
  res.json({ success: true });
}));

// ---------------------------------------------------------------------------
// Your own working hours: when the agents may schedule meetings with you
// ---------------------------------------------------------------------------
router.get('/me/working-hours', wrap(async (req, res) => {
  const me = await User.findOne({ _id: String(req.user.id) }).select('profile').lean();
  const custom = Array.isArray(me?.profile?.workingHours) && me.profile.workingHours.length > 0;
  res.json({
    success: true,
    data: {
      custom,
      windows: custom ? me.profile.workingHours : [],
      defaultWindows: windowsFor({}).map((w) => ({ days: w.days, start: `${String(Math.floor(w.start / 60)).padStart(2, '0')}:${String(w.start % 60).padStart(2, '0')}`, end: `${String(Math.floor(w.end / 60)).padStart(2, '0')}:${String(w.end % 60).padStart(2, '0')}` })),
    },
  });
}));

router.put('/me/working-hours', wrap(async (req, res) => {
  let windows;
  try {
    windows = validateWindows(req.body?.windows ?? []);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  await User.updateOne({ _id: String(req.user.id) }, { $set: { 'profile.workingHours': windows } });
  res.json({ success: true, message: windows.length ? 'Your working hours were saved. The agents will only book meetings inside them.' : 'Your custom hours were cleared. The centre default applies.', data: { custom: windows.length > 0, windows } });
}));

// ---------------------------------------------------------------------------
// Super Admin: agent health, raw logs, manual override
// ---------------------------------------------------------------------------
const superOnly = requireRole('super_admin');

router.get('/health', superOnly, wrap(async (req, res) => {
  const [health, rates, queue] = await Promise.all([
    scheduler.health(),
    ActionLog.aggregate([{ $group: { _id: { agent: '$agent', status: '$status' }, count: { $sum: 1 } } }]),
    DomainEvent.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const perAgent = {};
  rates.forEach((r) => {
    const agent = r._id.agent;
    perAgent[agent] = perAgent[agent] || { total: 0, failed: 0, escalations: 0 };
    perAgent[agent].total += r.count;
    if (r._id.status === 'failed') perAgent[agent].failed += r.count;
  });
  const escalationRows = await ActionLog.aggregate([{ $match: { action: 'escalation.raise' } }, { $group: { _id: '$agent', count: { $sum: 1 } } }]);
  escalationRows.forEach((r) => { if (perAgent[r._id]) perAgent[r._id].escalations = r.count; });
  const eventQueue = Object.fromEntries(queue.map((q) => [q._id, q.count]));
  res.json({
    success: true,
    data: {
      ...health,
      integrations: integrationStatus(),
      eventQueue: { depth: (eventQueue.pending || 0) + (eventQueue.failed || 0), byStatus: eventQueue },
      agents: Object.entries(perAgent).map(([agent, v]) => ({ agent, ...v, errorRate: v.total ? Math.round((v.failed / v.total) * 1000) / 10 : 0 })),
    },
  });
}));

router.get('/admin/log', requireRole('admin'), wrap(async (req, res) => {
  const rows = await ActionLog.find({}).sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 50, 200)).lean();
  res.json({ success: true, data: rows.map(views.feedItem) });
}));

router.get('/admin/pipeline', requireRole('admin'), wrap(async (req, res) => {
  const [admissions, introductions, stuck, jobStates, rates] = await Promise.all([
    Approval.countDocuments({ type: 'admission', status: 'pending' }),
    Approval.countDocuments({ type: 'investor_intro', status: 'pending' }),
    AgentJob.countDocuments({ state: { $in: ['escalated', 'failed'] } }),
    AgentJob.aggregate([{ $group: { _id: '$state', count: { $sum: 1 } } }]),
    ActionLog.aggregate([{ $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  // The real application queue lives in agent-service; count from it so the card matches the Applications page.
  let applicationsByStatus = null;
  try {
    const all = await py.getQueue(py.agentActor('pipeline'), 'all');
    applicationsByStatus = {};
    for (const a of all.queue || []) { const k = String(a.status).toLowerCase(); applicationsByStatus[k] = (applicationsByStatus[k] || 0) + 1; }
  } catch (err) {
    console.warn('[pipeline] application counts unavailable:', err.message);
  }
  const awaitingReal = applicationsByStatus ? (applicationsByStatus.submitted || 0) + (applicationsByStatus.under_review || 0) : null;
  const byStatus = Object.fromEntries(rates.map((r) => [r._id, r.count]));
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const escalations = await ActionLog.countDocuments({ action: 'escalation.raise', createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } });
  res.json({
    success: true,
    data: {
      applicationsAwaitingDecision: awaitingReal ?? admissions, applicationsByStatus, introductionsAwaitingApproval: introductions, stuckWorkflows: stuck,
      jobsByState: Object.fromEntries(jobStates.map((r) => [r._id, r.count])),
      last30Days: { actions: total, succeeded: (byStatus.success || 0) + (byStatus.simulated || 0), failed: byStatus.failed || 0, escalations, successRate: total ? Math.round((((byStatus.success || 0) + (byStatus.simulated || 0)) / total) * 1000) / 10 : null, escalationRate: total ? Math.round((escalations / total) * 1000) / 10 : null },
    },
  });
}));

router.get('/super/events', superOnly, wrap(async (req, res) => {
  const rows = await DomainEvent.find({}).sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 50, 200)).lean();
  res.json({ success: true, data: rows.map((e) => ({ eventId: e.eventId, type: e.eventType, status: e.status, attempts: e.attempts, error: e.lastError, correlationId: e.correlationId, at: e.createdAt, processedAt: e.processedAt })) });
}));

router.get('/super/jobs', superOnly, wrap(async (req, res) => {
  const filter = req.query.state ? { state: String(req.query.state) } : {};
  const rows = await AgentJob.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
  res.json({ success: true, data: rows.map((j) => ({ ...scheduler.slimJob(j), history: (j.history || []).slice(-6) })) });
}));

router.get('/super/outbox', superOnly, wrap(async (req, res) => {
  const rows = await OutboxMessage.find({}).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ success: true, data: rows.map((m) => ({ id: String(m._id), channel: m.channel, mode: m.mode, status: m.status, to: m.to, subject: m.subject, error: m.error, at: m.createdAt })) });
}));

router.post('/override/jobs/:id/retry', superOnly, wrap(async (req, res) => {
  const job = await AgentJob.findOne({ _id: req.params.id }).lean();
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  await AgentJob.updateOne({ _id: job._id }, { $set: { state: 'pending', attempts: 0, lockedAt: null, nextRunAt: new Date(), lastError: null, resolvedAt: null } });
  res.json({ success: true, message: 'The job was queued to run again.' });
}));

router.post('/override/run', superOnly, wrap(async (req, res) => {
  const { agent, projectId } = req.body || {};
  const { makeCtx } = require('../agentic/agents/context');
  const { note } = require('../agentic/actionLog');
  let outcome;
  if (agent === 'monitoring') outcome = await monitoringAgent.sweep({});
  else if (agent === 'investor') outcome = await investorAgent.sweep({});
  else if (agent === 'mentor' && projectId) outcome = await require('../services/agentHubService').runMentorMatching({ projectId, actor: req.user });
  else if (agent === 'scheduler') outcome = await scheduler.tick({ force: true });
  else return res.status(400).json({ success: false, message: 'Choose monitoring, investor, scheduler, or mentor with a startup.' });
  await note({ ...makeCtx('Super Admin override', { trigger: { type: 'override', ref: String(req.user.id) } }), agent: `${req.user.name || 'Super Admin'} (manual override)`, action: 'monitoring.rerun', status: 'success', summary: `${req.user.name || 'A super admin'} ran the ${agent} agent manually.`, audience: { userIds: [], roles: ['super_admin'] } });
  res.json({ success: true, message: 'Ran the agent now.', data: outcome });
}));

// ---------------------------------------------------------------------------
// Assistant control surface
// ---------------------------------------------------------------------------
router.post('/assistant', wrap(async (req, res) => {
  const message = String(req.body?.message || '').slice(0, 1000);
  if (!message.trim()) return res.status(400).json({ success: false, message: 'Type a question or a request.' });
  const reply = await assistant.handle({ user: req.user, message });
  res.json({ success: true, data: reply });
}));

module.exports = router;
