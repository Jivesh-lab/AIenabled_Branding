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

const THEMES = {
  "active-projects": {
    bar: "bg-brand",
    iconBg: "bg-brand-soft text-brand",
    hoverBorder: "hover:border-brand/50",
  },
  "needs-attention": {
    bar: "bg-warm",
    iconBg: "bg-warm-soft text-warm",
    hoverBorder: "hover:border-warm/50",
  },
  "upcoming-meetings": {
    bar: "bg-teal",
    iconBg: "bg-teal-soft text-teal",
    hoverBorder: "hover:border-teal/50",
  },
  "overdue-tasks": {
    bar: "bg-rose-500",
    iconBg: "bg-rose-50 text-rose-600",
    hoverBorder: "hover:border-rose-400",
  },
} as const;

/**
 * Premium KPI summary cards for the Student Dashboard.
 * Clean, spacious, with accent top bars and micro-elevation.
 */
export default function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <section aria-label="At a glance">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4.5">
        {kpis.map((kpi) => {
          const Icon = ICON[kpi.id];
          const theme = THEMES[kpi.id] || THEMES["active-projects"];
          const attention = (kpi.id === "overdue-tasks" || kpi.id === "needs-attention") && (kpi.value ?? 0) > 0;
          const failed = kpi.value === null && kpi.state === "unavailable";
          const display = kpi.value === null ? (failed ? "—" : "0") : String(kpi.value);

          return (
            <Link
              key={kpi.id}
              href={kpi.href}
              title={`${kpi.definition} Source: ${kpi.source}.`}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-white p-4.5 text-left shadow-[0_2px_8px_rgba(16,27,53,0.04)] outline-none",
                "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/60 focus-visible:ring-2 focus-visible:ring-brand/30",
                attention
                  ? "border-warm/40 bg-gradient-to-b from-warm-soft/30 to-white"
                  : "border-line " + theme.hoverBorder
              )}
            >
              {/* Subtle top accent line */}
              <div
                className={cn(
                  "absolute top-0 inset-x-0 h-1 transition-all duration-200 group-hover:h-1.5",
                  attention ? "bg-warm" : theme.bar
                )}
              />

              <div className="flex items-start justify-between gap-3 pt-1">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold uppercase tracking-wider text-muted-ink">
                    {kpi.label}
                  </span>
                  <span
                    className={cn(
                      "mt-2 block text-2xl lg:text-3xl font-extrabold tracking-tight tabular-nums",
                      failed ? "text-muted-ink" : attention ? "text-warm" : "text-brand-deep"
                    )}
                  >
                    {display}
                  </span>
                </span>
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                    attention ? "bg-warm-soft text-warm" : theme.iconBg
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
