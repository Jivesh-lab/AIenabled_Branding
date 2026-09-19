import Link from "next/link";
import { MapPin, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock, weekdayShort } from "@/lib/dates";
import { StatusBadge } from "@/components/shared/Surface";
import { MEETING_TYPE_LABEL, type Meeting } from "@/mock/student-meetings";
import {
  isJoinable,
  MEETING_STATUS_LABEL,
  MEETING_STATUS_TONE,
  meetingStatus,
  openStudentItems,
} from "../_lib/meetings";

export const joinLinkClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1";
export const detailsLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-brand transition-colors duration-150 hover:border-brand/40 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export default function MeetingListItem({ meeting }: { meeting: Meeting }) {
  const status = meetingStatus(meeting);
  const joinable = isJoinable(meeting);
  const cancelled = status === "CANCELLED";
  const pendingItems = openStudentItems(meeting).length;
  const day = new Date(meeting.date).getUTCDate();

  return (
    <article
      aria-labelledby={`meeting-${meeting.id}`}
      className="flex gap-4 rounded-xl border border-line bg-white p-4 shadow-sm transition-colors duration-150 hover:border-brand-cyan/40"
    >
      {/* Date tile — the one piece of structure that makes a list scannable by day */}
      <div
        className={cn(
          "flex w-12 shrink-0 flex-col items-center justify-center self-start rounded-lg border py-1.5",
          status === "TODAY" ? "border-brand/30 bg-brand-cyan-soft/60" : "border-line bg-canvas"
        )}
      >
        <span className="text-[11px] font-medium uppercase text-muted-ink">{weekdayShort(meeting.date)}</span>
        <span className={cn("text-[18px] font-bold leading-tight tabular-nums", status === "TODAY" ? "text-brand" : "text-ink")}>
          {day}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3
            id={`meeting-${meeting.id}`}
            className={cn("text-[15px] font-semibold leading-snug", cancelled ? "text-muted-ink line-through" : "text-ink")}
          >
            {meeting.title}
          </h3>
          <StatusBadge label={MEETING_STATUS_LABEL[status]} tone={MEETING_STATUS_TONE[status]} />
        </div>

        <p className="mt-0.5 text-[13px] font-medium text-brand-cyan-ink">{meeting.projectName}</p>

        <p className="mt-1.5 text-[13px] text-ink">
          <span className="tabular-nums">
            {formatClock(meeting.startTime)} – {formatClock(meeting.endTime)}
          </span>
          <span className="text-muted-ink">
            {" · "}
            {MEETING_TYPE_LABEL[meeting.type]} · {meeting.host.name}
          </span>
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-ink">
          {meeting.meetingLink ? (
            <Video className="size-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{meeting.meetingLink ? "Online meeting" : meeting.location}</span>
        </p>

        {cancelled ? (
          <p className="mt-2 text-[13px] text-muted-ink">{meeting.cancellation?.reason}</p>
        ) : status === "ACTION_REQUIRED" ? (
          <p className="mt-2 text-[13px] font-medium text-brand-gold-ink">
            {pendingItems} open action {pendingItems === 1 ? "item" : "items"} for your team
          </p>
        ) : (
          meeting.agenda.length > 0 && (
            <p className="mt-2 line-clamp-1 text-[13px] text-muted-ink">
              <span className="font-medium text-ink">Agenda:</span> {meeting.agenda.join(" · ")}
            </p>
          )
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/workspace/student/meetings/${meeting.id}`} className={detailsLinkClass}>
            View Details
            <span className="sr-only">: {meeting.title}</span>
          </Link>
          {joinable && (
            <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className={joinLinkClass}>
              <Video className="size-3.5" aria-hidden="true" />
              Join Meeting
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
