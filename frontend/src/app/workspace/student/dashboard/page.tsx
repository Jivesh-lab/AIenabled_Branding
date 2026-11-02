"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { ErrorState, SlowNotice } from "@/components/shared/loading/primitives";
import { useDelayedFlag, useLongWait } from "@/hooks/useDelayedFlag";
import { journeysFor } from "@/lib/overviewJourneys";
import { computeKpis } from "@/lib/studentKpis";
import { istNow } from "@/lib/workflowState";
import type { StudentOverview } from "@/types/student-overview";
import AgentStrip from "@/components/agentic/AgentStrip";
import AgentActivityFeed from "@/components/agentic/AgentActivityFeed";
import Introductions from "@/components/agentic/Introductions";
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
      <SectionHeading title={title} kicker="Section" />
      <Card className="p-6">
        <ErrorState title="Could not load this section" message={message} onRetry={onRetry} />
      </Card>
    </section>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
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
      if (!res.ok || !body) throw new Error(res.status === 401 ? "Your session has expired. Please sign in again." : "We couldn't load your dashboard right now. Please try again.");
      if (id !== latest.current) return;
      setOverview(body as StudentOverview);
    } catch (err) {
      if (id !== latest.current) return;
      const timedOut = controller.signal.aborted;
      const message = timedOut
        ? "This is taking longer than expected. Please try again."
        : err instanceof TypeError
          ? "We couldn't reach the server. Check your connection and try again."
          : err instanceof Error
            ? err.message
            : "We couldn't load your dashboard right now. Please try again.";
      setRequestError(message);
      toast.error(message, { id: "dashboard-load" });
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
  const showSkeleton = useDelayedFlag(loading && !overview, 150);
  const slow = useLongWait(loading && !overview, 5000);

  if (!overview) {
    if (requestError) {
      return (
        <DashboardLayout
          heading={<DashboardHeader />}
          kpis={null}
          main={
            <Card variant="elevated" className="p-8">
              <ErrorState title="We couldn't load your dashboard" message={requestError} onRetry={retry} />
            </Card>
          }
          side={null}
          lower={null}
        />
      );
    }
    return (
      <DashboardLayout
        heading={<DashboardHeader />}
        kpis={null}
        main={
          showSkeleton ? (
            <div className="space-y-4">
              <DashboardSkeleton />
              <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-8">
                <SlowNotice show={slow} />
              </div>
            </div>
          ) : null
        }
        side={null}
        lower={null}
      />
    );
  }


  const now = istNow();
  const { projects, meetings, tasks } = overview;
  const journeys = journeysFor(overview, now);
  const kpis = computeKpis({ projects, meetings, tasks, journeys }, now);

  return (
    <DashboardLayout
      heading={
        <div className="space-y-4">
          <DashboardHeader />
          <AgentStrip />
          {requestError && (
            <div role="alert" className="rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-5">
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
                  {[!tasks.ok && "Tasks", !meetings.ok && "meetings"].filter(Boolean).join(" and ")} couldn&apos;t be loaded, so they are not listed. Refresh to try again.
                </p>
              )}
            </>
          )}
          {meetings.ok ? <UpcomingMeetings meetings={meetings.data} now={now} /> : <SectionError title="Upcoming Meetings" message={meetings.message} onRetry={retry} />}
          {projects.ok && <AiInsights projects={projects.data} />}
        </>
      }
      lower={
        <div className="space-y-8">
          <AgentActivityFeed title="What the agents did for you" limit={10} emptyMessage="Nothing yet. After you submit an application you will see each check, request and booking here - with what happens next - even when you are not logged in." />
          <Introductions role="founder" title="Investor introductions" />
          <FundingOpportunities />
        </div>
      }
    />
  );
}
