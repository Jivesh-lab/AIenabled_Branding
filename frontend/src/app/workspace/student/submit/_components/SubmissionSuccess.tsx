import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { PIPELINE_POSITION_LABEL, REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/types/status";

/**
 * Shown after a successful submission. Review status and pipeline position are
 * rendered as two separate facts — they are separate fields (§15.2).
 */
export default function SubmissionSuccess({
  ideaName,
  referenceId,
  onSubmitAnother,
}: {
  ideaName: string;
  referenceId: string;
  onSubmitAnother: () => void;
}) {
  return (
    <Card className="px-6 py-10 text-center sm:px-10">
      <CheckCircle2 className="mx-auto size-10 text-success" strokeWidth={1.75} aria-hidden="true" />

      <h2 className="mt-4 text-[22px] font-bold tracking-tight text-ink">Your idea has been submitted.</h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-ink">
        <span className="font-medium text-ink">{ideaName}</span> is now in the AAI–DBITIC review pipeline.
        You&apos;ll be notified when a reviewer responds.
      </p>

      <dl className="mx-auto mt-6 grid max-w-md grid-cols-1 divide-y divide-line rounded-lg border border-line text-left sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3">
          <dt className="text-[12px] font-medium text-muted-ink">Review status</dt>
          <dd className="mt-1.5">
            <StatusBadge label={REVIEW_STATUS_LABEL.SUBMITTED} tone={REVIEW_STATUS_TONE.SUBMITTED} />
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[12px] font-medium text-muted-ink">Pipeline</dt>
          <dd className="mt-1.5 text-[14px] font-medium text-ink">
            Awaiting {PIPELINE_POSITION_LABEL.FACULTY_REVIEW}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[12px] text-muted-ink">
        Reference <span className="font-mono text-ink">{referenceId}</span>
      </p>

      <div className="mt-8 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onSubmitAnother}
          className="inline-flex h-10 items-center rounded-lg px-4 text-[14px] font-medium text-brand transition-colors duration-150 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Submit another idea
        </button>
        <Link
          href="/workspace/student/projects"
          className="inline-flex h-10 items-center rounded-lg bg-brand px-5 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
        >
          View My Projects
        </Link>
      </div>
    </Card>
  );
}
