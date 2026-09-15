import Link from "next/link";
import { AlertCircle, ArrowRight, CircleDot, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDue, isDueSoon } from "@/lib/dates";
import { Card, MaturityTag, StatusBadge } from "@/components/shared/Surface";
import {
  MATURITY_LABEL,
  PIPELINE_POSITION_LABEL,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_TONE,
} from "@/types/status";
import { MOCK_TODAY, type StudentProject } from "@/mock/student-projects";

const primaryLink =
  "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1";
const secondaryLink =
  "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-brand transition-colors duration-150 hover:border-brand/40 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/**
 * The three status fields shown as three separate facts, followed by the next
 * action. Sits beside the current stage so "where am I" and "what do I do
 * next" are read together.
 */
export default function PositionPanel({ project }: { project: StudentProject }) {
  const isDraft = project.reviewStatus === "DRAFT";
  const isRevision = project.reviewStatus === "REVISION_REQUESTED";
  const next = project.next;
  const urgent =
    isRevision || (!!next?.dueDate && next.kind === "action" && isDueSoon(next.dueDate, MOCK_TODAY));
  const NextIcon = urgent ? AlertCircle : next?.kind === "milestone" ? Flag : CircleDot;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <h2 className="text-[14px] font-semibold text-ink">Current position</h2>
        <dl className="mt-3 flex flex-col divide-y divide-line">
          <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
            <dt className="text-[13px] text-muted-ink">Review status</dt>
            <dd>
              <StatusBadge
                label={REVIEW_STATUS_LABEL[project.reviewStatus]}
                tone={REVIEW_STATUS_TONE[project.reviewStatus]}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-[13px] text-muted-ink">Pipeline position</dt>
            <dd className="text-right text-[13px] font-medium text-ink">
              {project.pipelinePosition ? (
                PIPELINE_POSITION_LABEL[project.pipelinePosition]
              ) : (
                <span className="font-normal text-muted-ink">{isDraft ? "Not submitted" : "Review complete"}</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
            <dt className="text-[13px] text-muted-ink">Maturity</dt>
            <dd>
              <MaturityTag label={MATURITY_LABEL[project.maturity]} />
            </dd>
          </div>
        </dl>
      </Card>

      <Card className={cn("p-5", isRevision && "border-brand-gold/50")}>
        <h2 className="text-[14px] font-semibold text-ink">Next action</h2>

        {next ? (
          <div className="mt-3 flex items-start gap-2.5">
            <NextIcon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                urgent ? "text-brand-gold" : next.kind === "milestone" ? "text-brand-cyan" : "text-icon"
              )}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-[14px] font-medium leading-snug text-ink">{next.label}</p>
              {next.dueDate && (
                <p className={cn("mt-0.5 text-[12px]", urgent ? "font-medium text-brand-gold-ink" : "text-muted-ink")}>
                  {formatDue(next.dueDate, MOCK_TODAY)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-muted-ink">Nothing needs your attention right now.</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {isRevision && (
            <Link href={`/student/projects/${project.id}#feedback`} className={primaryLink}>
              View Feedback
            </Link>
          )}
          <Link
            href={isDraft ? "/student/submit" : `/student/projects/${project.id}`}
            className={isRevision ? secondaryLink : primaryLink}
          >
            {isDraft ? "Continue Draft" : "Open Project"}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
