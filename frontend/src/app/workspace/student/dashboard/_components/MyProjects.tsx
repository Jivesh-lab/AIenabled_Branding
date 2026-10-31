import Link from "next/link";
import { ArrowRight, FolderKanban, Plus, Loader2 } from "lucide-react";
import { Card, ProgressBar, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/types/status";
import type { StudentProject } from "@/types/student-application";
import type { MentorResult } from "@/lib/mentorState";
import { MentorLine } from "../../_components/MentorCard";
import MilestoneProgress from "../../_components/MilestoneProgress";
import { projectHref } from "../../_lib/project-links";

export default function MyProjects({
  projects = [],
  loading = false,
  mentors,
}: {
  projects?: StudentProject[];
  loading?: boolean;
  mentors?: Record<string, MentorResult>;
}) {
  return (
    <section aria-label="My projects">
      <SectionHeading title="My Projects" action={{ label: "View all", href: "/workspace/student/projects" }} />

      {loading ? (
        <Card className="p-8 flex items-center justify-center text-muted-ink">
          <Loader2 className="size-5 animate-spin mr-2" />
          <span className="text-xs">Loading projects...</span>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-line">
          <FolderKanban className="size-8 text-muted-ink/40 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-ink">No projects yet</h3>
          <p className="text-xs text-muted-ink mt-1 max-w-sm mx-auto">
            Submit your innovative idea to begin institutional and mentor incubation review.
          </p>
          <Link
            href="/workspace/student/submit"
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
          >
            <Plus className="size-3.5" /> Submit New Idea
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            <Card key={project.id} interactive className="p-5">
              {/* Identity */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-semibold text-ink">{project.name}</h3>
                  <p className="mt-1 text-[13px] text-muted-ink">{project.domain || "—"}</p>
                </div>
                <StatusBadge
                  label={REVIEW_STATUS_LABEL[project.reviewStatus]}
                  tone={REVIEW_STATUS_TONE[project.reviewStatus]}
                />
              </div>

              <p className="mt-2 text-[13px]">
                <MentorLine result={mentors?.[project.id]} />
              </p>

              {/* Draft: how complete the submission is. Otherwise: persisted milestone progress. */}
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

              {/* What is next */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
                <p className="min-w-0 truncate text-[13px] text-ink">
                  <span className="font-medium text-muted-ink">Next:</span> {project.next?.label ?? "Nothing pending"}
                </p>

                <Link
                  href={projectHref(project)}
                  className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand transition-colors duration-150 hover:text-brand-cyan"
                >
                  {project.reviewStatus === "DRAFT" ? "Continue draft" : "View"}
                  <ArrowRight
                    className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
