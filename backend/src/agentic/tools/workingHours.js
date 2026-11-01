const { getConfig } = require('../config');
const { localParts } = require('../time');

/**
 * Per-person availability.
 *
 * A person may store `profile.workingHours` as a list of windows:
 *   [{ days: [1,2,3,4,5], start: '17:00', end: '20:00' }, { days: [6], start: '10:00', end: '14:00' }]
 * (days are 0 = Sunday ... 6 = Saturday, times are in the centre's timezone).
 * Someone with no windows uses the centre default (weekdays, MEETING_WORK_START_HOUR to MEETING_WORK_END_HOUR).
 * A custom window REPLACES the default for that person: an evening mentor is not blocked by office hours.
 */
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

function minutes(clock) {
  const m = CLOCK.exec(String(clock));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Validates user input and returns clean windows, or throws an Error whose message is safe to show. */
function validateWindows(input) {
  if (!Array.isArray(input)) throw new Error('Working hours must be a list of windows.');
  if (input.length > 14) throw new Error('Please use 14 windows or fewer.');
  return input.map((w, i) => {
    const days = Array.isArray(w.days) ? [...new Set(w.days.map(Number))].sort() : [];
    if (!days.length || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error(`Window ${i + 1}: choose at least one day.`);
    const start = minutes(w.start);
    const end = minutes(w.end);
    if (start === null || end === null) throw new Error(`Window ${i + 1}: times must look like 17:00.`);
    if (end - start < 30) throw new Error(`Window ${i + 1}: the end must be at least 30 minutes after the start.`);
    return { days, start: w.start, end: w.end };
  });
}

/** Windows as minutes, or the centre default when the person set none. */
function windowsFor(profile) {
  const stored = profile && Array.isArray(profile.workingHours) ? profile.workingHours : [];
  const clean = [];
  stored.forEach((w) => {
    const start = minutes(w.start);
    const end = minutes(w.end);
    if (start !== null && end !== null && end > start && Array.isArray(w.days)) clean.push({ days: w.days.map(Number), start, end });
  });
  if (clean.length) return clean;
  const cfg = getConfig().workflow;
  return [{ days: [1, 2, 3, 4, 5], start: cfg.workStartHour * 60, end: cfg.workEndHour * 60 }];
}

/** True when [begin, end) sits wholly inside one of the person's windows on a single local day. */
function fits(profile, begin, end) {
  const a = localParts(begin);
  const b = localParts(new Date(end.getTime() - 1));
  if (a.day !== b.day || a.month !== b.month) return false;
  const startMin = a.hour * 60 + a.minute;
  const endMin = b.hour * 60 + b.minute + 1;
  return windowsFor(profile).some((w) => w.days.includes(a.dow) && startMin >= w.start && endMin <= w.end);
}

module.exports = { validateWindows, windowsFor, fits };
