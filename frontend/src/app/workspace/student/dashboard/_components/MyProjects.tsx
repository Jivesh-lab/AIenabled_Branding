import Link from "next/link";
import { CalendarClock, UserRound } from "lucide-react";
import { ProgressBar, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { PROJECTS } from "@/mock/student-dashboard";

/**
 * Student Dashboard — Active Project Ledger.
 * Clear architectural roster with milestone timelines, plain language, and zero trailing arrows.
 */
export default function MyProjects() {
  return (
    <section aria-label="Active projects ledger">
      <SectionHeading
        title="Active Projects"
        action={{ label: "View all projects", href: "/workspace/student/projects" }}
      />

      <div className="divide-y divide-line rounded-lg border border-line bg-white">
        {PROJECTS.map((project) => (
          <article
            key={project.id}
            className="p-5 transition-colors hover:bg-[#FAFBFB]"
          >
            {/* Identity and Stage */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[16px] font-semibold text-ink">
                    {project.name}
                  </h3>
                  <StatusBadge label={project.stage} tone={project.stageTone} />
                </div>
                <p className="mt-1 text-[13px] text-muted-ink">
                  {project.domain}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[13px] text-muted-ink">
                <UserRound className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Advisor: <strong className="font-medium text-ink">{project.mentor}</strong></span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <ProgressBar value={project.progress} label="Incubation Progress" />
            </div>

            {/* Next Milestone & Action */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                <span className="text-muted-ink">
                  Upcoming deliverable: <span className="font-medium text-ink">{project.nextMilestone}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-muted-ink">
                  <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                  Due {project.dueDate}
                </span>
              </div>

              <Link
                href={project.href}
                className="text-[13px] font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                Open project details
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
