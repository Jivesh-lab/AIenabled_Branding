import Link from "next/link";
import { ArrowRight, CalendarClock, UserRound, FolderKanban, Plus, Loader2 } from "lucide-react";
import { Card, ProgressBar, SectionHeading, StatusBadge } from "@/components/shared/Surface";

export default function MyProjects({ projects = [], loading = false }: { projects?: any[]; loading?: boolean }) {
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
          <h3 className="text-sm font-semibold text-ink">No active projects yet</h3>
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
          {projects.map((project: any) => {
            const id = project.id || project._id;
            const name = project.title || project.name || "Untitled Project";
            const domain = project.domain || "Deep Tech";
            const mentor = project.mentor || "Mentor TBD";
            const stage = project.stage || "Under Review";
            const progress = project.progress ?? (project.readiness_score || 25);
            const nextMilestone = project.nextMilestone || "Faculty Vetting";
            const dueDate = project.dueDate || "Pending";

            return (
              <Card key={id} interactive className="p-5">
                {/* Identity */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-[16px] font-semibold text-ink">{name}</h3>
                    <p className="mt-1 text-[13px] text-muted-ink">{domain}</p>
                  </div>
                  <StatusBadge
                    label={stage}
                    tone={stage === "Incubated" ? "success" : stage === "In Review" ? "progress" : "info"}
                  />
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-ink">
                  <UserRound className="size-3.5 shrink-0 text-brand-cyan" aria-hidden="true" />
                  Mentor: <span className="font-medium text-ink">{mentor}</span>
                </p>

                {/* Progress */}
                <div className="mt-4">
                  <ProgressBar progress={progress} />
                </div>

                {/* What is next */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-ink">
                      <span className="font-medium text-muted-ink">Next:</span> {nextMilestone}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-ink">
                      <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                      Due {dueDate}
                    </p>
                  </div>

                  <Link
                    href={`/workspace/student/projects/${id}`}
                    className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand transition-colors duration-150 hover:text-brand-cyan"
                  >
                    View
                    <ArrowRight
                      className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
