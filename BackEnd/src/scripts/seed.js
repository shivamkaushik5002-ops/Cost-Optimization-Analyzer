const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

// Load .env file from backend directory
// Try multiple possible locations
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Also try loading from current working directory
if (!process.env.MONGODB_URI) {
  dotenv.config();
}

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cost-analyzer';
    
    if (!mongoUri || !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      console.error('Error: MONGODB_URI is invalid or missing');
      console.error('Current MONGODB_URI:', mongoUri);
      console.error('Please check your backend/.env file');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    console.log('Connected to MongoDB');

    // Create default admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Admin user created: admin@example.com / admin123');
    } else {
      console.log('Admin user already exists');
    }

    // Create default test user
    const testUser = await User.findOne({ email: 'user@example.com' });
    if (!testUser) {
      await User.create({
        username: 'user',
        email: 'user@example.com',
        password: 'user123',
        role: 'user'
      });
      console.log('Test user created: user@example.com / user123');
    } else {
      console.log('Test user already exists');
    }

    console.log('Seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();

