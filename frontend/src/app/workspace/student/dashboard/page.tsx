"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { journeysFor } from "@/lib/overviewJourneys";
import { computeKpis } from "@/lib/studentKpis";
import { istNow } from "@/lib/workflowState";
import type { StudentOverview } from "@/types/student-overview";
import DashboardHeader from "./_components/DashboardHeader";
import KpiRow from "./_components/KpiRow";
import MyProjects from "./_components/MyProjects";
import UpcomingMeetings from "./_components/UpcomingMeetings";
import JourneySummary from "./_components/JourneySummary";
import NextActions from "./_components/NextActions";
import AiInsights from "./_components/AiInsights";
import RecentActivity from "./_components/RecentActivity";
import FundingOpportunities from "./_components/FundingOpportunities";

function SectionError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <section aria-label={title}>
      <SectionHeading title={title} />
      <Card>
        <div role="alert" className="flex flex-wrap items-center gap-3 p-4 text-[13px] text-red-800">
          <span className="min-w-0 flex-1">
            Could not load. {message}
          </span>
          <button type="button" onClick={onRetry} className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-red-50">
            Try again
          </button>
        </div>
      </Card>
    </section>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  // A newer request always wins: an older response arriving late must not overwrite newer data.
  const latest = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const id = ++latest.current;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/student/overview", { cache: "no-store", signal: controller.signal });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error((body && typeof body.message === "string" && body.message) || "The dashboard could not be loaded.");
      if (id !== latest.current) return;
      setOverview(body as StudentOverview);
    } catch (err) {
      if (controller.signal.aborted || id !== latest.current) return;
      setRequestError(err instanceof Error ? err.message : "The dashboard could not be loaded.");
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => inFlight.current?.abort();
  }, [load]);

  const retry = () => void load();
  const now = istNow();

  // The whole request failed (network, expired session) and nothing has ever loaded.
  if (!overview) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          <DashboardHeader />
          {loading ? (
            <p role="status" className="text-sm text-muted-ink">Loading your dashboard…</p>
          ) : (
            <SectionError title="Dashboard" message={requestError ?? "Please try again."} onRetry={retry} />
          )}
        </div>
      </PageContainer>
    );
  }

  const { projects, tasks, meetings } = overview;
  const journeys = journeysFor(overview, now);
  const kpis = computeKpis({ projects, meetings }, now);

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <DashboardHeader />

        {requestError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
            Showing the last data we loaded; refreshing failed. {requestError}
            <button type="button" onClick={retry} className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-red-100">
              Try again
            </button>
          </div>
        )}

        <KpiRow kpis={kpis} loading={loading && !overview} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Primary column */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {projects.ok ? (
              <>
                <MyProjects projects={projects.data} mentors={overview.mentors} />
                <JourneySummary journeys={journeys} />
                <AiInsights projects={projects.data} />
              </>
            ) : (
              <SectionError title="My Projects" message={projects.message} onRetry={retry} />
            )}
          </div>

          {/* Time-sensitive column */}
          <div className="flex flex-col gap-6">
            {meetings.ok ? (
              <UpcomingMeetings meetings={meetings.data} now={now} />
            ) : (
              <SectionError title="Upcoming Meetings" message={meetings.message} onRetry={retry} />
            )}
            {projects.ok && (
              <>
                <NextActions journeys={journeys} />
                {(!tasks.ok || !meetings.ok) && (
                  <p role="status" className="-mt-4 text-[12px] text-muted-ink">
                    {[!tasks.ok && "task", !meetings.ok && "meeting"].filter(Boolean).join(" and ")} actions are unavailable right now, so they are not listed.
                  </p>
                )}
                <RecentActivity projects={projects.data} />
              </>
            )}
          </div>
        </div>

        <FundingOpportunities />
      </div>
    </PageContainer>
  );
}
