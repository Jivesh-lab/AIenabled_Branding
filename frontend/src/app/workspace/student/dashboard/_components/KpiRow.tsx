import Link from "next/link";
import { FolderKanban, ClipboardCheck, CalendarDays, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { KPI_STATS, type KpiStat } from "@/mock/student-dashboard";

const ICONS: Record<KpiStat["icon"], LucideIcon> = {
  projects: FolderKanban,
  reviews: ClipboardCheck,
  meetings: CalendarDays,
  milestones: Target,
};

export default function KpiRow() {
  return (
    <section aria-label="Incubation overview">
      <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {KPI_STATS.map((stat, idx) => {
          const Icon = ICONS[stat.icon];
          return (
            <Link
              key={stat.id}
              href={stat.href}
              className="group flex flex-col justify-between p-4 sm:p-5 transition-colors hover:bg-[#FAFBFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-muted-ink">
                  {stat.label}
                </span>
                <Icon
                  className="size-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="tabular-nums text-[26px] font-semibold tracking-tight text-ink">
                  {stat.value}
                </span>
                {idx === 0 && (
                  <span className="text-[12px] font-medium text-teal-700 bg-teal-50 border border-teal-200/50 rounded px-1.5 py-0.5">
                    Active Sprint
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
