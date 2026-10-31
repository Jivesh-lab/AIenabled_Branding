import { Card, SectionHeading } from "@/components/shared/Surface";

export default function RecentActivity({ projects = [] }: { projects?: any[] }) {
  const activities =
    projects.length === 0
      ? []
      : projects.slice(0, 4).map((p: any) => ({
          id: p.id || p._id,
          description: `${p.title || "Project"} updated status to ${p.stage || p.status || "Submitted"}`,
          timestamp: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "Recent",
        }));

  return (
    <section aria-label="Recent activity">
      <SectionHeading title="Recent Activity" />

      <Card className="p-5">
        {activities.length === 0 ? (
          <p className="text-xs text-muted-ink text-center py-2">
            No recent activity recorded yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {activities.map((entry) => (
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
