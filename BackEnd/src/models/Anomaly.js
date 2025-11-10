const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['spike', 'drop', 'unusual_pattern'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  // User association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Made optional for backward compatibility with existing data
    index: true
  },
  accountId: String,
  service: String,
  region: String,
  date: {
    type: Date,
    required: true,
    index: true
  },
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  cost: Number,
  expectedCost: Number,
  variance: Number,
  variancePercent: Number,
  zScore: Number,
  description: String,
  lineItemIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingLineItem'
  }],
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: Date
}, {
  timestamps: true
});

anomalySchema.index({ userId: 1, date: -1, severity: 1 });
anomalySchema.index({ userId: 1, detectedAt: -1, acknowledged: 1 });

module.exports = mongoose.model('Anomaly', anomalySchema);

