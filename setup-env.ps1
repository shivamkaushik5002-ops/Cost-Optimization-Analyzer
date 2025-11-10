# PowerShell setup script for environment files

Write-Host "Setting up environment files..." -ForegroundColor Green

# Backend .env
Write-Host "Creating backend\.env..." -ForegroundColor Yellow
$backendEnv = @"
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/cost-analyzer

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
"@

$backendEnv | Out-File -FilePath "backend\.env" -Encoding utf8

# Frontend .env
Write-Host "Creating frontend\.env..." -ForegroundColor Yellow
$frontendEnv = @"
# API Configuration
REACT_APP_API_URL=http://localhost:5000
"@

$frontendEnv | Out-File -FilePath "frontend\.env" -Encoding utf8

Write-Host ""
Write-Host "Environment files created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Update backend\.env with your MongoDB URI and change JWT_SECRET in production!" -ForegroundColor Yellow

