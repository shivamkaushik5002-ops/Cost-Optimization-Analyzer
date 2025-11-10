const express = require('express');
const BillingLineItem = require('../models/BillingLineItem');
const Aggregate = require('../models/Aggregate');
const IngestionJob = require('../models/IngestionJob');
const Anomaly = require('../models/Anomaly');
const Recommendation = require('../models/Recommendation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Clear all billing data
 * WARNING: This is a destructive operation that cannot be undone
 */
router.delete('/clear', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Delete only the authenticated user's billing data
    const lineItemsResult = await BillingLineItem.deleteMany({ userId });
    const aggregatesResult = await Aggregate.deleteMany({ userId });
    const jobsResult = await IngestionJob.deleteMany({ userId });
    const anomaliesResult = await Anomaly.deleteMany({ userId });
    const recommendationsResult = await Recommendation.deleteMany({ userId });

    res.json({
      message: 'All billing data has been deleted',
      deleted: {
        lineItems: lineItemsResult.deletedCount,
        aggregates: aggregatesResult.deletedCount,
        jobs: jobsResult.deletedCount,
        anomalies: anomaliesResult.deletedCount,
        recommendations: recommendationsResult.deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

