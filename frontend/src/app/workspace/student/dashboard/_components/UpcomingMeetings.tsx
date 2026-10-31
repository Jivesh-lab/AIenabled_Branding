import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { CalendarDays, Loader2 } from "lucide-react";

export default function UpcomingMeetings({
  meetings = [],
  loading = false,
}: {
  meetings?: any[];
  loading?: boolean;
}) {
  return (
    <section aria-label="Upcoming meetings">
      <SectionHeading
        title="Upcoming Meetings"
        action={{ label: "View all", href: "/workspace/student/meetings" }}
      />

      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-6 text-muted-ink">
            <Loader2 className="size-4 animate-spin mr-2" />
            <span className="text-xs">Loading meetings...</span>
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-6 text-center">
            <CalendarDays className="size-6 text-muted-ink/40 mx-auto mb-1.5" />
            <p className="text-xs text-muted-ink">No upcoming meetings scheduled.</p>
            <Link
              href="/workspace/student/meetings"
              className="mt-2 inline-block text-xs font-semibold text-brand hover:underline"
            >
              Request a Meeting
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {meetings.slice(0, 3).map((meeting: any) => {
              const id = meeting.id || meeting._id;
              const title = meeting.agenda || meeting.title || "Advisory Mentorship Review";
              const dateStr = meeting.date ? new Date(meeting.date).toLocaleDateString() : "Upcoming";
              const timeStr = meeting.time || "Scheduled";
              const kind = meeting.meetingType || "Incubation Advisory";
              const hasLink = Boolean(meeting.meetingLink);

              return (
                <li key={id} className="flex items-start gap-3 p-4">
                  <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-cyan" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-[12px] text-muted-ink">
                      <span className="font-medium text-brand">{dateStr}</span>
                      {" · "}
                      {timeStr}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-ink">{kind}</p>
                  </div>

                  {hasLink ? (
                    <a
                      href={meeting.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[13px] font-semibold bg-brand text-white hover:bg-brand-hover transition-colors"
                    >
                      Join
                    </a>
                  ) : (
                    <Link
                      href="/workspace/student/meetings"
                      className="inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[13px] font-semibold border border-line text-ink hover:bg-nav-hover transition-colors"
                    >
                      View
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
