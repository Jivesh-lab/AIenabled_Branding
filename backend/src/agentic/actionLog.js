const ActionLog = require('../models/ActionLog');
const Approval = require('../models/Approval');
const { tierFor, TIER } = require('./config');

class ApprovalRequiredError extends Error {
  constructor(action, detail) {
    super(`"${action}" needs human approval before it can run${detail ? `: ${detail}` : '.'}`);
    this.name = 'ApprovalRequiredError';
    this.code = 'APPROVAL_REQUIRED';
    this.action = action;
  }
}

function clip(value, max = 400) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

async function record(entry) {
  const row = {
    agent: entry.agent,
    action: entry.action,
    tool: entry.tool || null,
    tier: entry.tier || tierFor(entry.action),
    status: entry.status,
    trigger: { type: entry.trigger?.type || 'event', ref: entry.trigger?.ref || null },
    summary: entry.summary,
    inputSummary: clip(entry.inputSummary || ''),
    result: entry.result === undefined ? null : entry.result,
    followUp: entry.followUp || null,
    correlationId: entry.correlationId || null,
    jobId: entry.jobId ? String(entry.jobId) : null,
    approvalId: entry.approvalId ? String(entry.approvalId) : null,
    applicationId: entry.applicationId || null,
    projectId: entry.projectId || null,
    audience: { userIds: (entry.audience?.userIds || []).map(String), roles: entry.audience?.roles || [] },
  };
  if (entry.successKey) row.successKey = entry.successKey;
  return ActionLog.create(row);
}

/**
 * The ONE gate every agent action passes through.
 *
 *  - Tier is looked up from configuration (unknown actions are Tier 3).
 *  - Tier 3 refuses to run unless `approvalId` names an APPROVED approval for that same action.
 *  - `idempotencyKey` makes a repeated call (duplicate event, job retry, restart) return the first
 *    successful result instead of acting twice.
 *  - Success, simulation, failure and refusals are all written to the immutable Action Log.
 *
 * `exec()` performs the real work and returns { status?: 'success'|'simulated', result?, summary?, followUp? }.
 */
async function runAction(opts) {
  const { agent, action, tool = null, trigger, correlationId, jobId, applicationId, projectId, audience, approvalId, idempotencyKey, inputSummary, exec } = opts;
  const tier = tierFor(action);
  const base = { agent, action, tool, tier, trigger, correlationId, jobId, applicationId, projectId, audience, approvalId, inputSummary };
  const describe = typeof opts.summary === 'function' ? opts.summary : () => opts.summary;

  if (idempotencyKey) {
    const existing = await ActionLog.findOne({ successKey: idempotencyKey }).lean();
    if (existing) return { deduped: true, status: existing.status, result: existing.result, summary: existing.summary };
  }

  if (tier === TIER.HUMAN_APPROVES) {
    const approval = approvalId ? await Approval.findOne({ _id: approvalId }).lean() : null;
    const allowed = approval && approval.status === 'approved' && approval.action === action;
    if (!allowed) {
      await record({
        ...base,
        status: 'blocked',
        summary: `${agent} was stopped from running "${action}" because no human approval exists yet.`,
      });
      throw new ApprovalRequiredError(action, approval ? `approval is ${approval.status}` : 'no approval supplied');
    }
  }

  let out;
  try {
    out = (await exec()) || {};
  } catch (error) {
    await record({
      ...base,
      status: 'failed',
      summary: `${agent} could not complete "${action}": ${clip(error.message, 160)}`,
      result: { error: clip(error.message, 500) },
    });
    throw error;
  }

  const status = out.status === 'simulated' ? 'simulated' : 'success';
  const summary = out.summary || describe(out.result) || `${agent} completed ${action}.`;
  await record({
    ...base,
    status,
    summary: status === 'simulated' ? `${summary} (sandbox: not delivered externally)` : summary,
    result: out.result,
    followUp: out.followUp,
    successKey: idempotencyKey || undefined,
  });
  return { status, result: out.result, summary };
}

/** Log something that is not an executable action (a decision to wait, an escalation, a skipped step). */
async function note(entry) {
  return record({ status: 'success', ...entry });
}

module.exports = { runAction, record, note, ApprovalRequiredError, clip };
