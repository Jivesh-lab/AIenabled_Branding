import { CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, UsersIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { KpiCardSkeleton } from "@/components/shared/loading/primitives";
import type { HealthFilter } from "../_lib/mentees";

const ITEMS: { filter: HealthFilter; label: string; icon: React.ElementType; attention?: "gold" | "danger" }[] = [
  { filter: "All", label: "Total Mentees", icon: UsersIcon },
  { filter: "On Track", label: "On Track", icon: CheckCircleIcon },
  { filter: "Needs Attention", label: "Needs Attention", icon: ExclamationTriangleIcon, attention: "gold" },
  { filter: "At Risk", label: "At Risk", icon: ExclamationCircleIcon, attention: "danger" },
];

/**
 * Four summary cards that are also the health filter, so there is no second row of chips repeating them. Same card
 * as the Student Portal's My Projects summary; amber / red only when there is something to act on.
 */
export default function MenteeStats({
  counts,
  active,
  onSelect,
  loading,
}: {
  counts: Record<HealthFilter, number>;
  active: HealthFilter;
  onSelect: (filter: HealthFilter) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {ITEMS.map((item) => (
          <KpiCardSkeleton key={item.filter} label={item.label} />
        ))}
      </div>
    );
  }

  return (
    <div role="group" aria-label="Filter mentees by health" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {ITEMS.map(({ filter, label, icon: Icon, attention }) => {
        const count = counts[filter];
        const isActive = active === filter;
        const raised = attention && count > 0;
        const tone = attention === "danger" ? "danger" : "gold";

        return (
          <button
            key={filter}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(filter)}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border bg-white p-4 text-left shadow-sm outline-none",
              "transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-brand/20",
              isActive
                ? raised
                  ? tone === "danger"
                    ? "border-danger bg-danger/5"
                    : "border-brand-gold bg-brand-gold/5"
                  : "border-brand bg-brand-cyan-soft/40"
                : "border-line hover:border-brand-cyan/40 hover:bg-nav-hover"
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-muted-ink">{label}</span>
              <span
                className={cn(
                  "mt-1 block text-[24px] font-bold leading-none tabular-nums",
                  raised ? (tone === "danger" ? "text-danger" : "text-brand-gold-ink") : "text-brand"
                )}
              >
                {count}
              </span>
            </span>
            <Icon
              className={cn("size-[18px] shrink-0", raised ? (tone === "danger" ? "text-danger" : "text-brand-gold") : "text-brand-cyan")}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
