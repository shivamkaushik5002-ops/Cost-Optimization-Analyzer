const cron = require('node-cron');
const ingestionService = require('./ingestionService');
const anomalyDetectionService = require('./anomalyDetectionService');
const recommendationService = require('./recommendationService');
const Aggregate = require('../models/Aggregate');
const IngestionJob = require('../models/IngestionJob');
const fs = require('fs');
const path = require('path');

let scheduler = null;

/**
 * Start the scheduler
 */
function startScheduler(schedule, logger) {
  if (scheduler) {
    logger.warn('Scheduler already running');
    return;
  }

  scheduler = cron.schedule(schedule, async () => {
    logger.info('Starting scheduled nightly processing...');
    
    try {
      await runNightlyProcessing(logger);
      logger.info('Nightly processing completed successfully');
    } catch (error) {
      logger.error('Error in nightly processing:', error);
    }
  });

  logger.info(`Scheduler configured with schedule: ${schedule}`);
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (scheduler) {
    scheduler.stop();
    scheduler = null;
  }
}

/**
 * Run nightly processing tasks
 */
async function runNightlyProcessing(logger) {
  const startTime = Date.now();

  // 1. Process any pending ingestion jobs
  const pendingJobs = await IngestionJob.find({ status: 'pending' });
  logger.info(`Found ${pendingJobs.length} pending ingestion jobs`);

  for (const job of pendingJobs) {
    try {
      if (job.filePath && fs.existsSync(job.filePath)) {
        logger.info(`Processing job ${job._id}: ${job.fileName}`);
        // Pass userId from job to ensure data is associated with the correct user
        await ingestionService.processCSVFile(job.filePath, job._id.toString(), { userId: job.userId });
      } else {
        logger.warn(`Job ${job._id} file not found: ${job.filePath}`);
        job.status = 'failed';
        await job.save();
      }
    } catch (error) {
      logger.error(`Error processing job ${job._id}:`, error);
      job.status = 'failed';
      job.errors.push({
        row: 0,
        message: error.message,
        timestamp: new Date()
      });
      await job.save();
    }
  }

  // 2. Compute monthly aggregates
  logger.info('Computing monthly aggregates...');
  await ingestionService.computeMonthlyAggregates();

  // 3. Detect anomalies
  logger.info('Detecting anomalies...');
  const anomalies = await anomalyDetectionService.detectAnomalies({
    lookbackDays: 30
  });
  logger.info(`Detected ${anomalies.length} anomalies`);

  // 4. Generate recommendations
  logger.info('Generating recommendations...');
  const recommendations = await recommendationService.generateRecommendations({
    lookbackDays: 30
  });
  logger.info(`Generated ${recommendations.length} recommendations`);

  const duration = Date.now() - startTime;
  logger.info(`Nightly processing completed in ${duration}ms`);
}

module.exports = {
  startScheduler,
  stopScheduler,
  runNightlyProcessing
};

