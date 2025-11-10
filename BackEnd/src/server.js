const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const summaryRoutes = require('./routes/summary');
const breakdownRoutes = require('./routes/breakdown');
const anomalyRoutes = require('./routes/anomaly');
const recommendationRoutes = require('./routes/recommendation');
const jobRoutes = require('./routes/job');
const dataRoutes = require('./routes/data');

// Import services
const ingestionService = require('./services/ingestionService');
const schedulerService = require('./services/schedulerService');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cost-analyzer')
.then(() => {
  logger.info('MongoDB connected successfully');
})
.catch((err) => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/breakdown', breakdownRoutes);
app.use('/api/anomaly', anomalyRoutes);
app.use('/api/recommendation', recommendationRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/profile', require('./routes/profile'));
app.use('/api/diagnostic', require('./routes/diagnostic'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start scheduler if enabled
if (process.env.ENABLE_CRON === 'true') {
  const schedule = process.env.CRON_SCHEDULE || '0 2 * * *';
  schedulerService.startScheduler(schedule, logger);
  logger.info(`Scheduler started with schedule: ${schedule}`);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;

