"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, CircleDashed, Lock, Minus } from "lucide-react";
import { Card, ProgressBar, StatusBadge } from "@/components/shared/Surface";
import { cn } from "@/lib/utils";
import { PROGRESS_RULE, type Journey, type JourneyStage, type MissingSource, type StageState } from "@/lib/journey";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE, type ReviewStatus } from "@/types/status";

const STATE_LABEL: Record<StageState, string> = {
  complete: "Done",
  current: "In progress",
  upcoming: "Upcoming",
  blocked: "Needs attention",
  closed: "Closed",
};

const MISSING_LABEL: Record<MissingSource, string> = {
  mentor: "mentor status",
  tasks: "tasks",
  meetings: "meetings",
  monitoring: "monitoring check",
};

function Marker({ state }: { state: StageState }) {
  const base = "flex size-7 shrink-0 items-center justify-center rounded-full border-2";
  switch (state) {
    case "complete":
      return <span className={cn(base, "border-emerald-500 bg-emerald-500 text-white")}><Check className="size-4" aria-hidden="true" /></span>;
    case "current":
      return <span className={cn(base, "border-brand bg-brand-cyan-soft text-brand")}><CircleDashed className="size-4" aria-hidden="true" /></span>;
    case "blocked":
      return <span className={cn(base, "border-brand-gold bg-brand-gold/15 text-brand-gold-ink")}><AlertTriangle className="size-4" aria-hidden="true" /></span>;
    case "closed":
      return <span className={cn(base, "border-line bg-canvas text-muted-ink")}><Minus className="size-4" aria-hidden="true" /></span>;
    default:
      return <span className={cn(base, "border-line bg-white text-muted-ink")}><Lock className="size-3.5" aria-hidden="true" /></span>;
  }
}

function Stage({ stage, isCurrent }: { stage: JourneyStage; isCurrent: boolean }) {
  const body = (
    <div className={cn("min-w-0 flex-1 rounded-lg px-3 py-2", isCurrent && "bg-brand-cyan-soft/40")}>
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn("text-[14px] font-semibold", stage.state === "upcoming" || stage.state === "closed" ? "text-muted-ink" : "text-ink")}>{stage.label}</p>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-ink">{STATE_LABEL[stage.state]}</span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted-ink">{stage.detail}</p>
    </div>
  );
  return (
    <li className="flex gap-3" aria-current={isCurrent ? "step" : undefined}>
      <Marker state={stage.state} />
      {stage.href ? (
        <Link href={stage.href} className="min-w-0 flex-1 rounded-lg hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

/** One project's journey. Everything shown comes from the journey model; nothing is computed here. */
export default function JourneyBoard({ journey, status }: { journey: Journey; status: ReviewStatus }) {
  const router = useRouter();
  const { progress } = journey;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-bold text-ink">{journey.projectName}</h2>
          <div className="mt-1.5 flex items-center gap-2">
            <StatusBadge label={REVIEW_STATUS_LABEL[status]} tone={REVIEW_STATUS_TONE[status]} />
            <Link href={`/workspace/student/projects/${encodeURIComponent(journey.projectId)}`} className="text-[13px] font-medium text-brand hover:underline">
              Open project
            </Link>
          </div>
        </div>
        <div className="w-full sm:w-56">
          <ProgressBar value={progress.percent} label={`Journey progress · ${progress.done} of ${progress.total} stages`} />
          <p className="mt-1 text-[11px] leading-snug text-muted-ink">{PROGRESS_RULE}</p>
        </div>
      </div>

      {journey.missing.length > 0 && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas px-3 py-2 text-[13px] text-muted-ink">
          <span>
            Could not load: <strong className="text-ink">{journey.missing.map((m) => MISSING_LABEL[m]).join(", ")}</strong>. These are not counted as done or as empty.
          </span>
          <button type="button" onClick={() => router.refresh()} className="rounded-md bg-brand px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-brand-hover">
            Try again
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ol className="flex flex-col gap-3" aria-label="Journey stages">
          {journey.stages.map((stage) => (
            <Stage key={stage.id} stage={stage} isCurrent={stage.id === journey.currentStageId} />
          ))}
        </ol>

        <div className="flex flex-col gap-5">
          <section aria-label="Blockers">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-ink">Blockers</h3>
            {journey.blockers.length === 0 ? (
              <p className="mt-1.5 text-[13px] text-muted-ink">No blockers recorded.</p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {journey.blockers.map((b) => (
                  <li key={b.id}>
                    <Link href={b.href} className="flex items-start gap-2 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-[13px] text-brand-gold-ink hover:bg-brand-gold/20">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {b.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Next actions">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-ink">Next actions</h3>
            {journey.actions.length === 0 ? (
              <p className="mt-1.5 text-[13px] text-muted-ink">Nothing to do right now.</p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {journey.actions.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={a.href}
                      className={cn(
                        "group flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[13px] hover:bg-nav-hover",
                        a.urgent ? "border-brand-gold/50 font-medium text-ink" : "border-line text-ink",
                      )}
                    >
                      <span className="min-w-0">{a.label}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Card>
  );
}
