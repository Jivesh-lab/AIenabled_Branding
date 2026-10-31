import Link from "next/link";
import { CalendarDays, ClipboardCheck, FolderKanban, Target } from "lucide-react";
import { Card } from "@/components/shared/Surface";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/studentKpis";

const ICON = {
  "active-projects": FolderKanban,
  "pending-reviews": ClipboardCheck,
  "upcoming-meetings": CalendarDays,
  "overdue-milestones": Target,
} as const;

/** One short line under each number; the full rule is in the tooltip. */
const HINT = {
  "active-projects": "Submitted, in review or approved",
  "pending-reviews": "Waiting for a reviewer",
  "upcoming-meetings": "Confirmed, today or later",
  "overdue-milestones": "Past target date",
} as const;

const STATE_HINT = { unavailable: "Unavailable right now", "not-tracked": "None recorded yet" } as const;

/**
 * KPI tiles. A number is shown only when its source loaded; otherwise the tile says why it has none
 * ("Unavailable" vs "None recorded"), never 0 as a stand-in. Overdue milestones turn red only when there are some.
 */
export default function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <section aria-label="At a glance">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = ICON[kpi.id];
          const alert = kpi.id === "overdue-milestones" && (kpi.value ?? 0) > 0;
          return (
            <Link key={kpi.id} href={kpi.href} title={`${kpi.definition} Source: ${kpi.source}.`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-xl">
              <Card interactive className="flex h-[112px] items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-muted-ink">{kpi.label}</p>
                  <p className={cn("mt-1.5 text-[30px] font-bold leading-none tabular-nums", alert ? "text-danger" : "text-brand")}>
                    {kpi.value === null ? "—" : kpi.value}
                  </p>
                  <p className="mt-2 truncate text-[12px] text-muted-ink">{kpi.state === "ok" ? HINT[kpi.id] : STATE_HINT[kpi.state]}</p>
                </div>
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", alert ? "bg-danger/10 text-danger" : "bg-brand-soft text-brand")}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
