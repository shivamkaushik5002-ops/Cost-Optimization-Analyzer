@echo off
REM Setup script for environment files (Windows)

echo Setting up environment files...

REM Backend .env
echo Creating backend\.env...
(
echo # Server Configuration
echo PORT=5000
echo NODE_ENV=development
echo.
echo # MongoDB Configuration
echo MONGODB_URI=mongodb://localhost:27017/cost-analyzer
echo.
echo # JWT Configuration
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
echo JWT_EXPIRE=7d
echo.
echo # File Upload Configuration
echo MAX_FILE_SIZE=104857600
echo UPLOAD_DIR=./uploads
echo.
echo # Cron Job Configuration
echo CRON_SCHEDULE=0 2 * * *
echo ENABLE_CRON=true
echo.
echo # Logging
echo LOG_LEVEL=info
) > backend\.env

REM Frontend .env
echo Creating frontend\.env...
(
echo # API Configuration
echo REACT_APP_API_URL=http://localhost:5000
) > frontend\.env

echo Environment files created successfully!
echo.
echo IMPORTANT: Update backend\.env with your MongoDB URI and change JWT_SECRET in production!

pause

