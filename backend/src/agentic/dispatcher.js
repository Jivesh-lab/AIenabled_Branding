const User = require('../models/User');
const FacultyProject = require('../models/FacultyProject');
const jobs = require('./jobs');
const { note } = require('./actionLog');
const { cleanName } = require('./projects');
const applicationAgent = require('./agents/applicationAgent');
const mentorAgent = require('./agents/mentorAgent');
const workflowAgent = require('./agents/workflowAgent');
const monitoringAgent = require('./agents/monitoringAgent');
const investorAgent = require('./agents/investorAgent');

/**
 * Routes a durable domain event to the agent that cares about it. Called by the existing event
 * worker (services/eventOrchestrator), so events keep their idempotency, retry and dead-letter
 * behaviour. Every handler is itself idempotent: a re-delivered event changes nothing.
 */
async function handleDomainEvent(event) {
  const results = [];
  switch (event.eventType) {
    case 'application.submitted':
      results.push(['application', await applicationAgent.onSubmitted(event)]);
      break;
    case 'application.resubmitted':
      results.push(['application', await applicationAgent.onResubmitted(event)]);
      break;
    case 'application.approved':
      results.push(['application', await applicationAgent.onDecided(event)]);
      results.push(['mentor', await mentorAgent.onApproved(event)]);
      break;
    case 'application.rejected':
      results.push(['application', await applicationAgent.onDecided(event)]);
      break;
    case 'allocation.confirmed':
      results.push(['workflow', await workflowAgent.onAllocationConfirmed(event)]);
      break;
    case 'mentor.allocation.approved': {
      // A coordinator confirmed a mentor by hand (the older request form). If that mentor has an account the
      // Workflow Agent can onboard them; otherwise say plainly that a person has to arrange the first meeting.
      const name = cleanName(event.payload?.allocatedMentorName).toLowerCase();
      const mentors = await User.find({ role: 'mentor', status: 'active' }).select('_id name').lean();
      const mentor = mentors.find((m) => cleanName(m.name).toLowerCase() === name);
      const projectId = event.projectId;
      if (mentor && projectId) {
        await FacultyProject.updateOne({ id: projectId }, { $set: { mentorUserId: String(mentor._id) } });
        results.push(['workflow', await workflowAgent.onAllocationConfirmed({ ...event, payload: { ...event.payload, mentorUserId: String(mentor._id) } })]);
      } else {
        await note({ agent: 'Workflow Agent', action: 'meeting.schedule', status: 'skipped', trigger: { type: 'event', ref: event.eventType }, projectId, summary: `The Workflow Agent did not arrange an onboarding meeting: ${event.payload?.allocatedMentorName || 'the mentor'} has no mentor account, so there is no calendar to book. A person needs to arrange the first meeting.`, audience: { userIds: [], roles: ['faculty', 'admin'] } });
      }
      break;
    }
    case 'task.completed': {
      // A founder finished a task: any open monitoring case should re-check straight away.
      const open = event.projectId ? await jobs.findOpen(monitoringAgent.JOB_TYPE, event.projectId) : null;
      if (open) results.push(['monitoring', await jobs.signal(open._id, 'recheck', {})]);
      break;
    }
    default:
      break;
  }
  return { handledBy: results.filter(([, r]) => r).map(([name]) => name) };
}

module.exports = { handleDomainEvent };
