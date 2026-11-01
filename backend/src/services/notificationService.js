const User = require('../models/User');
const AgentNotification = require('../models/AgentNotification');
const { sendEmail, smtpConfigured } = require('./emailService');

function eventCopy(event) {
  const payload = event.payload || {};
  const project = payload.projectTitle || payload.startupName || event.projectId || 'your incubation project';
  switch (event.eventType) {
    case 'application.submitted':
    case 'application.resubmitted':
      return { title: 'Application received', message: `Your application for ${project} was submitted and is being processed.` };
    case 'application.approved':
      return { title: 'Application approved', message: `Your application for ${project} was approved. Incubation coordination is starting.` };
    case 'application.revision_requested':
      return { title: 'Application revision requested', message: `Please review the requested changes for ${project} before resubmitting.` };
    case 'mentor.allocation.approved':
      return { title: 'Mentor allocation approved', message: `A mentor allocation for ${project} was approved. Your kickoff activities are being coordinated.` };
    case 'monitoring.report.created':
      return { title: 'Startup monitoring update', message: `${project} has a new monitoring result requiring attention.` };
    case 'task.overdue':
      return { title: 'Task overdue', message: `A task for ${project} is overdue and a follow-up has been requested.` };
    case 'investor.introduction_requested':
      return { title: 'Investor introduction submitted', message: 'A new investor introduction request is waiting for review.' };
    case 'investor.introduction_approved':
      return { title: 'Investor introduction approved', message: 'An investor introduction has passed admin review and is ready for coordination.' };
    default:
      return null;
  }
}

async function recipientsFor(event) {
  const payload = event.payload || {};
  const ids = new Set();
  if (payload.applicant_id) ids.add(String(payload.applicant_id));
  if (payload.recipientUserId) ids.add(String(payload.recipientUserId));

  const roles = event.eventType.startsWith('application.') || event.eventType.startsWith('investor.')
    ? ['admin', 'super_admin']
    : ['faculty', 'admin', 'super_admin'];
  const users = await User.find({ role: { $in: roles }, status: 'active', isSoftDeleted: { $ne: true } })
    .select('_id email name role')
    .lean();
  users.forEach((user) => ids.add(String(user._id)));

  const directUsers = ids.size ? await User.find({ _id: { $in: [...ids] }, status: 'active', isSoftDeleted: { $ne: true } }).select('_id email role').lean() : [];
  return [...directUsers, ...users.filter((user) => ids.has(String(user._id)))].filter((user, index, list) => list.findIndex((item) => String(item._id) === String(user._id)) === index);
}

async function notifyForEvent(event, log = console) {
  const copy = eventCopy(event);
  if (!copy) return { attempted: 0, delivered: 0 };
  const recipients = await recipientsFor(event);
  let delivered = 0;
  for (const recipient of recipients) {
    const existing = await AgentNotification.findOne({ eventId: event.eventId, recipientUserId: String(recipient._id) });
    if (existing?.status === 'delivered') {
      delivered += 1;
      continue;
    }

    const notification = existing || await AgentNotification.create({
      eventId: event.eventId,
      recipientUserId: String(recipient._id),
      recipientEmail: recipient.email || '',
      recipientRole: recipient.role || '',
      title: copy.title,
      message: copy.message,
      status: 'pending',
      channel: 'in_app',
    });

    try {
      let emailMessageId = null;
      if (smtpConfigured() && recipient.email) {
        const result = await sendEmail({ to: recipient.email, subject: copy.title, text: copy.message, html: `<p>${copy.message}</p>` });
        if (!result?.success) throw new Error('Email provider did not accept the notification');
        emailMessageId = result.messageId || null;
      }
      await AgentNotification.updateOne(
        { _id: notification._id },
        { $set: { status: 'delivered', channel: emailMessageId ? 'email' : 'in_app', emailMessageId, deliveredAt: new Date(), errorMessage: null } }
      );
      delivered += 1;
    } catch (error) {
      await AgentNotification.updateOne({ _id: notification._id }, { $set: { status: 'failed', errorMessage: String(error.message || error).slice(0, 500) } });
      log.warn(`[NOTIFICATIONS] Delivery failed for ${recipient.email || recipient._id}:`, error.message);
    }
  }
  return { attempted: recipients.length, delivered };
}

module.exports = { notifyForEvent };
