import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/dates";
import { MONTH_NAMES, monthGrid } from "../_lib/meetings";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Compact month calendar. Primary blue marks only the selected date; today is
 * outlined; days with meetings carry a small cyan dot. Controlled: the parent
 * owns the visible month and the selection.
 */
export default function MeetingCalendar({
  year,
  month,
  today,
  selected,
  meetingDates,
  onMonthChange,
  onSelect,
}: {
  year: number;
  month: number; // 0-based
  today: string;
  selected: string | null;
  meetingDates: Set<string>;
  onMonthChange: (year: number, month: number) => void;
  onSelect: (iso: string) => void;
}) {
  const cells = monthGrid(year, month);

  function shift(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    onMonthChange(next.getUTCFullYear(), next.getUTCMonth());
  }

  const navButton =
    "flex size-8 items-center justify-center rounded-md text-muted-ink transition-colors hover:bg-nav-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-ink" aria-live="polite">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className={navButton}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className={navButton}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div role="group" aria-label={`${MONTH_NAMES[month]} ${year} — choose a date`} className="grid grid-cols-7 gap-y-1">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} aria-hidden="true" className="pb-1 text-center text-[11px] font-medium text-muted-ink">
            {d}
          </div>
        ))}

        {cells.map((cell) => {
          const isSelected = cell.iso === selected;
          const isToday = cell.iso === today;
          const hasMeeting = meetingDates.has(cell.iso);

          return (
            <div key={cell.iso} className="flex justify-center">
              <button
                type="button"
                onClick={() => onSelect(cell.iso)}
                aria-pressed={isSelected}
                aria-label={`${formatLongDate(cell.iso)}${hasMeeting ? ", has meetings" : ""}${isToday ? ", today" : ""}`}
                className={cn(
                  "relative flex size-9 flex-col items-center justify-center rounded-lg text-[13px] tabular-nums outline-none",
                  "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/40",
                  isSelected
                    ? "bg-brand font-semibold text-white"
                    : cn(
                        "hover:bg-nav-hover",
                        cell.inMonth ? "text-ink" : "text-muted-ink/50",
                        isToday && "font-semibold text-brand ring-1 ring-inset ring-brand/40"
                      )
                )}
              >
                {cell.day}
                {hasMeeting && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute bottom-1 size-1 rounded-full",
                      isSelected ? "bg-white" : "bg-brand-cyan"
                    )}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
