const mongoose = require('mongoose');

const billingLineItemSchema = new mongoose.Schema({
  // AWS Billing CSV fields
  invoiceId: String,
  payerAccountId: String,
  linkedAccountId: String,
  recordType: String,
  productName: String,
  productCode: String,
  usageType: String,
  operation: String,
  availabilityZone: String,
  reservedInstance: String,
  itemDescription: String,
  usageStartDate: Date,
  usageEndDate: Date,
  usageQuantity: Number,
  blendedRate: Number,
  blendedCost: Number,
  unblendedRate: Number,
  unblendedCost: Number,
  resourceId: String,
  
  // Normalized fields
  accountId: {
    type: String,
    required: true,
    index: true
  },
  service: {
    type: String,
    required: true,
    index: true
  },
  region: {
    type: String,
    index: true
  },
  usageTypeNormalized: String,
  cost: {
    type: Number,
    required: true,
    index: true
  },
  usageQuantityNormalized: Number,
  
  // Tags (stored as key-value pairs)
  tags: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // User association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Made optional for backward compatibility with existing data
    index: true
  },
  
  // Metadata
  ingestionJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IngestionJob',
    index: true
  },
  ingestionDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  isAnomaly: {
    type: Boolean,
    default: false,
    index: true
  },
  anomalyScore: Number
}, {
  timestamps: true
});

// Compound indexes for common queries
billingLineItemSchema.index({ userId: 1, accountId: 1, service: 1, ingestionDate: -1 });
billingLineItemSchema.index({ userId: 1, accountId: 1, region: 1, ingestionDate: -1 });
billingLineItemSchema.index({ userId: 1, service: 1, ingestionDate: -1 });
billingLineItemSchema.index({ userId: 1, ingestionDate: -1, cost: -1 });
billingLineItemSchema.index({ userId: 1, 'tags': 1, ingestionDate: -1 });

module.exports = mongoose.model('BillingLineItem', billingLineItemSchema);

