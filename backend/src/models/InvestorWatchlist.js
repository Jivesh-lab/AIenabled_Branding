const mongoose = require('mongoose');

const investorWatchlistSchema = new mongoose.Schema(
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
    interestLevel: {
      type: String,
      enum: ['watching', 'high_interest', 'passed'],
      default: 'watching',
    },
    notes: {
      type: String,
      default: '',
      maxlength: 3000,
    },
  },
  { timestamps: true }
);

// Unique compound index so an investor can only have one entry per startup
investorWatchlistSchema.index({ investorId: 1, startupId: 1 }, { unique: true });

const InvestorWatchlist = mongoose.model('InvestorWatchlist', investorWatchlistSchema);

module.exports = InvestorWatchlist;
