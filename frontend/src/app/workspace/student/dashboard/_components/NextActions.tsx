import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { NEXT_ACTIONS } from "@/mock/student-dashboard";

/**
 * Answers "what should I do next?".
 * Gold (#FBB02D) marks genuinely urgent items only — it is not decorative.
 */
export default function NextActions() {
  return (
    <section aria-label="Next actions">
      <SectionHeading title="Next Actions" />

      <Card>
        <ul className="divide-y divide-line">
          {NEXT_ACTIONS.map((action) => (
            <li key={action.id} className="flex items-start gap-3 p-4">
              <Circle
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  action.isUrgent ? "text-brand-gold" : "text-icon"
                )}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink">{action.task}</p>
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
