"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle, AlertCircle, Users } from "lucide-react";
import { KpiCard } from "@/components/shared/Surface";

interface Metrics {
  activeProjects: number;
  upcomingMeetings: number;
  pendingTasks: number;
  overdueMilestones: number;
}

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

  const value = (n?: number) => (failed ? "-" : (n ?? 0));
  const caption = (text: string) => (failed ? "Couldn't load" : text);

  return (
    <section aria-label="At a glance">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        <KpiCard label="Active Mentees" value={value(metrics?.activeProjects)} sub={caption("Supervised startups")} icon={Users} accent="brand" />
        <KpiCard label="Upcoming Sessions" value={value(metrics?.upcomingMeetings)} sub={caption("Scheduled meetings")} icon={CalendarDays} accent="brand-cyan" />
        <KpiCard label="Pending Tasks" value={value(metrics?.pendingTasks)} sub={caption("Action items")} icon={CheckCircle} accent="brand-gold" />
        <KpiCard label="Overdue Milestones" value={value(metrics?.overdueMilestones)} sub={caption("Needs attention")} icon={AlertCircle} accent="brand-gold" />
      </div>
    </section>
  );
}
