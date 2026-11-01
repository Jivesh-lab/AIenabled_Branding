const FacultyProject = require('../models/FacultyProject');
const ActionLog = require('../models/ActionLog');
const AgentJob = require('../models/AgentJob');

/**
 * Who may see what. Every agentic read goes through these helpers, so scoping is enforced on the
 * server and the UI can never widen it.
 *   student  - their own startups and anything addressed to them
 *   faculty  - the startups they coordinate
 *   mentor   - the startups they mentor and requests addressed to them
 *   investor - introductions addressed to them
 *   admin / super_admin - the whole centre
 */
async function projectIdsFor(user) {
  if (['admin', 'super_admin'].includes(user.role)) return null; // null means "all"
  const field = { student: 'ownerUserId', faculty: 'coordinatorUserId', mentor: 'mentorUserId' }[user.role];
  if (!field) return [];
  const projects = await FacultyProject.find({ [field]: String(user.id) }).select('id').lean();
  return projects.map((p) => p.id);
}

async function canSeeProject(user, projectId) {
  const ids = await projectIdsFor(user);
  return ids === null || ids.includes(String(projectId));
}

async function feedFilter(user) {
  const uid = String(user.id);
  if (['admin', 'super_admin'].includes(user.role)) return {};
  if (user.role === 'faculty') {
    const ids = await projectIdsFor(user);
    return { $or: [{ 'audience.userIds': uid }, { projectId: { $in: ids }, 'audience.roles': 'faculty' }] };
  }
  return { 'audience.userIds': uid };
}

async function feedFor(user, { limit = 30, projectId, before } = {}) {
  const filter = await feedFilter(user);
  if (projectId) {
    if (!(await canSeeProject(user, projectId))) return [];
    filter.projectId = String(projectId);
  }
  if (before) filter.createdAt = { $lt: new Date(before) };
  return ActionLog.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 30, 100)).lean();
}

/** Open jobs that matter to this person, scoped by role. */
async function jobsFor(user, { states } = {}) {
  const filter = { state: { $nin: ['done', 'failed'] } };
  if (states) filter.state = { $in: states };
  const ids = await projectIdsFor(user);
  if (ids === null) return AgentJob.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
  if (user.role === 'student') {
    return AgentJob.find({ ...filter, $or: [{ projectId: { $in: ids } }, { 'data.applicantId': String(user.id) }] }).sort({ updatedAt: -1 }).limit(50).lean();
  }
  return AgentJob.find({ ...filter, projectId: { $in: ids } }).sort({ updatedAt: -1 }).limit(50).lean();
}

module.exports = { projectIdsFor, canSeeProject, feedFilter, feedFor, jobsFor };
