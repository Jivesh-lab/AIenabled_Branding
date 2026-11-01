import Link from "next/link";
import { CalendarDaysIcon, ClipboardDocumentCheckIcon, ExclamationCircleIcon, FolderIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/studentKpis";

const ICON = {
  "active-projects": FolderIcon,
  "needs-attention": ExclamationCircleIcon,
  "upcoming-meetings": CalendarDaysIcon,
  "overdue-tasks": ClipboardDocumentCheckIcon,
} as const;

/**
 * KPI tiles, styled to match the My Projects summary cards (SummaryFilters): separate white cards with a label,
 * a bold number and a top-right icon. A number is shown only when its source loaded; a genuine load failure shows
 * an em-dash, while "not-tracked" is a real zero. Needs-attention and overdue tiles take the amber attention
 * treatment only when there is actually something to act on.
 */
export default function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <section aria-label="At a glance">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map((kpi) => {
          const Icon = ICON[kpi.id];
          const attention = (kpi.id === "overdue-tasks" || kpi.id === "needs-attention") && (kpi.value ?? 0) > 0;
          const failed = kpi.value === null && kpi.state === "unavailable";
          const display = kpi.value === null ? (failed ? "—" : "0") : String(kpi.value);

          return (
            <Link
              key={kpi.id}
              href={kpi.href}
              title={`${kpi.definition} Source: ${kpi.source}.`}
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl border bg-white p-4 text-left shadow-sm outline-none",
                "transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-brand/20",
                attention ? "border-brand-gold/40 hover:border-brand-gold" : "border-line hover:border-brand-cyan/40 hover:bg-nav-hover"
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-muted-ink">{kpi.label}</span>
                <span
                  className={cn(
                    "mt-1 block text-[24px] font-bold leading-none tabular-nums",
                    failed ? "text-muted-ink" : attention ? "text-brand-gold-ink" : "text-brand"
                  )}
                >
                  {display}
                </span>
              </span>
              <Icon
                className={cn("size-[18px] shrink-0", attention ? "text-brand-gold" : "text-brand-cyan")}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
