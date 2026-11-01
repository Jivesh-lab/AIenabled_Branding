const Approval = require('../models/Approval');
const { record } = require('./actionLog');
const { tierFor } = require('./config');

class ApprovalError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ApprovalError';
    this.status = status;
  }
}

const handlers = new Map();
/** handler = { approve(approval, user), reject(approval, user) } - runs the Tier-3 action only after a human decision. */
function registerApprovalHandler(type, handler) {
  handlers.set(type, handler);
}

function plain(doc) {
  return doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
}

/** Roles may decide an item they are assigned; a faculty coordinator only the items for their own startups. */
function canDecide(user, approval) {
  if (!user || !user.role) return false;
  if (user.role === 'super_admin') return true;
  if (!approval.assignedRoles.includes(user.role)) return false;
  if (user.role === 'faculty' && approval.assignedUserIds?.length) {
    return approval.assignedUserIds.map(String).includes(String(user.id));
  }
  return true;
}

function visibleFilter(user) {
  if (user.role === 'super_admin') return {};
  if (user.role === 'admin') return { assignedRoles: 'admin' };
  if (user.role === 'faculty') {
    return { assignedRoles: 'faculty', $or: [{ assignedUserIds: { $size: 0 } }, { assignedUserIds: String(user.id) }] };
  }
  return { _id: null }; // every other role sees no approval queue
}

/** Agent asks for a human decision. Idempotent: one pending approval per (type, subject). */
async function request(input) {
  const { type, action, title, summary = '', requestedBy, assignedRoles, assignedUserIds = [], applicationId = null, projectId = null, subjectId, evidence = {}, payload = {}, jobId = null, correlationId = null, trigger } = input;
  if (tierFor(action) !== 3) throw new Error(`${action} is not a Tier-3 action; it does not need an approval`);
  const existing = await Approval.findOne({ type, subjectId: String(subjectId), status: 'pending' }).lean();
  if (existing) return { approval: existing, created: false };
  let approval;
  try {
    approval = plain(
      await Approval.create({
        type,
        action,
        title,
        summary,
        requestedBy,
        assignedRoles,
        assignedUserIds: assignedUserIds.map(String),
        applicationId,
        projectId,
        subjectId: String(subjectId),
        evidence,
        payload,
        jobId: jobId ? String(jobId) : null,
        correlationId,
      })
    );
  } catch (error) {
    if (error && (error.code === 11000 || /duplicate/i.test(error.message))) {
      return { approval: await Approval.findOne({ type, subjectId: String(subjectId), status: 'pending' }).lean(), created: false };
    }
    throw error;
  }
  await record({
    agent: requestedBy,
    action,
    tier: 3,
    status: 'pending_approval',
    trigger: trigger || { type: 'event', ref: null },
    summary: `${requestedBy} is waiting for a human decision: ${title}`,
    inputSummary: summary,
    approvalId: approval._id,
    jobId,
    applicationId,
    projectId,
    correlationId,
    audience: { userIds: assignedUserIds, roles: assignedRoles },
  });
  return { approval, created: true };
}

/** Record a human decision, then run the approved action (or the rejection) through the registered handler. */
async function decide({ approvalId, user, decision, comment = '' }) {
  if (!['approved', 'rejected'].includes(decision)) throw new ApprovalError('Decision must be approved or rejected.');
  const approval = await Approval.findOne({ _id: approvalId }).lean();
  if (!approval) throw new ApprovalError('This approval request was not found.', 404);
  if (!canDecide(user, approval)) throw new ApprovalError('You are not permitted to decide this item.', 403);
  if (approval.status !== 'pending') throw new ApprovalError(`This item was already ${approval.status}.`, 409);

  const decided = await Approval.findOneAndUpdate(
    { _id: approval._id, status: 'pending' },
    {
      $set: {
        status: decision,
        decidedBy: String(user.id),
        decidedByName: user.name || null,
        decidedByRole: user.role,
        decidedAt: new Date(),
        decisionComment: String(comment || '').slice(0, 1000),
      },
    },
    { returnDocument: 'after' }
  ).lean();
  if (!decided) throw new ApprovalError('This item was just decided by someone else.', 409);

  await record({
    agent: decided.requestedBy,
    action: decided.action,
    tier: 3,
    status: 'success',
    trigger: { type: 'user', ref: String(user.id) },
    summary: `${user.name || user.role} ${decision} "${decided.title}"${comment ? ` - "${String(comment).slice(0, 120)}"` : ''}`,
    approvalId: decided._id,
    jobId: decided.jobId,
    applicationId: decided.applicationId,
    projectId: decided.projectId,
    correlationId: decided.correlationId,
    audience: { userIds: decided.assignedUserIds, roles: decided.assignedRoles },
  });

  return execute(decided, user);
}

async function execute(approval, user) {
  const handler = handlers.get(approval.type);
  if (!handler) return { approval, executionError: `No handler is registered for ${approval.type}` };
  try {
    const hook = approval.status === 'approved' ? handler.approve : handler.reject;
    if (hook) await hook(approval, user);
    const done = await Approval.findOneAndUpdate({ _id: approval._id }, { $set: { executionStatus: 'done', executionError: null } }, { returnDocument: 'after' }).lean();
    return { approval: done };
  } catch (error) {
    const failed = await Approval.findOneAndUpdate(
      { _id: approval._id },
      { $set: { executionStatus: 'failed', executionError: String(error.message).slice(0, 400) } },
      { returnDocument: 'after' }
    ).lean();
    return { approval: failed, executionError: error.message };
  }
}

/** Sweep: re-run decisions whose execution failed (e.g. the agent service was down at the time). */
async function retryFailedExecutions(limit = 10) {
  const failed = await Approval.find({ status: { $in: ['approved', 'rejected'] }, executionStatus: 'failed' }).limit(limit).lean();
  const out = [];
  for (const approval of failed) {
    const user = { id: approval.decidedBy, name: approval.decidedByName, role: approval.decidedByRole };
    out.push(await execute(approval, user));
  }
  return out;
}

async function listPending(user, { type, limit = 50 } = {}) {
  const filter = { status: 'pending', ...visibleFilter(user) };
  if (type) filter.type = type;
  return Approval.find(filter).sort({ createdAt: 1 }).limit(limit).lean();
}

async function countPending(user, { type } = {}) {
  const filter = { status: 'pending', ...visibleFilter(user) };
  if (type) filter.type = type;
  return Approval.countDocuments(filter);
}

/** Resolve a pending approval because the decision was made elsewhere (e.g. the existing application review screen). */
async function resolveExternally({ type, subjectId, decision, decidedBy, decidedByName, decidedByRole, comment = '' }) {
  return Approval.findOneAndUpdate(
    { type, subjectId: String(subjectId), status: 'pending' },
    {
      $set: {
        status: decision,
        decidedBy: decidedBy ? String(decidedBy) : null,
        decidedByName: decidedByName || null,
        decidedByRole: decidedByRole || null,
        decidedAt: new Date(),
        decisionComment: comment,
        executionStatus: 'done',
      },
    },
    { returnDocument: 'after' }
  ).lean();
}

module.exports = { registerApprovalHandler, request, decide, listPending, countPending, canDecide, retryFailedExecutions, resolveExternally, ApprovalError };
