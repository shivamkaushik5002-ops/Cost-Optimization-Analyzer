# AWS Cost Optimization Analyzer

A comprehensive MERN stack application for analyzing AWS billing data, detecting cost anomalies, and generating optimization recommendations.

## Features

### Core Functionality
- **CSV Ingestion Pipeline**: Stream-based processing of large AWS billing CSV files with validation and error handling
- **Data Normalization**: Canonicalizes AWS billing data by account, service, region, usage type, and tags
- **Aggregation**: Pre-computed daily and monthly aggregates for fast querying
- **Anomaly Detection**: Statistical anomaly detection using rolling mean and standard deviation
- **Recommendations Engine**: Automated cost optimization recommendations including:
  - Rightsizing opportunities
  - Reserved Instance/Savings Plan recommendations
  - Unattached EBS volumes and Elastic IPs
  - Storage tiering opportunities
  - Idle resource cleanup
- **Interactive Dashboard**: React-based dashboard with Chart.js visualizations
- **RESTful APIs**: Paginated endpoints with caching and ETag support
- **Scheduling**: Nightly cron jobs for automated processing
- **Security**: JWT authentication, input sanitization, role-based access control

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React, Chart.js, React Router
- **Authentication**: JWT (JSON Web Tokens)
- **File Processing**: csv-parse, multer
- **Scheduling**: node-cron
- **Logging**: Winston

## Prerequisites

- Node.js 18+ and npm
- MongoDB 7.0+ (or use Docker)
- Docker and Docker Compose (optional, for containerized setup)

## Installation

### Option 1: Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd Cost-optimization-analyzer
```

2. Start all services:
```bash
docker-compose up -d
```

3. Seed default users:
```bash
docker-compose exec backend npm run seed
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017

### Option 2: Manual Setup

1. Install dependencies:
```bash
npm run install-all
```

2. Set up MongoDB:
   - Install MongoDB locally or use a cloud instance
   - Update `MONGODB_URI` in `backend/.env`

3. Create environment files:
```bash
# Option 1: Use setup script (recommended)
# PowerShell (Windows):
.\setup-env.ps1

# Bash (Linux/Mac):
chmod +x setup-env.sh
./setup-env.sh

# Option 2: Create manually (see SETUP.md for templates)
```

See [SETUP.md](./SETUP.md) for detailed environment variable configuration.

4. Start MongoDB (if running locally)

5. Seed default users:
```bash
cd backend
npm run seed
```

6. Start backend:
```bash
cd backend
npm run dev
```

7. Start frontend (in a new terminal):
```bash
cd frontend
npm start
```

## Default Users

After seeding, you can login with:
- **Admin**: admin@example.com / admin123
- **User**: user@example.com / user123

## Usage

### Uploading Billing Data

1. Navigate to the Upload page
2. Select an AWS billing CSV file
3. Click Upload
4. Monitor the job status in the Jobs page

### Viewing Cost Summary

1. Navigate to the Summary page
2. Select date range
3. View aggregated costs by service, account, and region

### Analyzing Breakdowns

1. Navigate to the Breakdown page
2. Apply filters (date range, account, service, region)
3. View detailed line items
4. Export to CSV if needed

### Anomaly Detection

1. Navigate to the Anomalies page
2. Click "Detect Anomalies" to trigger detection
3. Review detected anomalies
4. Acknowledge anomalies as needed

### Recommendations

1. Navigate to the Recommendations page
2. Click "Generate Recommendations" to create new recommendations
3. Review recommendations with estimated savings
4. Update status as you implement them

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Upload
- `POST /api/upload` - Upload billing CSV file
- `GET /api/upload/history` - Get upload history
- `GET /api/upload/job/:id` - Get job details

### Summary
- `GET /api/summary` - Get cost summary
- `GET /api/summary/top-services` - Get top services by cost
- `GET /api/summary/top-accounts` - Get top accounts by cost

### Breakdown
- `GET /api/breakdown/line-items` - Get line items with filters
- `GET /api/breakdown/by-dimension` - Get breakdown by dimension
- `GET /api/breakdown/heatmap` - Get heatmap data
- `GET /api/breakdown/trends` - Get cost trends

### Anomalies
- `GET /api/anomaly` - Get anomalies
- `POST /api/anomaly/detect` - Trigger anomaly detection
- `PATCH /api/anomaly/:id/acknowledge` - Acknowledge anomaly
- `GET /api/anomaly/stats` - Get anomaly statistics

### Recommendations
- `GET /api/recommendation` - Get recommendations
- `POST /api/recommendation/generate` - Generate recommendations
- `PATCH /api/recommendation/:id/status` - Update recommendation status
- `GET /api/recommendation/stats` - Get recommendation statistics

### Jobs
- `GET /api/job` - Get job history
- `GET /api/job/:id` - Get job details
- `POST /api/job/:id/process` - Trigger manual processing
- `POST /api/job/nightly/trigger` - Trigger nightly processing

## Sample Data

A sample AWS billing CSV file is included in `sample-data/sample-billing.csv`. You can use this to test the application.

## Configuration

### Environment Files

You need to create `.env` files for both backend and frontend. See [SETUP.md](./SETUP.md) for detailed instructions and templates.

**Quick setup:**
- Backend: Create `backend/.env` with MongoDB URI, JWT secret, etc.
- Frontend: Create `frontend/.env` with `REACT_APP_API_URL=http://localhost:5000`

### Backend Environment Variables

- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: JWT expiration time (default: 7d)
- `MAX_FILE_SIZE`: Maximum file upload size in bytes
- `UPLOAD_DIR`: Directory for uploaded files
- `CRON_SCHEDULE`: Cron schedule for nightly processing (default: "0 2 * * *")
- `ENABLE_CRON`: Enable/disable cron jobs (default: true)
- `LOG_LEVEL`: Logging level (default: info)

### Frontend Environment Variables

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:5000)

## Development

### Project Structure

```
Cost-optimization-analyzer/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Express middleware
│   │   ├── utils/            # Utility functions
│   │   └── scripts/          # Seed scripts
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── services/          # API services
│   │   ├── context/          # React context
│   │   └── hooks/             # Custom hooks
│   ├── package.json
│   └── Dockerfile
├── sample-data/              # Sample CSV files
├── docker-compose.yml
└── README.md
```

## Performance Considerations

- MongoDB indexes are created on common query fields
- Aggregates are pre-computed for fast summary queries
- API responses include ETags for caching
- Pagination is implemented for large datasets
- CSV processing uses streaming for memory efficiency

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Role-based access control (admin, user, viewer)
- Rate limiting on API endpoints
- Helmet.js for security headers

## Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB is running
- Check `MONGODB_URI` in environment variables
- Ensure network connectivity

### File Upload Issues
- Check `UPLOAD_DIR` exists and is writable
- Verify `MAX_FILE_SIZE` is sufficient
- Check file format (must be CSV)

### CORS Issues
- Verify CORS configuration in backend
- Check API URL in frontend environment variables

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

