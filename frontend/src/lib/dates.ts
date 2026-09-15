/**
 * Date display helpers.
 *
 * Relative labels take an explicit reference date instead of reading the clock
 * during render. Reading `Date.now()` in render makes output differ between
 * the server and the browser (hydration mismatch) and between renders.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Everything is computed in UTC. Date-only ISO strings ("2026-09-15") parse as
 * UTC midnight, so mixing in local time would shift days in timezones behind
 * UTC and make the server and browser disagree.
 */
function utcDay(iso: string) {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function dayDiff(iso: string, referenceIso: string) {
  return Math.round((utcDay(iso) - utcDay(referenceIso)) / DAY_MS);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "20 Sep". Formatted by hand: Intl month names vary between ICU builds
 * ("Sep" vs "Sept"), which would make server and browser text disagree.
 */
function shortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Today", "Yesterday", "3 days ago", or "02 Sep" for anything older than a week. */
export function formatUpdated(iso: string, referenceIso: string) {
  const diff = dayDiff(iso, referenceIso);
  if (diff >= 0) return "today";
  if (diff === -1) return "yesterday";
  if (diff >= -7) return `${-diff} days ago`;
  return `on ${shortDate(iso)}`;
}

/** "Due today", "Due tomorrow", "Overdue · 12 Sep", or "Due 20 Sep". */
export function formatDue(iso: string, referenceIso: string) {
  const diff = dayDiff(iso, referenceIso);
  if (diff < 0) return `Overdue · ${shortDate(iso)}`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${shortDate(iso)}`;
}

/** Due today, tomorrow, or already overdue. */
export function isDueSoon(iso: string, referenceIso: string) {
  return dayDiff(iso, referenceIso) <= 1;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "14 Sep 2026" */
export function formatLongDate(iso: string) {
  const d = new Date(iso);
  return `${shortDate(iso)} ${d.getUTCFullYear()}`;
}

/** "Wed" */
export function weekdayShort(iso: string) {
  return WEEKDAYS[new Date(iso).getUTCDay()];
}

/** Whole days from `referenceIso` to `iso` (negative = in the past). */
export function daysFrom(iso: string, referenceIso: string) {
  return dayDiff(iso, referenceIso);
}

/** "Today", "Tomorrow", "Yesterday", or "Wed, 18 Sep". */
export function formatDayLabel(iso: string, referenceIso: string) {
  const diff = dayDiff(iso, referenceIso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return `${weekdayShort(iso)}, ${shortDate(iso)}`;
}

/** Adds whole days to a date-only ISO string, returning "YYYY-MM-DD". */
export function addDays(iso: string, days: number) {
  return new Date(utcDay(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** "15:00" → "3:00 PM". Times are institute-local wall-clock strings. */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
