const mongoose = require('mongoose');

/**
 * A user's own Google Calendar connection (OAuth). Tokens are stored encrypted (AES-256-GCM with
 * INTEGRATIONS_ENCRYPTION_KEY) and are never returned by any API.
 */
const calendarConnectionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    provider: { type: String, enum: ['google'], default: 'google' },
    accountEmail: { type: String, default: '' },
    accessTokenEnc: { type: String, default: null },
    refreshTokenEnc: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    scope: { type: String, default: '' },
    status: { type: String, enum: ['connected', 'needs_reconnect', 'revoked'], default: 'connected' },
    lastError: { type: String, default: null },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

calendarConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.models.CalendarConnection || mongoose.model('CalendarConnection', calendarConnectionSchema);
