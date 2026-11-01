import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { EmptyState } from "@/components/shared/loading/primitives";
import { incubationOverview } from "@/lib/incubationOverview";
import type { Journey } from "@/lib/journey";
import type { StudentProject } from "@/types/student-application";

/**
 * One summary of how many projects sit in each stage (rules in lib/incubationOverview.ts). The full step-by-step
 * timeline of each project stays on the Journey Timeline page.
 */
export default function IncubationOverview({ projects, journeys }: { projects: StudentProject[]; journeys: Journey[] }) {
  const stages = incubationOverview(projects, journeys);
  const total = projects.length;

  return (
    <section aria-label="Incubation overview">
      <SectionHeading title="Incubation Overview" />
      <Card>
        {total === 0 ? (
          <EmptyState icon={Layers} title="No projects in the pipeline yet" description="Your projects will be counted by stage here." />
        ) : (
          <ul className="divide-y divide-line">
            {stages.map((stage) => (
              <li key={stage.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-40 shrink-0 text-[13px] text-ink">{stage.label}</span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-soft" aria-hidden="true">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${(stage.count / total) * 100}%` }} />
                </span>
                <span className="w-6 shrink-0 text-right text-[14px] font-semibold tabular-nums text-ink">{stage.count}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-5 py-3">
          <Link href="/workspace/student/journey" className="group inline-flex items-center gap-1 rounded-md text-[13px] font-semibold text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            View full incubation journey
            <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </section>
  );
}
