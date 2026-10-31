import Link from "next/link";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/shared/Surface";
import type { Journey } from "@/lib/journey";

/**
 * Next actions come from the journey model (saved application status, milestones, tasks, meetings), i.e. the same
 * actions the Journey page lists, across all projects. Nothing is invented; with no projects the only suggestion is
 * to submit an idea.
 */
export default function NextActions({ journeys }: { journeys: Journey[] }) {
  const actions = journeys
    .flatMap((j) => j.actions.map((a) => ({ ...a, project: j.projectName, key: `${j.projectId}-${a.id}` })))
    .sort((a, b) => Number(b.urgent) - Number(a.urgent))
    .slice(0, 6);

  return (
    <section aria-label="Next actions">
      <SectionHeading title="Next Actions" />
      <Card>
        {actions.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-ink">
            {journeys.length === 0 ? (
              <>
                No actions yet.{" "}
                <Link href="/workspace/student/submit" className="font-semibold text-brand hover:underline">
                  Submit your first idea
                </Link>
              </>
            ) : (
              "No pending actions."
            )}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {actions.map((action) => (
              <li key={action.key} className="flex items-start gap-3 p-4">
                <Circle className={cn("mt-0.5 size-4 shrink-0", action.urgent ? "text-brand-gold" : "text-icon")} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <Link href={action.href} className="text-[14px] font-medium text-ink hover:text-brand hover:underline">
                    {action.label}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-muted-ink">{action.project}</p>
                </div>
                {action.urgent && <span className="shrink-0 text-[12px] font-medium text-brand-gold-ink">Needs attention</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
