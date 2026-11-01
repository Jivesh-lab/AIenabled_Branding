"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDaysIcon, CheckCircleIcon, ExclamationCircleIcon, UsersIcon } from "@heroicons/react/24/outline";
import MetricCard from "@/components/shared/MetricCard";

interface Metrics {
  activeProjects: number;
  upcomingMeetings: number;
  pendingTasks: number;
  overdueMilestones: number;
}

/**
 * The four headline numbers, in the portal's standard KPI card. While loading each card is a placeholder of the same
 * size; if the numbers cannot be loaded the cards say so instead of showing a misleading 0.
 */
export default function MentorKpiRow() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/faculty/overview");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json.data?.metrics) throw new Error("unavailable");
      setMetrics(json.data.metrics);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = (n?: number) => (failed ? "—" : (n ?? 0));
  const caption = (text: string) => (failed ? "Couldn't load" : text);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <MetricCard loading={loading} label="Active Mentees" value={value(metrics?.activeProjects)} sub={caption("Supervised startups")} icon={UsersIcon} />
      <MetricCard loading={loading} label="Upcoming Sessions" value={value(metrics?.upcomingMeetings)} sub={caption("Scheduled meetings")} icon={CalendarDaysIcon} />
      <MetricCard loading={loading} label="Pending Tasks" value={value(metrics?.pendingTasks)} sub={caption("Action items")} icon={CheckCircleIcon} tone="attention" />
      <MetricCard loading={loading} label="Overdue Milestones" value={value(metrics?.overdueMilestones)} sub={caption("Needs attention")} icon={ExclamationCircleIcon} tone="danger" />
    </div>
  );
}
