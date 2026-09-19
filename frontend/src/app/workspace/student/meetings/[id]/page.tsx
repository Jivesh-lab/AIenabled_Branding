import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, Video } from "lucide-react";
import { formatClock, formatDayLabel, formatLongDate } from "@/lib/dates";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  MEETING_TYPE_LABEL,
  MEETINGS,
  MOCK_NOW,
  STUDENT_MEETING_PERMISSIONS,
} from "@/mock/student-meetings";
import {
  hasEnded,
  isJoinable,
  MEETING_STATUS_LABEL,
  MEETING_STATUS_TONE,
  meetingStatus,
} from "../_lib/meetings";
import { joinLinkClass } from "../_components/MeetingListItem";
import MeetingNotesPanel from "./_components/MeetingNotesPanel";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return MEETINGS.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const meeting = MEETINGS.find((m) => m.id === id);
  return { title: meeting ? `${meeting.title} | Meetings | AAI–DBITIC` : "Meeting not found | AAI–DBITIC" };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[12px] font-medium text-muted-ink">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-ink">{children}</dd>
    </div>
  );
}

export default async function MeetingDetailPage({ params }: Params) {
  const { id } = await params;
  const meeting = MEETINGS.find((m) => m.id === id);
  if (!meeting) notFound();

  const status = meetingStatus(meeting);
  const ended = hasEnded(meeting) && status !== "CANCELLED";
  const joinable = isJoinable(meeting);
  const cancelled = status === "CANCELLED";

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <Link
          href="/workspace/student/meetings"
          className="inline-flex items-center gap-1.5 self-start rounded-md text-[13px] font-medium text-muted-ink transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All meetings
        </Link>

        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={MEETING_STATUS_LABEL[status]} tone={MEETING_STATUS_TONE[status]} />
              <span className="text-[13px] text-muted-ink">{MEETING_TYPE_LABEL[meeting.type]}</span>
            </div>
            <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-ink">{meeting.title}</h1>
            <Link
              href={`/student/projects/${meeting.projectId}`}
              className="mt-1 inline-block text-[14px] font-medium text-brand-cyan-ink hover:text-brand hover:underline"
            >
              {meeting.projectName}
            </Link>
            <p className="mt-2 flex items-center gap-1.5 text-[14px] text-ink">
              <CalendarClock className="size-4 shrink-0 text-muted-ink" aria-hidden="true" />
              {formatDayLabel(meeting.date, MOCK_NOW.date)} · {formatClock(meeting.startTime)} – {formatClock(meeting.endTime)}
            </p>
          </div>

          {joinable && (
            <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className={cn(joinLinkClass, "h-10 self-start px-4 text-[14px]")}>
              <Video className="size-4" aria-hidden="true" />
              Join Meeting
            </a>
          )}
        </header>

        {cancelled && (
          <div role="status" className="rounded-lg border border-line bg-white px-4 py-3 text-[14px] text-ink">
            <span className="font-semibold">This meeting was cancelled.</span>{" "}
            <span className="text-muted-ink">{meeting.cancellation?.reason}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:items-start">
          {/* Main */}
          <div className="flex min-w-0 flex-col gap-6">
            <Card className="p-5">
              <h2 className="text-[15px] font-semibold text-ink">Agenda</h2>
              <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-relaxed text-ink marker:font-medium marker:text-muted-ink">
                {meeting.agenda.map((point) => (
                  <li key={point} className="pl-1">
                    {point}
                  </li>
                ))}
              </ol>
            </Card>

            {ended && (
              <Card className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[15px] font-semibold text-ink">Meeting minutes</h2>
                  <span className="text-[12px] text-muted-ink">Recorded by {meeting.host.name}</span>
                </div>
                {meeting.minutes ? (
                  <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink">{meeting.minutes}</p>
                ) : (
                  <p className="mt-3 text-[13px] text-muted-ink">
                    Minutes haven&apos;t been recorded yet.
                    {!STUDENT_MEETING_PERMISSIONS.canRecordMinutes && " The host will add them after the meeting."}
                  </p>
                )}
              </Card>
            )}

            {!cancelled && <MeetingNotesPanel meeting={meeting} ended={ended} />}
          </div>

          {/* Details */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[84px]">
            <Card className="p-5">
              <h2 className="sr-only">Meeting details</h2>
              <dl className="flex flex-col divide-y divide-line">
                <DetailRow label="Date">{formatLongDate(meeting.date)}</DetailRow>
                <DetailRow label="Time">
                  {formatClock(meeting.startTime)} – {formatClock(meeting.endTime)}
                </DetailRow>
                <DetailRow label="Meeting type">{MEETING_TYPE_LABEL[meeting.type]}</DetailRow>
                <DetailRow label={meeting.meetingLink ? "Meeting link" : "Location"}>
                  {meeting.meetingLink ? (
                    joinable ? (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                      >
                        <Video className="size-3.5" aria-hidden="true" />
                        Join online
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-ink">
                        <Video className="size-3.5" aria-hidden="true" />
                        {ended || cancelled ? "Online meeting" : "Link available on the day"}
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-ink" aria-hidden="true" />
                      {meeting.location}
                    </span>
                  )}
                </DetailRow>
                {meeting.followUpDate && (
                  <DetailRow label="Follow-up">
                    {formatLongDate(meeting.followUpDate)}
                    <span className="block text-[12px] text-muted-ink">Set by host</span>
                  </DetailRow>
                )}
              </dl>
            </Card>

            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-ink">Participants</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {[meeting.host, ...meeting.participants.filter((p) => p.name !== meeting.host.name)].map((person, i) => (
                  <li key={person.name} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={
                        i === 0
                          ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-[11px] font-semibold text-white"
                          : "flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-[11px] font-semibold text-muted-ink"
                      }
                    >
                      {initialsOf(person.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{person.name}</p>
                      <p className="truncate text-[12px] text-muted-ink">{i === 0 ? `Host · ${person.role}` : person.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
