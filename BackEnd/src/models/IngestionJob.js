const mongoose = require('mongoose');

const ingestionJobSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  filePath: String,
  fileSize: Number,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
    default: 'pending',
    index: true
  },
  startedAt: Date,
  completedAt: Date,
  duration: Number, // in milliseconds
  rowsProcessed: {
    type: Number,
    default: 0
  },
  rowsTotal: Number,
  rowsSkipped: {
    type: Number,
    default: 0
  },
  errors: [{
    row: Number,
    message: String,
    timestamp: Date
  }],
  metadata: {
    accountId: String,
    invoiceId: String,
    billingPeriod: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Made optional for backward compatibility with existing data
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

ingestionJobSchema.index({ userId: 1, status: 1, createdAt: -1 });
ingestionJobSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('IngestionJob', ingestionJobSchema);

