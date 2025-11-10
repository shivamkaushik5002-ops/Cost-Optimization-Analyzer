const express = require('express');
const BillingLineItem = require('../models/BillingLineItem');
const Aggregate = require('../models/Aggregate');
const IngestionJob = require('../models/IngestionJob');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Diagnostic endpoint to check data ingestion status
 */
router.get('/data-status', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Only show data for the authenticated user
    const userQuery = {
      userId
    };
    
    const lineItemCount = await BillingLineItem.countDocuments(userQuery);
    const aggregateCount = await Aggregate.countDocuments(userQuery);
    const jobCount = await IngestionJob.countDocuments(userQuery);
    
    const latestJob = await IngestionJob.findOne(userQuery)
      .sort({ createdAt: -1 })
      .lean();
    
    const latestLineItem = await BillingLineItem.findOne(userQuery)
      .sort({ ingestionDate: -1 })
      .select('usageStartDate cost service accountId')
      .lean();
    
    const latestAggregate = await Aggregate.findOne(userQuery)
      .sort({ date: -1 })
      .select('date totalCost service accountId')
      .lean();

    const dateRange = await BillingLineItem.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: null,
          minDate: { $min: '$usageStartDate' },
          maxDate: { $max: '$usageStartDate' }
        }
      }
    ]);

    res.json({
      status: 'ok',
      counts: {
        lineItems: lineItemCount,
        aggregates: aggregateCount,
        jobs: jobCount
      },
      latest: {
        job: latestJob ? {
          id: latestJob._id,
          fileName: latestJob.fileName,
          status: latestJob.status,
          rowsProcessed: latestJob.rowsProcessed,
          rowsTotal: latestJob.rowsTotal,
          createdAt: latestJob.createdAt
        } : null,
        lineItem: latestLineItem,
        aggregate: latestAggregate
      },
      dateRange: dateRange[0] || null
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

