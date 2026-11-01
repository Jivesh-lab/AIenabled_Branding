import { cleanName } from "@/lib/displayName";
import type { StatusTone } from "@/types/status";

export interface Session {
  id: string;
  title: string;
  project: string;
  participants: string[];
  /** YYYY-MM-DD when valid; anything else is treated as "date to be confirmed". */
  date: string;
  startTime?: string;
  durationMinutes?: number;
  meetingType?: string;
  agenda?: string;
  provider?: string;
  /** A URL for online sessions, otherwise a place. */
  location?: string;
  status: string;
  /** Notes the host recorded after the session. Empty until then. */
  notes?: string;
}

export type ScheduleTab = "upcoming" | "completed" | "all";

export const TAB_LABEL: Record<ScheduleTab, string> = { upcoming: "Upcoming", completed: "Completed", all: "All" };

const STATUS_TONE: Record<string, StatusTone> = {
  Sent: "progress",
  Requested: "attention",
  Confirmed: "success",
  Completed: "success",
  Cancelled: "neutral",
};

export function statusTone(status: string): StatusTone {
  return STATUS_TONE[status] ?? "neutral";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (value?: string): value is string => !!value && ISO_DATE.test(value);

interface MeetingRecord {
  id?: string;
  _id?: string;
  title?: string;
  projectTitle?: string;
  participants?: string[];
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  meetingType?: string;
  agenda?: string;
  meetingProvider?: string;
  meetingLinkOrLocation?: string;
  invitationStatus?: string;
  notes?: string;
}

export function toSessions(records: unknown[]): Session[] {
  return (records as MeetingRecord[])
    .map((m, i) => ({
      id: m.id || m._id || `session-${i}`,
      title: m.title || "Mentoring session",
      project: m.projectTitle || "",
      participants: (m.participants ?? []).map(cleanName),
      date: m.date || "",
      startTime: m.startTime,
      durationMinutes: m.durationMinutes,
      meetingType: m.meetingType,
      agenda: m.agenda,
      provider: m.meetingProvider,
      location: m.meetingLinkOrLocation,
      status: m.invitationStatus || "Sent",
      notes: m.notes?.trim() || undefined,
    }))
    .sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`));
}

/** A session is upcoming while it is not completed or cancelled and its date has not passed (a date to be confirmed counts). */
export function isUpcoming(s: Session, today: string): boolean {
  if (s.status === "Completed" || s.status === "Cancelled") return false;
  return !isIsoDate(s.date) || s.date >= today;
}

export const isCompleted = (s: Session) => s.status === "Completed";

/** Only a real link can be joined; a room name or an address is shown as the place instead. */
export function joinUrl(s: Session): string | undefined {
  return s.location && /^https?:\/\//i.test(s.location) ? s.location : undefined;
}

/** Sessions that belong on the calendar: a real date and not cancelled. */
export function calendarDates(sessions: Session[]): Set<string> {
  return new Set(sessions.filter((s) => isIsoDate(s.date) && s.status !== "Cancelled").map((s) => s.date));
}

export function sessionsOnMonth(sessions: Session[], year: number, month: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return sessions.filter((s) => isIsoDate(s.date) && s.date.startsWith(prefix) && s.status !== "Cancelled").length;
}
