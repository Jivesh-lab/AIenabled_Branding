import { DocumentTextIcon } from "@heroicons/react/24/outline";
import ActivityTimeline, { type ActivityEntry, type ActivityTone } from "@/components/shared/ActivityTimeline";
import { SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/types/status";
import type { StudentProject } from "@/types/student-application";
import { projectHref } from "../../_lib/project-links";

/** A quiet tint per review state; the status badge carries the exact wording. */
const NODE_TONE: Partial<Record<string, ActivityTone>> = {
  APPROVED: "success",
  REVISION_REQUESTED: "attention",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  DRAFT: "neutral",
};

/**
 * Last recorded state per project, from persisted `updatedAt` - not a fabricated event feed. Rendered with the
 * shared timeline so Recent Activity looks the same on every dashboard.
 */
export default function RecentActivity({ projects = [] }: { projects?: StudentProject[] }) {
  const entries: ActivityEntry[] = projects
    .filter((p) => p.updatedAt)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      href: projectHref(p),
      icon: DocumentTextIcon,
      tone: NODE_TONE[p.reviewStatus] ?? "neutral",
      title: <span className="font-semibold">{p.name}</span>,
      badge: <StatusBadge label={REVIEW_STATUS_LABEL[p.reviewStatus]} tone={REVIEW_STATUS_TONE[p.reviewStatus]} />,
      meta: new Date(`${p.updatedAt}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }),
    }));

  return (
    <section aria-label="Recent activity">
      <SectionHeading title="Recent Activity" />
      <ActivityTimeline entries={entries} emptyMessage="No recorded activity yet." />
    </section>
  );
}
