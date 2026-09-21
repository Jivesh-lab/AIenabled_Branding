const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[DB] MONGO_URI is not set — auth routes requiring DB will fail.');
    return;
  }

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('[DB] MongoDB connected successfully.');
  } catch (err) {
    // Log clearly but keep the server alive — individual route handlers
    // will fail with their own 500 errors rather than taking down the process.
    console.error('[DB] Connection failed:', err.message);
    console.error('[DB] Make sure MongoDB is running: mongod');
  }
}

module.exports = connectDB;
