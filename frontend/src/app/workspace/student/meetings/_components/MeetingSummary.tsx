import { cn } from "@/lib/utils";

/**
 * Compact summary strip. Counts come from the meetings the backend returned; "Awaiting confirmation" are the
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
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-white shadow-sm sm:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "px-4 py-3",
            i % 2 === 1 && "border-l border-line",
            i >= 2 && "border-t border-line sm:border-t-0",
            i === 2 && "sm:border-l"
          )}
        >
          <dt className="text-[12px] font-medium text-muted-ink">{item.label}</dt>
          <dd
            className={cn(
              "mt-0.5 text-[22px] font-bold leading-tight tabular-nums",
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
