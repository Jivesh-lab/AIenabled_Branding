import { isIsoDate, type Session } from "../../_lib/sessions";

export type SummaryTab = "all" | "notes" | "awaiting";

export const SUMMARY_TAB_LABEL: Record<SummaryTab, string> = { all: "All sessions", notes: "With notes", awaiting: "Awaiting notes" };

/**
 * A session is "awaiting notes" once it has happened (completed, or its date has passed) without any notes recorded.
 * A future or cancelled session is never waiting for notes.
 */
export function isAwaitingNotes(s: Session, today: string): boolean {
  if (s.notes || s.status === "Cancelled") return false;
  return s.status === "Completed" || (isIsoDate(s.date) && s.date < today);
}

/** Latest first; sessions without a usable date sink to the bottom. */
export function newestFirst(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    const aDate = isIsoDate(a.date) ? a.date : "";
    const bDate = isIsoDate(b.date) ? b.date : "";
    return bDate.localeCompare(aDate);
  });
}

export function filterSummaries(sessions: Session[], tab: SummaryTab, today: string): Session[] {
  if (tab === "notes") return sessions.filter((s) => !!s.notes);
  if (tab === "awaiting") return sessions.filter((s) => isAwaitingNotes(s, today));
  return sessions;
}
