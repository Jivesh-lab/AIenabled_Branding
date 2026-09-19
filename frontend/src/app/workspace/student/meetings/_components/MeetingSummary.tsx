import { cn } from "@/lib/utils";

/**
 * Compact summary strip — one bordered row divided into four, not four cards.
 * Gold is used for Action Required only when there is something to act on.
 */
export default function MeetingSummary({
  upcoming,
  thisWeek,
  completed,
  actionRequired,
}: {
  upcoming: number;
  thisWeek: number;
  completed: number;
  actionRequired: number;
}) {
  const items = [
    { label: "Upcoming", value: upcoming },
    { label: "This week", value: thisWeek },
    { label: "Completed", value: completed },
    { label: "Action required", value: actionRequired, attention: actionRequired > 0 },
  ];

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-white shadow-sm sm:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "px-4 py-3",
            // Dividers: vertical between columns, horizontal between the two rows on mobile.
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
