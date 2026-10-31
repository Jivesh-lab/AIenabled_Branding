import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { Card, ProgressBar, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { EmptyState } from "@/components/shared/loading/primitives";
import { dashboardPreview } from "@/lib/dashboardProjects";
import type { Journey } from "@/lib/journey";
import type { MentorResult } from "@/lib/mentorState";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/types/status";
import type { StudentProject } from "@/types/student-application";
import { MentorLine } from "../../_components/MentorCard";
import MilestoneProgress from "../../_components/MilestoneProgress";
import { projectHref } from "../../_lib/project-links";

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
  const { shown, total, hidden } = dashboardPreview(projects);
  const stageOf = new Map(journeys.map((j) => [j.projectId, j.stages.find((s) => s.id === j.currentStageId)]));

  return (
    <section aria-label="My projects">
      <SectionHeading title="My Projects" action={{ label: hidden > 0 ? `View all ${total}` : "View all", href: "/workspace/student/projects" }} />

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Submit your idea to start the review and incubation journey."
            action={{ label: "Submit New Idea", href: "/workspace/student/submit" }}
          />
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

                    <div className="mt-3 flex flex-col gap-1 text-[13px] sm:flex-row sm:flex-wrap sm:gap-x-6">
                      <MentorLine result={mentors?.[project.id]} />
                      {stage && (
                        <p className="min-w-0 truncate text-muted-ink">
                          <span className="font-medium text-ink">Stage:</span> {stage.label}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      {project.reviewStatus === "DRAFT" ? (
                        <>
                          <p className="mb-1 text-[12px] text-muted-ink">Submission complete</p>
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
          {hidden > 0 && (
            <p className="mt-3 text-[13px] text-muted-ink">
              Showing the {shown.length} that need the most attention.{" "}
              <Link href="/workspace/student/projects" className="font-semibold text-brand hover:underline">
                View all {total} projects
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
