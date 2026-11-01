/**
 * Calendar-grid helpers for the Meetings page. Status, grouping and summary counts live in
 * @/lib/workflowState (pure and unit-tested).
 */
import { addDays, daysFrom } from "@/lib/dates";
import { weekStart } from "@/lib/workflowState";

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
