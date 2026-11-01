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
 * Dashboard preview of the active projects that most need attention.
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
  const { shown, total } = dashboardPreview(projects || []);
  const stageOf = new Map((journeys || []).map((j) => [j.projectId, j.stages.find((s) => s.id === j.currentStageId)]));

  return (
    <section aria-label="Active projects ledger">
      <SectionHeading
        title="Active Projects"
        action={{ label: "View all projects", href: "/workspace/student/projects" }}
      />

      {(!projects || projects.length === 0) ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No projects submitted yet"
            description="Submit your innovation idea to start the review and incubation advisory journey."
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
                  <Card interactive className="p-5 border border-line bg-white">
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
                          <p className="mb-1 text-[12px] text-muted-ink">Submission progress</p>
                          <ProgressBar value={project.progress} />
                        </>
                      ) : (
                        <MilestoneProgress summary={project.milestones} status={project.reviewStatus} />
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line/60 pt-3">
                      <p className="min-w-0 truncate text-[13px] text-ink">
                        <span className="font-medium text-muted-ink">Next step:</span> {project.next?.label ?? "Nothing pending"}
                      </p>
                      <Link
                        href={projectHref(project)}
                        className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        {project.reviewStatus === "DRAFT" ? "Continue draft" : "View project"}
                        <ArrowRight className="size-3" aria-hidden="true" />
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-ink">
            <span>Showing {shown.length} of {total} {total === 1 ? "project" : "projects"}</span>
            <Link href="/workspace/student/projects" className="font-medium text-brand hover:underline">
              View all projects
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
