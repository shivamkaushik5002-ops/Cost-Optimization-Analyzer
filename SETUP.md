# Environment Setup Guide

## Environment Files

You need to create `.env` files for both backend and frontend. Copy the examples below or create them manually.

### Backend Environment File (`backend/.env`)

Create a file named `.env` in the `backend/` directory with the following content:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/cost-analyzer

# For Docker MongoDB:
# MONGODB_URI=mongodb://admin:password@mongodb:27017/cost-analyzer?authSource=admin

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads

# Cron Job Configuration
CRON_SCHEDULE=0 2 * * *
ENABLE_CRON=true

# Logging
LOG_LEVEL=info
```

### Frontend Environment File (`frontend/.env`)

Create a file named `.env` in the `frontend/` directory with the following content:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000
```

## Quick Setup Commands

### Option 1: Use Setup Scripts (Recommended)

**PowerShell (Windows):**
```powershell
.\setup-env.ps1
```

**Bash (Linux/Mac):**
```bash
chmod +x setup-env.sh
./setup-env.sh
```

**Command Prompt (Windows):**
```cmd
.\setup-env.bat
```

### Option 2: Manual Setup

**For Backend (Linux/Mac):**
```bash
cd backend
cat > .env << 'EOF'
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/cost-analyzer
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
CRON_SCHEDULE=0 2 * * *
ENABLE_CRON=true
LOG_LEVEL=info
EOF
```

**For Frontend (Linux/Mac):**
```bash
cd frontend
cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:5000
EOF
```

**For PowerShell (Windows):**
```powershell
# Backend
@"
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/cost-analyzer
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
CRON_SCHEDULE=0 2 * * *
ENABLE_CRON=true
LOG_LEVEL=info
"@ | Out-File -FilePath "backend\.env" -Encoding utf8

# Frontend
@"
REACT_APP_API_URL=http://localhost:5000
"@ | Out-File -FilePath "frontend\.env" -Encoding utf8
```

## Docker Setup

If you're using Docker Compose, the environment variables are already configured in `docker-compose.yml`. You don't need to create `.env` files when using Docker.

## Environment Variables Explained

### Backend Variables

- **PORT**: Port on which the backend server runs (default: 5000)
- **NODE_ENV**: Environment mode (development/production)
- **MONGODB_URI**: MongoDB connection string
- **JWT_SECRET**: Secret key for JWT token signing (change in production!)
- **JWT_EXPIRE**: JWT token expiration time (default: 7d)
- **MAX_FILE_SIZE**: Maximum file upload size in bytes (default: 100MB)
- **UPLOAD_DIR**: Directory for uploaded CSV files
- **CRON_SCHEDULE**: Cron expression for nightly processing (default: 2 AM daily)
- **ENABLE_CRON**: Enable/disable cron jobs (true/false)
- **LOG_LEVEL**: Logging level (info/debug/warn/error)

### Frontend Variables

- **REACT_APP_API_URL**: Backend API URL (must start with REACT_APP_ prefix)

## Security Notes

⚠️ **Important**: Change the `JWT_SECRET` to a strong, random string in production!

You can generate a secure secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Production Configuration

For production, make sure to:
1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper MongoDB connection with authentication
4. Set appropriate `MAX_FILE_SIZE` limits
5. Configure proper logging levels
6. Use HTTPS for `REACT_APP_API_URL` in frontend

