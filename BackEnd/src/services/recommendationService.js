const BillingLineItem = require('../models/BillingLineItem');
const Aggregate = require('../models/Aggregate');
const Recommendation = require('../models/Recommendation');

/**
 * Generate cost optimization recommendations
 */
async function generateRecommendations(options = {}) {
  const { accountId, lookbackDays = 30, userId } = options;
  
  if (!userId) {
    throw new Error('User ID is required for generating recommendations');
  }
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  const query = {
    userId: userId, // Filter by user
    usageStartDate: { $gte: startDate, $lte: endDate }
  };
  
  if (accountId) query.accountId = accountId;

  const recommendations = [];

  // 1. Rightsizing recommendations
  recommendations.push(...await detectRightsizingOpportunities(query));

  // 2. Reserved Instance / Savings Plan recommendations
  recommendations.push(...await detectRIOpportunities(query));

  // 3. Unattached EBS volumes
  recommendations.push(...await detectUnattachedEBS(query));

  // 4. Unattached Elastic IPs
  recommendations.push(...await detectUnattachedEIP(query));

  // 5. Storage tiering recommendations
  recommendations.push(...await detectStorageTieringOpportunities(query));

  // 6. Idle resource cleanup
  recommendations.push(...await detectIdleResources(query));

  // Save recommendations with userId
  if (recommendations.length > 0) {
    const recommendationsWithUserId = recommendations.map(rec => ({
      ...rec,
      userId: userId
    }));
    await Recommendation.insertMany(recommendationsWithUserId, { ordered: false });
  }

  return recommendations;
}

/**
 * Detect rightsizing opportunities
 */
async function detectRightsizingOpportunities(query) {
  const recommendations = [];
  
  // Find EC2 instances with low utilization
  // Try multiple query patterns to match different data structures
  let ec2Items = await BillingLineItem.find({
    ...query,
    $or: [
      { service: { $regex: /EC2|Elastic Compute Cloud/i } },
      { productName: { $regex: /EC2|Elastic Compute Cloud/i } },
      { productCode: { $regex: /AmazonEC2/i } }
    ]
  }).lean();
  
  // Filter for BoxUsage items in JavaScript if not found in query
  ec2Items = ec2Items.filter(item => 
    (item.usageType && /BoxUsage/i.test(item.usageType)) ||
    (item.usageTypeNormalized && /BoxUsage/i.test(item.usageTypeNormalized)) ||
    (item.usageType && /BoxUsage/i.test(item.usageType))
  );

  // Group by instance type and account
  const instanceGroups = {};
  ec2Items.forEach(item => {
    const instanceType = item.usageTypeNormalized || 'unknown';
    const key = `${item.accountId}_${instanceType}`;
    if (!instanceGroups[key]) {
      instanceGroups[key] = {
        accountId: item.accountId,
        instanceType,
        totalCost: 0,
        count: 0,
        resourceIds: new Set()
      };
    }
    instanceGroups[key].totalCost += item.cost || 0;
    instanceGroups[key].count += 1;
    if (item.resourceId) {
      instanceGroups[key].resourceIds.add(item.resourceId);
    }
  });

  // Recommend rightsizing for instances with low cost but high count
  // Lowered thresholds to generate more recommendations
  Object.values(instanceGroups).forEach(group => {
    if (group.totalCost > 10 && group.count > 1) {
      const avgCostPerInstance = group.totalCost / group.count;
      if (avgCostPerInstance < 50) {
        recommendations.push({
          type: 'rightsizing',
          priority: 'medium',
          accountId: group.accountId,
          service: 'EC2',
          title: `Rightsize ${group.instanceType} instances`,
          description: `${group.count} instances of type ${group.instanceType} with low average cost. Consider downsizing.`,
          currentCost: group.totalCost,
          estimatedSavings: group.totalCost * 0.3, // 30% savings estimate
          estimatedSavingsPercent: 30,
          implementationEffort: 'medium',
          actionItems: [
            'Review instance utilization metrics',
            'Consider switching to smaller instance types',
            'Evaluate spot instances for non-critical workloads'
          ],
          metadata: {
            instanceType: group.instanceType,
            instanceCount: group.count,
            resourceIds: Array.from(group.resourceIds).slice(0, 10)
          }
        });
      }
    }
  });

  return recommendations;
}

/**
 * Detect Reserved Instance opportunities
 */
async function detectRIOpportunities(query) {
  const recommendations = [];
  
  const ec2Items = await Aggregate.find({
    ...query,
    service: { $regex: /EC2/i },
    aggregationType: 'monthly'
  }).lean();

  // Find accounts with consistent EC2 spend
  const accountSpend = {};
  ec2Items.forEach(item => {
    if (!accountSpend[item.accountId]) {
      accountSpend[item.accountId] = [];
    }
    accountSpend[item.accountId].push(item.totalCost);
  });

  Object.entries(accountSpend).forEach(([accountId, costs]) => {
    const avgMonthlyCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - avgMonthlyCost, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgMonthlyCost;

    // If consistent spend (low variance), recommend RI
    if (avgMonthlyCost > 500 && coefficientOfVariation < 0.2) {
      recommendations.push({
        type: 'reserved_instance',
        priority: 'high',
        accountId,
        service: 'EC2',
        title: 'Consider Reserved Instances',
        description: `Consistent monthly EC2 spend of $${avgMonthlyCost.toFixed(2)}. Reserved Instances could save up to 72%.`,
        currentCost: avgMonthlyCost,
        estimatedSavings: avgMonthlyCost * 0.5, // 50% savings estimate
        estimatedSavingsPercent: 50,
        implementationEffort: 'low',
        actionItems: [
          'Analyze instance usage patterns',
          'Purchase 1-year or 3-year Reserved Instances',
          'Consider Savings Plans for flexibility'
        ],
        metadata: {
          avgMonthlyCost,
          coefficientOfVariation
        }
      });
    }
  });

  return recommendations;
}

/**
 * Detect unattached EBS volumes
 */
async function detectUnattachedEBS(query) {
  const recommendations = [];
  
  const ebsItems = await BillingLineItem.find({
    ...query,
    service: { $regex: /EBS/i },
    usageType: { $regex: /VolumeUsage/i }
  }).lean();

  // Group by account and resource
  const volumeGroups = {};
  ebsItems.forEach(item => {
    const key = `${item.accountId}_${item.resourceId || 'unknown'}`;
    if (!volumeGroups[key]) {
      volumeGroups[key] = {
        accountId: item.accountId,
        resourceId: item.resourceId,
        totalCost: 0
      };
    }
    volumeGroups[key].totalCost += item.cost || 0;
  });

  // Flag volumes with low or no usage (potential unattached)
  Object.values(volumeGroups).forEach(volume => {
    if (volume.totalCost > 0 && volume.totalCost < 5) {
      recommendations.push({
        type: 'unattached_ebs',
        priority: 'medium',
        accountId: volume.accountId,
        service: 'EBS',
        resourceId: volume.resourceId,
        title: 'Potential unattached EBS volume',
        description: `EBS volume ${volume.resourceId} has minimal cost. Verify if it's attached to an instance.`,
        currentCost: volume.totalCost,
        estimatedSavings: volume.totalCost,
        estimatedSavingsPercent: 100,
        implementationEffort: 'low',
        actionItems: [
          'Verify volume attachment status',
          'Delete unattached volumes',
          'Create snapshot before deletion if needed'
        ],
        metadata: {
          resourceId: volume.resourceId
        }
      });
    }
  });

  return recommendations;
}

/**
 * Detect unattached Elastic IPs
 */
async function detectUnattachedEIP(query) {
  const recommendations = [];
  
  const eipItems = await BillingLineItem.find({
    ...query,
    service: { $regex: /EC2/i },
    usageType: { $regex: /ElasticIP/i }
  }).lean();

  const eipGroups = {};
  eipItems.forEach(item => {
    const key = `${item.accountId}_${item.resourceId || 'unknown'}`;
    if (!eipGroups[key]) {
      eipGroups[key] = {
        accountId: item.accountId,
        resourceId: item.resourceId,
        totalCost: 0
      };
    }
    eipGroups[key].totalCost += item.cost || 0;
  });

  Object.values(eipGroups).forEach(eip => {
    if (eip.totalCost > 0) {
      recommendations.push({
        type: 'unattached_eip',
        priority: 'low',
        accountId: eip.accountId,
        service: 'EC2',
        resourceId: eip.resourceId,
        title: 'Elastic IP charges',
        description: `Elastic IP ${eip.resourceId} is incurring charges. Release if not in use.`,
        currentCost: eip.totalCost,
        estimatedSavings: eip.totalCost,
        estimatedSavingsPercent: 100,
        implementationEffort: 'low',
        actionItems: [
          'Verify Elastic IP is attached to a running instance',
          'Release unattached Elastic IPs'
        ],
        metadata: {
          resourceId: eip.resourceId
        }
      });
    }
  });

  return recommendations;
}

/**
 * Detect storage tiering opportunities
 */
async function detectStorageTieringOpportunities(query) {
  const recommendations = [];
  
  const s3Items = await BillingLineItem.find({
    ...query,
    service: { $regex: /S3/i }
  }).lean();

  const s3Groups = {};
  s3Items.forEach(item => {
    const key = `${item.accountId}_${item.usageTypeNormalized || 'unknown'}`;
    if (!s3Groups[key]) {
      s3Groups[key] = {
        accountId: item.accountId,
        usageType: item.usageTypeNormalized,
        totalCost: 0,
        totalUsage: 0
      };
    }
    s3Groups[key].totalCost += item.cost || 0;
    s3Groups[key].totalUsage += item.usageQuantityNormalized || 0;
  });

  // Check for Standard storage that could be moved to IA or Glacier
  Object.values(s3Groups).forEach(group => {
    if (group.usageType && group.usageType.includes('Standard') && group.totalCost > 50) {
      recommendations.push({
        type: 'storage_tiering',
        priority: 'medium',
        accountId: group.accountId,
        service: 'S3',
        title: 'S3 Storage Tiering Opportunity',
        description: `Consider moving ${group.usageType} data to Infrequent Access or Glacier for cost savings.`,
        currentCost: group.totalCost,
        estimatedSavings: group.totalCost * 0.5, // 50% savings estimate
        estimatedSavingsPercent: 50,
        implementationEffort: 'medium',
        actionItems: [
          'Analyze data access patterns',
          'Configure S3 Lifecycle policies',
          'Move infrequently accessed data to IA',
          'Archive old data to Glacier'
        ],
        metadata: {
          usageType: group.usageType,
          totalUsage: group.totalUsage
        }
      });
    }
  });

  return recommendations;
}

/**
 * Detect idle resources
 */
async function detectIdleResources(query) {
  const recommendations = [];
  
  // Find resources with very low usage
  const lowUsageItems = await Aggregate.find({
    ...query,
    aggregationType: 'daily',
    totalCost: { $gt: 0, $lt: 1 } // Less than $1 per day
  }).lean();

  const idleGroups = {};
  lowUsageItems.forEach(item => {
    const key = `${item.accountId}_${item.service}_${item.region}`;
    if (!idleGroups[key]) {
      idleGroups[key] = {
        accountId: item.accountId,
        service: item.service,
        region: item.region,
        totalCost: 0,
        days: 0
      };
    }
    idleGroups[key].totalCost += item.totalCost;
    idleGroups[key].days += 1;
  });

  // Flag resources idle for more than 7 days
  Object.values(idleGroups).forEach(group => {
    if (group.days >= 7) {
      recommendations.push({
        type: 'idle_resource_cleanup',
        priority: 'medium',
        accountId: group.accountId,
        service: group.service,
        region: group.region,
        title: `Idle ${group.service} resources detected`,
        description: `${group.service} resources in ${group.region} have been idle for ${group.days} days.`,
        currentCost: group.totalCost,
        estimatedSavings: group.totalCost,
        estimatedSavingsPercent: 100,
        implementationEffort: 'low',
        actionItems: [
          'Review resource usage',
          'Stop or terminate idle resources',
          'Set up automated cleanup policies'
        ],
        metadata: {
          days: group.days,
          region: group.region
        }
      });
    }
  });

  return recommendations;
}

module.exports = {
  generateRecommendations
};

