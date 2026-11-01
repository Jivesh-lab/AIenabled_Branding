import Link from "next/link";
import { ArrowRightIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/types/status";
import type { StudentProject } from "@/types/student-application";
import { projectHref } from "../../_lib/project-links";

/**
 * Timeline of the last recorded state per project, from persisted `updatedAt` - not a fabricated event feed.
 * A vertical spine connects one node per project; each row links to that project.
 */
export default function RecentActivity({ projects = [] }: { projects?: StudentProject[] }) {
  const entries = projects
    .filter((p) => p.updatedAt)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 4)
    .map((p) => ({
      project: p,
      date: new Date(`${p.updatedAt}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }),
    }));

  return (
    <section aria-label="Recent activity">
      <SectionHeading title="Recent Activity" />

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white px-4 py-6 text-center text-[13px] text-muted-ink">
          No recorded activity yet.
        </p>
      ) : (
        <ol className="relative flex flex-col">
          {/* Spine */}
          <span aria-hidden="true" className="absolute bottom-4 left-[15px] top-4 w-px bg-line" />
          {entries.map(({ project, date }) => (
            <li key={project.id} className="relative">
              <Link
                href={projectHref(project)}
                className="group flex items-start gap-3 rounded-lg py-2.5 pr-2 outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <span className="relative z-10 flex size-[31px] shrink-0 items-center justify-center rounded-full border border-line bg-white text-brand-cyan">
                  <DocumentTextIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-muted-ink">{date}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-[14px] font-semibold text-ink">{project.name}</span>
                    <StatusBadge label={REVIEW_STATUS_LABEL[project.reviewStatus]} tone={REVIEW_STATUS_TONE[project.reviewStatus]} />
                  </span>
                </span>
                <ArrowRightIcon
                  className="mt-2 size-4 shrink-0 text-muted-ink transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
