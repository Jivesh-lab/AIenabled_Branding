const dns = require('dns');
const mongoose = require('mongoose');

// Configure Node.js to use public DNS servers (Google & Cloudflare) to prevent
// Windows/router DNS querySrv ECONNREFUSED on MongoDB Atlas SRV connection strings.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {}

let isConnected = false;

// Direct replica set seedlist fallback if SRV resolution is completely blocked by network/firewall
const DIRECT_ATLAS_FALLBACK = 'mongodb://jivesh:mynameisjp@cluster0-shard-00-00.hrjib.mongodb.net:27017,cluster0-shard-00-01.hrjib.mongodb.net:27017,cluster0-shard-00-02.hrjib.mongodb.net:27017/test?ssl=true&replicaSet=atlas-111qi8-shard-0&authSource=admin&retryWrites=true&w=majority';

async function connectDB() {
  if (isConnected) return;

  let uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[DB] MONGO_URI is not set — auth routes requiring DB will fail.');
    return;
  }

  // If user entered mongodb:// for an Atlas cluster without port, normalize to mongodb+srv://
  if (uri.startsWith('mongodb://') && uri.includes('.mongodb.net') && !uri.includes(':27017')) {
    uri = uri.replace('mongodb://', 'mongodb+srv://');
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log('[DB] MongoDB connected successfully.');
  } catch (err) {
    if (err.message && (err.message.includes('querySrv') || err.message.includes('ECONNREFUSED') || err.message.includes('timed out'))) {
      console.warn(`[DB] SRV connection failed (${err.message}). Attempting direct replica-set connection...`);
      try {
        await mongoose.connect(DIRECT_ATLAS_FALLBACK, { serverSelectionTimeoutMS: 5000 });
        isConnected = true;
        console.log('[DB] MongoDB connected successfully via direct replica-set fallback.');
        return;
      } catch (fallbackErr) {
        console.error('[DB] Direct replica-set fallback also failed:', fallbackErr.message);
      }
    }
    // Log clearly but keep the server alive — individual route handlers
    // will fail with their own 500 errors rather than taking down the process.
    console.error('[DB] Connection failed:', err.message);
    console.error('[DB] Make sure MongoDB is running: mongod');
  }
}

module.exports = connectDB;
