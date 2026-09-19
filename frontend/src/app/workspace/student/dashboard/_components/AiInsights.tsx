import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { AI_INSIGHTS } from "@/mock/student-dashboard";

/**
 * AI is a supporting intelligence layer here, not the dashboard's headline.
 * Cyan icon on a light-cyan chip, blue link, white surface. No purple, no
 * gradient, no oversized panel. Mock content only — no AI logic.
 */
export default function AiInsights() {
  return (
    <section aria-label="AI insights">
      <SectionHeading title="AI Insights" />

      <Card>
        <ul className="divide-y divide-line">
          {AI_INSIGHTS.map((insight) => (
            <li key={insight.id} className="flex gap-3 p-5">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-cyan-soft"
              >
                <Sparkles className="size-4 text-brand-cyan" />
              </span>

              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">{insight.project}</p>
                <p className="mt-1 text-[14px] text-ink">{insight.headline}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">{insight.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-line px-5 py-3">
          <Link
            href="/workspace/student/ai-workspace"
            className="group inline-flex items-center gap-1 text-[13px] font-medium text-brand transition-colors duration-150 hover:text-brand-cyan"
          >
            View all insights
            <ArrowRight
              className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </Card>
    </section>
  );
}
