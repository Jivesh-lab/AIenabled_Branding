/**
 * Timezone-aware helpers built on Intl (no extra dependency). The incubation centre runs on one
 * configured zone (AGENT_TIMEZONE, default Asia/Kolkata); instants are stored in UTC.
 */
const { getConfig } = require('./config');

const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function tz() {
  return getConfig().timezone;
}

function localParts(date, zone = tz()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { year: +get('year'), month: +get('month'), day: +get('day'), hour: +get('hour'), minute: +get('minute'), dow: DOW[get('weekday')] };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function localDateString(date, zone = tz()) {
  const p = localParts(date, zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function localTimeString(date, zone = tz()) {
  const p = localParts(date, zone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** 'YYYY-MM-DD' + 'HH:mm' in the configured zone -> the UTC instant. */
function zonedToUtc(dateStr, timeStr, zone = tz()) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  const [h, mi] = String(timeStr || '00:00').split(':').map(Number);
  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i += 1) {
    const p = localParts(new Date(guess), zone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += Date.UTC(y, mo - 1, d, h, mi) - asUtc;
  }
  return new Date(guess);
}

function formatLocal(date, zone = tz()) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  }).format(date);
}

module.exports = { localParts, localDateString, localTimeString, zonedToUtc, formatLocal };
