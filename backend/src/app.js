const express = require('express');
const cors = require('cors');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  }),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    success: true,
    message: 'AAI–DBITIC API is running',
  });
});

module.exports = app;