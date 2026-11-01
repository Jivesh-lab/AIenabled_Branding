"use client";

import Link from "next/link";
import { VideoCameraIcon } from "@heroicons/react/24/outline";
import { cleanName } from "@/lib/displayName";
import { dateTileParts } from "@/lib/formatDate";
import { useApiList } from "@/lib/useApiList";
import PanelCard, { PanelMessage } from "@/components/shared/PanelCard";
import { PanelRowsSkeleton } from "./DashboardSkeleton";

interface SessionItem {
  id: string;
  startup: string;
  topic: string;
  date?: string;
  time: string;
  link?: string;
}

interface MeetingRecord {
  id?: string;
  _id?: string;
  studentLead?: string;
  projectTitle?: string;
  agenda?: string;
  date?: string;
  time?: string;
  meetingLink?: string;
  invitationStatus?: string;
}

const PREVIEW = 3;

function toItems(records: unknown[]): SessionItem[] {
  return (records as MeetingRecord[])
    .filter((m) => m.invitationStatus !== "Completed")
    .map((m, i) => ({
      id: m.id || m._id || `session-${i}`,
      startup: cleanName(m.studentLead || m.projectTitle || "Researcher project"),
      topic: m.agenda || "Advisory mentorship review",
      date: m.date,
      time: m.time || "Time to be confirmed",
      link: m.meetingLink,
    }));
}

const actionClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export default function UpcomingSessions() {
  const { items, loading, failed, reload } = useApiList("/api/faculty/meetings", toItems);

  return (
    <PanelCard title="Upcoming Sessions" action={{ label: "Calendar", href: "/workspace/mentor/schedule" }}>
      {loading ? (
        <PanelRowsSkeleton rows={3} tile />
      ) : failed ? (
        <PanelMessage onRetry={() => void reload()}>We couldn&apos;t load your sessions right now.</PanelMessage>
      ) : items.length === 0 ? (
        <PanelMessage>No mentoring sessions are scheduled.</PanelMessage>
      ) : (
        <ul className="divide-y divide-line">
          {items.slice(0, PREVIEW).map((session) => {
            const tile = dateTileParts(session.date);
            return (
              <li key={session.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-canvas py-1" aria-hidden={!tile}>
                  {tile ? (
                    <>
                      <span className="text-[10px] font-medium uppercase leading-tight text-muted-ink">{tile.month}</span>
                      <span className="text-[16px] font-bold leading-tight tabular-nums text-ink">{tile.day}</span>
                    </>
                  ) : (
                    <span className="px-1 text-[11px] font-medium text-muted-ink">TBC</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold leading-snug text-ink">{session.startup}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted-ink">{session.topic}</span>
                  <span className="mt-0.5 block text-[12px] tabular-nums text-muted-ink">{session.time}</span>
                </span>
                {session.link ? (
                  <a
                    href={session.link}
                    target="_blank"
                    rel="noreferrer"
                    className={`${actionClass} bg-brand text-white hover:bg-brand-hover`}
                  >
                    <VideoCameraIcon className="size-3.5" aria-hidden="true" />
                    Join
                  </a>
                ) : (
                  <Link href="/workspace/mentor/schedule" className={`${actionClass} border border-line bg-white text-ink hover:bg-nav-hover`}>
                    View
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
