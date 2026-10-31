import Link from "next/link";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { CalendarDays, Loader2 } from "lucide-react";
import { formatDayLabel } from "@/lib/dates";
import { isIsoDate, joinUrl, meetingStatus, type Now } from "@/lib/workflowState";
import type { StudentMeeting } from "@/types/student-workflow";
import { timeRange } from "../../meetings/_components/MeetingListItem";

/** Confirmed meetings from today onwards, soonest first. Requests still awaiting the host are counted below the list. */
export default function UpcomingMeetings({
  meetings = [],
  now,
  loading = false,
}: {
  meetings?: StudentMeeting[];
  now: Now;
  loading?: boolean;
}) {
  const upcoming = meetings
    .filter((m) => ["TODAY", "UPCOMING"].includes(meetingStatus(m, now)))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const awaiting = meetings.filter((m) => meetingStatus(m, now) === "REQUESTED").length;

  return (
    <section aria-label="Upcoming meetings">
      <SectionHeading title="Upcoming Meetings" action={{ label: "View all", href: "/workspace/student/meetings" }} />

      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-6 text-muted-ink">
            <Loader2 className="size-4 animate-spin mr-2" />
            <span className="text-xs">Loading meetings...</span>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="p-6 text-center">
            <CalendarDays className="size-6 text-muted-ink/40 mx-auto mb-1.5" />
            <p className="text-xs text-muted-ink">No upcoming meetings scheduled.</p>
            <Link href="/workspace/student/meetings" className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">
              Request a Meeting
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.slice(0, 3).map((meeting) => {
              const join = joinUrl(meeting, now);
              return (
                <li key={meeting.id} className="flex items-start gap-3 p-4">
                  <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-cyan" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{meeting.title}</p>
                    <p className="mt-0.5 text-[12px] text-muted-ink">
                      <span className="font-medium text-brand">
                        {isIsoDate(meeting.date) ? formatDayLabel(meeting.date, now.date) : meeting.date}
                      </span>
                      {" · "}
                      {timeRange(meeting)}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-ink">{meeting.projectTitle}</p>
                  </div>
                  {join ? (
                    <a
                      href={join}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 shrink-0 items-center rounded-lg bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover"
                    >
                      Join
                    </a>
                  ) : (
                    <Link
                      href={`/workspace/student/meetings/${encodeURIComponent(meeting.id)}`}
                      className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-nav-hover"
                    >
                      View
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!loading && awaiting > 0 && (
          <p className="border-t border-line px-4 py-2.5 text-[12px] text-muted-ink">
            {awaiting} meeting {awaiting === 1 ? "request is" : "requests are"} awaiting confirmation.
          </p>
        )}
      </Card>
    </section>
  );
}
