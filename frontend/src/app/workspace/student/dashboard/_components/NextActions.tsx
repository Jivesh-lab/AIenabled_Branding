import Link from "next/link";
import { Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/shared/Surface";

export default function NextActions({ projects = [] }: { projects?: any[] }) {
  const actions =
    projects.length === 0
      ? [
          {
            id: "act-submit",
            task: "Submit Idea Proposal",
            project: "DBIT Incubation Centre",
            due: "Open",
            isUrgent: true,
            href: "/workspace/student/submit",
          },
        ]
      : projects.slice(0, 3).map((p: any) => ({
          id: p.id || p._id,
          task:
            p.status === "pending"
              ? "Under Faculty Initial Review"
              : p.status === "in_review"
              ? "In Progress Review"
              : "Review Milestones",
          project: p.title || p.name || "My Project",
          due: p.dueDate || "Upcoming",
          isUrgent: p.status === "pending",
          href: `/workspace/student/projects/${p.id || p._id}`,
        }));

  return (
    <section aria-label="Next actions">
      <SectionHeading title="Next Actions" />

      <Card>
        <ul className="divide-y divide-line">
          {actions.map((action) => (
            <li key={action.id} className="flex items-start gap-3 p-4">
              <Circle
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  action.isUrgent ? "text-brand-gold" : "text-icon"
                )}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <Link
                  href={action.href}
                  className="text-[14px] font-medium text-ink hover:text-brand hover:underline"
                >
                  {action.task}
                </Link>
                <p className="mt-0.5 text-[12px] text-muted-ink">{action.project}</p>
              </div>

              <span
                className={cn(
                  "shrink-0 text-[12px] font-medium",
                  action.isUrgent ? "text-brand-gold-ink" : "text-muted-ink"
                )}
              >
                {action.due}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
