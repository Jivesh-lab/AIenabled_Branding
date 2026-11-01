"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, UserIcon } from "@heroicons/react/24/outline";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { formatClock } from "@/lib/dates";
import { formatShortDate } from "@/lib/formatDate";
import { isIsoDate, statusTone, type Session } from "../../_lib/sessions";
import { isAwaitingNotes } from "./summaries";

const PREVIEW_CHARS = 280;

/**
 * One session with the notes the host recorded for it, exactly as written. Nothing is generated: a session without
 * notes says so, and a long note can be expanded.
 */
export default function SummaryCard({ session, today }: { session: Session; today: string }) {
  const [expanded, setExpanded] = useState(false);
  const notesId = useId();
  const notes = session.notes;
  const long = (notes?.length ?? 0) > PREVIEW_CHARS;
  const shown = notes && long && !expanded ? `${notes.slice(0, PREVIEW_CHARS).trimEnd()}…` : notes;
  const when = [isIsoDate(session.date) ? formatShortDate(session.date) : "Date to be confirmed", session.startTime && formatClock(session.startTime)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">{session.project || session.title}</h3>
            <StatusBadge label={session.status} tone={statusTone(session.status)} />
          </div>
          {session.project && <p className="mt-0.5 text-[13px] text-muted-ink">{session.title}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-ink">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
              {when}
            </span>
            {session.participants.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <UserIcon className="size-3.5" aria-hidden="true" />
                {session.participants.join(", ")}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/workspace/mentor/schedule"
          className="inline-flex h-8 shrink-0 items-center self-start rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Session details
        </Link>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-canvas/60 p-3.5">
        <h4 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-ink">Recorded notes</h4>
        {notes ? (
          <>
            <p id={notesId} className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink">
              {shown}
            </p>
            {long && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={notesId}
                className="mt-1.5 rounded text-[13px] font-semibold text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </>
        ) : (
          <p className="mt-1.5 text-[13px] text-muted-ink">
            {isAwaitingNotes(session, today) ? "This session has been held, but no notes have been recorded yet." : "Notes can be recorded once the session has taken place."}
          </p>
        )}
      </div>
    </Card>
  );
}
