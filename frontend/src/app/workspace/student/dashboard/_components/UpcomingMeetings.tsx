import Link from "next/link";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/shared/Surface";
import { MEETINGS } from "@/mock/student-dashboard";

export default function UpcomingMeetings() {
  return (
    <section aria-label="Upcoming mentoring and review sessions">
      <SectionHeading
        title="Upcoming Sessions"
        action={{ label: "View calendar", href: "/workspace/student/meetings" }}
      />

      <div className="rounded-lg border border-line bg-white">
        <ul className="divide-y divide-line">
          {MEETINGS.map((meeting) => (
            <li key={meeting.id} className="flex items-start gap-3 p-4">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  meeting.isToday ? "bg-teal-600" : "bg-slate-300"
                )}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{meeting.title}</p>
                <p className="mt-0.5 text-[12px] text-muted-ink">
                  <span className={cn("font-medium", meeting.isToday ? "text-teal-800" : "text-ink")}>
                    {meeting.day}
                  </span>
                  <span className="text-slate-400 mx-1">at</span>
                  <span>{meeting.time}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-muted-ink">{meeting.kind}</p>
              </div>

              <Link
                href="/workspace/student/meetings"
                className={cn(
                  "inline-flex h-8 shrink-0 items-center rounded-md px-3 text-[12px] font-medium",
                  "transition-colors duration-150",
                  meeting.action === "Join"
                    ? "bg-brand text-white hover:bg-brand-hover"
                    : "border border-line text-ink hover:bg-slate-50"
                )}
              >
                {meeting.action}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
