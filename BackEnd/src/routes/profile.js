const express = require('express');
const BillingLineItem = require('../models/BillingLineItem');
const Aggregate = require('../models/Aggregate');
const IngestionJob = require('../models/IngestionJob');
const Anomaly = require('../models/Anomaly');
const Recommendation = require('../models/Recommendation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Get user profile statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get counts - only show data for the authenticated user
    const userQuery = {
      userId
    };
    const lineItemCount = await BillingLineItem.countDocuments(userQuery);
    const aggregateCount = await Aggregate.countDocuments(userQuery);
    const jobCount = await IngestionJob.countDocuments(userQuery);
    const anomalyCount = await Anomaly.countDocuments(userQuery);
    const recommendationCount = await Recommendation.countDocuments(userQuery);

    // Get cost statistics - only show data for the authenticated user
    const costStats = await BillingLineItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' },
          avgCost: { $avg: '$cost' },
          minCost: { $min: '$cost' },
          maxCost: { $max: '$cost' }
        }
      }
    ]);

    // Get date range - only show data for the authenticated user
    const dateRange = await BillingLineItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          minDate: { $min: '$usageStartDate' },
          maxDate: { $max: '$usageStartDate' }
        }
      }
    ]);

    // Get top services - only show data for the authenticated user
    const topServices = await BillingLineItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$service',
          totalCost: { $sum: '$cost' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalCost: -1 } },
      { $limit: 5 }
    ]);

    // Get latest job - only show data for the authenticated user
    const latestJob = await IngestionJob.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      counts: {
        lineItems: lineItemCount,
        aggregates: aggregateCount,
        jobs: jobCount,
        anomalies: anomalyCount,
        recommendations: recommendationCount
      },
      cost: costStats[0] || {
        totalCost: 0,
        avgCost: 0,
        minCost: 0,
        maxCost: 0
      },
      dateRange: dateRange[0] || null,
      topServices: topServices.map(s => ({
        service: s._id,
        totalCost: s.totalCost,
        count: s.count
      })),
      latestJob: latestJob ? {
        id: latestJob._id,
        fileName: latestJob.fileName,
        status: latestJob.status,
        rowsProcessed: latestJob.rowsProcessed,
        rowsTotal: latestJob.rowsTotal,
        createdAt: latestJob.createdAt,
        completedAt: latestJob.completedAt
      } : null
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

