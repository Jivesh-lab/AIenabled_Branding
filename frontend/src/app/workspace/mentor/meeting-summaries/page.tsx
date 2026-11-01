"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { ErrorState } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import { istNow } from "@/lib/workflowState";
import { useApiList } from "@/lib/useApiList";
import { toSessions } from "../_lib/sessions";
import SummaryCard from "./_components/SummaryCard";
import { SummaryListSkeleton } from "./_components/SummariesSkeleton";
import SummaryStats from "./_components/SummaryStats";
import { SUMMARY_TAB_LABEL, filterSummaries, newestFirst, type SummaryTab } from "./_components/summaries";

const EMPTY: Record<SummaryTab, string> = {
  all: "No sessions are on your schedule yet.",
  notes: "No notes have been recorded for any session yet.",
  awaiting: "Every session that has taken place has notes recorded.",
};

export default function MeetingSummariesPage() {
  const { items, loading, failed, reload } = useApiList("/api/faculty/meetings", toSessions);
  const today = istNow().date;
  const [tab, setTab] = useState<SummaryTab>("all");

  const sessions = useMemo(() => newestFirst(items), [items]);
  const visible = useMemo(() => filterSummaries(sessions, tab, today), [sessions, tab, today]);
  const counts = useMemo(
    () => ({ all: sessions.length, notes: filterSummaries(sessions, "notes", today).length, awaiting: filterSummaries(sessions, "awaiting", today).length }),
    [sessions, today]
  );

  return (
    <PageContainer
      title="AI Meeting Summaries & Transcripts"
      description="Notes and outcomes from your advisory sessions, in one place."
    >
      <SummaryStats sessions={sessions} today={today} loading={loading} failed={failed} />

      <div role="note" className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
        <InformationCircleIcon className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
        <p className="text-[13px] text-muted-ink">
          AI-generated summaries and transcripts aren&apos;t available yet. This page shows the notes recorded for each session, exactly as written.
        </p>
      </div>

      {!failed && (
        <div role="tablist" aria-label="Session filter" className="flex flex-wrap gap-1">
          {(Object.keys(SUMMARY_TAB_LABEL) as SummaryTab[]).map((key) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/40",
                  selected ? "bg-brand-soft font-semibold text-brand" : "font-medium text-muted-ink hover:bg-nav-hover hover:text-ink"
                )}
              >
                {SUMMARY_TAB_LABEL[key]} <span className="tabular-nums">({loading ? "–" : counts[key]})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <SummaryListSkeleton />
      ) : failed ? (
        <Card>
          <ErrorState
            title="We couldn't load your sessions"
            message="Something went wrong on our side. Please try again in a moment."
            onRetry={() => void reload()}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-ink">Nothing to show</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-ink">{EMPTY[tab]}</p>
          {sessions.length === 0 && (
            <Link
              href="/workspace/mentor/schedule"
              className="mt-4 inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-brand transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Open your schedule
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((session) => (
            <SummaryCard key={session.id} session={session} today={today} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
