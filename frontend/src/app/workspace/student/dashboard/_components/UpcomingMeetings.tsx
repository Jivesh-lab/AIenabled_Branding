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
  const upcoming = (meetings || [])
    .filter((m) => ["TODAY", "UPCOMING"].includes(meetingStatus(m, now)))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const awaiting = (meetings || []).filter((m) => meetingStatus(m, now) === "REQUESTED").length;

  return (
    <section aria-label="Upcoming mentoring and clinic sessions">
      <SectionHeading title="Upcoming Sessions" action={{ label: "View all", href: "/workspace/student/meetings" }} />
      <Card className="border border-line bg-white">
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming mentoring sessions"
            action={{ label: "Request an advisory session", href: "/workspace/student/meetings" }}
          />
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.slice(0, 2).map((meeting) => {
              const join = joinUrl(meeting, now);
              const status = meetingStatus(meeting, now);
              const isToday = status === "TODAY";
              return (
                <li key={meeting.id} className="flex items-start gap-3.5 p-4">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${isToday ? "bg-teal-600" : "bg-brand"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{meeting.title}</p>
                    <p className="mt-0.5 text-[12px] text-muted-ink">
                      <span className={`font-medium ${isToday ? "text-teal-800" : "text-ink"}`}>
                        {isIsoDate(meeting.date) ? formatDayLabel(meeting.date, now.date) : meeting.date}
                      </span>
                      <span className="text-slate-400 mx-1.5">at</span>
                      <span>{timeRange(meeting)}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-ink">
                      {meeting.meetingType} / {meeting.projectTitle}
                    </p>
                    <span className="mt-1.5 inline-block rounded border border-teal-200/60 bg-teal-50 px-1.5 py-0.5 text-[11px] font-medium text-teal-800">
                      {MEETING_STATUS_LABEL[status]}
                    </span>
                  </div>
                  {join ? (
                    <a
                      href={join}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 shrink-0 items-center rounded-md bg-brand px-3 text-[12px] font-medium text-white hover:bg-brand-hover transition-colors"
                    >
                      Join
                    </a>
                  ) : (
                    <Link
                      href={`/workspace/student/meetings/${encodeURIComponent(meeting.id)}`}
                      className="inline-flex h-8 shrink-0 items-center rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-slate-50 transition-colors"
                    >
                      View
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {awaiting > 0 && (
          <p className="border-t border-line/60 bg-[#FAFBFB] px-4 py-2.5 text-[12px] text-muted-ink rounded-b-lg">
            {awaiting} advisory {awaiting === 1 ? "request is" : "requests are"} awaiting confirmation.
          </p>
        )}
      </Card>
    </section>
  );
}
