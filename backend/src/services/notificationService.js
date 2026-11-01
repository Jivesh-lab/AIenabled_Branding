const User = require('../models/User');
const AgentNotification = require('../models/AgentNotification');
const { sendEmail } = require('../agentic/tools/email');

/**
 * Lifecycle notices for the people an event is actually about.
 *
 * Earlier versions broadcast every event to all admins, faculty and super admins, which is why every
 * role showed the same notification badge. Now each event goes only to its owner (the applicant or
 * founder). Staff are told by the agents, which address the right people for each situation
 * (see src/agentic), so the badge a person sees is the number of notices addressed to them.
 */
function eventCopy(event) {
  const payload = event.payload || {};
  const project = payload.projectTitle || payload.startupName || 'your incubation project';
  switch (event.eventType) {
    case 'application.submitted':
    case 'application.resubmitted':
      return { title: 'Application received', message: `Your application was received. The Application Agent is checking it now and will tell you if anything is missing.`, kind: 'status' };
    case 'application.approved':
      return { title: 'Application approved', message: `Your application was approved by a reviewer. Mentor matching has started.`, kind: 'status' };
    case 'application.rejected':
      return { title: 'Application decision', message: `A reviewer decided not to take your application forward. Open it to read their comments.`, kind: 'status' };
    case 'investor.introduction_declined':
      return { title: 'Investor introduction declined', message: `An introduction request for ${project} was declined by an administrator.`, kind: 'status' };
    default:
      return null;
  }
}

async function recipientsFor(event) {
  const payload = event.payload || {};
  const ids = new Set();
  if (payload.applicant_id) ids.add(String(payload.applicant_id));
  if (payload.recipientUserId) ids.add(String(payload.recipientUserId));
  if (!ids.size) return [];
  return User.find({ _id: { $in: [...ids] }, status: 'active', isSoftDeleted: { $ne: true } }).select('_id email role').lean();
}

async function notifyForEvent(event, log = console) {
  const copy = eventCopy(event);
  if (!copy) return { attempted: 0, delivered: 0 };
  const recipients = await recipientsFor(event);
  let delivered = 0;
  for (const recipient of recipients) {
    const existing = await AgentNotification.findOne({ eventId: event.eventId, recipientUserId: String(recipient._id) }).lean();
    if (existing?.status === 'delivered') {
      delivered += 1;
      continue;
    }
    try {
      await AgentNotification.create({
        eventId: event.eventId, recipientUserId: String(recipient._id), recipientEmail: recipient.email || '', recipientRole: recipient.role || '',
        title: copy.title, message: copy.message, kind: copy.kind, status: 'delivered', channel: 'in_app', mode: 'live', deliveredAt: new Date(),
      });
      delivered += 1;
      if (recipient.email) {
        await sendEmail({ to: recipient.email, subject: copy.title, text: copy.message, dedupeKey: `event:${event.eventId}:${recipient._id}`, correlationId: event.correlationId }).catch((error) => {
          log.warn(`[NOTIFICATIONS] Email not delivered to ${recipient.email}: ${error.message}`);
        });
      }
    } catch (error) {
      if (!(error && (error.code === 11000 || /duplicate/i.test(error.message)))) {
        log.warn(`[NOTIFICATIONS] Delivery failed for ${recipient._id}:`, error.message);
      } else {
        delivered += 1;
      }
    }
  }
  return { attempted: recipients.length, delivered };
}

module.exports = { notifyForEvent, eventCopy };
