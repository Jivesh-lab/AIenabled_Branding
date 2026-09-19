import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEntry } from "../_lib/journey";
import StageMarker, { STATE_LABEL } from "./StageMarker";

const TITLE_TONE: Partial<Record<TimelineEntry["state"], string>> = {
  revision: "text-brand-gold-ink",
  rejected: "text-danger",
  approved: "text-success",
  current: "text-brand",
  upcoming: "text-muted-ink",
};

/**
 * Vertical journey timeline: marker → title → date/context → description → action.
 * A thin neutral rule connects the markers; the markers carry all the colour.
 */
export default function JourneyTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol>
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1;
        const isFuture = entry.state === "upcoming";

        return (
          <li key={entry.id} className="flex gap-4">
            {/* Marker + connecting rule */}
            <div className="flex flex-col items-center">
              <StageMarker state={entry.state} />
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn("my-1 w-px flex-1", isFuture ? "border-l border-dashed border-line bg-transparent" : "bg-line")}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn("min-w-0 flex-1", !isLast && "pb-7")}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 className={cn("text-[14px] font-semibold leading-6", TITLE_TONE[entry.state] ?? "text-ink")}>
                  {entry.title}
                </h3>
                <span className="sr-only">({STATE_LABEL[entry.state]})</span>
                {entry.score !== undefined && (
                  <span className="rounded-md border border-line bg-canvas px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink">
                    Score {entry.score}/100
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-ink">{entry.meta}</p>
              <p className={cn("mt-1 max-w-prose text-[13px] leading-relaxed", isFuture ? "text-muted-ink" : "text-ink/80")}>
                {entry.description}
              </p>

              {entry.action && (
                <Link
                  href={entry.action.href}
                  className="group mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand transition-colors duration-150 hover:text-brand-hover focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  {entry.action.label}
                  <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
