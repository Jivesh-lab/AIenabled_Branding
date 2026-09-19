/**
 * Meeting derivation — pure functions, no React.
 * Status, grouping, summary counts and the calendar grid all come from here.
 */
import { addDays, daysFrom } from "@/lib/dates";
import type { StatusTone } from "@/types/status";
import { MOCK_NOW, type Meeting } from "@/mock/student-meetings";

export type MeetingStatus = "UPCOMING" | "TODAY" | "COMPLETED" | "CANCELLED" | "ACTION_REQUIRED";

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  UPCOMING: "Upcoming",
  TODAY: "Today",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ACTION_REQUIRED: "Action Required",
};

/** Blue upcoming · cyan today · green completed · gold action · muted cancelled. */
export const MEETING_STATUS_TONE: Record<MeetingStatus, StatusTone> = {
  UPCOMING: "progress",
  TODAY: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
  ACTION_REQUIRED: "attention",
};

export type Now = { date: string; time: string };

export function hasEnded(m: Meeting, now: Now = MOCK_NOW) {
  return m.date < now.date || (m.date === now.date && m.endTime <= now.time);
}

/** Open action items that the student's team is responsible for. */
export function openStudentItems(m: Meeting) {
  return m.actionItems.filter((item) => item.status === "OPEN" && item.studentEditable);
}

export function meetingStatus(m: Meeting, now: Now = MOCK_NOW): MeetingStatus {
  if (m.cancellation) return "CANCELLED";
  if (hasEnded(m, now)) return openStudentItems(m).length > 0 ? "ACTION_REQUIRED" : "COMPLETED";
  return m.date === now.date ? "TODAY" : "UPCOMING";
}

/** A meeting can be joined on its day, before it ends, when it has an online link. */
export function isJoinable(m: Meeting, now: Now = MOCK_NOW) {
  return !!m.meetingLink && meetingStatus(m, now) === "TODAY";
}

const byStartAsc = (a: Meeting, b: Meeting) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`);

export function groupMeetings(meetings: Meeting[], now: Now = MOCK_NOW) {
  const today: Meeting[] = [];
  const upcoming: Meeting[] = [];
  const past: Meeting[] = [];

  for (const m of meetings) {
    const status = meetingStatus(m, now);
    if (status === "TODAY") today.push(m);
    else if (status === "UPCOMING") upcoming.push(m);
    else past.push(m);
  }

  today.sort(byStartAsc);
  upcoming.sort(byStartAsc);
  // Past: anything still needing action first, then most recent first.
  past.sort((a, b) => {
    const aAction = meetingStatus(a, now) === "ACTION_REQUIRED" ? 0 : 1;
    const bAction = meetingStatus(b, now) === "ACTION_REQUIRED" ? 0 : 1;
    return aAction - bAction || byStartAsc(b, a);
  });

  return { today, upcoming, past };
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string) {
  const weekday = new Date(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, weekday === 0 ? -6 : 1 - weekday);
}

export function summarize(meetings: Meeting[], now: Now = MOCK_NOW) {
  const monday = weekStart(now.date);
  const sunday = addDays(monday, 6);
  let upcoming = 0;
  let thisWeek = 0;
  let completed = 0;
  let actionRequired = 0;

  for (const m of meetings) {
    const status = meetingStatus(m, now);
    if (status === "TODAY" || status === "UPCOMING") upcoming++;
    if (status === "COMPLETED" || status === "ACTION_REQUIRED") completed++;
    if (status === "ACTION_REQUIRED") actionRequired++;
    if (status !== "CANCELLED" && m.date >= monday && m.date <= sunday) thisWeek++;
  }

  return { upcoming, thisWeek, completed, actionRequired };
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------
export interface CalendarCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** Month grid starting on Monday, padded to whole weeks. `month` is 0-based. */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const start = weekStart(first);
  const leading = daysFrom(first, start);
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;

  return Array.from({ length: total }, (_, i) => {
    const iso = addDays(start, i);
    const d = new Date(iso);
    return { iso, day: d.getUTCDate(), inMonth: d.getUTCMonth() === month };
  });
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

