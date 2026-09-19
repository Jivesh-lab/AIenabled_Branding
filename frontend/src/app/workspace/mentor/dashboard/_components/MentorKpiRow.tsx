import { Users, CalendarDays, CheckSquare, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const KPIS = [
  { label: "Active Mentees", value: "8", icon: Users, trend: "+2 this month", positive: true },
  { label: "Sessions This Week", value: "3", icon: CalendarDays },
  { label: "Pending Reviews", value: "2", icon: CheckSquare, alert: true },
  { label: "Unread Messages", value: "5", icon: MessageSquare },
];

export default function MentorKpiRow() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {KPIS.map((kpi) => (
        <div
          key={kpi.label}
          className="flex flex-col rounded-[12px] border border-line bg-white p-5 shadow-sm shadow-slate-200/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-muted-ink">{kpi.label}</span>
            <div className={cn("flex size-8 items-center justify-center rounded-full bg-slate-50", kpi.alert && "bg-amber-50 text-amber-600")}>
              <kpi.icon className="size-4" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">{kpi.value}</span>
            {kpi.trend && (
              <span
                className={cn(
                  "text-[11px] font-medium",
                  kpi.positive ? "text-emerald-600" : "text-muted-ink"
                )}
              >
                {kpi.trend}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
