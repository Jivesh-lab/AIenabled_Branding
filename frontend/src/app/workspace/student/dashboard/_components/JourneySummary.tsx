import Link from "next/link";
import { Card, ProgressBar, SectionHeading } from "@/components/shared/Surface";
import type { Journey } from "@/lib/journey";

/**
 * One line per project from the SAME journey model the Journey page uses, so the stage and percentage shown here
 * are always the ones on that page.
 */
export default function JourneySummary({ journeys }: { journeys: Journey[] }) {
  return (
    <section aria-label="Incubation journey">
      <SectionHeading title="Incubation Journey" action={{ label: "View timeline", href: "/workspace/student/journey" }} />
      <Card>
        {journeys.length === 0 ? (
          <p className="p-5 text-center text-xs text-muted-ink">Your journey starts once you save or submit an idea.</p>
        ) : (
          <ul className="divide-y divide-line">
            {journeys.map((j) => {
              const current = j.stages.find((s) => s.id === j.currentStageId);
              return (
                <li key={j.projectId} className="p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href="/workspace/student/journey" className="text-[14px] font-semibold text-ink hover:text-brand hover:underline">
                      {j.projectName}
                    </Link>
                    <span className="text-[12px] text-muted-ink">
                      {j.progress.done} of {j.progress.total} stages done
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={j.progress.percent} />
                  </div>
                  <p className="mt-2 text-[13px] text-muted-ink">
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
