import Link from "next/link";
import { CalendarDays, ClipboardCheck, FolderKanban, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/shared/Surface";
import { KPI_STATS, type KpiStat } from "@/mock/student-dashboard";

const ICONS: Record<KpiStat["icon"], LucideIcon> = {
  projects: FolderKanban,
  reviews: ClipboardCheck,
  meetings: CalendarDays,
  milestones: Target,
};

export default function KpiRow() {
  return (
    <section aria-label="At a glance">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI_STATS.map((stat) => {
          const Icon = ICONS[stat.icon];
          return (
            <Link key={stat.id} href={stat.href} className="block">
              <Card interactive className="flex h-full items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-muted-ink">{stat.label}</p>
                  <p className="mt-1 text-[28px] font-bold leading-none text-brand">{stat.value}</p>
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
