import { cn } from "@/lib/utils";
import { formatDayLabel } from "@/lib/dates";
import SessionRow from "./SessionRow";
import { TAB_LABEL, isCompleted, isUpcoming, type ScheduleTab, type Session } from "../../_lib/sessions";

const EMPTY: Record<ScheduleTab, string> = {
  upcoming: "No upcoming sessions. Use Schedule Session to add one.",
  completed: "No sessions have been completed yet.",
  all: "No sessions yet. Use Schedule Session to add one.",
};

/**
 * One surface with hairline-separated rows. A tab strip filters by state; picking a date on the calendar replaces the
 * tabs with that day's sessions and a way back.
 */
export default function ScheduleList({
  sessions,
  today,
  tab,
  onTab,
  selectedDate,
  onClearDate,
}: {
  sessions: Session[];
  today: string;
  tab: ScheduleTab;
  onTab: (tab: ScheduleTab) => void;
  selectedDate: string | null;
  onClearDate: () => void;
}) {
  const byTab: Record<ScheduleTab, Session[]> = {
    upcoming: sessions.filter((s) => isUpcoming(s, today)),
    completed: sessions.filter(isCompleted),
    all: sessions,
  };
  const rows = selectedDate ? sessions.filter((s) => s.date === selectedDate) : byTab[tab];

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        {selectedDate ? (
          <>
            <p className="text-[14px] font-semibold text-ink" aria-live="polite">
              {formatDayLabel(selectedDate, today)}
              <span className="ml-2 font-normal tabular-nums text-muted-ink">({rows.length})</span>
            </p>
            <button
              type="button"
              onClick={onClearDate}
              className="rounded-md px-1.5 py-0.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Clear date filter
            </button>
          </>
        ) : (
          <div role="tablist" aria-label="Session filter" className="flex gap-1">
            {(Object.keys(TAB_LABEL) as ScheduleTab[]).map((key) => {
              const selected = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onTab(key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/40",
                    selected ? "bg-brand-soft font-semibold text-brand" : "font-medium text-muted-ink hover:bg-nav-hover hover:text-ink"
                  )}
                >
                  {TAB_LABEL[key]} <span className="tabular-nums">({byTab[key].length})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] text-muted-ink">{selectedDate ? "No sessions on this day." : EMPTY[tab]}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((session) => (
            <li key={session.id}>
              <SessionRow session={session} today={today} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
