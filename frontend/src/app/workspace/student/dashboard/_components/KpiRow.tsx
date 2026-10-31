import Link from "next/link";
import { CalendarDays, ClipboardCheck, FolderKanban, Target } from "lucide-react";
import { Card } from "@/components/shared/Surface";
import type { Kpi } from "@/lib/studentKpis";

const ICON = {
  "active-projects": FolderKanban,
  "pending-reviews": ClipboardCheck,
  "upcoming-meetings": CalendarDays,
  "overdue-milestones": Target,
} as const;

const NOTE = {
  ok: null,
  unavailable: "Unavailable right now",
  "not-tracked": "None recorded yet",
} as const;

/**
 * KPI tiles. A number is shown only when its source loaded; otherwise the tile says why it has no number
 * ("Unavailable" vs "None recorded") - never 0 as a stand-in. Hover/focus text gives each KPI's source and rule.
 */
export default function KpiRow({ kpis, loading = false }: { kpis: Kpi[]; loading?: boolean }) {
  return (
    <section aria-label="At a glance">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = ICON[kpi.id];
          return (
            <Link key={kpi.id} href={kpi.href} className="block" title={`${kpi.definition} Source: ${kpi.source}.`}>
              <Card interactive className="flex h-full items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-muted-ink">{kpi.label}</p>
                  <p className="mt-1 text-[28px] font-bold leading-none text-brand">{loading || kpi.value === null ? "—" : kpi.value}</p>
                  {!loading && NOTE[kpi.state] && <p className="mt-1.5 text-[11px] text-muted-ink">{NOTE[kpi.state]}</p>}
                </div>
                <Icon className="size-[18px] shrink-0 text-brand-cyan" aria-hidden="true" />
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
