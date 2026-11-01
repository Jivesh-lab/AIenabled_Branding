/**
 * Human-readable views of Action Log rows and jobs. Raw identifiers never reach the screen: feeds show
 * what an agent did, why, what happened and what happens next.
 */
const EVENT_LABELS = {
  'application.submitted': 'an application was submitted',
  'application.resubmitted': 'an application was resubmitted',
  'application.approved': 'an application was approved',
  'application.rejected': 'an application was rejected',
  'allocation.confirmed': 'a mentor allocation was confirmed',
  'task.completed': 'a task was completed',
  'mentor.allocation.approved': 'a mentor allocation was approved',
  'schedule.monitoring': 'the scheduled monitoring check',
  'schedule.investor': 'the scheduled investor readiness check',
  'override.run': 'a manual override',
  'user.command': 'a request from the assistant',
};

const STATUS_LABELS = {
  success: 'Done',
  simulated: 'Recorded in sandbox (not delivered)',
  failed: 'Failed',
  pending_approval: 'Waiting for a person to decide',
  blocked: 'Stopped: needs approval',
  skipped: 'Skipped',
};

const TIER_LABELS = { 1: 'Routine', 2: 'Done, then told you', 3: 'Needs a human decision' };

function triggerLabel(trigger) {
  if (!trigger) return 'a scheduled check';
  if (trigger.type === 'event') return `when ${EVENT_LABELS[trigger.ref] || String(trigger.ref || 'an event').replace(/[._]/g, ' ')}`;
  if (trigger.type === 'schedule') return `on a scheduled check${trigger.ref ? ` (${String(trigger.ref).replace(/[._]/g, ' ')})` : ''}`;
  if (trigger.type === 'user') return 'at a person\'s request';
  if (trigger.type === 'assistant') return 'at your request in the assistant';
  if (trigger.type === 'override') return 'by a manual override';
  return 'automatically';
}

function feedItem(row) {
  return {
    id: String(row._id),
    at: row.createdAt,
    agent: row.agent,
    summary: row.summary,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || row.status,
    tier: row.tier,
    tierLabel: TIER_LABELS[row.tier],
    followUp: row.followUp || null,
    trigger: triggerLabel(row.trigger),
    projectId: row.projectId || null,
    simulated: row.status === 'simulated',
  };
}

const DAY = 24 * 60 * 60 * 1000;
function inDays(date) {
  if (!date) return null;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / DAY);
  return days <= 0 ? 'soon' : days === 1 ? 'in about a day' : `in about ${days} days`;
}

/** One plain sentence describing what an open job is doing and what it is waiting for. */
function describeJob(job) {
  const data = job.data || {};
  const next = job.nextRunAt ? inDays(job.nextRunAt) : null;
  const base = { id: String(job._id), agent: job.agent, state: job.state, step: job.step, projectId: job.projectId || null, applicationId: job.applicationId || null, updatedAt: job.updatedAt };
  switch (job.type) {
    case 'application.review':
      if (job.step === 'waiting_info') return { ...base, headline: `Waiting for you: ${(data.missing || []).join('; ') || 'a few details'}`, waitingOn: 'you', detail: `Add it and resubmit; the review restarts automatically.${next ? ` A reminder follows ${next}.` : ''}` };
      if (job.state === 'waiting_for_approval') return { ...base, headline: 'Your application is complete and waiting for a reviewer decision', waitingOn: 'a reviewer', detail: 'You will be notified as soon as it is decided.' };
      if (job.state === 'escalated') return { ...base, headline: 'Your application was escalated to the admins because the requested information has not arrived', waitingOn: 'you', detail: 'Resubmit with the missing details to continue.' };
      return { ...base, headline: 'Checking your application', waitingOn: 'the agent', detail: 'This only takes a moment.' };
    case 'mentor.matching':
      if (job.state === 'waiting_for_approval') return { ...base, headline: 'A mentor accepted. The coordinator is confirming the allocation', waitingOn: 'the coordinator', detail: 'You will be told when it is confirmed.' };
      if (job.state === 'escalated') return { ...base, headline: 'No mentor could be confirmed yet; the coordinator has been asked to step in', waitingOn: 'the coordinator', detail: 'Nothing is needed from you.' };
      return { ...base, headline: `Asking a mentor to work with you${data.tried?.length ? ` (${data.tried.length} already asked)` : ''}`, waitingOn: 'a mentor', detail: `A reply is expected ${next || 'soon'}; if not, the next mentor is asked.` };
    case 'workflow.onboarding':
    case 'workflow.review':
      if (job.state === 'escalated') return { ...base, headline: 'Arranging your meeting needs the coordinator', waitingOn: 'the coordinator', detail: 'Nothing is needed from you.' };
      return { ...base, headline: data.meetingId ? 'Your meeting is booked. Notes and tasks follow once it has taken place' : 'Finding a time that suits everyone for your meeting', waitingOn: data.meetingId ? 'the meeting' : 'the agent', detail: 'Check your meetings page for the time.' };
    case 'monitoring.case':
      if (job.step === 'founder_checkin') return { ...base, headline: 'We checked in with you - a quick reply keeps things on track', waitingOn: 'you', detail: 'Mark the check-in task complete (or send a status). If we hear nothing your mentor is told.' };
      if (job.state === 'escalated') return { ...base, headline: 'The coordinator has been asked to reach out about progress', waitingOn: 'the coordinator', detail: 'Reply to the check-in task to close this.' };
      return { ...base, headline: 'Your mentor has been told the startup went quiet', waitingOn: 'you', detail: 'A short update from you is all it takes.' };
    case 'investor.introduction':
      if (job.step === 'awaiting_consent') return { ...base, headline: 'Waiting for your answer: may we introduce your startup to an investor?', waitingOn: 'you', detail: 'Nothing is shared without your yes.' };
      if (job.state === 'waiting_for_approval') return { ...base, headline: 'Your introduction is with an administrator for approval', waitingOn: 'an administrator', detail: 'You will be told the outcome.' };
      if (job.step === 'awaiting_investor') return { ...base, headline: 'The investor has been introduced and has been asked to respond', waitingOn: 'the investor', detail: 'A meeting is booked automatically if they accept.' };
      return { ...base, headline: 'Your investor introduction is in progress', waitingOn: 'the agent', detail: '' };
    default:
      return { ...base, headline: `${job.agent} is working on something`, waitingOn: 'the agent', detail: '' };
  }
}

module.exports = { feedItem, describeJob, triggerLabel, STATUS_LABELS, TIER_LABELS, EVENT_LABELS };
