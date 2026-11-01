const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');

// Configure Node.js to use public DNS servers (Google & Cloudflare) to prevent
// Windows/router DNS querySrv ECONNREFUSED on MongoDB Atlas SRV connection strings.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { startReminderSweeper } = require('./services/reminderService');
const { startEventOrchestrator } = require('./services/eventOrchestrator');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT} (port ${PORT})`);
  startReminderSweeper(); // no-op unless REMINDERS_ENABLED=true and real SMTP is configured
  startEventOrchestrator(); // no-op unless EVENT_ORCHESTRATOR_ENABLED=true
});
