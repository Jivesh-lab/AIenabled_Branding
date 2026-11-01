const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { startReminderSweeper } = require('./services/reminderService');
const { startEventOrchestrator } = require('./services/eventOrchestrator');

const PORT = process.env.PORT || 5000;

async function startNgrok() {
  if (!process.env.NGROK_AUTHTOKEN) return null;
  try {
    const ngrok = require('@ngrok/ngrok');
    const listener = await ngrok.forward({ addr: PORT, authtoken: process.env.NGROK_AUTHTOKEN });
    const url = listener.url();
    process.env.PUBLIC_API_URL = url;
    process.env.CALENDAR_SYNC_MODE = 'live';
    console.log(`[ngrok] Tunnel active → ${url}`);
    console.log(`[ngrok] Google Calendar webhook URL → ${url}/api/integrations/google/webhook`);
    return url;
  } catch (err) {
    console.warn(`[ngrok] Could not start tunnel: ${err.message}`);
    return null;
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT} (port ${PORT})`);
  await startNgrok();
  startReminderSweeper(); // no-op unless REMINDERS_ENABLED=true and real SMTP is configured
  startEventOrchestrator(); // no-op unless EVENT_ORCHESTRATOR_ENABLED=true
});
