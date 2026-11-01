const mongoose = require('mongoose');

/**
 * Short-lived, single-use tickets for the Google flows. Only a SHA-256 hash of the ticket is stored, so a
 * database read cannot be replayed. Tickets expire on their own (TTL index).
 *
 *   login       the holder has been verified and may start a session (consumed by the exchange)
 *   register    a verified Google identity with no account yet; the holder may complete a profile
 *   link        a verified Google identity whose e-mail matches an existing account; needs that account's password
 *   oauth-state one-time value that binds an OAuth redirect to the request that started it
 */
const authTicketSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    purpose: { type: String, enum: ['login', 'register', 'link', 'oauth-state'], required: true, index: true },
    userId: { type: String, default: null, index: true },
    claims: { type: mongoose.Schema.Types.Mixed, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

authTicketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.AuthTicket || mongoose.model('AuthTicket', authTicketSchema);
