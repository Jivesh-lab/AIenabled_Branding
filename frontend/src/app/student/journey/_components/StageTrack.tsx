import { cn } from "@/lib/utils";
import type { TrackStage } from "../_lib/journey";
import StageMarker, { STATE_LABEL } from "./StageMarker";

const LABEL_TONE: Record<TrackStage["state"], string> = {
  complete: "text-ink",
  approved: "font-semibold text-success",
  current: "font-semibold text-brand",
  revision: "font-semibold text-brand-gold-ink",
  rejected: "font-semibold text-danger",
  upcoming: "text-muted-ink",
  closed: "text-muted-ink/70 line-through decoration-line",
};

/** A connector is solid once the track has moved past it. */
function isReached(state: TrackStage["state"]) {
  return state === "complete" || state === "approved";
}

/**
 * Compact stage track. Horizontal from `md` up, a vertical list below it.
 * Two explicit layouts rather than one that fights itself at breakpoints.
 */
export default function StageTrack({ title, stages }: { title: string; stages: TrackStage[] }) {
  return (
    <div>
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-ink">{title}</h3>

      {/* md+ — horizontal */}
      <ol className="hidden items-start md:flex">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                aria-hidden="true"
                className={cn("h-0.5 flex-1", i === 0 ? "invisible" : isReached(stages[i - 1].state) ? "bg-brand" : "bg-line")}
              />
              <StageMarker state={stage.state} size="sm" />
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 flex-1",
                  i === stages.length - 1 ? "invisible" : isReached(stage.state) ? "bg-brand" : "bg-line"
                )}
              />
            </div>
            <span className={cn("mt-2 px-1 text-center text-[12px] leading-tight", LABEL_TONE[stage.state])}>
              {stage.label}
              <span className="sr-only"> — {STATE_LABEL[stage.state]}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* below md — vertical */}
      <ol className="flex flex-col gap-2.5 md:hidden">
        {stages.map((stage) => (
          <li key={stage.id} className="flex items-center gap-3">
            <StageMarker state={stage.state} size="sm" />
            <span className={cn("text-[13px]", LABEL_TONE[stage.state])}>
              {stage.label}
              <span className="sr-only"> — {STATE_LABEL[stage.state]}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
