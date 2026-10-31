import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Card, ProgressBar, SectionHeading } from "@/components/shared/Surface";
import { EmptyState } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import type { Journey, StageState } from "@/lib/journey";

const DOT: Record<StageState, string> = {
  complete: "border-success bg-success text-white",
  current: "border-brand bg-brand text-white ring-4 ring-brand-soft",
  blocked: "border-brand-gold bg-brand-gold/20 text-brand-gold-ink ring-4 ring-brand-gold/15",
  upcoming: "border-line bg-white text-muted-ink",
  closed: "border-line bg-canvas text-muted-ink",
};
const LABEL: Record<StageState, string> = {
  complete: "text-ink",
  current: "font-semibold text-brand",
  blocked: "font-semibold text-brand-gold-ink",
  upcoming: "text-muted-ink",
  closed: "text-muted-ink",
};
const STATE_WORD: Record<StageState, string> = { complete: "done", current: "in progress", blocked: "needs attention", upcoming: "upcoming", closed: "closed" };

/**
 * A horizontal journey per project from the SAME model the Journey page uses, so the stage states and the
 * percentage are always the ones on that page. A stage is "done" only if its saved record says so.
 */
export default function JourneySummary({ journeys }: { journeys: Journey[] }) {
  return (
    <section aria-label="Incubation journey">
      <SectionHeading title="Incubation Journey" action={{ label: "View timeline", href: "/workspace/student/journey" }} />
      <Card>
        {journeys.length === 0 ? (
          <EmptyState title="Your journey starts with an idea" description="It appears here once you save or submit a project." action={{ label: "Submit an idea", href: "/workspace/student/submit" }} />
        ) : (
          <ul className="divide-y divide-line">
            {journeys.map((j) => {
              const current = j.stages.find((s) => s.id === j.currentStageId);
              return (
                <li key={j.projectId} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                    <Link href="/workspace/student/journey" className="min-w-0 truncate text-[15px] font-semibold text-ink hover:text-brand hover:underline">
                      {j.projectName}
                    </Link>
                    <div className="w-full sm:w-52">
                      <ProgressBar value={j.progress.percent} label={`${j.progress.done} of ${j.progress.total} stages`} />
                    </div>
                  </div>

                  <ol className="mt-4 flex items-start gap-0 overflow-x-auto pb-1" aria-label={`${j.projectName} journey stages`}>
                    {j.stages.map((stage, i) => (
                      <li key={stage.id} className="relative flex min-w-[104px] flex-1 flex-col items-center px-1 text-center" aria-current={stage.id === j.currentStageId ? "step" : undefined}>
                        {i > 0 && <span aria-hidden="true" className={cn("absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2", j.stages[i - 1].state === "complete" ? "bg-success" : "bg-line")} />}
                        <span className={cn("relative z-10 flex size-6 items-center justify-center rounded-full border-2 text-[11px]", DOT[stage.state])}>
                          {stage.state === "complete" ? <Check className="size-3.5" aria-hidden="true" /> : stage.state === "closed" ? <Minus className="size-3.5" aria-hidden="true" /> : i + 1}
                        </span>
                        <span className={cn("mt-2 text-[12px] leading-tight", LABEL[stage.state])}>{stage.label}</span>
                        <span className="sr-only">{STATE_WORD[stage.state]}</span>
                      </li>
                    ))}
                  </ol>

                  <p className="mt-3 text-[13px] text-muted-ink">
                    {current ? (
                      <>
                        <span className="font-medium text-ink">{current.label}:</span> {current.detail}
                      </>
                    ) : j.progress.done === j.progress.total ? (
                      "All stages complete."
                    ) : (
                      "No active stage."
                    )}
                  </p>
                  {j.blockers.length > 0 && (
                    <p className="mt-1 text-[12px] font-medium text-brand-gold-ink">
                      {j.blockers.length} {j.blockers.length === 1 ? "blocker" : "blockers"}: {j.blockers[0].label}
                      {j.blockers.length > 1 ? ` (+${j.blockers.length - 1} more)` : ""}
                    </p>
                  )}
                  {j.missing.length > 0 && <p className="mt-1 text-[12px] text-muted-ink">Some information was unavailable and is not counted.</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
