"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import MonthCalendar from "@/components/shared/MonthCalendar";
import { Card } from "@/components/shared/Surface";
import { ErrorState } from "@/components/shared/loading/primitives";
import { istNow } from "@/lib/workflowState";
import { useApiList } from "@/lib/useApiList";
import NewSessionDrawer from "./_components/NewSessionDrawer";
import ScheduleList from "./_components/ScheduleList";
import { ScheduleListSkeleton } from "./_components/ScheduleSkeleton";
import ScheduleStats from "./_components/ScheduleStats";
import { calendarDates, toSessions, type ScheduleTab } from "../_lib/sessions";

export default function MentorSchedulePage() {
  const { items: sessions, loading, failed, reload } = useApiList("/api/faculty/meetings", toSessions);
  const today = istNow().date;

  const [view, setView] = useState({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tab, setTab] = useState<ScheduleTab>("upcoming");
  const [drawerOpen, setDrawerOpen] = useState(false);

  function selectDate(iso: string) {
    setSelectedDate((current) => (current === iso ? null : iso));
    setView({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Schedule & Sessions"
        description="Manage your upcoming mentorship sessions, track completed ones, and schedule new slots with mentees."
        actions={
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            Schedule Session
          </button>
        }
      />

      <ScheduleStats sessions={sessions} today={today} loading={loading} failed={failed} />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start">
          <ScheduleListSkeleton />
        </div>
      ) : failed ? (
        <Card>
          <ErrorState
            title="We couldn't load your schedule"
            message="Something went wrong on our side. Please try again in a moment."
            onRetry={() => void reload()}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start">
          <ScheduleList
            sessions={sessions}
            today={today}
            tab={tab}
            onTab={setTab}
            selectedDate={selectedDate}
            onClearDate={() => setSelectedDate(null)}
          />

          <Card className="p-4 lg:sticky lg:top-[84px]">
            <MonthCalendar
              year={view.year}
              month={view.month}
              today={today}
              selected={selectedDate}
              meetingDates={calendarDates(sessions)}
              onMonthChange={(year, month) => setView({ year, month })}
              onSelect={selectDate}
            />
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-muted-ink">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-cyan" />
                Days with sessions
              </span>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="rounded font-semibold text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  All sessions
                </button>
              )}
            </div>
          </Card>
        </div>
      )}

      <NewSessionDrawer open={drawerOpen} today={today} onClose={() => setDrawerOpen(false)} onCreated={() => void reload()} />
    </PageContainer>
  );
}
