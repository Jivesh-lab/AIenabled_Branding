const mongoose = require('mongoose');
const User = require('../models/User');
const FacultyProject = require('../models/FacultyProject');
const StartupProfile = require('../models/StartupProfile');
const { ensureFounderMembership, inviteRosterMembers } = require('../services/teamInvitationService');

/**
 * Projects are linked to real accounts. The founder is the application's owner, the coordinator is a
 * real faculty account, and names shown in the UI are always read from those accounts - never typed in.
 */
function cleanName(name) {
  return String(name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function capitalize(value) {
  const text = String(value || 'Prototype');
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

async function pickCoordinator() {
  const coordinators = await User.find({ role: 'faculty', facultyRole: 'coordinator', status: 'active', isSoftDeleted: { $ne: true } }).select('_id name email').lean();
  if (coordinators.length) return coordinators[0];
  const anyFaculty = await User.find({ role: 'faculty', status: 'active', isSoftDeleted: { $ne: true } }).select('_id name email').lean();
  return anyFaculty[0] || null;
}

async function loadUser(id) {
  if (!id || !mongoose.isValidObjectId(String(id))) return null;
  return User.findById(String(id)).select('_id name email role').lean();
}

/** Create (once) the portfolio record for an approved application and link it to its owner and coordinator. */
async function ensureProject({ applicationId, startup = {}, applicantId, form = {} }) {
  const existing = await FacultyProject.findOne({ id: String(applicationId) }).lean();
  if (existing && existing.ownerUserId) return existing;

  const owner = await loadUser(applicantId);
  const coordinator = await pickCoordinator();
  const team = Array.isArray(form.teamMembers) && form.teamMembers.length
    ? form.teamMembers.map((m) => ({ name: m.name, rollNumber: m.rollNumber, email: m.email, role: m.role || 'Team member' }))
    : owner ? [{ name: cleanName(owner.name), email: owner.email, role: 'Lead' }] : [];
  const fields = {
    title: startup.name || form.name || 'Untitled startup',
    domain: startup.sector || form.domain || 'Technology',
    stage: capitalize(startup.stage || form.maturity),
    leadStudent: owner ? cleanName(owner.name) : 'Founder',
    ownerUserId: owner ? String(owner._id) : null,
    applicationId: String(applicationId),
    coordinatorUserId: coordinator ? String(coordinator._id) : null,
    assignedCoordinatorName: coordinator ? cleanName(coordinator.name) : null,
    rollNumber: form.teamMembers?.[0]?.rollNumber || '',
    department: form.department || 'Engineering',
    teamMembers: team,
    description: startup.tagline || startup.problem || form.shortDescription || '',
  };
  // The student workspace finds a founder's projects through StartupProfile.founderId, so keep that link too.
  if (owner && !(await StartupProfile.findOne({ applicationId: String(applicationId) }).lean())) {
    const stage = String(startup.stage || form.maturity || 'idea').toLowerCase();
    await StartupProfile.create({
      applicationId: String(applicationId), founderId: owner._id, name: fields.title, tagline: String(startup.tagline || form.shortDescription || fields.title).slice(0, 300),
      problem: startup.problem || form.problem || 'Not provided', solution: startup.solution || form.solution || 'Not provided', sector: fields.domain,
      stage: ['idea', 'concept', 'prototype', 'mvp', 'growth', 'market_ready'].includes(stage) ? stage : 'idea', isApproved: true, approvedAt: new Date(),
    });
  }
  if (existing) {
    await FacultyProject.updateOne({ id: String(applicationId) }, { $set: fields });
    // Ensure founder membership exists even for previously-created projects.
    if (owner && mongoose.connection?.readyState === 1) {
      await ensureFounderMembership({
        projectId: String(applicationId),
        applicationId: String(applicationId),
        founderId: owner._id,
        founderEmail: owner.email,
        founderName: cleanName(owner.name),
      }).catch((e) => console.warn('[projects] ensureFounderMembership (update):', e.message));
    }
    return { ...existing, ...fields };
  }
  const created = await FacultyProject.create({ id: String(applicationId), ...fields, trl: 1, progress: 0, health: 'On Track', nextMilestone: 'Mentor onboarding', nextMilestoneDate: '' });
  if (owner && mongoose.connection?.readyState === 1) {
    await ensureFounderMembership({
      projectId: String(applicationId),
      applicationId: String(applicationId),
      founderId: owner._id,
      founderEmail: owner.email,
      founderName: cleanName(owner.name),
    }).catch((e) => console.warn('[projects] ensureFounderMembership (create):', e.message));
    // Teammates listed on the submission get a real invitation (access is granted only on acceptance).
    const invited = await inviteRosterMembers({ projectId: String(applicationId), founderId: owner._id, roster: form.teamMembers })
      .catch((e) => { console.warn('[projects] inviteRosterMembers:', e.message); return []; });
    if (invited.length) console.log('[projects] roster invitations for', applicationId, JSON.stringify(invited));
  }
  return typeof created.toObject === 'function' ? created.toObject() : created;
}

module.exports = { ensureProject, pickCoordinator, loadUser, cleanName };
