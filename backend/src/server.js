const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { startReminderSweeper } = require('./services/reminderService');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT} (port ${PORT})`);
  startReminderSweeper(); // no-op unless REMINDERS_ENABLED=true and real SMTP is configured
});
