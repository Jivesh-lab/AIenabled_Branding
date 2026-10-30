const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRouter = require('./routes/auth');
const auditRouter = require('./routes/audit');
const adminRouter = require('./routes/admin');
const investorsRouter = require('./routes/investors');
const facultyRouter = require('./routes/faculty');

const app = express();

// ---------------------------------------------------------------------------
// Connect to MongoDB
// ---------------------------------------------------------------------------
connectDB();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly: permit frontend origin
    },
    credentials: true, // Required for cross-origin httpOnly cookies
  })
);

app.use((req, res, next) => {
  console.log(`[Backend HTTP] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(cookieParser()); // Parse Cookie header → req.cookies

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/audit', auditRouter);
app.use('/api/admin', adminRouter);
app.use('/api/investors', investorsRouter);
app.use('/api/faculty', facultyRouter);

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