import Link from "next/link";
import { MapPinIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
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
    // A compact row: the parent supplies the surface and the hairline separators.
    <article
      aria-labelledby={`meeting-${meeting.id}`}
      className="flex flex-col gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-nav-hover sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        {/* Date tile */}
        <div
          className={cn(
            "flex w-11 shrink-0 flex-col items-center justify-center rounded-lg border py-1",
            status === "TODAY" ? "border-brand/30 bg-brand-cyan-soft/60" : "border-line bg-canvas"
          )}
        >
          {isIsoDate(meeting.date) ? (
            <>
              <span className="text-[10px] font-medium uppercase leading-tight text-muted-ink">{weekdayShort(meeting.date)}</span>
              <span className={cn("text-[16px] font-bold leading-tight tabular-nums", status === "TODAY" ? "text-brand" : "text-ink")}>
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
              className={cn("text-[14px] font-semibold leading-snug", cancelled ? "text-muted-ink line-through" : "text-ink")}
            >
              {meeting.title}
            </h3>
            <StatusBadge label={MEETING_STATUS_LABEL[status]} tone={MEETING_STATUS_TONE[status]} />
          </div>

          <p className="mt-0.5 text-[12px] text-muted-ink">
            <span className="font-medium text-brand-cyan-ink">{meeting.projectTitle}</span>
            {" · "}
            <span className="tabular-nums text-ink">{timeRange(meeting)}</span>
            {" · "}
            {meeting.meetingType}
            {!isIsoDate(meeting.date) && ` · ${meeting.date}`}
          </p>

          {(meeting.location || meeting.agenda || reminder) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-ink">
              {meeting.location && (
                <span className="inline-flex items-center gap-1">
                  {online ? <VideoCameraIcon className="size-3.5 shrink-0" aria-hidden="true" /> : <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />}
                  <span className="truncate">{online ? "Online" : meeting.location}</span>
                </span>
              )}
              {meeting.agenda && <span className="line-clamp-1">{meeting.agenda}</span>}
              {reminder && <span className={cn(reminder.tone === "bad" && "text-danger")}>{reminder.text}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Actions stay aligned at the end of the row. */}
      <div className="flex shrink-0 gap-2 sm:justify-end">
        <Link href={`/workspace/student/meetings/${encodeURIComponent(meeting.id)}`} className={detailsLinkClass}>
          View Details
          <span className="sr-only">: {meeting.title}</span>
        </Link>
        {join && (
          <a href={join} target="_blank" rel="noopener noreferrer" className={joinLinkClass}>
            <VideoCameraIcon className="size-3.5" aria-hidden="true" />
            Join
          </a>
        )}
      </div>
    </article>
  );
}
