const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRouter = require('./routes/auth');
const auditRouter = require('./routes/audit');
const adminRouter = require('./routes/admin');

const app = express();

// ---------------------------------------------------------------------------
// Connect to MongoDB
// ---------------------------------------------------------------------------
connectDB();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Required for cross-origin httpOnly cookies
  })
);

app.use(express.json());
app.use(cookieParser()); // Parse Cookie header → req.cookies

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/audit', auditRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (_request, response) => {
  response.json({
    success: true,
    message: 'AAI–DBITIC API is running',
  });
});

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

module.exports = app;