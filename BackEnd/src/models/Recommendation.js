const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'rightsizing',
      'reserved_instance',
      'savings_plan',
      'storage_tiering',
      'idle_resource_cleanup',
      'data_transfer_optimization',
      'unattached_ebs',
      'unattached_eip'
    ],
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
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  accountId: String,
  service: String,
  region: String,
  resourceId: String,
  title: {
    type: String,
    required: true
  },
  description: String,
  currentCost: Number,
  estimatedSavings: {
    type: Number,
    required: true
  },
  estimatedSavingsPercent: Number,
  implementationEffort: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  actionItems: [String],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'implemented', 'dismissed'],
    default: 'pending',
    index: true
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  implementedAt: Date,
  implementedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

recommendationSchema.index({ userId: 1, status: 1, priority: 1, generatedAt: -1 });
recommendationSchema.index({ userId: 1, accountId: 1, type: 1, status: 1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);

