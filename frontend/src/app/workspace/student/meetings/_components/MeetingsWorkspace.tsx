"use client";

/**
 * MeetingsWorkspace — header action, request panel, summary, calendar and list.
 *
 * State: whether the request panel is open, the visible calendar month, and
 * the selected date. Status, grouping and counts are derived from props on
 * every render; nothing is copied into state.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
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

type ScheduleTab = "upcoming" | "requested" | "past";

const TAB_LABEL: Record<ScheduleTab, string> = { upcoming: "Upcoming", requested: "Requested", past: "Past" };
const TAB_EMPTY: Record<ScheduleTab, string> = {
  upcoming: "No upcoming meetings. Use Request Meeting to schedule one.",
  requested: "No meeting requests are waiting for a response.",
  past: "No past meetings yet.",
};
/** How many rows each tab shows before "View all meetings". */
const PREVIEW_COUNT = 3;

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

  const [tab, setTab] = useState<ScheduleTab>("upcoming");
  const [showAll, setShowAll] = useState(false);
  // "Requested" also carries meetings whose date is still to be confirmed, so no record is hidden by the tabs.
  const byTab: Record<ScheduleTab, StudentMeeting[]> = {
    upcoming: [...groups.today, ...groups.upcoming],
    requested: [...groups.requested, ...groups.unscheduled],
    past: groups.past,
  };
  const tabMeetings = selectedDate ? onSelectedDate : byTab[tab];
  const visibleMeetings = showAll || selectedDate ? tabMeetings : tabMeetings.slice(0, PREVIEW_COUNT);

  function openRequest() {
    setRequestOpen(true);
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
        else toast.error("We couldn't load your investor introductions. Please refresh to try again.", { id: "intros-load" });
      } catch {
        toast.error("We couldn't load your investor introductions. Please refresh to try again.", { id: "intros-load" });
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
            aria-haspopup="dialog"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
          >
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
            Request Meeting
          </button>
        }
      />

      {/* KPI summary — directly below the header. */}
      <MeetingSummary {...summary} />

      <RequestMeetingPanel open={requestOpen} projects={projects} today={now.date} onClose={() => setRequestOpen(false)} />

      {/* Your schedule - meeting list (about 70%) with a compact calendar navigator (about 30%). */}
      <section aria-label="Your schedule" className="flex flex-col gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-ink">Your Schedule</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start">
          {/* Primary: upcoming meetings */}
          <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              {selectedDate ? (
                <p className="text-[14px] font-semibold text-ink" aria-live="polite">
                  {formatDayLabel(selectedDate, now.date)}
                  <span className="ml-2 font-normal tabular-nums text-muted-ink">({onSelectedDate.length})</span>
                </p>
              ) : (
                <div role="tablist" aria-label="Meeting filter" className="flex gap-1">
                  {(Object.keys(TAB_LABEL) as ScheduleTab[]).map((key) => {
                    const selected = tab === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => {
                          setTab(key);
                          setShowAll(false);
                        }}
                        className={
                          "rounded-lg px-3 py-1.5 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/40 " +
                          (selected ? "bg-brand-soft font-semibold text-brand" : "font-medium text-muted-ink hover:bg-nav-hover hover:text-ink")
                        }
                      >
                        {TAB_LABEL[key]} <span className="tabular-nums">({byTab[key].length})</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="rounded-md px-1.5 py-0.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  Clear date filter
                </button>
              )}
            </div>

            {visibleMeetings.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted-ink">
                {selectedDate ? "No meetings on this day." : TAB_EMPTY[tab]}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {visibleMeetings.map((m) => (
                  <li key={m.id}>
                    <MeetingListItem meeting={m} now={now} />
                  </li>
                ))}
              </ul>
            )}

            {!selectedDate && tabMeetings.length > PREVIEW_COUNT && (
              <div className="border-t border-line px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  aria-expanded={showAll}
                  className="rounded-md text-[13px] font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  {showAll ? "Show fewer meetings" : `View all meetings (${tabMeetings.length}) \u2192`}
                </button>
              </div>
            )}
          </div>

          {/* Secondary: compact calendar navigator */}
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
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-muted-ink">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-cyan" />
                Days with meetings
              </span>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="rounded font-semibold text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  All upcoming
                </button>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* AI-coordinated investor discovery - a distinct section; these records live in their own collection. */}
      {investorMeetings.length > 0 && <InvestorDocket introductions={investorMeetings} />}

    </div>
  );
}
