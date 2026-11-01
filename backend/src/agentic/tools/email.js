const OutboxMessage = require('../../models/OutboxMessage');
const { smtpReady, demoModeForced } = require('../config');

/**
 * Email adapter. ONE code path for live and sandbox: the message is always recorded in the outbox.
 * With SMTP credentials (and AGENT_DEMO_MODE not forced) it is delivered; otherwise it is recorded
 * as `simulated` and nothing leaves the server. A simulated message is never reported as delivered.
 */
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const nodemailer = require('nodemailer');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS },
  });
  return transporter;
}
function resetTransporter() {
  transporter = null;
}
/** Tests inject a fake transport; production never calls this. */
function setTransporter(fake) {
  transporter = fake;
}

function mode() {
  return smtpReady() && !demoModeForced() ? 'live' : 'sandbox';
}

function fromAddress() {
  const name = process.env.SMTP_FROM_NAME || 'DBIT Incubation Centre';
  const address = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@example.invalid';
  return `"${name}" <${address}>`;
}

async function sendEmail({ to, subject, text = '', html, ics = null, dedupeKey, correlationId, meta = {} }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) {
    return { status: 'skipped', reason: 'No recipient email address on file', outboxId: null, mode: mode() };
  }
  if (dedupeKey) {
    const existing = await OutboxMessage.findOne({ dedupeKey, status: { $in: ['sent', 'simulated'] } }).lean();
    if (existing) return { status: existing.status, outboxId: String(existing._id), mode: existing.mode, deduped: true };
  }
  const currentMode = mode();
  const base = { channel: 'email', mode: currentMode, to: recipients, subject, body: text || html || '', ics, meta, correlationId: correlationId || null };

  if (currentMode === 'sandbox') {
    const row = await OutboxMessage.create({ ...base, status: 'simulated', dedupeKey });
    return { status: 'simulated', outboxId: String(row._id), mode: 'sandbox' };
  }

  try {
    const message = { from: fromAddress(), to: recipients.join(', '), subject, text, html: html || undefined };
    if (ics) message.icalEvent = { method: 'REQUEST', content: ics };
    const info = await getTransporter().sendMail(message);
    const row = await OutboxMessage.create({ ...base, status: 'sent', dedupeKey, providerMessageId: info.messageId || null });
    return { status: 'sent', outboxId: String(row._id), mode: 'live', providerMessageId: info.messageId };
  } catch (error) {
    await OutboxMessage.create({ ...base, status: 'failed', error: String(error.message).slice(0, 400) });
    const failure = new Error(`Email could not be delivered (${error.message})`);
    failure.code = 'EMAIL_FAILED';
    throw failure;
  }
}

module.exports = { sendEmail, mode, resetTransporter, setTransporter };
