import Link from "next/link";
import { ArrowRight, CalendarClock, UserRound } from "lucide-react";
import { Card, ProgressBar, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { PROJECTS } from "@/mock/student-dashboard";

/**
 * The primary section of the dashboard. Each card answers the four questions a
 * student actually has: where am I, what stage, what is next, when is it due.
 *
 * The section heading sits outside the cards so projects are not cards nested
 * inside another card.
 */
export default function MyProjects() {
  return (
    <section aria-label="My projects">
      <SectionHeading title="My Projects" action={{ label: "View all", href: "/student/projects/1" }} />

      <div className="flex flex-col gap-4">
        {PROJECTS.map((project) => (
          <Card key={project.id} interactive className="p-5">
            {/* Identity */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-[16px] font-semibold text-ink">{project.name}</h3>
                <p className="mt-1 text-[13px] text-muted-ink">{project.domain}</p>
              </div>
              <StatusBadge label={project.stage} tone={project.stageTone} />
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-ink">
              <UserRound className="size-3.5 shrink-0 text-brand-cyan" aria-hidden="true" />
              Mentor: <span className="font-medium text-ink">{project.mentor}</span>
            </p>

            {/* Progress */}
            <div className="mt-4">
              <ProgressBar value={project.progress} label="Progress" />
            </div>

            {/* What is next */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-ink">
                  <span className="font-medium text-muted-ink">Next:</span> {project.nextMilestone}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-ink">
                  <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                  Due {project.dueDate}
                </p>
              </div>

              <Link
                href={project.href}
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
        ))}
      </div>
    </section>
  );
}
