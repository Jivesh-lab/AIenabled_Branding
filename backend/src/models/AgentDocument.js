const mongoose = require('mongoose');

/** Documents agents generate (summaries, onboarding packs, meeting notes, introduction drafts). */
const agentDocumentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['application_summary', 'onboarding_pack', 'meeting_notes', 'intro_draft', 'escalation_brief'], required: true, index: true },
    title: { type: String, required: true },
    markdown: { type: String, required: true },
    generatedBy: { type: String, required: true },
    method: { type: String, default: 'rules' },
    dedupeKey: { type: String, default: undefined },
    projectId: { type: String, default: null, index: true },
    applicationId: { type: String, default: null, index: true },
    audience: { userIds: { type: [String], default: [] }, roles: { type: [String], default: [] } },
  },
  { timestamps: true }
);

agentDocumentSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });

module.exports = mongoose.models.AgentDocument || mongoose.model('AgentDocument', agentDocumentSchema);
