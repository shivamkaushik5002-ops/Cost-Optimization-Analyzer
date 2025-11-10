const express = require('express');
const Anomaly = require('../models/Anomaly');
const anomalyDetectionService = require('../services/anomalyDetectionService');
const { authenticate } = require('../middleware/auth');
const { parsePagination, createPaginationResponse } = require('../utils/pagination');

const router = express.Router();

/**
 * Get anomalies
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { startDate, endDate, accountId, service, severity, acknowledged } = req.query;

    // Filter by user - only show data for the authenticated user
    const query = {
      userId: req.user._id
    };

    if (startDate || endDate) {
      // Anomaly model uses 'date' field for the anomaly date
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (accountId) query.accountId = accountId;
    if (service) query.service = service;
    if (severity) query.severity = severity;
    if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';

    // Debug: Log query and check if any data exists
    console.log('Anomaly query:', JSON.stringify(query, null, 2));
    const totalCount = await Anomaly.countDocuments({ userId: req.user._id });
    console.log(`Total anomalies for user ${req.user._id}: ${totalCount}`);

    const anomalies = await Anomaly.find(query)
      .sort({ detectedAt: -1, severity: -1 })
      .skip(skip)
      .limit(limit)
      .populate('acknowledgedBy', 'username email')
      .lean();

    const total = await Anomaly.countDocuments(query);
    console.log(`Anomalies found with filters: ${total}`);

    res.json(createPaginationResponse(anomalies, total, page, limit));
  } catch (error) {
    next(error);
  }
});

/**
 * Trigger anomaly detection
 */
router.post('/detect', authenticate, async (req, res, next) => {
  try {
    const { accountId, service, lookbackDays = 30 } = req.body;

    const anomalies = await anomalyDetectionService.detectAnomalies({
      accountId,
      service,
      lookbackDays,
      userId: req.user._id
    });

    res.json({
      message: 'Anomaly detection completed',
      count: anomalies.length,
      anomalies: anomalies.slice(0, 10) // Return first 10
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Acknowledge anomaly
 */
router.patch('/:id/acknowledge', authenticate, async (req, res, next) => {
  try {
    const anomaly = await Anomaly.findOne({
      _id: req.params.id,
      userId: req.user._id // Ensure user owns the anomaly
    });

    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    anomaly.acknowledged = true;
    anomaly.acknowledgedBy = req.user._id;
    anomaly.acknowledgedAt = new Date();
    await anomaly.save();

    res.json(anomaly);
  } catch (error) {
    next(error);
  }
});

/**
 * Get anomaly statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Filter by user - only show data for the authenticated user
    const query = {
      userId: req.user._id
    };
    if (startDate || endDate) {
      query.detectedAt = {};
      if (startDate) query.detectedAt.$gte = new Date(startDate);
      if (endDate) query.detectedAt.$lte = new Date(endDate);
    }

    const stats = await Anomaly.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
          totalVariance: { $sum: '$variance' }
        }
      },
      {
        $project: {
          _id: 0,
          severity: '$_id',
          count: 1,
          totalVariance: 1
        }
      }
    ]);

    const total = await Anomaly.countDocuments(query);
    const acknowledged = await Anomaly.countDocuments({ ...query, acknowledged: true });

    res.json({
      total,
      acknowledged,
      unacknowledged: total - acknowledged,
      bySeverity: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

