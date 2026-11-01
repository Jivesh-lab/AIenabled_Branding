import { MapPinIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/Surface";
import { dateTileParts } from "@/lib/formatDate";
import { formatClock } from "@/lib/dates";
import { isIsoDate, isUpcoming, joinUrl, statusTone, type Session } from "../../_lib/sessions";

/** One session as a compact row: date tile, title and status, project and time, and a Join link only when one exists. */
export default function SessionRow({ session, today }: { session: Session; today: string }) {
  const tile = isIsoDate(session.date) ? dateTileParts(session.date) : null;
  const link = isUpcoming(session, today) ? joinUrl(session) : undefined;
  const cancelled = session.status === "Cancelled";
  const online = !!joinUrl(session) || /video|online/i.test(session.provider ?? "");
  const place = joinUrl(session) ? "Online" : session.location || session.provider;
  const when = [
    session.startTime && formatClock(session.startTime),
    session.durationMinutes ? `${session.durationMinutes} min` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="flex flex-col gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-nav-hover sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-canvas py-1">
          {tile ? (
            <>
              <span className="text-[10px] font-medium uppercase leading-tight text-muted-ink">{tile.month}</span>
              <span className="text-[16px] font-bold leading-tight tabular-nums text-ink">{tile.day}</span>
            </>
          ) : (
            <span className="px-1 text-center text-[11px] font-medium leading-tight text-muted-ink">TBC</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className={cn("text-[14px] font-semibold leading-snug", cancelled ? "text-muted-ink line-through" : "text-ink")}>{session.title}</h3>
            <StatusBadge label={session.status} tone={statusTone(session.status)} />
          </div>

          <p className="mt-0.5 text-[12px] text-muted-ink">
            {session.project && <span className="font-medium text-brand-cyan-ink">{session.project}</span>}
            {session.project && when && " · "}
            {when && <span className="tabular-nums text-ink">{when}</span>}
            {session.meetingType && <> · {session.meetingType}</>}
          </p>

          {session.participants.length > 0 && (
            <p className="mt-0.5 truncate text-[12px] text-muted-ink">
              With <span className="font-medium text-ink">{session.participants.join(", ")}</span>
            </p>
          )}

          {(place || session.agenda) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-ink">
              {place && (
                <span className="inline-flex items-center gap-1">
                  {online ? <VideoCameraIcon className="size-3.5 shrink-0" aria-hidden="true" /> : <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />}
                  <span className="truncate">{place}</span>
                </span>
              )}
              {session.agenda && <span className="line-clamp-1">{session.agenda}</span>}
            </p>
          )}
        </div>
      </div>

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
        >
          <VideoCameraIcon className="size-3.5" aria-hidden="true" />
          Join
          <span className="sr-only">: {session.title}</span>
        </a>
      )}
    </article>
  );
}
