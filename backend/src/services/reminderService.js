const nodemailer = require('nodemailer');

const StartupProfile = require('../models/StartupProfile');
const FacultyTask = require('../models/FacultyTask');
const FacultyMeeting = require('../models/FacultyMeeting');
const User = require('../models/User');
const ReminderLog = require('../models/ReminderLog');

/**
 * Student reminders for real deadlines: tasks assigned to students (due within 48h, not completed) and
 * confirmed meetings starting within 24h.
 *
 * Guarantees:
 *  - No duplicates: each reminder is claimed by inserting a ReminderLog row with a unique key BEFORE sending,
 *    so reprocessing the same event (overlapping sweeps, restarts) is a no-op.
 *  - Honest outcomes: a row becomes "sent" only if the mail server ACCEPTED the recipient. Errors and
 *    rejections are stored as "failed" with the reason, and are retried (max MAX_ATTEMPTS).
 *  - No fake delivery: without real SMTP credentials nothing is sent and nothing is recorded as sent. (The
 *    shared emailService falls back to a test mailbox and always reports "delivered", so it is not used.)
 */

const MAX_ATTEMPTS = 3;
const TASK_WINDOW_HOURS = 48;
const MEETING_WINDOW_HOURS = 24;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Epoch ms for an institute-local (IST) date + "HH:MM", or null when the date is not an ISO date. */
function istInstant(date, time = '09:00') {
  if (!ISO_DATE.test(date || '')) return null;
  const clock = CLOCK.test(time || '') ? time : '09:00';
  return Date.parse(`${date}T${clock}:00+05:30`);
}

function smtpConfigured(env = process.env) {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && (env.SMTP_PASS || env.SMTP_PASSWORD));
}

/** Real-SMTP-only mailer. Resolves with what the server reported; never invents success. */
function createSmtpMailer(env = process.env) {
  if (!smtpConfigured(env)) return null;
  const port = parseInt(env.SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS || env.SMTP_PASSWORD },
  });
  const from = `"${env.SMTP_FROM_NAME || 'DBIT Incubation Centre'}" <${env.SMTP_FROM || env.SMTP_USER}>`;
  return async ({ to, subject, text }) => {
    const info = await transporter.sendMail({ from, to, subject, text });
    return { accepted: info.accepted || [], rejected: info.rejected || [], messageId: info.messageId || null };
  };
}

async function recipientFor(projectId) {
  const profile = await StartupProfile.findOne({ applicationId: projectId }).select('founderId').lean();
  if (!profile?.founderId) return null;
  const user = await User.findOne({ _id: profile.founderId, status: 'active', isSoftDeleted: { $ne: true } })
    .select('email name')
    .lean();
  return user?.email ? { id: String(profile.founderId), email: user.email, name: user.name || '' } : null;
}

/**
 * Atomically claim a reminder. true = this caller must send it; false = already sent / in flight / out of
 * attempts. A duplicate-key error on insert means someone else already owns it.
 */
async function claim(entry) {
  try {
    await ReminderLog.create({ ...entry, status: 'pending', attempts: 1 });
    return true;
  } catch (err) {
    if (err && err.code !== 11000) throw err;
  }
  const retry = await ReminderLog.findOneAndUpdate(
    { key: entry.key, status: 'failed', attempts: { $lt: MAX_ATTEMPTS } },
    { $set: { status: 'pending' }, $inc: { attempts: 1 } },
    { new: true }
  );
  return Boolean(retry);
}

async function deliver(mailer, entry, message) {
  try {
    const result = await mailer({ to: entry.recipientEmail, ...message });
    const accepted = (result.accepted || []).map((a) => String(a).toLowerCase());
    if (accepted.includes(entry.recipientEmail.toLowerCase())) {
      await ReminderLog.updateOne(
        { key: entry.key },
        { $set: { status: 'sent', messageId: result.messageId || null, sentAt: new Date(), error: null } }
      );
      return 'sent';
    }
    await ReminderLog.updateOne(
      { key: entry.key },
      { $set: { status: 'failed', error: `Recipient not accepted by the mail server (rejected: ${(result.rejected || []).join(', ') || 'none listed'})` } }
    );
    return 'failed';
  } catch (err) {
    await ReminderLog.updateOne({ key: entry.key }, { $set: { status: 'failed', error: String(err.message || err).slice(0, 300) } });
    return 'failed';
  }
}

async function remind(mailer, base, message, totals) {
  const to = await recipientFor(base.projectId);
  if (!to) {
    totals.noRecipient += 1;
    return;
  }
  const entry = { ...base, recipientUserId: to.id, recipientEmail: to.email };
  if (!(await claim(entry))) {
    totals.duplicates += 1;
    return;
  }
  totals[await deliver(mailer, entry, message)] += 1;
}

/**
 * One pass over upcoming deadlines. `now` and `mailer` are injectable for tests.
 * Returns counts; `configured:false` means nothing was attempted because no real mail server is set up.
 */
async function runReminderSweep({ now = Date.now(), mailer = createSmtpMailer() } = {}) {
  const totals = { configured: Boolean(mailer), considered: 0, sent: 0, failed: 0, duplicates: 0, noRecipient: 0 };
  if (!mailer) return totals;

  const tasks = await FacultyTask.find({ assignedRole: 'student', status: { $ne: 'Completed' } }).lean();
  for (const task of tasks) {
    const due = istInstant(task.dueDate, '18:00');
    if (due === null || due < now || due - now > TASK_WINDOW_HOURS * 3600000) continue;
    totals.considered += 1;
    await remind(
      mailer,
      { key: `task:${task.id}:${task.dueDate}:${TASK_WINDOW_HOURS}h`, kind: 'task', refId: task.id, projectId: task.projectId },
      {
        subject: `Task due soon: ${task.title}`,
        text: `Your task "${task.title}" for ${task.projectTitle || 'your project'} is due on ${task.dueDate}. Status: ${task.status}.`,
      },
      totals
    );
  }

  const meetings = await FacultyMeeting.find({}).lean();
  for (const meeting of meetings) {
    if (/^(requested|cancel+ed|declined)$/i.test(meeting.invitationStatus || '')) continue; // not a confirmed meeting
    const start = istInstant(meeting.date, meeting.startTime);
    if (start === null || start < now || start - now > MEETING_WINDOW_HOURS * 3600000) continue;
    totals.considered += 1;
    await remind(
      mailer,
      { key: `meeting:${meeting.id}:${meeting.date}T${meeting.startTime}:${MEETING_WINDOW_HOURS}h`, kind: 'meeting', refId: meeting.id, projectId: meeting.projectId },
      {
        subject: `Meeting reminder: ${meeting.title}`,
        text: `"${meeting.title}" is scheduled for ${meeting.date} at ${meeting.startTime} IST (${meeting.meetingProvider || 'location to be confirmed'}).`,
      },
      totals
    );
  }
  return totals;
}

/** Starts the periodic sweep. Off unless REMINDERS_ENABLED=true AND real SMTP is configured. */
function startReminderSweeper(env = process.env, log = console) {
  if (env.REMINDERS_ENABLED !== 'true') return null;
  if (!smtpConfigured(env)) {
    log.warn('[REMINDERS] REMINDERS_ENABLED=true but SMTP is not configured; reminders will NOT be sent.');
    return null;
  }
  const minutes = Math.max(5, parseInt(env.REMINDER_SWEEP_MINUTES || '15', 10));
  const run = () =>
    runReminderSweep().then(
      (t) => log.log(`[REMINDERS] sweep: ${JSON.stringify(t)}`),
      (err) => log.error('[REMINDERS] sweep failed:', err.message)
    );
  run();
  return setInterval(run, minutes * 60000);
}

module.exports = { runReminderSweep, startReminderSweeper, createSmtpMailer, smtpConfigured, istInstant, MAX_ATTEMPTS };
