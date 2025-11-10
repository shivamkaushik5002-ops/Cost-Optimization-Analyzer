const fs = require('fs');
const { parse } = require('csv-parse');
const { Readable } = require('stream');
const BillingLineItem = require('../models/BillingLineItem');
const IngestionJob = require('../models/IngestionJob');
const Aggregate = require('../models/Aggregate');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// AWS Billing CSV column mapping
const CSV_COLUMNS = {
  'InvoiceID': 'invoiceId',
  'PayerAccountId': 'payerAccountId',
  'LinkedAccountId': 'linkedAccountId',
  'RecordType': 'recordType',
  'ProductName': 'productName',
  'ProductCode': 'productCode',
  'UsageType': 'usageType',
  'Operation': 'operation',
  'AvailabilityZone': 'availabilityZone',
  'ReservedInstance': 'reservedInstance',
  'ItemDescription': 'itemDescription',
  'UsageStartDate': 'usageStartDate',
  'UsageEndDate': 'usageEndDate',
  'UsageQuantity': 'usageQuantity',
  'BlendedRate': 'blendedRate',
  'BlendedCost': 'blendedCost',
  'UnblendedRate': 'unblendedRate',
  'UnblendedCost': 'unblendedCost',
  'ResourceId': 'resourceId'
};

// Tag columns start with 'user:' prefix
const TAG_PREFIX = 'user:';

/**
 * Normalize a billing line item
 */
function normalizeLineItem(row, jobId) {
  const normalized = {
    ingestionJobId: jobId,
    ingestionDate: new Date()
  };

  // Map CSV columns
  Object.keys(CSV_COLUMNS).forEach(csvCol => {
    const modelField = CSV_COLUMNS[csvCol];
    if (row[csvCol] !== undefined && row[csvCol] !== '') {
      normalized[modelField] = row[csvCol];
    }
  });

  // Parse dates
  if (normalized.usageStartDate) {
    normalized.usageStartDate = new Date(normalized.usageStartDate);
  }
  if (normalized.usageEndDate) {
    normalized.usageEndDate = new Date(normalized.usageEndDate);
  }

  // Parse numeric fields
  if (normalized.usageQuantity) {
    normalized.usageQuantity = parseFloat(normalized.usageQuantity);
  }
  if (normalized.blendedCost) {
    normalized.blendedCost = parseFloat(normalized.blendedCost);
  }
  if (normalized.unblendedCost) {
    normalized.unblendedCost = parseFloat(normalized.unblendedCost);
  }

  // Normalized fields
  normalized.accountId = normalized.linkedAccountId || normalized.payerAccountId || 'unknown';
  normalized.service = normalized.productName || normalized.productCode || 'unknown';
  normalized.region = extractRegion(normalized.availabilityZone || normalized.usageType || '');
  normalized.cost = normalized.unblendedCost || normalized.blendedCost || 0;
  normalized.usageQuantityNormalized = normalized.usageQuantity || 0;
  normalized.usageTypeNormalized = normalized.usageType || '';

  // Extract tags
  normalized.tags = new Map();
  Object.keys(row).forEach(key => {
    if (key.startsWith(TAG_PREFIX) && row[key]) {
      const tagKey = key.substring(TAG_PREFIX.length);
      normalized.tags.set(tagKey, row[key]);
    }
  });

  return normalized;
}

/**
 * Extract region from availability zone or usage type
 */
function extractRegion(value) {
  if (!value) return 'unknown';
  
  // AWS regions pattern
  const regionMatch = value.match(/(us|eu|ap|sa|ca|cn|af)-(north|south|east|west|central)-\d/);
  if (regionMatch) {
    return regionMatch[0];
  }
  
  // Try to extract from availability zone (e.g., us-east-1a -> us-east-1)
  const azMatch = value.match(/([a-z]{2}-[a-z]+-\d+)[a-z]/);
  if (azMatch) {
    return azMatch[1];
  }
  
  return 'unknown';
}

/**
 * Process CSV file in chunks
 */
async function processCSVFile(filePath, jobId, options = {}) {
  const { chunkSize = 1000, onProgress, userId } = options;
  const job = await IngestionJob.findById(jobId);
  
  if (!job) {
    throw new Error('Ingestion job not found');
  }
  
  // Get userId from job if not provided
  const userIdToUse = userId || job.userId;
  
  if (!userIdToUse) {
    throw new Error('User ID is required for data ingestion');
  }

  job.status = 'processing';
  job.startedAt = new Date();
  await job.save();

  let headers = [];
  let rowCount = 0;
  let processedCount = 0;
  let skippedCount = 0;
  const errors = [];
  let batch = [];

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    
    stream
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true
      }))
      .on('headers', (headerList) => {
        headers = headerList;
        logger.info(`CSV headers: ${headers.length} columns`);
      })
      .on('data', async (row) => {
        rowCount++;
        
        try {
          const normalized = normalizeLineItem(row, jobId);
          
          // Associate with user
          normalized.userId = userIdToUse;
          
          // Validate required fields
          if (!normalized.accountId || !normalized.service || normalized.cost === undefined) {
            skippedCount++;
            errors.push({
              row: rowCount,
              message: 'Missing required fields',
              timestamp: new Date()
            });
            return;
          }

          batch.push(normalized);

          // Process in chunks
          if (batch.length >= chunkSize) {
            stream.pause();
            try {
              await BillingLineItem.insertMany(batch, { ordered: false });
              processedCount += batch.length;
              batch = [];
              
              if (onProgress) {
                onProgress({ processed: processedCount, total: rowCount });
              }
            } catch (err) {
              // Handle duplicate key errors (idempotent re-ingest)
              if (err.code === 11000) {
                skippedCount += batch.length;
                logger.warn(`Skipped ${batch.length} duplicate records`);
              } else {
                throw err;
              }
              batch = [];
            }
            stream.resume();
          }
        } catch (err) {
          skippedCount++;
          errors.push({
            row: rowCount,
            message: err.message,
            timestamp: new Date()
          });
        }
      })
      .on('end', async () => {
        // Process remaining batch
        if (batch.length > 0) {
          try {
            await BillingLineItem.insertMany(batch, { ordered: false });
            processedCount += batch.length;
          } catch (err) {
            if (err.code === 11000) {
              skippedCount += batch.length;
            } else {
              logger.error('Error inserting final batch:', err);
            }
          }
        }

        // Update job status
        job.status = processedCount > 0 ? 'completed' : 'failed';
        job.completedAt = new Date();
        job.duration = job.completedAt - job.startedAt;
        job.rowsProcessed = processedCount;
        job.rowsTotal = rowCount;
        job.rowsSkipped = skippedCount;
        job.errors = errors.slice(0, 100); // Limit errors stored
        await job.save();

        // Trigger aggregation
        if (processedCount > 0) {
          await aggregateData(jobId);
        }

        logger.info(`Processing complete: ${processedCount} processed, ${skippedCount} skipped`);
        resolve({ processed: processedCount, skipped: skippedCount, total: rowCount });
      })
      .on('error', async (err) => {
        job.status = 'failed';
        job.completedAt = new Date();
        job.errors.push({
          row: rowCount,
          message: err.message,
          timestamp: new Date()
        });
        await job.save();
        reject(err);
      });
  });
}

/**
 * Aggregate data by account, service, region, and date
 * This function aggregates ALL data for the user, not just from the current job
 */
async function aggregateData(jobId) {
  logger.info(`Starting data aggregation for job ${jobId}...`);
  
  const job = await IngestionJob.findById(jobId);
  if (!job || !job.userId) {
    logger.error('Job not found or missing userId');
    return;
  }
  
  const userId = job.userId;
  logger.info(`Aggregating data for user ${userId}`);
  
  // Get ALL line items for this user (not just from this job)
  // This ensures we aggregate all data, including from previous uploads
  const lineItems = await BillingLineItem.find({ userId }).lean();
  
  if (lineItems.length === 0) {
    logger.warn('No line items found for user');
    return;
  }

  logger.info(`Found ${lineItems.length} line items to aggregate`);

  // Group by date, account, service, region
  const dailyAggregates = new Map();
  
  lineItems.forEach(item => {
    const date = new Date(item.usageStartDate || item.ingestionDate);
    date.setHours(0, 0, 0, 0);
    
    const key = `${date.toISOString()}_${item.accountId || 'unknown'}_${item.service || 'unknown'}_${item.region || 'unknown'}`;
    
    if (!dailyAggregates.has(key)) {
      dailyAggregates.set(key, {
        date,
        accountId: item.accountId || 'unknown',
        service: item.service || 'unknown',
        region: item.region || 'unknown',
        aggregationType: 'daily',
        userId: userId,
        totalCost: 0,
        totalUsageQuantity: 0,
        lineItemCount: 0
      });
    }
    
    const agg = dailyAggregates.get(key);
    agg.totalCost += item.cost || 0;
    agg.totalUsageQuantity += item.usageQuantityNormalized || 0;
    agg.lineItemCount += 1;
  });

  // Delete existing daily aggregates for this user to avoid duplicates
  const deleteResult = await Aggregate.deleteMany({ 
    userId: userId, 
    aggregationType: 'daily' 
  });
  logger.info(`Deleted ${deleteResult.deletedCount} existing daily aggregates`);

  // Save new aggregates with userId
  const aggregates = Array.from(dailyAggregates.values());
  if (aggregates.length > 0) {
    try {
      const insertResult = await Aggregate.insertMany(aggregates, { ordered: false });
      logger.info(`Successfully created ${insertResult.length} daily aggregates`);
      
      // Verify the aggregates were saved
      const verifyCount = await Aggregate.countDocuments({ 
        userId: userId, 
        aggregationType: 'daily' 
      });
      logger.info(`Verified: ${verifyCount} daily aggregates now exist for user ${userId}`);
    } catch (err) {
      // Handle duplicate key errors
      if (err.code === 11000) {
        logger.warn('Some aggregates already exist, using upsert approach');
        // Use upsert for each aggregate
        let upserted = 0;
        for (const agg of aggregates) {
          await Aggregate.findOneAndUpdate(
            {
              userId: agg.userId,
              date: agg.date,
              accountId: agg.accountId,
              service: agg.service,
              region: agg.region,
              aggregationType: agg.aggregationType
            },
            agg,
            { upsert: true }
          );
          upserted++;
        }
        logger.info(`Upserted ${upserted} daily aggregates`);
      } else {
        logger.error('Error inserting aggregates:', err);
        throw err;
      }
    }
  } else {
    logger.warn('No aggregates to save');
  }

  // Recompute monthly aggregates for this user
  logger.info('Starting monthly aggregate computation...');
  await computeMonthlyAggregates(userId);
  logger.info('Aggregation completed successfully');
}

/**
 * Compute monthly aggregates from daily aggregates
 */
async function computeMonthlyAggregates(userId) {
  if (!userId) {
    logger.warn('No userId provided for monthly aggregation');
    return;
  }

  logger.info(`Computing monthly aggregates for user ${userId}`);
  
  // Get all daily aggregates for this user (not just current month)
  const query = {
    aggregationType: 'daily',
    userId: userId
  };
  
  const dailyAggs = await Aggregate.find(query).lean();
  
  if (dailyAggs.length === 0) {
    logger.warn('No daily aggregates found for monthly computation');
    return;
  }

  logger.info(`Found ${dailyAggs.length} daily aggregates to compute monthly aggregates`);

  const monthlyMap = new Map();

  dailyAggs.forEach(daily => {
    const monthStart = new Date(daily.date);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const key = `${monthStart.toISOString()}_${daily.accountId || 'unknown'}_${daily.service || 'unknown'}_${daily.region || 'unknown'}`;
    
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        date: monthStart,
        userId: daily.userId,
        accountId: daily.accountId || 'unknown',
        service: daily.service || 'unknown',
        region: daily.region || 'unknown',
        aggregationType: 'monthly',
        totalCost: 0,
        totalUsageQuantity: 0,
        lineItemCount: 0
      });
    }
    
    const monthly = monthlyMap.get(key);
    monthly.totalCost += daily.totalCost || 0;
    monthly.totalUsageQuantity += daily.totalUsageQuantity || 0;
    monthly.lineItemCount += daily.lineItemCount || 0;
  });

  // Delete existing monthly aggregates for this user
  await Aggregate.deleteMany({ 
    userId: userId, 
    aggregationType: 'monthly' 
  });
  logger.info('Deleted existing monthly aggregates');

  const monthlyAggs = Array.from(monthlyMap.values());
  if (monthlyAggs.length > 0) {
    try {
      await Aggregate.insertMany(monthlyAggs, { ordered: false });
      logger.info(`Created ${monthlyAggs.length} monthly aggregates`);
    } catch (err) {
      // Handle duplicate key errors
      if (err.code === 11000) {
        logger.warn('Some monthly aggregates already exist, using upsert approach');
        // Use upsert for each aggregate
        for (const agg of monthlyAggs) {
          await Aggregate.findOneAndUpdate(
            {
              userId: agg.userId,
              date: agg.date,
              accountId: agg.accountId,
              service: agg.service,
              region: agg.region,
              aggregationType: agg.aggregationType
            },
            agg,
            { upsert: true }
          );
        }
        logger.info(`Upserted ${monthlyAggs.length} monthly aggregates`);
      } else {
        throw err;
      }
    }
  }
}

module.exports = {
  processCSVFile,
  normalizeLineItem,
  aggregateData,
  computeMonthlyAggregates
};

