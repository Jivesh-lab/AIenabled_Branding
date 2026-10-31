import { Card, SectionHeading } from "@/components/shared/Surface";
import { REVIEW_STATUS_LABEL } from "@/types/status";
import type { StudentProject } from "@/types/student-application";

/** Last recorded state per project, from persisted `updatedAt` - not a fabricated event feed. */
export default function RecentActivity({ projects = [] }: { projects?: StudentProject[] }) {
  const entries = projects
    .filter((p) => p.updatedAt)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      description: `${p.name} — ${REVIEW_STATUS_LABEL[p.reviewStatus]}`,
      timestamp: new Date(`${p.updatedAt}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" }),
    }));

  return (
    <section aria-label="Recent activity">
      <SectionHeading title="Recent Activity" />

      <Card className="p-5">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-ink text-center py-2">No recorded activity yet.</p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-baseline gap-3">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand-cyan" />
                <p className="min-w-0 flex-1 truncate text-[13px] text-ink">{entry.description}</p>
                <span className="shrink-0 text-[12px] text-muted-ink">{entry.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
