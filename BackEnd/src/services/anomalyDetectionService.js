const BillingLineItem = require('../models/BillingLineItem');
const Aggregate = require('../models/Aggregate');
const Anomaly = require('../models/Anomaly');

/**
 * Detect anomalies using rolling mean and standard deviation
 */
async function detectAnomalies(options = {}) {
  const {
    accountId,
    service,
    lookbackDays = 30,
    threshold = 2.5 // z-score threshold
  } = options;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  // Build query
  const query = {
    date: { $gte: startDate, $lte: endDate },
    aggregationType: 'daily'
  };
  
  if (options.userId) query.userId = options.userId;
  if (accountId) query.accountId = accountId;
  if (service) query.service = service;

  // Get daily aggregates
  let aggregates = await Aggregate.find(query)
    .sort({ date: 1 })
    .lean();

  // Fallback to line items if no aggregates found
  if (aggregates.length === 0) {
    const lineItemQuery = {
      userId: options.userId,
      usageStartDate: { $gte: startDate, $lte: endDate }
    };
    if (accountId) lineItemQuery.accountId = accountId;
    if (service) lineItemQuery.service = service;

    const lineItems = await BillingLineItem.find(lineItemQuery).lean();
    
    // Group by date, account, service, region
    const dailyMap = new Map();
    lineItems.forEach(item => {
      const date = new Date(item.usageStartDate || item.ingestionDate);
      date.setHours(0, 0, 0, 0);
      const key = `${date.toISOString()}_${item.accountId || 'all'}_${item.service || 'all'}_${item.region || 'all'}`;
      
      if (!dailyMap.has(key)) {
        dailyMap.set(key, {
          date,
          accountId: item.accountId,
          service: item.service,
          region: item.region,
          totalCost: 0
        });
      }
      dailyMap.get(key).totalCost += item.cost || 0;
    });
    
    aggregates = Array.from(dailyMap.values());
  }

  if (aggregates.length < 7) {
    return []; // Need at least a week of data
  }

  // Group by account/service/region
  const groups = {};
  aggregates.forEach(agg => {
    const key = `${agg.accountId || 'all'}_${agg.service || 'all'}_${agg.region || 'all'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(agg);
  });

  const anomalies = [];

  // Detect anomalies in each group
  for (const [key, groupData] of Object.entries(groups)) {
    const costs = groupData.map(d => d.totalCost);
    const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) continue;

    // Check each data point
    groupData.forEach((agg, index) => {
      const zScore = Math.abs((agg.totalCost - mean) / stdDev);
      
      if (zScore > threshold) {
        const [account, service, region] = key.split('_');
        
        const anomaly = {
          type: agg.totalCost > mean ? 'spike' : 'drop',
          severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
          userId: options.userId, // Associate with user
          accountId: account !== 'all' ? account : undefined,
          service: service !== 'all' ? service : undefined,
          region: region !== 'all' ? region : undefined,
          date: agg.date,
          cost: agg.totalCost,
          expectedCost: mean,
          variance: agg.totalCost - mean,
          variancePercent: ((agg.totalCost - mean) / mean) * 100,
          zScore: zScore,
          description: `Cost ${agg.totalCost > mean ? 'spike' : 'drop'} detected: $${agg.totalCost.toFixed(2)} vs expected $${mean.toFixed(2)} (z-score: ${zScore.toFixed(2)})`
        };

        anomalies.push(anomaly);
      }
    });
  }

  // Save anomalies
  if (anomalies.length > 0) {
    await Anomaly.insertMany(anomalies, { ordered: false });
    
    // Mark line items as anomalies
    for (const anomaly of anomalies) {
      const lineItems = await BillingLineItem.find({
        userId: options.userId, // Filter by user
        accountId: anomaly.accountId || { $exists: true },
        service: anomaly.service || { $exists: true },
        region: anomaly.region || { $exists: true },
        usageStartDate: {
          $gte: new Date(anomaly.date),
          $lt: new Date(anomaly.date.getTime() + 24 * 60 * 60 * 1000)
        }
      }).limit(100).select('_id');
      
      if (lineItems.length > 0) {
        await BillingLineItem.updateMany(
          { _id: { $in: lineItems.map(i => i._id) } },
          { $set: { isAnomaly: true, anomalyScore: anomaly.zScore } }
        );
      }
    }
  }

  return anomalies;
}

module.exports = {
  detectAnomalies
};

