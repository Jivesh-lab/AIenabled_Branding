import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, ProgressBar, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { dashboardPreview } from "@/lib/dashboardProjects";
import type { Journey } from "@/lib/journey";
import type { MentorResult } from "@/lib/mentorState";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/types/status";
import type { StudentProject } from "@/types/student-application";
import { MentorLine } from "../../_components/MentorCard";
import MilestoneProgress from "../../_components/MilestoneProgress";
import { projectHref } from "../../_lib/project-links";

const LAUNCH_STEPS = [
  { title: "Pitch your idea", detail: "Describe the problem, solution and team." },
  { title: "Screening and review", detail: "AI pre-screening, then faculty review." },
  { title: "Mentor allocation", detail: "Approved teams are matched with a mentor." },
] as const;

/**
 * Dashboard preview of the projects that most need attention (see lib/dashboardProjects.ts). The complete list,
 * with filters, is on My Projects; nothing is removed, only ordered and capped here.
 */
export default function MyProjects({
  projects,
  mentors,
  journeys,
}: {
  projects: StudentProject[];
  mentors?: Record<string, MentorResult>;
  journeys: Journey[];
}) {
  const { shown, total } = dashboardPreview(projects);
  const stageOf = new Map(journeys.map((j) => [j.projectId, j.stages.find((s) => s.id === j.currentStageId)]));

  return (
    <section aria-label="My projects">
      <SectionHeading title="My Projects" action={{ label: "View all", href: "/workspace/student/projects" }} />

      {projects.length === 0 ? (
        <Card className="p-6">
          <h3 className="text-[16px] font-semibold text-ink">Ready to turn your idea into a venture?</h3>
          <p className="mt-1 max-w-xl text-[13px] text-muted-ink">
            Submit a proposal to begin. Each stage below is tracked here once your idea is in.
          </p>
          <ol className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {LAUNCH_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-[12px] font-semibold text-ink">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">{step.title}</span>
                  <span className="mt-0.5 block text-[12px] text-muted-ink">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link
            href="/workspace/student/submit"
            className="mt-6 inline-flex h-9 items-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
          >
            Submit Proposal
          </Link>
        </Card>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {shown.map((project) => {
              const stage = stageOf.get(project.id);
              return (
                <li key={project.id}>
                  <Card interactive className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-[16px] font-semibold text-ink">{project.name}</h3>
                        <p className="mt-0.5 text-[13px] text-muted-ink">{project.domain || "Sector not set"}</p>
                      </div>
                      <StatusBadge label={REVIEW_STATUS_LABEL[project.reviewStatus]} tone={REVIEW_STATUS_TONE[project.reviewStatus]} />
                    </div>

                    <div className="mt-3 flex flex-col gap-1 text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                      <MentorLine result={mentors?.[project.id]} />
                      {stage && (
                        <p className="min-w-0 truncate text-muted-ink sm:border-l sm:border-line sm:pl-4">
                          <span className="font-medium text-ink">Stage:</span> {stage.label}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      {project.reviewStatus === "DRAFT" ? (
                        <>
                          <p className="mb-1 flex items-center justify-between text-[12px] text-muted-ink">
                            <span>Draft progress</span>
                            <span className="font-semibold tabular-nums text-ink">{project.progress}%</span>
                          </p>
                          <ProgressBar value={project.progress} />
                        </>
                      ) : (
                        <MilestoneProgress summary={project.milestones} status={project.reviewStatus} />
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
                      <p className="min-w-0 truncate text-[13px] text-ink">
                        <span className="font-medium text-muted-ink">Next:</span> {project.next?.label ?? "Nothing pending"}
                      </p>
                      <Link
                        href={projectHref(project)}
                        className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-md"
                      >
                        {project.reviewStatus === "DRAFT" ? "Continue draft" : "View project"}
                        <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-ink">
            <span>Showing {shown.length} of {total} {total === 1 ? "project" : "projects"}</span>
            <Link href="/workspace/student/projects" className="font-semibold text-brand hover:underline">
              View all projects →
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
