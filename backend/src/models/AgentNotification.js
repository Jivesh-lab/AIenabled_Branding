const mongoose = require('mongoose');

const agentNotificationSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    recipientUserId: { type: String, required: true, index: true },
    recipientEmail: { type: String, default: '' },
    recipientRole: { type: String, default: '' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    kind: { type: String, default: 'info' },
    severity: { type: String, enum: ['info', 'action', 'warning'], default: 'info' },
    link: { type: String, default: null },
    projectId: { type: String, default: null },
    mode: { type: String, enum: ['live', 'sandbox'], default: 'live' },
    status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending', index: true },
    channel: { type: String, enum: ['in_app', 'email'], default: 'in_app' },
    emailMessageId: { type: String, default: null },
    errorMessage: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

agentNotificationSchema.index({ eventId: 1, recipientUserId: 1 }, { unique: true });

module.exports = mongoose.models.AgentNotification || mongoose.model('AgentNotification', agentNotificationSchema);
