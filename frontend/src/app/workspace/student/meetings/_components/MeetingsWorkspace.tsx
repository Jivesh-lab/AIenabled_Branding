"use client";

/**
 * MeetingsWorkspace — header action, request panel, summary, calendar and list.
 *
 * State: whether the request panel is open, the visible calendar month, and
 * the selected date. Status, grouping and counts are derived from props on
 * every render; nothing is copied into state.
 */
import { useEffect, useRef, useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { formatDayLabel } from "@/lib/dates";
import { Card } from "@/components/shared/Surface";
import PageHeader from "@/components/shared/PageHeader";
import type { StudentMeeting } from "@/types/student-workflow";
import type { StudentProject } from "@/types/student-application";
import { groupMeetings, isIsoDate, meetingStatus, summarize, type Now } from "@/lib/workflowState";
import InvestorDocket, { type InvestorIntroduction } from "./InvestorDocket";
import MeetingSummary from "./MeetingSummary";
import MeetingCalendar from "./MeetingCalendar";
import MeetingListItem from "./MeetingListItem";
import RequestMeetingPanel from "./RequestMeetingPanel";

/** One labelled group of rows. The surrounding schedule card supplies the border, so rows are separated by hairlines. */
function MeetingSection({ title, meetings, now, empty }: { title: string; meetings: StudentMeeting[]; now: Now; empty?: string }) {
  if (meetings.length === 0 && !empty) return null;
  return (
    <section aria-label={title}>
      <h3 className="border-b border-line bg-canvas/60 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-ink">
        {title} <span className="font-medium tabular-nums">({meetings.length})</span>
      </h3>
      {meetings.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-ink">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {meetings.map((m) => (
            <li key={m.id}>
              <MeetingListItem meeting={m} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function MeetingsWorkspace({
  meetings,
  projects,
  now,
}: {
  meetings: StudentMeeting[];
  projects: StudentProject[];
  now: Now;
}) {
  const todayDate = new Date(now.date);
  const [view, setView] = useState({ year: todayDate.getUTCFullYear(), month: todayDate.getUTCMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const summary = summarize(meetings, now);
  const groups = groupMeetings(meetings, now);
  // Dots mark days with a confirmed (non-cancelled, non-requested) meeting on a real date.
  const meetingDates = new Set(
    meetings
      .filter((m) => isIsoDate(m.date) && !["CANCELLED", "REQUESTED", "UNSCHEDULED"].includes(meetingStatus(m, now)))
      .map((m) => m.date),
  );
  const onSelectedDate = selectedDate
    ? meetings.filter((m) => m.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];

  function openRequest() {
    setRequestOpen(true);
    // Bring the panel into view on small screens, where it opens below the fold.
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function selectDate(iso: string) {
    setSelectedDate((current) => (current === iso ? null : iso));
    const d = new Date(iso);
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  const [investorMeetings, setInvestorMeetings] = useState<InvestorIntroduction[]>([]);

  useEffect(() => {
    async function loadInvestorIntros() {
      try {
        const res = await fetch("/api/founder/introductions");
        if (res.ok) {
          const data = await res.json();
          setInvestorMeetings(data.introductions || []);
        }
      } catch (err) {
        console.error("Failed to load investor intros", err);
      }
    }
    loadInvestorIntros();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meetings"
        description="Manage your mentor, faculty, and investor discovery meetings."
        actions={
          <button
            type="button"
            onClick={openRequest}
            aria-expanded={requestOpen}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
          >
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
            Request Meeting
          </button>
        }
      />

      {/* KPI summary — directly below the header. */}
      <MeetingSummary {...summary} />

      {requestOpen && (
        <div ref={panelRef} className="scroll-mt-24">
          <RequestMeetingPanel projects={projects} today={now.date} onClose={() => setRequestOpen(false)} />
        </div>
      )}

      {/* AI-coordinated investor discovery - a distinct section; these records live in their own collection. */}
      {investorMeetings.length > 0 && <InvestorDocket introductions={investorMeetings} />}

      {/* Your meeting schedule - calendar (about a third) and the student's own mentor/faculty meetings. */}
      <section aria-label="Your meeting schedule" className="flex flex-col gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-ink">Your Meeting Schedule</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
          <Card className="p-4 lg:sticky lg:top-[84px]">
            <MeetingCalendar
              year={view.year}
              month={view.month}
              today={now.date}
              selected={selectedDate}
              meetingDates={meetingDates}
              onMonthChange={(year, month) => setView({ year, month })}
              onSelect={selectDate}
            />
            <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[12px] text-muted-ink">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-cyan" />
              Days with meetings. Select a date to filter.
            </p>
          </Card>

          {/* Meeting list - one surface, hairline-separated rows */}
          <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            {selectedDate ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                  <p className="text-[14px] font-semibold text-ink" aria-live="polite">
                    {formatDayLabel(selectedDate, now.date)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="rounded-md px-1.5 py-0.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    Show all meetings
                  </button>
                </div>
                <MeetingSection title="Meetings on this day" meetings={onSelectedDate} now={now} empty="No meetings on this day." />
              </>
            ) : (
              <>
                <MeetingSection title="Today" meetings={groups.today} now={now} />
                <MeetingSection title="Upcoming" meetings={groups.upcoming} now={now} empty="No upcoming meetings. Use Request Meeting to schedule one." />
                <MeetingSection title="Awaiting confirmation" meetings={groups.requested} now={now} />
                <MeetingSection title="Date to be confirmed" meetings={groups.unscheduled} now={now} />
                <MeetingSection title="Past meetings" meetings={groups.past} now={now} />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
