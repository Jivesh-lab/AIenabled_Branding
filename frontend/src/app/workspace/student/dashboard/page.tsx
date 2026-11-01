"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { ErrorState, SlowNotice } from "@/components/shared/loading/primitives";
import { useDelayedFlag, useLongWait } from "@/hooks/useDelayedFlag";
import { journeysFor } from "@/lib/overviewJourneys";
import { computeKpis } from "@/lib/studentKpis";
import { istNow } from "@/lib/workflowState";
import type { StudentOverview } from "@/types/student-overview";
import AiInsights from "./_components/AiInsights";
import DashboardHeader from "./_components/DashboardHeader";
import DashboardLayout from "./_components/DashboardLayout";
import DashboardSkeleton from "./_components/DashboardSkeleton";
import FundingOpportunities from "./_components/FundingOpportunities";
import IncubationOverview from "./_components/IncubationOverview";
import KpiRow from "./_components/KpiRow";
import MyProjects from "./_components/MyProjects";
import NextActions from "./_components/NextActions";
import RecentActivity from "./_components/RecentActivity";
import UpcomingMeetings from "./_components/UpcomingMeetings";

const REQUEST_TIMEOUT_MS = 30_000;

function SectionError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <section aria-label={title}>
      <SectionHeading title={title} />
      <Card>
        <ErrorState title="Could not load this section" message={message} onRetry={onRetry} />
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
    const timeout = setTimeout(() => controller.abort(new DOMException("timed out", "TimeoutError")), REQUEST_TIMEOUT_MS);
    setLoading(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/student/overview", { cache: "no-store", signal: controller.signal });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error((body && typeof body.message === "string" && body.message) || "The dashboard could not be loaded.");
      if (id !== latest.current) return;
      setOverview(body as StudentOverview);
    } catch (err) {
      if (id !== latest.current) return; // superseded by a newer request
      const timedOut = controller.signal.aborted;
      setRequestError(timedOut ? "The server took too long to respond." : err instanceof Error ? err.message : "The dashboard could not be loaded.");
    } finally {
      clearTimeout(timeout);
      if (id === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => inFlight.current?.abort();
  }, [load]);

  const retry = () => void load();
  // Skeleton only after a short threshold (no flicker for fast responses); content replaces it the instant data is ready.
  const showSkeleton = useDelayedFlag(loading && !overview, 150);
  const slow = useLongWait(loading && !overview, 5000);

  // Nothing has ever loaded.
  if (!overview) {
    if (requestError) {
      return (
        <DashboardLayout
          heading={<DashboardHeader />}
          kpis={null}
          main={
            <Card>
              <ErrorState title="We couldn't load your dashboard" message={requestError} onRetry={retry} />
            </Card>
          }
          side={null}
          lower={null}
        />
      );
    }
    return showSkeleton ? (
      <div>
        <DashboardSkeleton />
        <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-8">
          <SlowNotice show={slow} />
        </div>
      </div>
    ) : (
      <DashboardLayout heading={<DashboardHeader />} kpis={null} main={null} side={null} lower={null} />
    );
  }

  const now = istNow();
  const { projects, meetings, tasks } = overview;
  const journeys = journeysFor(overview, now);
  const kpis = computeKpis({ projects, meetings, tasks, journeys }, now);

  return (
    <DashboardLayout
      heading={
        <div className="flex flex-col gap-3">
          <DashboardHeader />
          {requestError && (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50">
              <ErrorState title="Showing the last data we loaded" message={`Refreshing failed. ${requestError}`} onRetry={retry} />
            </div>
          )}
        </div>
      }
      kpis={<KpiRow kpis={kpis} />}
      main={
        projects.ok ? (
          <>
            <MyProjects projects={projects.data} mentors={overview.mentors} journeys={journeys} />
            <IncubationOverview projects={projects.data} journeys={journeys} />
            <RecentActivity projects={projects.data} />
          </>
        ) : (
          <SectionError title="My Projects" message={projects.message} onRetry={retry} />
        )
      }
      side={
        <>
          {projects.ok && (
            <>
              <NextActions journeys={journeys} />
              {(!tasks.ok || !meetings.ok) && (
                <p role="status" className="-mt-4 text-[12px] text-muted-ink">
                  {[!tasks.ok && "Task", !meetings.ok && "Meeting"].filter(Boolean).join(" and ")} actions are unavailable right now, so they are not listed.
                </p>
              )}
            </>
          )}
          {meetings.ok ? <UpcomingMeetings meetings={meetings.data} now={now} /> : <SectionError title="Upcoming Meetings" message={meetings.message} onRetry={retry} />}
          {projects.ok && <AiInsights projects={projects.data} />}
        </>
      }
      lower={<FundingOpportunities />}
    />
  );
}
