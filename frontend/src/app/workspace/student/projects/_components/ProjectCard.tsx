import Link from "next/link";
import { AlertCircle, ArrowRight, CircleDot, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDue, formatUpdated, isDueSoon } from "@/lib/dates";
import { Card, MaturityTag, ProgressBar, StatusBadge } from "@/components/shared/Surface";
import {
  MATURITY_LABEL,
  PIPELINE_POSITION_LABEL,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_TONE,
  type ReviewStatus,
} from "@/types/status";
import { MOCK_TODAY, type StudentProject } from "@/mock/student-projects";

/** How the pipeline position reads next to each review status. */
const PIPELINE_PREFIX: Partial<Record<ReviewStatus, string>> = {
  SUBMITTED: "Awaiting",
  UNDER_REVIEW: "In",
  REVISION_REQUESTED: "Returned from",
  REJECTED: "Closed at",
};

function NextStep({ project }: { project: StudentProject }) {
  const { next, reviewStatus } = project;
  if (!next) return <span className="text-[13px] text-muted-ink">No pending actions</span>;

  const due = next.dueDate ? formatDue(next.dueDate, MOCK_TODAY) : null;
  const needsAttention =
    reviewStatus === "REVISION_REQUESTED" ||
    (next.kind === "action" && !!next.dueDate && isDueSoon(next.dueDate, MOCK_TODAY));

  const Icon = needsAttention ? AlertCircle : next.kind === "milestone" ? Flag : CircleDot;

  return (
    <p className="flex min-w-0 items-start gap-2 text-[13px]">
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          needsAttention ? "text-brand-gold" : next.kind === "milestone" ? "text-brand-cyan" : "text-icon"
        )}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="font-medium text-muted-ink">
          {next.kind === "milestone" ? "Next milestone:" : "Next:"}
        </span>{" "}
        <span className="text-ink">{next.label}</span>
        {due && (
          <span className={cn("ml-1.5 whitespace-nowrap", needsAttention ? "font-medium text-brand-gold-ink" : "text-muted-ink")}>
            · {due}
          </span>
        )}
      </span>
    </p>
  );
}

export default function ProjectCard({ project }: { project: StudentProject }) {
  const isDraft = project.reviewStatus === "DRAFT";
  const prefix = PIPELINE_PREFIX[project.reviewStatus];
  const primaryHref = isDraft ? "/workspace/student/submit" : `/workspace/student/projects/${project.id}`;

  return (
    <Card className="transition-colors duration-150 hover:border-brand-cyan/40">
      <article aria-labelledby={`project-${project.id}-name`}>
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          {/* Identity */}
          <div className="min-w-0">
            <h3 id={`project-${project.id}-name`} className="text-[16px] font-semibold leading-snug text-ink">
              {project.name}
            </h3>
            <p className="mt-0.5 text-[13px] font-medium text-brand-cyan-ink">{project.domain}</p>
            <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-muted-ink">{project.shortDescription}</p>

            {/* Review status and maturity are separate axes — rendered as separate elements */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge
                label={REVIEW_STATUS_LABEL[project.reviewStatus]}
                tone={REVIEW_STATUS_TONE[project.reviewStatus]}
              />
              <MaturityTag label={MATURITY_LABEL[project.maturity]} />
              {project.pipelinePosition && prefix && (
                <span className="text-[12px] text-muted-ink">
                  <span className="sr-only">Pipeline position: </span>
                  {prefix} {PIPELINE_POSITION_LABEL[project.pipelinePosition]}
                </span>
              )}
            </div>
          </div>

          {/* Progress & people */}
          <div className="flex flex-col gap-3 lg:border-l lg:border-line lg:pl-5">
            <ProgressBar value={project.progress} label={isDraft ? "Submission complete" : "Progress"} />
            <dl className="flex flex-col gap-1 text-[13px]">
              <div className="flex gap-1.5">
                <dt className="shrink-0 text-muted-ink">Faculty guide:</dt>
                <dd className={cn("min-w-0 truncate", project.facultyGuide ? "font-medium text-ink" : "text-muted-ink")}>
                  {project.facultyGuide ?? "Not yet assigned"}
                </dd>
              </div>
              <div className="text-muted-ink">
                <dt className="sr-only">Team and last update</dt>
                <dd>
                  {project.teamSize} team {project.teamSize === 1 ? "member" : "members"} · Updated{" "}
                  {formatUpdated(project.updatedAt, MOCK_TODAY)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Next step + action */}
        <div className="flex flex-col gap-3 border-t border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <NextStep project={project} />
          <Link
            href={primaryHref}
            aria-label={`${isDraft ? "Continue draft" : "Open project"}: ${project.name}`}
            className="group inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-brand transition-colors duration-150 hover:border-brand/40 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:self-auto"
          >
            {isDraft ? "Continue Draft" : "Open Project"}
            <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </Card>
  );
}
