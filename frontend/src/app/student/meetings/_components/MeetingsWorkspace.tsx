"use client";

/**
 * MeetingsWorkspace — header action, request panel, summary, calendar and list.
 *
 * State: whether the request panel is open, the visible calendar month, and
 * the selected date. Status, grouping and counts are derived from props on
 * every render; nothing is copied into state.
 */
import { useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { formatDayLabel } from "@/lib/dates";
import { Card } from "@/components/shared/Surface";
import PageHeader from "@/components/shared/PageHeader";
import { MOCK_NOW, type Meeting } from "@/mock/student-meetings";
import type { StudentProject } from "@/mock/student-projects";
import { groupMeetings, summarize } from "../_lib/meetings";
import MeetingSummary from "./MeetingSummary";
import MeetingCalendar from "./MeetingCalendar";
import MeetingListItem from "./MeetingListItem";
import RequestMeetingPanel from "./RequestMeetingPanel";

function MeetingSection({ title, meetings, empty }: { title: string; meetings: Meeting[]; empty?: string }) {
  if (meetings.length === 0 && !empty) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-ink">
        {title} <span className="font-medium tabular-nums">({meetings.length})</span>
      </h2>
      {meetings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white px-4 py-6 text-center text-[13px] text-muted-ink">
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {meetings.map((m) => (
            <li key={m.id}>
              <MeetingListItem meeting={m} />
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
}: {
  meetings: Meeting[];
  projects: StudentProject[];
}) {
  const todayDate = new Date(MOCK_NOW.date);
  const [view, setView] = useState({ year: todayDate.getUTCFullYear(), month: todayDate.getUTCMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const summary = summarize(meetings);
  const groups = groupMeetings(meetings);
  const meetingDates = new Set(meetings.filter((m) => !m.cancellation).map((m) => m.date));
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meetings"
        description="Manage your mentor, faculty and incubation meetings."
        actions={
          <button
            type="button"
            onClick={openRequest}
            aria-expanded={requestOpen}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            Request Meeting
          </button>
        }
      />

      {requestOpen && (
        <div ref={panelRef} className="scroll-mt-24">
          <RequestMeetingPanel projects={projects} onClose={() => setRequestOpen(false)} />
        </div>
      )}

      <MeetingSummary {...summary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[19.5rem_minmax(0,1fr)] lg:items-start">
        {/* Calendar — compact, never the dominant element */}
        <Card className="p-4 lg:sticky lg:top-[84px]">
          <MeetingCalendar
            year={view.year}
            month={view.month}
            today={MOCK_NOW.date}
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

        {/* Meeting list */}
        <div className="flex min-w-0 flex-col gap-6">
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold text-ink" aria-live="polite">
                  {formatDayLabel(selectedDate, MOCK_NOW.date)}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="rounded-md px-1.5 py-0.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  Show all meetings
                </button>
              </div>
              <MeetingSection title="Meetings on this day" meetings={onSelectedDate} empty="No meetings on this day." />
            </>
          ) : (
            <>
              <MeetingSection title="Today" meetings={groups.today} />
              <MeetingSection title="Upcoming" meetings={groups.upcoming} empty="No upcoming meetings." />
              <MeetingSection title="Past meetings" meetings={groups.past} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
