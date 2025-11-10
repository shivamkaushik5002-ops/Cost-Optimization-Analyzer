const express = require('express');
const Recommendation = require('../models/Recommendation');
const recommendationService = require('../services/recommendationService');
const { authenticate } = require('../middleware/auth');
const { parsePagination, createPaginationResponse } = require('../utils/pagination');

const router = express.Router();

/**
 * Get recommendations
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { accountId, service, type, priority, status } = req.query;

    // Filter by user - only show data for the authenticated user
    const query = {
      userId: req.user._id
    };

    if (accountId) query.accountId = accountId;
    if (service) query.service = service;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (status) query.status = status;

    // Debug: Log query and check if any data exists
    console.log('Recommendation query:', JSON.stringify(query, null, 2));
    const totalCount = await Recommendation.countDocuments({ userId: req.user._id });
    console.log(`Total recommendations for user ${req.user._id}: ${totalCount}`);

    const recommendations = await Recommendation.find(query)
      .sort({ priority: -1, estimatedSavings: -1, generatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('implementedBy', 'username email')
      .lean();

    const total = await Recommendation.countDocuments(query);
    console.log(`Recommendations found with filters: ${total}`);

    // Convert metadata Map to object
    const formatted = recommendations.map(rec => ({
      ...rec,
      metadata: rec.metadata ? Object.fromEntries(rec.metadata) : {}
    }));

    res.json(createPaginationResponse(formatted, total, page, limit));
  } catch (error) {
    next(error);
  }
});

/**
 * Trigger recommendation generation
 */
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { accountId, lookbackDays = 30 } = req.body;

    const recommendations = await recommendationService.generateRecommendations({
      accountId,
      lookbackDays,
      userId: req.user._id
    });

    res.json({
      message: 'Recommendations generated successfully',
      count: recommendations.length,
      recommendations: recommendations.slice(0, 10) // Return first 10
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update recommendation status
 */
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'implemented', 'dismissed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const recommendation = await Recommendation.findOne({
      _id: req.params.id,
      userId: req.user._id // Ensure user owns the recommendation
    });

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    recommendation.status = status;
    
    if (status === 'implemented') {
      recommendation.implementedAt = new Date();
      recommendation.implementedBy = req.user._id;
    }

    await recommendation.save();

    res.json(recommendation);
  } catch (error) {
    next(error);
  }
});

/**
 * Get recommendation statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { accountId } = req.query;

    // Filter by user - only show data for the authenticated user
    const query = {
      userId: req.user._id
    };
    if (accountId) query.accountId = accountId;

    const stats = await Recommendation.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSavings: { $sum: '$estimatedSavings' }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          count: 1,
          totalSavings: 1
        }
      }
    ]);

    const total = await Recommendation.countDocuments(query);
    const implemented = await Recommendation.countDocuments({ ...query, status: 'implemented' });
    const totalSavings = await Recommendation.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$estimatedSavings' } } }
    ]);

    res.json({
      total,
      implemented,
      pending: total - implemented,
      totalEstimatedSavings: totalSavings[0]?.total || 0,
      byType: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

