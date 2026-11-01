import Link from "next/link";
import { AlertCircle, CalendarDays, FolderKanban, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/studentKpis";

const ICON = {
  "active-projects": FolderKanban,
  "needs-attention": AlertCircle,
  "upcoming-meetings": CalendarDays,
  "overdue-tasks": ListChecks,
} as const;

/** One short line under each number; the full rule is in the tooltip. */
const HINT = {
  "active-projects": "Submitted, in review or approved",
  "needs-attention": "Actions waiting on you",
  "upcoming-meetings": "Confirmed, today or later",
  "overdue-tasks": "Past their due date",
} as const;

const STATE_HINT = { unavailable: "Unavailable right now", "not-tracked": "None recorded yet" } as const;

/**
 * KPI ledger. A number is shown only when its source loaded; otherwise the tile explains why
 * ("Unavailable" vs "None recorded"), never 0 as a stand-in.
 */
export default function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <section aria-label="Incubation overview">
      <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {kpis.map((kpi) => {
          const Icon = ICON[kpi.id];
          const alert = (kpi.id === "overdue-tasks" || kpi.id === "needs-attention") && (kpi.value ?? 0) > 0;
          return (
            <Link
              key={kpi.id}
              href={kpi.href}
              title={`${kpi.definition} Source: ${kpi.source}.`}
              className={cn(
                "group flex flex-col justify-between p-4 sm:p-5 transition-colors hover:bg-[#FAFBFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                alert && "bg-amber-50/40"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-muted-ink">
                  {kpi.label}
                </span>
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    alert ? "text-amber-600" : "text-slate-400 group-hover:text-brand"
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-3">
                <span
                  className={cn(
                    "tabular-nums text-[26px] font-semibold tracking-tight",
                    alert ? "text-amber-900" : "text-ink"
                  )}
                >
                  {kpi.value === null ? "—" : kpi.value}
                </span>
                <p className="mt-0.5 text-[12px] text-muted-ink">
                  {kpi.state === "ok" ? HINT[kpi.id] : STATE_HINT[kpi.state]}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
