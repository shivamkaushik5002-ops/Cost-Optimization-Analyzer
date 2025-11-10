const mongoose = require('mongoose');

const aggregateSchema = new mongoose.Schema({
  // User association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Made optional for backward compatibility with existing data
    index: true
  },
  
  // Aggregation dimensions
  date: {
    type: Date,
    required: true,
    index: true
  },
  accountId: {
    type: String,
    index: true
  },
  service: {
    type: String,
    index: true
  },
  region: {
    type: String,
    index: true
  },
  tagKey: String,
  tagValue: String,
  
  // Aggregation type: daily, monthly
  aggregationType: {
    type: String,
    enum: ['daily', 'monthly'],
    required: true,
    index: true
  },
  
  // Aggregated metrics
  totalCost: {
    type: Number,
    required: true
  },
  totalUsageQuantity: Number,
  lineItemCount: Number,
  
  // Trend metrics
  previousPeriodCost: Number,
  costVariance: Number,
  costVariancePercent: Number,
  
  // Computed at
  computedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes
aggregateSchema.index({ userId: 1, date: -1, accountId: 1, service: 1, aggregationType: 1 });
aggregateSchema.index({ userId: 1, date: -1, service: 1, aggregationType: 1 });
aggregateSchema.index({ userId: 1, date: -1, region: 1, aggregationType: 1 });
aggregateSchema.index({ userId: 1, aggregationType: 1, date: -1 });

module.exports = mongoose.model('Aggregate', aggregateSchema);

