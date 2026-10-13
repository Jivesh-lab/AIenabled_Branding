import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/shared/Surface";
import { AI_INSIGHTS } from "@/mock/student-dashboard";

/**
 * AI Insights — Clean intelligence briefing without purple gradients or trailing arrows.
 */
export default function AiInsights() {
  return (
    <section aria-label="AI insights briefing">
      <SectionHeading title="Ecosystem Insights" />

      <div className="rounded-lg border border-line bg-white">
        <ul className="divide-y divide-line">
          {AI_INSIGHTS.map((insight) => (
            <li key={insight.id} className="flex gap-3.5 p-5">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded bg-teal-50 text-teal-700 border border-teal-200/50 mt-0.5"
              >
                <Sparkles className="size-3.5" />
              </span>

              <div className="min-w-0">
                <span className="text-[12px] font-medium text-slate-500">{insight.project}</span>
                <p className="mt-0.5 text-[14px] font-semibold text-ink leading-snug">{insight.headline}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">{insight.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-line/60 px-5 py-3 bg-[#FAFBFB] rounded-b-lg">
          <Link
            href="/workspace/student/projects"
            className="text-[13px] font-medium text-brand hover:underline"
          >
            Review all project suggestions
          </Link>
        </div>
      </div>
    </section>
  );
}
