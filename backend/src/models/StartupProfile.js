const mongoose = require('mongoose');

const startupProfileSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    startupId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    founderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Startup name is required'],
      trim: true,
      maxlength: 120,
    },
    tagline: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    problem: {
      type: String,
      required: true,
    },
    solution: {
      type: String,
      required: true,
    },
    sector: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    stage: {
      type: String,
      enum: ['idea', 'concept', 'prototype', 'mvp', 'growth', 'market_ready'],
      default: 'idea',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'incubated', 'graduated', 'inactive'],
      default: 'active',
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pitchDeckUrl: {
      type: String,
      default: null, // Only visible to verified investors
    },
    pitchVideoUrl: {
      type: String,
      default: null, // Only visible to verified investors
    },
    tractionSummary: {
      type: String,
      default: null, // Sanitized summary
    },
    readinessScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

startupProfileSchema.index({ isApproved: 1, status: 1 });

const StartupProfile = mongoose.model('StartupProfile', startupProfileSchema);

module.exports = StartupProfile;
