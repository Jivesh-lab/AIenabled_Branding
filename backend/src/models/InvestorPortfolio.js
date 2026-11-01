const mongoose = require('mongoose');

const monthlyMetricSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // e.g. '2026-08', '2026-09', '2026-10'
    mrr: { type: Number, default: 0 }, // Monthly Recurring Revenue in INR
    activeUsers: { type: Number, default: 0 },
    burnRate: { type: Number, default: 0 }, // Monthly burn in INR
    runwayMonths: { type: Number, default: 12 },
    keyMilestone: { type: String, default: '' },
    trlLevel: { type: Number, default: 6 },
  },
  { _id: false }
);

const investorPortfolioSchema = new mongoose.Schema(
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
    startupName: {
      type: String,
      required: true,
      trim: true,
    },
    sector: {
      type: String,
      required: true,
      trim: true,
    },
    stage: {
      type: String,
      default: 'prototype',
    },
    investmentDate: {
      type: Date,
      default: Date.now,
    },
    round: {
      type: String,
      enum: ['Pre-Seed', 'Seed', 'Pre-Series A', 'Series A', 'Grant Cohort', 'Angel Round', 'Convertible Note'],
      default: 'Seed',
    },
    investmentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    equityPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    currentValuation: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'term_sheet_signed', 'exit_profitable', 'written_off'],
      default: 'active',
      index: true,
    },
    boardSeat: {
      type: Boolean,
      default: false,
    },
    leadMentor: {
      type: String,
      default: 'Incubation Advisory Board',
    },
    governanceNotes: {
      type: String,
      default: '',
      maxlength: 3000,
    },
    monthlyMetrics: {
      type: [monthlyMetricSchema],
      default: [],
    },
  },
  { timestamps: true }
);

investorPortfolioSchema.index({ investorId: 1, startupId: 1 }, { unique: true });
investorPortfolioSchema.index({ investorId: 1, createdAt: -1 });

const InvestorPortfolio = mongoose.model('InvestorPortfolio', investorPortfolioSchema);

module.exports = InvestorPortfolio;

