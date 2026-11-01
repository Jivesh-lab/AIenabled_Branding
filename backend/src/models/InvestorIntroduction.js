const mongoose = require('mongoose');

const investorIntroductionSchema = new mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StartupProfile',
      required: true,
      index: true,
    },
    founderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['expression_of_interest', 'meeting_request'],
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Introduction message is required'],
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },
    proposedTimes: {
      type: [
        {
          date: { type: String, required: true },
          time: { type: String, required: true },
          timeZone: { type: String, default: 'IST' },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['awaiting_founder_consent', 'pending_admin_review', 'approved', 'forwarded_to_founder', 'scheduled', 'accepted', 'declined', 'cancelled'],
      default: 'pending_admin_review',
      index: true,
    },
    scheduledMeeting: {
      date: { type: String, default: null },
      time: { type: String, default: null },
      timeZone: { type: String, default: 'IST' },
      meetingLink: { type: String, default: null },
      scheduledByAgent: { type: Boolean, default: false },
      emailSentToInvestor: { type: Boolean, default: false },
      emailSentToFounder: { type: Boolean, default: false },
      scheduledAt: { type: Date, default: null },
    },
    // Introductions proposed by the Investor Agent: nothing is shared before the founder consents and an admin approves.
    origin: { type: String, enum: ['investor', 'agent'], default: 'investor', index: true },
    founderConsent: {
      status: { type: String, enum: ['not_required', 'pending', 'granted', 'declined'], default: 'not_required' },
      at: { type: Date, default: null },
    },
    matchScore: { type: Number, default: null },
    matchReasons: { type: [String], default: [] },
    draftDocumentId: { type: String, default: null },
    jobId: { type: String, default: null },
    meetingId: { type: String, default: null },
    investorResponse: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    feedback: {
      type: [{ byUserId: String, byRole: String, rating: Number, comment: String, at: Date, _id: false }],
      default: [],
    },
    adminNotes: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

investorIntroductionSchema.index({ investorId: 1, createdAt: -1 });
investorIntroductionSchema.index({ status: 1, createdAt: -1 });

const InvestorIntroduction = mongoose.model('InvestorIntroduction', investorIntroductionSchema);

module.exports = InvestorIntroduction;
