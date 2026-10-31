const mongoose = require('mongoose');

/**
 * One row per reminder that was ever attempted, keyed so the same event can never be reminded twice.
 *
 * key = `${kind}:${refId}:${dueDate}:${window}`  (e.g. "task:task-17:2026-11-03:48h")
 * Rescheduling a meeting changes dueDate and therefore creates a new key; reprocessing the same event
 * hits the unique index and is skipped.
 *
 * status values describe what is actually known:
 *   pending   claimed by a sweep that has not finished (or crashed)
 *   sent      the SMTP server accepted the message for the recipient (not proof of inbox delivery)
 *   failed    the attempt errored or the server rejected the recipient
 */
const reminderLogSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['task', 'meeting'], required: true },
    refId: { type: String, required: true, index: true },
    projectId: { type: String, default: '' },
    recipientUserId: { type: String, default: '' },
    recipientEmail: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    messageId: { type: String, default: null },
    error: { type: String, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ReminderLog || mongoose.model('ReminderLog', reminderLogSchema);
