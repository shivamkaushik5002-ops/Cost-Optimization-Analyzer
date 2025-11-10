#!/bin/bash

# Setup script for environment files

echo "Setting up environment files..."

# Backend .env
echo "Creating backend/.env..."
cat > backend/.env << 'EOF'
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
EOF

# Frontend .env
echo "Creating frontend/.env..."
cat > frontend/.env << 'EOF'
# API Configuration
REACT_APP_API_URL=http://localhost:5000
EOF

echo "Environment files created successfully!"
echo ""
echo "⚠️  IMPORTANT: Update backend/.env with your MongoDB URI and change JWT_SECRET in production!"

