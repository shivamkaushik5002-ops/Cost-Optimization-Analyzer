const express = require('express');
const BillingLineItem = require('../models/BillingLineItem');
const Aggregate = require('../models/Aggregate');
const { authenticate } = require('../middleware/auth');
const { parsePagination, createPaginationResponse } = require('../utils/pagination');

const router = express.Router();

/**
 * Get line items with filters
 */
router.get('/line-items', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { startDate, endDate, accountId, service, region, tagKey, tagValue, minCost, maxCost, isAnomaly } = req.query;

    // Filter by user - only show data for the authenticated user
    const queryConditions = [
      { userId: req.user._id }
    ];

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      queryConditions.push({ usageStartDate: dateFilter });
    }

    if (accountId) queryConditions.push({ accountId });
    if (service) queryConditions.push({ service });
    if (region) queryConditions.push({ region });
    if (minCost || maxCost) {
      const costFilter = {};
      if (minCost) costFilter.$gte = parseFloat(minCost);
      if (maxCost) costFilter.$lte = parseFloat(maxCost);
      queryConditions.push({ cost: costFilter });
    }

    // Tag filtering
    if (tagKey) {
      queryConditions.push({ [`tags.${tagKey}`]: tagValue || { $exists: true } });
    }

    // Anomaly filtering
    if (isAnomaly !== undefined) {
      queryConditions.push({ isAnomaly: isAnomaly === 'true' });
    }

    const query = queryConditions.length === 1 ? queryConditions[0] : { $and: queryConditions };

    // Debug: Log query and check if any data exists
    console.log('Breakdown query:', JSON.stringify(query, null, 2));
    const totalCount = await BillingLineItem.countDocuments({ userId: req.user._id });
    console.log(`Total line items for user ${req.user._id}: ${totalCount}`);

    const lineItems = await BillingLineItem.find(query)
      .sort({ usageStartDate: -1, cost: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await BillingLineItem.countDocuments(query);
    console.log(`Line items found with filters: ${total}`);

    // Convert tags Map to object for JSON response and include anomaly info
    const formattedItems = lineItems.map(item => ({
      ...item,
      tags: item.tags ? Object.fromEntries(item.tags) : {},
      isAnomaly: item.isAnomaly || false,
      anomalyScore: item.anomalyScore || null
    }));

    res.json(createPaginationResponse(formattedItems, total, page, limit));
  } catch (error) {
    next(error);
  }
});

/**
 * Get breakdown by dimension
 */
router.get('/by-dimension', authenticate, async (req, res, next) => {
  try {
    const { dimension = 'service', startDate, endDate, accountId, service, region } = req.query;

    // Filter by user - only show data for the authenticated user
    const matchConditions = [
      { userId: req.user._id },
      { aggregationType: 'daily' }
    ];

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      matchConditions.push({ date: dateFilter });
    }

    if (accountId) matchConditions.push({ accountId });
    if (service) matchConditions.push({ service });
    if (region) matchConditions.push({ region });

    const matchQuery = { $and: matchConditions };

    const groupField = dimension === 'account' ? '$accountId' : 
                       dimension === 'service' ? '$service' : 
                       dimension === 'region' ? '$region' : '$service';

    let breakdown = await Aggregate.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupField,
          totalCost: { $sum: '$totalCost' },
          totalUsage: { $sum: '$totalUsageQuantity' },
          count: { $sum: '$lineItemCount' }
        }
      },
      { $sort: { totalCost: -1 } },
      {
        $project: {
          _id: 0,
          [dimension]: '$_id',
          totalCost: 1,
          totalUsage: 1,
          count: 1
        }
      }
    ]);

    // Fallback to line items if no aggregates found
    if (breakdown.length === 0) {
      const lineItemQuery = { userId: req.user._id };
      
      if (startDate || endDate) {
        lineItemQuery.usageStartDate = {};
        if (startDate) lineItemQuery.usageStartDate.$gte = new Date(startDate);
        if (endDate) lineItemQuery.usageStartDate.$lte = new Date(endDate);
      }
      if (accountId) lineItemQuery.accountId = accountId;
      if (service) lineItemQuery.service = service;
      if (region) lineItemQuery.region = region;

      const groupFieldMap = {
        'account': 'accountId',
        'service': 'service',
        'region': 'region'
      };
      const fieldName = groupFieldMap[dimension] || 'service';

      breakdown = await BillingLineItem.aggregate([
        { $match: lineItemQuery },
        {
          $group: {
            _id: `$${fieldName}`,
            totalCost: { $sum: '$cost' },
            totalUsage: { $sum: '$usageQuantityNormalized' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalCost: -1 } },
        {
          $project: {
            _id: 0,
            [dimension]: '$_id',
            totalCost: 1,
            totalUsage: 1,
            count: 1
          }
        }
      ]);
    }

    res.json(breakdown);
  } catch (error) {
    next(error);
  }
});

/**
 * Get heatmap data by region and service
 */
router.get('/heatmap', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, accountId } = req.query;

    // Filter by user - only show data for the authenticated user
    const matchConditions = [
      { userId: req.user._id },
      { aggregationType: 'daily' }
    ];

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      matchConditions.push({ date: dateFilter });
    }

    if (accountId) matchConditions.push({ accountId });

    const matchQuery = { $and: matchConditions };

    const heatmap = await Aggregate.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            service: '$service',
            region: '$region'
          },
          totalCost: { $sum: '$totalCost' }
        }
      },
      {
        $project: {
          _id: 0,
          service: '$_id.service',
          region: '$_id.region',
          cost: '$totalCost'
        }
      }
    ]);

    res.json(heatmap);
  } catch (error) {
    next(error);
  }
});

/**
 * Get trends over time
 */
router.get('/trends', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, accountId, service, region, period = 'daily' } = req.query;

    // Filter by user - only show data for the authenticated user
    const matchConditions = [
      { userId: req.user._id },
      { aggregationType: period === 'monthly' ? 'monthly' : 'daily' }
    ];

    // Only add date filter if dates are provided
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      matchConditions.push({ date: dateFilter });
    }

    if (accountId) matchConditions.push({ accountId });
    if (service) matchConditions.push({ service });
    if (region) matchConditions.push({ region });

    const matchQuery = { $and: matchConditions };

    let trends = await Aggregate.find(matchQuery)
      .sort({ date: 1 })
      .select('date totalCost accountId service region')
      .lean();

    // Fallback to line items if no aggregates found
    if (trends.length === 0) {
      const lineItemQuery = { userId: req.user._id };
      
      if (startDate || endDate) {
        lineItemQuery.usageStartDate = {};
        if (startDate) lineItemQuery.usageStartDate.$gte = new Date(startDate);
        if (endDate) lineItemQuery.usageStartDate.$lte = new Date(endDate);
      }
      if (accountId) lineItemQuery.accountId = accountId;
      if (service) lineItemQuery.service = service;
      if (region) lineItemQuery.region = region;

      const lineItems = await BillingLineItem.find(lineItemQuery)
        .select('usageStartDate cost accountId service region')
        .lean();

      // Group by date
      const dailyMap = new Map();
      lineItems.forEach(item => {
        const date = new Date(item.usageStartDate || item.ingestionDate);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString();
        
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            date,
            totalCost: 0,
            accountId: item.accountId,
            service: item.service,
            region: item.region
          });
        }
        dailyMap.get(dateKey).totalCost += item.cost || 0;
      });
      
      trends = Array.from(dailyMap.values())
        .sort((a, b) => a.date - b.date);
    }

    res.json(trends);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

