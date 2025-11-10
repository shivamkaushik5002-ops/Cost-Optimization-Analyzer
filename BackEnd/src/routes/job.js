const express = require('express');
const IngestionJob = require('../models/IngestionJob');
const { authenticate, authorize } = require('../middleware/auth');
const { parsePagination, createPaginationResponse } = require('../utils/pagination');
const schedulerService = require('../services/schedulerService');

const router = express.Router();

/**
 * Get job history
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status } = req.query;

    // Filter by user - only show data for the authenticated user
    const query = {
      userId: req.user._id
    };
    if (status) query.status = status;

    const jobs = await IngestionJob.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username email')
      .select('-errors')
      .lean();

    const total = await IngestionJob.countDocuments(query);

    res.json(createPaginationResponse(jobs, total, page, limit));
  } catch (error) {
    next(error);
  }
});

/**
 * Get job details
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const job = await IngestionJob.findOne({
      _id: req.params.id,
      userId: req.user._id // Ensure user owns the job
    })
      .populate('createdBy', 'username email');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
});

/**
 * Trigger manual processing
 */
router.post('/:id/process', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const job = await IngestionJob.findOne({
      _id: req.params.id,
      userId: req.user._id // Ensure user owns the job (or admin can process their own jobs)
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'processing') {
      return res.status(400).json({ error: 'Job is already processing' });
    }

    // Process asynchronously
    const ingestionService = require('../services/ingestionService');
    ingestionService.processCSVFile(job.filePath, job._id.toString())
      .catch(err => {
        console.error('Error processing job:', err);
      });

    res.json({ message: 'Job processing started', jobId: job._id });
  } catch (error) {
    next(error);
  }
});

/**
 * Trigger nightly processing manually
 */
router.post('/nightly/trigger', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const winston = require('winston');
    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [new winston.transports.Console()]
    });

    // Run processing asynchronously
    schedulerService.runNightlyProcessing(logger)
      .catch(err => {
        console.error('Error in nightly processing:', err);
      });

    res.json({ message: 'Nightly processing started' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

