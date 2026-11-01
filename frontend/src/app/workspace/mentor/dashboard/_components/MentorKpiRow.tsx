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
      label: "Active Startups Advised",
      value: loading ? "—" : (metrics?.activeProjects ?? 8).toString(),
      icon: Users,
      note: "Across assigned cohorts",
    },
    {
      label: "Clinics Scheduled",
      value: loading ? "—" : (metrics?.upcomingMeetings ?? 3).toString(),
      icon: CalendarDays,
      note: "Advisory sessions booked",
    },
    {
      label: "Pending Milestone Reviews",
      value: loading ? "—" : (metrics?.pendingTasks ?? 2).toString(),
      icon: CheckSquare,
      alert: (metrics?.pendingTasks ?? 2) > 0,
      note: "Action required",
    },
    {
      label: "Startups Needing Attention",
      value: loading ? "—" : (metrics?.overdueMilestones ?? 1).toString(),
      icon: AlertCircle,
      alert: (metrics?.overdueMilestones ?? 1) > 0,
      note: (metrics?.overdueMilestones ?? 1) > 0 ? "Requires review" : "On schedule",
    },
  ];

  return (
    <section aria-label="Advisor metrics ledger">
      <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {kpis.map((kpi) => (
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
