const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const IngestionJob = require('../models/IngestionJob');
const ingestionService = require('../services/ingestionService');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'billing-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * Upload billing CSV file
 */
router.post('/', authenticate, authorize('admin', 'user'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create ingestion job
    const job = await IngestionJob.create({
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'pending',
      userId: req.user._id, // Associate with user
      createdBy: req.user._id
    });

    // Process file asynchronously
    ingestionService.processCSVFile(req.file.path, job._id.toString(), { userId: req.user._id })
      .catch(err => {
        console.error('Error processing file:', err);
      });

    res.status(201).json({
      message: 'File uploaded successfully',
      job: {
        id: job._id,
        fileName: job.fileName,
        status: job.status,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get upload history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Filter by user - only show data for the authenticated user
    const query = {
      userId: req.user._id
    };

    const jobs = await IngestionJob.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username email')
      .select('-errors');

    const total = await IngestionJob.countDocuments(query);

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get job details
 */
router.get('/job/:id', authenticate, async (req, res, next) => {
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

module.exports = router;

