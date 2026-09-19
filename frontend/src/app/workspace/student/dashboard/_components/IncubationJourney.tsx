import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { JOURNEY_STAGES, type JourneyStage } from "@/mock/student-dashboard";

/**
 * Incubation Journey — horizontal stepper on desktop, vertical timeline on
 * mobile. Completed #00B4D8 · current #023EBA · upcoming #D8EAF0.
 *
 * The two orientations are rendered as separate markup rather than one
 * contorted layout; each stays simple and neither needs JS.
 */

const DOT: Record<JourneyStage["state"], string> = {
  complete: "border-brand-cyan bg-brand-cyan",
  current: "border-brand bg-brand ring-4 ring-brand-cyan-soft",
  upcoming: "border-line bg-white",
};

const LABEL: Record<JourneyStage["state"], string> = {
  complete: "text-ink",
  current: "font-semibold text-brand",
  upcoming: "text-muted-ink",
};

/** A connector is filled once the journey has reached past it. */
function connectorClass(filled: boolean) {
  return cn("h-0.5 flex-1", filled ? "bg-brand-cyan" : "bg-line");
}

export default function IncubationJourney() {
  const currentIndex = JOURNEY_STAGES.findIndex((s) => s.state === "current");

  return (
    <section aria-label="Incubation journey">
      <SectionHeading title="Incubation Journey" action={{ label: "View timeline", href: "/workspace/student/journey" }} />

      <Card className="p-5 sm:p-6">
        {/* Desktop — horizontal stepper */}
        <ol className="hidden items-start md:flex">
          {JOURNEY_STAGES.map((stage, i) => (
            <li key={stage.id} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span aria-hidden="true" className={cn(connectorClass(i <= currentIndex), i === 0 && "invisible")} />
                <span
                  aria-hidden="true"
                  className={cn("size-3 shrink-0 rounded-full border-2", DOT[stage.state])}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    connectorClass(i < currentIndex),
                    i === JOURNEY_STAGES.length - 1 && "invisible"
                  )}
                />
              </div>
              <span className={cn("mt-2.5 px-1 text-center text-[11px] leading-tight", LABEL[stage.state])}>
                {stage.label}
              </span>
            </li>
          ))}
        </ol>

        {/* Mobile — vertical timeline */}
        <ol className="flex flex-col md:hidden">
          {JOURNEY_STAGES.map((stage, i) => (
            <li key={stage.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={cn("size-3 shrink-0 rounded-full border-2", DOT[stage.state])}
                />
                {i < JOURNEY_STAGES.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn("w-0.5 flex-1", i < currentIndex ? "bg-brand-cyan" : "bg-line")}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[13px] leading-none",
                  LABEL[stage.state],
                  i < JOURNEY_STAGES.length - 1 && "pb-5"
                )}
              >
                {stage.label}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
