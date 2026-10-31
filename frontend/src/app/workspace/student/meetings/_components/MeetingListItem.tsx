import Link from "next/link";
import { MapPin, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock, weekdayShort } from "@/lib/dates";
import { StatusBadge } from "@/components/shared/Surface";
import type { StatusTone } from "@/types/status";
import type { StudentMeeting } from "@/types/student-workflow";
import {
  endTime,
  isIsoDate,
  joinUrl,
  MEETING_STATUS_LABEL,
  meetingStatus,
  reminderLabel,
  type MeetingStatus,
  type Now,
} from "@/lib/workflowState";

export const MEETING_STATUS_TONE: Record<MeetingStatus, StatusTone> = {
  REQUESTED: "attention",
  CANCELLED: "neutral",
  UNSCHEDULED: "neutral",
  TODAY: "info",
  UPCOMING: "progress",
  COMPLETED: "success",
  ENDED: "neutral",
};

export const joinLinkClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1";
export const detailsLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-brand transition-colors duration-150 hover:border-brand/40 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function timeRange(meeting: StudentMeeting): string {
  if (!meeting.startTime) return "Time to be confirmed";
  const end = endTime(meeting);
  return end ? `${formatClock(meeting.startTime)} – ${formatClock(end)}` : formatClock(meeting.startTime);
}

export default function MeetingListItem({ meeting, now }: { meeting: StudentMeeting; now: Now }) {
  const status = meetingStatus(meeting, now);
  const join = joinUrl(meeting, now);
  const cancelled = status === "CANCELLED";
  const online = /^https?:\/\//i.test(meeting.location);
  const reminder = reminderLabel(meeting.reminder);

  return (
    <article
      aria-labelledby={`meeting-${meeting.id}`}
      className="flex gap-4 rounded-xl border border-line bg-white p-4 shadow-sm transition-colors duration-150 hover:border-brand-cyan/40"
    >
      {/* Date tile */}
      <div
        className={cn(
          "flex w-12 shrink-0 flex-col items-center justify-center self-start rounded-lg border py-1.5",
          status === "TODAY" ? "border-brand/30 bg-brand-cyan-soft/60" : "border-line bg-canvas"
        )}
      >
        {isIsoDate(meeting.date) ? (
          <>
            <span className="text-[11px] font-medium uppercase text-muted-ink">{weekdayShort(meeting.date)}</span>
            <span className={cn("text-[18px] font-bold leading-tight tabular-nums", status === "TODAY" ? "text-brand" : "text-ink")}>
              {new Date(meeting.date).getUTCDate()}
            </span>
          </>
        ) : (
          <span className="px-1 text-center text-[11px] font-medium leading-tight text-muted-ink">TBC</span>
        )}
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

        <p className="mt-0.5 text-[13px] font-medium text-brand-cyan-ink">{meeting.projectTitle}</p>

        <p className="mt-1.5 text-[13px] text-ink">
          <span className="tabular-nums">{timeRange(meeting)}</span>
          <span className="text-muted-ink">
            {" · "}
            {meeting.meetingType}
            {!isIsoDate(meeting.date) && ` · ${meeting.date}`}
          </span>
        </p>

        {meeting.location && (
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-ink">
            {online ? <Video className="size-3.5 shrink-0" aria-hidden="true" /> : <MapPin className="size-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate">{online ? "Online meeting" : meeting.location}</span>
          </p>
        )}

        {meeting.agenda && (
          <p className="mt-2 line-clamp-1 text-[13px] text-muted-ink">
            <span className="font-medium text-ink">Agenda:</span> {meeting.agenda}
          </p>
        )}

        {reminder && (
          <p className={cn("mt-1.5 text-[12px]", reminder.tone === "bad" ? "text-danger" : "text-muted-ink")}>{reminder.text}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/workspace/student/meetings/${encodeURIComponent(meeting.id)}`} className={detailsLinkClass}>
            View Details
            <span className="sr-only">: {meeting.title}</span>
          </Link>
          {join && (
            <a href={join} target="_blank" rel="noopener noreferrer" className={joinLinkClass}>
              <Video className="size-3.5" aria-hidden="true" />
              Join Meeting
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
