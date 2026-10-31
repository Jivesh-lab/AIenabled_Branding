import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";

export default function AiInsights({ projects = [] }: { projects?: any[] }) {
  const insights =
    projects.length === 0
      ? [
          {
            id: "ins-intro",
            project: "AI Evaluation Engine",
            headline: "AI Application Screening & TRL Scoring",
            detail:
              "Once you submit your innovation proposal, the AI Evaluation Agent automatically performs market viability analysis, novelty screening, and TRL readiness calculation.",
          },
        ]
      : projects.slice(0, 2).map((p: any) => ({
          id: p.id || p._id,
          project: p.title || "Project",
          headline: `TRL Readiness: Score ${p.readiness_score || p.readinessScore || 70}/100`,
          detail: `AI screening evaluated ${p.domain || "deep tech"} proposal. Next recommended milestone: prototype benchmark testing and faculty advisor review.`,
        }));

  return (
    <section aria-label="AI insights">
      <SectionHeading title="AI Insights" />

      <Card>
        <ul className="divide-y divide-line">
          {insights.map((insight) => (
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
            href="/workspace/student/projects"
            className="group inline-flex items-center gap-1 text-[13px] font-medium text-brand transition-colors duration-150 hover:text-brand-cyan"
          >
            View project details
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
