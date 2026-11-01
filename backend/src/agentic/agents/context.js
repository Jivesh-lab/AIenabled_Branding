function jobTrigger(job) {
  if (!job) return null;
  if (job.triggerEvent === 'user.command') return { type: 'assistant', ref: job.data?.requestedBy || null };
  if (job.triggerEvent === 'override.run') return { type: 'override', ref: job.data?.requestedBy || null };
  if (job.triggerEvent && job.triggerEvent.startsWith('schedule.')) return { type: 'schedule', ref: job.triggerEvent.replace('schedule.', '') };
  if (job.triggerEvent) return { type: 'event', ref: job.triggerEvent };
  return null;
}

/** The context every agent action carries so the Action Log can say who did what, because of what. */
function makeCtx(agent, { job = null, event = null, trigger = null, applicationId = null, projectId = null, correlationId = null } = {}) {
  return {
    agent,
    trigger: trigger || jobTrigger(job) || (event ? { type: 'event', ref: event.eventType } : { type: 'schedule', ref: job?.type || 'worker' }),
    correlationId: correlationId || job?.correlationId || event?.correlationId || null,
    jobId: job ? String(job._id) : null,
    applicationId: applicationId || job?.applicationId || event?.applicationId || null,
    projectId: projectId || job?.projectId || event?.projectId || null,
  };
}

const AGENTS = Object.freeze({
  application: 'Application Agent',
  mentor: 'Mentor-Matching Agent',
  workflow: 'Workflow Agent',
  monitoring: 'Monitoring Agent',
  investor: 'Investor Agent',
});

module.exports = { makeCtx, AGENTS };
