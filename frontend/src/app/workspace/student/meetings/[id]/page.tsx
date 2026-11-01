import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarClock, MapPin, Video } from "lucide-react";
import { formatDayLabel, formatLongDate } from "@/lib/dates";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { fetchBackend } from "@/lib/backendProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";
import { isIsoDate, istNow, joinUrl, MEETING_STATUS_LABEL, meetingStatus, reminderLabel } from "@/lib/workflowState";
import type { StudentMeeting } from "@/types/student-workflow";
import LoadError from "../../_components/LoadError";
import { joinLinkClass, MEETING_STATUS_TONE, timeRange } from "../_components/MeetingListItem";

export const metadata: Metadata = {
  title: "Meeting | DBIT Incubation Centre",
};

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchBackend<StudentMeeting[]>(
    { path: "/api/student/meetings", roles: STUDENT_READ_ROLES, tag: "Meeting Detail" },
    [],
  );

  // The student endpoint only ever returns the caller's own meetings, so an id that is not in the list is
  // either missing or not theirs - the page cannot (and need not) tell which.
  const meeting = result.ok ? result.data.find((m) => m.id === id) : undefined;

  if (!result.ok || !meeting) {
    return (
      <PageContainer>
        <LoadError
          title={result.ok ? "Meeting not found" : "We couldn't load this meeting"}
          message={result.ok ? "This meeting doesn't exist, or it isn't one of yours." : result.message}
          canRetry={!result.ok && result.kind === "unavailable"}
          backHref="/workspace/student/meetings"
          backLabel="Back to Meetings"
        />
      </PageContainer>
    );
  }

  const now = istNow();
  const status = meetingStatus(meeting, now);
  const join = joinUrl(meeting, now);
  const online = /^https?:\/\//i.test(meeting.location);
  const reminder = reminderLabel(meeting.reminder);

  return (
    <PageContainer>
      <div className="flex max-w-3xl flex-col gap-6">
        <Link
          href="/workspace/student/meetings"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted-ink transition-colors hover:text-brand"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to Meetings
        </Link>

        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold tracking-tight text-ink">{meeting.title}</h1>
              <p className="mt-1 text-[14px] font-medium text-brand-cyan-ink">{meeting.projectTitle}</p>
            </div>
            <StatusBadge label={MEETING_STATUS_LABEL[status]} tone={MEETING_STATUS_TONE[status]} />
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 text-[14px] sm:grid-cols-2">
            <div>
              <dt className="text-[12px] font-medium text-muted-ink">When</dt>
              <dd className="mt-0.5 flex items-start gap-1.5 text-ink">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-ink" aria-hidden="true" />
                <span>
                  {isIsoDate(meeting.date) ? `${formatDayLabel(meeting.date, now.date)} · ${formatLongDate(meeting.date)}` : `${meeting.date} (not a confirmed date)`}
                  <br />
                  <span className="tabular-nums text-muted-ink">
                    {timeRange(meeting)}
                    {meeting.startTime && meeting.timeZone ? ` · ${meeting.timeZone}` : ""}
                  </span>
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium text-muted-ink">Where</dt>
              <dd className="mt-0.5 flex items-start gap-1.5 text-ink">
                {online ? <Video className="mt-0.5 size-4 shrink-0 text-muted-ink" aria-hidden="true" /> : <MapPin className="mt-0.5 size-4 shrink-0 text-muted-ink" aria-hidden="true" />}
                <span>
                  {meeting.provider || "To be confirmed"}
                  {meeting.location && !online && <span className="block text-muted-ink">{meeting.location}</span>}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium text-muted-ink">Type</dt>
              <dd className="mt-0.5 text-ink">{meeting.meetingType}</dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium text-muted-ink">Participants</dt>
              <dd className="mt-0.5 text-ink">{meeting.participants.length > 0 ? meeting.participants.join(", ") : "Not listed"}</dd>
            </div>
          </dl>

          {join && (
            <a href={join} target="_blank" rel="noopener noreferrer" className={`${joinLinkClass} mt-5`}>
              <Video className="size-3.5" aria-hidden="true" /> Join Meeting
            </a>
          )}
          {status === "REQUESTED" && (
            <p className="mt-5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-[13px] text-brand-gold-ink">
              This is your request. It is not a scheduled meeting until the host confirms a time.
            </p>
          )}
          {reminder && (
            <p className={`mt-4 text-[12px] ${reminder.tone === "bad" ? "text-danger" : "text-muted-ink"}`}>{reminder.text}</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-[15px] font-bold text-ink">Agenda</h2>
          <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-muted-ink">
            {meeting.agenda || "No agenda has been added."}
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-[15px] font-bold text-ink">Notes and outcome</h2>
          {meeting.notes === null ? (
            <p className="mt-2 text-[13px] text-muted-ink">
              Notes are shared after the host records this meeting as held. None have been recorded yet.
            </p>
          ) : (
            <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink">
              {meeting.notes || "The host recorded this meeting as held but did not add notes."}
            </p>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
