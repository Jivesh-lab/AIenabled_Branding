"use client";

import { useState, useEffect } from "react";
import { Users, CalendarDays, CheckSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metrics {
  activeProjects: number;
  totalStudents: number;
  pendingMentorRequests: number;
  upcomingMeetings: number;
  pendingTasks: number;
  overdueMilestones: number;
}

export default function MentorKpiRow() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKPIs() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/overview");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.metrics) {
            setMetrics(json.data.metrics);
          }
        }
      } catch {
        // Silently catch
      } finally {
        setLoading(false);
      }
    }
    fetchKPIs();
  }, []);

  const kpis = [
    {
      label: "Active Mentees",
      value: loading ? "—" : (metrics?.activeProjects ?? 0).toString(),
      icon: Users,
      trend: "Supervised startups",
      positive: true,
    },
    {
      label: "Upcoming Sessions",
      value: loading ? "—" : (metrics?.upcomingMeetings ?? 0).toString(),
      icon: CalendarDays,
      trend: "Scheduled meetings",
    },
    {
      label: "Pending Tasks",
      value: loading ? "—" : (metrics?.pendingTasks ?? 0).toString(),
      icon: CheckSquare,
      alert: (metrics?.pendingTasks ?? 0) > 0,
      trend: "Action items",
    },
    {
      label: "At Risk / Overdue",
      value: loading ? "—" : (metrics?.overdueMilestones ?? 0).toString(),
      icon: AlertCircle,
      alert: (metrics?.overdueMilestones ?? 0) > 0,
      trend: "Needs attention",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
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
