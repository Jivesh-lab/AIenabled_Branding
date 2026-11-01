/**
 * Derivation of meeting and task display states from persisted records. Pure (no framework imports) and
 * unit-tested. Only states the backend can actually express are produced:
 *
 *  - Meetings have no "status" column. Their state comes from `invitationStatus` ("Requested", "Cancelled", ...),
 *    `attendanceLogged` (the host recorded the meeting as held) and the clock. "Rescheduled" is not a backend
 *    state: a rescheduled meeting is simply the same record with a new date.
 *  - Tasks have a stored status plus a due date; "overdue" is derived, never stored by the student.
 */
import { addDays, daysFrom } from "./dates.ts";
import type { ReminderState, StudentMeeting, StudentTask } from "../types/student-workflow.ts";

/** Institute-local wall clock (IST, UTC+5:30), which is how meeting dates and times are stored. */
export interface Now {
  date: string;
  time: string;
}

export function istNow(ms: number = Date.now()): Now {
  const iso = new Date(ms + 5.5 * 3600000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** YYYY-MM-DD in institute time for any timestamp (stored in UTC). */
export function istDateOf(timestamp: string): string {
  const ms = Date.parse(timestamp);
  return Number.isNaN(ms) ? timestamp.slice(0, 10) : istNow(ms).date;
}

/** "4 Nov 2026, 1:20 am" in institute time, the same on the server and in every browser. */
export function formatIstDateTime(timestamp: string): string {
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) return timestamp;
  return new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isClock = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** HH:MM the meeting ends at, or null when it has no start time. */
export function endTime(m: Pick<StudentMeeting, "startTime" | "durationMinutes">): string | null {
  if (!isClock(m.startTime)) return null;
  const [h, min] = m.startTime.split(":").map(Number);
  const total = h * 60 + min + (m.durationMinutes > 0 ? m.durationMinutes : 0);
  if (total >= 24 * 60) return "23:59";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export type MeetingStatus = "REQUESTED" | "CANCELLED" | "UNSCHEDULED" | "TODAY" | "UPCOMING" | "COMPLETED" | "ENDED";

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  REQUESTED: "Awaiting confirmation",
  CANCELLED: "Cancelled",
  UNSCHEDULED: "Date to be confirmed",
  TODAY: "Today",
  UPCOMING: "Upcoming",
  COMPLETED: "Completed",
  ENDED: "Ended",
};

export function meetingStatus(m: StudentMeeting, now: Now): MeetingStatus {
  const invitation = m.invitationStatus.trim().toLowerCase();
  if (invitation === "requested") return "REQUESTED";
  if (/^cancel/.test(invitation)) return "CANCELLED";
  if (!isIsoDate(m.date)) return "UNSCHEDULED";

  const end = endTime(m) ?? "23:59";
  const over = m.date < now.date || (m.date === now.date && end <= now.time);
  if (m.attendanceLogged) return "COMPLETED"; // the host recorded it as held
  if (over) return "ENDED"; // time has passed, but nobody has logged it as held
  return m.date === now.date ? "TODAY" : "UPCOMING";
}

/** A meeting can be joined on its day, before it ends, when the location is an http(s) link. */
export function joinUrl(m: StudentMeeting, now: Now): string | null {
  return meetingStatus(m, now) === "TODAY" && /^https?:\/\//i.test(m.location) ? m.location : null;
}

const byStart = (a: StudentMeeting, b: StudentMeeting) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`);

export function groupMeetings(meetings: StudentMeeting[], now: Now) {
  const groups = { today: [] as StudentMeeting[], upcoming: [] as StudentMeeting[], requested: [] as StudentMeeting[], unscheduled: [] as StudentMeeting[], past: [] as StudentMeeting[] };
  for (const m of meetings) {
    switch (meetingStatus(m, now)) {
      case "TODAY": groups.today.push(m); break;
      case "UPCOMING": groups.upcoming.push(m); break;
      case "REQUESTED": groups.requested.push(m); break;
      case "UNSCHEDULED": groups.unscheduled.push(m); break;
      default: groups.past.push(m);
    }
  }
  groups.today.sort(byStart);
  groups.upcoming.sort(byStart);
  groups.requested.sort(byStart);
  groups.past.sort((a, b) => byStart(b, a));
  return groups;
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string) {
  const weekday = new Date(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, weekday === 0 ? -6 : 1 - weekday);
}

export function summarize(meetings: StudentMeeting[], now: Now) {
  const monday = weekStart(now.date);
  const sunday = addDays(monday, 6);
  const out = { upcoming: 0, thisWeek: 0, completed: 0, requested: 0 };
  for (const m of meetings) {
    const status = meetingStatus(m, now);
    if (status === "TODAY" || status === "UPCOMING") out.upcoming++;
    if (status === "COMPLETED") out.completed++;
    if (status === "REQUESTED") out.requested++;
    if ((status === "TODAY" || status === "UPCOMING") && m.date >= monday && m.date <= sunday) out.thisWeek++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export type TaskState = "COMPLETED" | "OVERDUE" | "DUE_SOON" | "UPCOMING" | "NO_DATE";

export const TASK_STATE_LABEL: Record<TaskState, string> = {
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
  DUE_SOON: "Due soon",
  UPCOMING: "Upcoming",
  NO_DATE: "No due date",
};

export function taskState(t: Pick<StudentTask, "status" | "dueDate">, todayIso: string): TaskState {
  if (t.status === "Completed") return "COMPLETED";
  if (!isIsoDate(t.dueDate)) return "NO_DATE";
  const diff = daysFrom(t.dueDate, todayIso);
  if (diff < 0) return "OVERDUE";
  return diff <= 2 ? "DUE_SOON" : "UPCOMING";
}

const TASK_ORDER: Record<TaskState, number> = { OVERDUE: 0, DUE_SOON: 1, UPCOMING: 2, NO_DATE: 3, COMPLETED: 4 };

export function sortTasks(tasks: StudentTask[], todayIso: string): StudentTask[] {
  return [...tasks].sort(
    (a, b) =>
      TASK_ORDER[taskState(a, todayIso)] - TASK_ORDER[taskState(b, todayIso)] || a.dueDate.localeCompare(b.dueDate),
  );
}

// ---------------------------------------------------------------------------
// Reminders - say only what was recorded
// ---------------------------------------------------------------------------
export function reminderLabel(reminder: ReminderState | null): { text: string; tone: "ok" | "bad" | "neutral" } | null {
  if (!reminder) return null; // none attempted: claim nothing
  if (reminder.status === "sent") return { text: "Reminder email accepted by the mail server", tone: "ok" };
  if (reminder.status === "failed") return { text: "A reminder email could not be sent", tone: "bad" };
  return { text: "Reminder email is being sent", tone: "neutral" };
}
