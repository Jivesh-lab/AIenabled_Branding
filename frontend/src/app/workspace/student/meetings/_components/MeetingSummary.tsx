import { cn } from "@/lib/utils";

/**
 * KPI row for the Meetings page, styled to match the dashboard and My Projects summary cards: four compact,
 * equal-width white cards. Counts come from the meetings the backend returned; "Awaiting confirmation" are the
 * student's own requests the host has not scheduled yet.
 */
export default function MeetingSummary({
  upcoming,
  thisWeek,
  completed,
  requested,
}: {
  upcoming: number;
  thisWeek: number;
  completed: number;
  requested: number;
}) {
  const items = [
    { label: "Upcoming", value: upcoming },
    { label: "This week", value: thisWeek },
    { label: "Completed", value: completed },
    { label: "Awaiting confirmation", value: requested, attention: requested > 0 },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-line bg-white p-4 shadow-sm"
        >
          <dt className="truncate text-[13px] font-medium text-muted-ink">{item.label}</dt>
          <dd
            className={cn(
              "mt-1 text-[24px] font-bold leading-none tabular-nums",
              item.attention ? "text-brand-gold-ink" : "text-brand"
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
