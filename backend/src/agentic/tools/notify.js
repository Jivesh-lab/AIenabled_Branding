const User = require('../../models/User');
const AgentNotification = require('../../models/AgentNotification');
const { runAction } = require('../actionLog');
const emailAdapter = require('./email');

/**
 * In-app + email notification. In-app notices are always real (they are database rows users see);
 * the email half is live or sandbox depending on configuration. A failed email never loses the
 * in-app notice, and is reported honestly in the Action Log.
 */
async function resolveRecipients({ userIds = [], roles = [] }) {
  const byId = userIds.length ? await User.find({ _id: { $in: userIds.map(String) }, status: 'active', isSoftDeleted: { $ne: true } }).select('_id email name role').lean() : [];
  const byRole = roles.length ? await User.find({ role: { $in: roles }, status: 'active', isSoftDeleted: { $ne: true } }).select('_id email name role').lean() : [];
  const seen = new Set();
  return [...byId, ...byRole].filter((u) => !seen.has(String(u._id)) && seen.add(String(u._id)));
}

function bodyHtml(title, message, link) {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  const cta = link ? `<p><a href="${base}${link}">Open in the incubation portal</a></p>` : '';
  return `<div style="font-family:Arial,sans-serif;max-width:560px"><h3>${title}</h3><p>${message}</p>${cta}<p style="color:#64748b;font-size:12px">Sent by the DBIT Incubation Centre agents.</p></div>`;
}

async function notify(ctx, params) {
  const { key, userIds = [], roles = [], title, message, link = null, kind = 'info', severity = 'info', projectId = ctx.projectId || null, email = true, action = 'notification.send' } = params;
  if (!key) throw new Error('notify requires a stable key');
  return runAction({
    agent: ctx.agent,
    action,
    tool: 'notify',
    trigger: ctx.trigger,
    correlationId: ctx.correlationId,
    jobId: ctx.jobId,
    applicationId: ctx.applicationId,
    projectId,
    audience: { userIds, roles },
    idempotencyKey: `notify:${key}`,
    inputSummary: `${title} -> ${userIds.length} user(s)${roles.length ? ` + role(s) ${roles.join(',')}` : ''}`,
    summary: (r) => params.logSummary || `${ctx.agent} notified ${r?.inApp ?? 0} person(s): ${title}`,
    exec: async () => {
      const recipients = await resolveRecipients({ userIds, roles });
      if (!recipients.length) {
        return { status: 'success', result: { inApp: 0, emails: [] }, summary: `${ctx.agent} had no active recipient to notify (${title}).` };
      }
      const mode = emailAdapter.mode();
      let inApp = 0;
      const emails = [];
      for (const r of recipients) {
        try {
          await AgentNotification.create({
            eventId: key,
            recipientUserId: String(r._id),
            recipientEmail: r.email || '',
            recipientRole: r.role || '',
            title,
            message,
            kind,
            severity,
            link,
            projectId,
            status: 'delivered',
            channel: 'in_app',
            mode: 'live',
            deliveredAt: new Date(),
          });
          inApp += 1;
        } catch (error) {
          if (!(error && (error.code === 11000 || /duplicate/i.test(error.message)))) throw error;
        }
        if (email && r.email) {
          try {
            const sent = await emailAdapter.sendEmail({
              to: r.email,
              subject: title,
              text: message,
              html: bodyHtml(title, message, link),
              dedupeKey: `${key}:${r._id}`,
              correlationId: ctx.correlationId,
            });
            emails.push({ to: r.email, status: sent.status });
          } catch (error) {
            emails.push({ to: r.email, status: 'failed', error: error.message });
          }
        }
      }
      const failed = emails.filter((e) => e.status === 'failed').length;
      const simulated = emails.filter((e) => e.status === 'simulated').length;
      const parts = [params.logSummary || `${ctx.agent} notified ${inApp} person(s): ${title}.`];
      if (failed) parts.push(`${failed} email(s) could not be delivered; the in-app notice was delivered.`);
      return {
        status: mode === 'sandbox' && emails.length > 0 && simulated === emails.length ? 'simulated' : 'success',
        result: { inApp, emails },
        summary: parts.join(' '),
        followUp: failed ? 'Email delivery failed; the person will see the in-app notice.' : null,
      };
    },
  });
}

module.exports = { notify, resolveRecipients };
