const mongoose = require('mongoose');

const moderationItemSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ['opportunity', 'document', 'message', 'project_profile'],
      required: true,
    },
    contentId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reporterEmail: {
      type: String,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'removed'],
      default: 'pending',
    },
    resolutionNote: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

moderationItemSchema.index({ status: 1, createdAt: -1 });

const ModerationItem = mongoose.model('ModerationItem', moderationItemSchema);

module.exports = ModerationItem;
