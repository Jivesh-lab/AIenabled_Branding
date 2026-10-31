import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { EmptyState } from "@/components/shared/loading/primitives";
import type { Journey } from "@/lib/journey";

/**
 * Next actions come from the journey model (saved application status, milestones, tasks, meetings), i.e. the same
 * actions the Journey page lists, across all projects. Nothing is invented. Items are de-duplicated per project.
 */
export default function NextActions({ journeys }: { journeys: Journey[] }) {
  // Waiting for a review decision is a status, not something the student can do, so it is not listed here.
  const actions = journeys
    .flatMap((j) => j.actions.filter((a) => a.id !== "await").map((a) => ({ ...a, project: j.projectName, key: `${j.projectId}-${a.id}` })))
    .sort((a, b) => Number(b.urgent) - Number(a.urgent))
    .slice(0, 4);

  return (
    <section aria-label="Next actions">
      <SectionHeading title="Next Actions" action={{ label: "View journey", href: "/workspace/student/journey" }} />
      <Card>
        {actions.length === 0 ? (
          journeys.length === 0 ? (
            <EmptyState icon={Circle} title="No actions yet" action={{ label: "Submit your first idea", href: "/workspace/student/submit" }} />
          ) : (
            <EmptyState icon={CheckCircle2} title="You're all caught up" description="Nothing needs your attention right now." />
          )
        ) : (
          <ul className="divide-y divide-line">
            {actions.map((action) => (
              <li key={action.key}>
                <Link href={action.href} className="flex items-start gap-3 p-4 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
                  <Circle className={cn("mt-0.5 size-4 shrink-0", action.urgent ? "text-brand-gold" : "text-icon")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-ink">{action.label}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted-ink">{action.project}</span>
                  </span>
                  {action.urgent && <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-brand-gold-ink">Attention</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
