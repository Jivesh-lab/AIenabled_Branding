import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { EmptyState } from "@/components/shared/loading/primitives";
import { formatDayLabel } from "@/lib/dates";
import { isIsoDate, joinUrl, meetingStatus, MEETING_STATUS_LABEL, type Now } from "@/lib/workflowState";
import type { StudentMeeting } from "@/types/student-workflow";
import { timeRange } from "../../meetings/_components/MeetingListItem";

/** The next two confirmed meetings from now onwards, soonest first. Requests still awaiting the host are counted below the list. */
export default function UpcomingMeetings({ meetings, now }: { meetings: StudentMeeting[]; now: Now }) {
  const upcoming = meetings
    .filter((m) => ["TODAY", "UPCOMING"].includes(meetingStatus(m, now)))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const awaiting = meetings.filter((m) => meetingStatus(m, now) === "REQUESTED").length;

  return (
    <section aria-label="Upcoming meetings">
      <SectionHeading title="Upcoming Meetings" action={{ label: "View all", href: "/workspace/student/meetings" }} />
      <Card>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming meetings" action={{ label: "Request a meeting", href: "/workspace/student/meetings" }} />
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.slice(0, 2).map((meeting) => {
              const join = joinUrl(meeting, now);
              const status = meetingStatus(meeting, now);
              return (
                <li key={meeting.id} className="flex items-start gap-3 p-4">
                  <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{meeting.title}</p>
                    <p className="mt-0.5 text-[12px] text-muted-ink">
                      <span className="font-medium text-brand">{isIsoDate(meeting.date) ? formatDayLabel(meeting.date, now.date) : meeting.date}</span>
                      {" · "}
                      {timeRange(meeting)}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-ink">
                      {meeting.meetingType} · {meeting.projectTitle}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-brand-cyan-ink">{MEETING_STATUS_LABEL[status]}</p>
                  </div>
                  {join ? (
                    <a href={join} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 shrink-0 items-center rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover">
                      Join
                    </a>
                  ) : (
                    <Link href={`/workspace/student/meetings/${encodeURIComponent(meeting.id)}`} className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line px-3 text-[13px] font-semibold text-ink hover:bg-nav-hover">
                      View
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {awaiting > 0 && (
          <p className="border-t border-line px-4 py-2.5 text-[12px] text-muted-ink">
            {awaiting} meeting {awaiting === 1 ? "request is" : "requests are"} awaiting confirmation.
          </p>
        )}
      </Card>
    </section>
  );
}
