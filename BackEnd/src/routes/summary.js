const express = require('express');
const Aggregate = require('../models/Aggregate');
const BillingLineItem = require('../models/BillingLineItem');
const { authenticate } = require('../middleware/auth');
const { parsePagination, createPaginationResponse } = require('../utils/pagination');
const { generateETag, checkETag, cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// Apply cache middleware with shorter cache time for real-time updates
router.use(cacheMiddleware(30)); // Reduced from 300 to 30 seconds

/**
 * Get cost summary by date range
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, accountId, service, region, aggregationType = 'daily' } = req.query;

    // Filter by user - only show data for the authenticated user
    const queryConditions = [
      { userId: req.user._id },
      { aggregationType }
    ];

    // Only add date filter if dates are provided
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      queryConditions.push({ date: dateFilter });
    }

    if (accountId) queryConditions.push({ accountId });
    if (service) queryConditions.push({ service });
    if (region) queryConditions.push({ region });

    const query = queryConditions.length === 1 
      ? queryConditions[0] 
      : { $and: queryConditions };

    console.log(`Summary query for user ${req.user._id}:`, JSON.stringify(query, null, 2));
    
    const aggregates = await Aggregate.find(query)
      .sort({ date: -1 })
      .limit(1000)
      .lean();

    console.log(`Found ${aggregates.length} aggregates for user ${req.user._id}`);

    // If no aggregates found, compute from line items
    let totals = { totalCost: 0, totalUsage: 0, lineItemCount: 0 };
    let byService = {};
    let byAccount = {};
    let byRegion = {};
    let timeSeries = [];

    if (aggregates.length > 0) {
      console.log('Using aggregates for summary');
      // Calculate totals from aggregates
      totals = aggregates.reduce((acc, agg) => {
        acc.totalCost += agg.totalCost || 0;
        acc.totalUsage += agg.totalUsageQuantity || 0;
        acc.lineItemCount += agg.lineItemCount || 0;
        return acc;
      }, { totalCost: 0, totalUsage: 0, lineItemCount: 0 });

      // Group by service
      aggregates.forEach(agg => {
        if (!byService[agg.service]) {
          byService[agg.service] = { totalCost: 0, count: 0 };
        }
        byService[agg.service].totalCost += agg.totalCost || 0;
        byService[agg.service].count += 1;
      });

      // Group by account
      aggregates.forEach(agg => {
        if (!byAccount[agg.accountId]) {
          byAccount[agg.accountId] = { totalCost: 0, count: 0 };
        }
        byAccount[agg.accountId].totalCost += agg.totalCost || 0;
        byAccount[agg.accountId].count += 1;
      });

      // Group by region
      aggregates.forEach(agg => {
        if (!byRegion[agg.region]) {
          byRegion[agg.region] = { totalCost: 0, count: 0 };
        }
        byRegion[agg.region].totalCost += agg.totalCost || 0;
        byRegion[agg.region].count += 1;
      });

      // Time series
      timeSeries = aggregates.map(agg => ({
        date: agg.date,
        cost: agg.totalCost,
        accountId: agg.accountId,
        service: agg.service,
        region: agg.region
      }));
    } else {
      // Fallback: compute from line items
      console.log('No aggregates found, computing from line items');
      const lineItemQuery = { userId: req.user._id };
      
      if (startDate || endDate) {
        lineItemQuery.usageStartDate = {};
        if (startDate) lineItemQuery.usageStartDate.$gte = new Date(startDate);
        if (endDate) lineItemQuery.usageStartDate.$lte = new Date(endDate);
      }
      if (accountId) lineItemQuery.accountId = accountId;
      if (service) lineItemQuery.service = service;
      if (region) lineItemQuery.region = region;

      const lineItems = await BillingLineItem.find(lineItemQuery).lean();

      // Calculate totals
      totals = lineItems.reduce((acc, item) => {
        acc.totalCost += item.cost || 0;
        acc.totalUsage += item.usageQuantityNormalized || 0;
        acc.lineItemCount += 1;
        return acc;
      }, { totalCost: 0, totalUsage: 0, lineItemCount: 0 });

      // Group by service
      lineItems.forEach(item => {
        if (!byService[item.service]) {
          byService[item.service] = { totalCost: 0, count: 0 };
        }
        byService[item.service].totalCost += item.cost || 0;
        byService[item.service].count += 1;
      });

      // Group by account
      lineItems.forEach(item => {
        if (!byAccount[item.accountId]) {
          byAccount[item.accountId] = { totalCost: 0, count: 0 };
        }
        byAccount[item.accountId].totalCost += item.cost || 0;
        byAccount[item.accountId].count += 1;
      });

      // Group by region
      lineItems.forEach(item => {
        const itemRegion = item.region || 'unknown';
        if (!byRegion[itemRegion]) {
          byRegion[itemRegion] = { totalCost: 0, count: 0 };
        }
        byRegion[itemRegion].totalCost += item.cost || 0;
        byRegion[itemRegion].count += 1;
      });

      // Time series from line items
      const dailyMap = new Map();
      lineItems.forEach(item => {
        const date = new Date(item.usageStartDate || item.ingestionDate);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString();
        
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { date, cost: 0 });
        }
        dailyMap.get(dateKey).cost += item.cost || 0;
      });
      
      timeSeries = Array.from(dailyMap.values())
        .sort((a, b) => a.date - b.date)
        .map(entry => ({
          date: entry.date,
          cost: entry.cost,
          accountId: null,
          service: null,
          region: null
        }));
    }

    const response = {
      totals,
      byService: Object.entries(byService)
        .map(([service, data]) => ({ service, ...data }))
        .sort((a, b) => b.totalCost - a.totalCost),
      byAccount: Object.entries(byAccount)
        .map(([accountId, data]) => ({ accountId, ...data }))
        .sort((a, b) => b.totalCost - a.totalCost),
      byRegion: Object.entries(byRegion)
        .map(([region, data]) => ({ region, ...data }))
        .sort((a, b) => b.totalCost - a.totalCost),
      timeSeries
    };

    const etag = generateETag(JSON.stringify(response));
    if (checkETag(req, res, etag)) {
      return;
    }

    res.set('ETag', etag);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * Get top N services by cost
 */
router.get('/top-services', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    // Filter by user - only show data for the authenticated user
    const queryConditions = [
      { userId: req.user._id },
      { aggregationType: 'daily' }
    ];

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      queryConditions.push({ date: dateFilter });
    }

    const query = { $and: queryConditions };

    const topServices = await Aggregate.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$service',
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalCost: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 0,
          service: '$_id',
          totalCost: 1,
          count: 1
        }
      }
    ]);

    res.json(topServices);
  } catch (error) {
    next(error);
  }
});

/**
 * Get top N accounts by cost
 */
router.get('/top-accounts', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    // Filter by user - only show data for the authenticated user
    const queryConditions = [
      { userId: req.user._id },
      { aggregationType: 'daily' }
    ];

    // Only add date filter if dates are provided
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      queryConditions.push({ date: dateFilter });
    }

    const query = { $and: queryConditions };

    const topAccounts = await Aggregate.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$accountId',
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalCost: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 0,
          accountId: '$_id',
          totalCost: 1,
          count: 1
        }
      }
    ]);

    res.json(topAccounts);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

