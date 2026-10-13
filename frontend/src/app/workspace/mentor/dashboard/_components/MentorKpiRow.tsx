import { Users, CalendarDays, CheckSquare, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const KPIS = [
  { label: "Active Startups Advised", value: "8", icon: Users, note: "Across 3 cohorts" },
  { label: "Clinics This Week", value: "3", icon: CalendarDays, note: "Next today at 2 PM" },
  { label: "Pending Milestone Reviews", value: "2", icon: CheckSquare, alert: true, note: "Action required" },
  { label: "Founder Messages", value: "5", icon: MessageSquare, note: "2 unread queries" },
];

export default function MentorKpiRow() {
  return (
    <section aria-label="Advisor metrics ledger">
      <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              "flex flex-col justify-between p-4 sm:p-5 transition-colors",
              kpi.alert ? "bg-amber-50/40" : "bg-white"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-muted-ink">
                {kpi.label}
              </span>
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded",
                  kpi.alert ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                )}
              >
                <kpi.icon className="size-3.5" strokeWidth={2} />
              </div>
            </div>

            <div className="mt-3">
              <span className="tabular-nums text-[26px] font-semibold tracking-tight text-ink">
                {kpi.value}
              </span>
              <p
                className={cn(
                  "mt-0.5 text-[12px]",
                  kpi.alert ? "font-medium text-amber-800" : "text-slate-500"
                )}
              >
                {kpi.note}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
