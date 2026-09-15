import { Card, SectionHeading } from "@/components/shared/Surface";
import { RECENT_ACTIVITY } from "@/mock/student-dashboard";

export default function RecentActivity() {
  return (
    <section aria-label="Recent activity">
      <SectionHeading title="Recent Activity" />

      <Card className="p-5">
        <ul className="flex flex-col gap-3.5">
          {RECENT_ACTIVITY.map((entry) => (
            <li key={entry.id} className="flex items-baseline gap-3">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand-cyan" />
              <p className="min-w-0 flex-1 truncate text-[13px] text-ink">{entry.description}</p>
              <span className="shrink-0 text-[12px] text-muted-ink">{entry.timestamp}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
