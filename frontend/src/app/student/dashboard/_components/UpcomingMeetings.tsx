import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { MEETINGS } from "@/mock/student-dashboard";

export default function UpcomingMeetings() {
  return (
    <section aria-label="Upcoming meetings">
      <SectionHeading title="Upcoming Meetings" action={{ label: "View all", href: "/student/meetings" }} />

      <Card>
        <ul className="divide-y divide-line">
          {MEETINGS.map((meeting) => (
            <li key={meeting.id} className="flex items-start gap-3 p-4">
              {/* Day marker — cyan for today, muted otherwise */}
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  meeting.isToday ? "bg-brand-cyan" : "bg-line"
                )}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{meeting.title}</p>
                <p className="mt-0.5 text-[12px] text-muted-ink">
                  <span className={cn("font-medium", meeting.isToday ? "text-brand" : "text-ink")}>
                    {meeting.day}
                  </span>
                  {" · "}
                  {meeting.time}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-ink">{meeting.kind}</p>
              </div>

              <Link
                href="/student/meetings"
                className={cn(
                  "inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[13px] font-semibold",
                  "transition-colors duration-150",
                  meeting.action === "Join"
                    ? "bg-brand text-white hover:bg-brand-hover"
                    : "border border-line text-ink hover:bg-nav-hover"
                )}
              >
                {meeting.action}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
