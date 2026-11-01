import { KpiCard } from "@/components/shared/Surface";
import { CalendarDays, ClipboardCheck, AlertCircle, Folder } from "lucide-react";
import type { Kpi } from "@/lib/studentKpis";

const ICON: Record<Kpi["id"], React.ComponentType<any>> = {
  "active-projects": Folder,
  "needs-attention": AlertCircle,
  "upcoming-meetings": CalendarDays,
  "overdue-tasks": ClipboardCheck,
} as const;

const ACCENT: Record<Kpi["id"], "brand" | "brand-cyan" | "brand-gold"> = {
  "active-projects": "brand",
  "needs-attention": "brand-gold",
  "upcoming-meetings": "brand-cyan",
  "overdue-tasks": "brand-gold",
} as const;

export default function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <section aria-label="At a glance">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {kpis.map((kpi) => {
          const Icon = ICON[kpi.id];
          const accent = ACCENT[kpi.id];
          const failed = kpi.value === null && kpi.state === "unavailable";
          const display = kpi.value === null ? (failed ? "-" : "0") : String(kpi.value);
          const attention = (kpi.id === "overdue-tasks" || kpi.id === "needs-attention") && (kpi.value ?? 0) > 0;

          return (
            <KpiCard
              key={kpi.id}
              label={kpi.label}
              value={display}
              sub={failed ? (attention ? "Source unavailable" : "Not tracked yet") : undefined}
              icon={Icon}
              accent={attention ? "brand-gold" : accent}
            />
          );
        })}
      </div>
    </section>
  );
}
