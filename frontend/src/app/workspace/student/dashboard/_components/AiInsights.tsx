import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import type { StudentProject } from "@/types/student-application";

interface StoredAssessment {
  overall_readiness_score?: number;
  weaknesses?: string[];
}

/** The persisted AI assessment (ai_feedback JSON) for a project, or null when none was produced. */
function readAssessment(project: StudentProject): StoredAssessment | null {
  if (!project.aiFeedback) return null;
  try {
    const parsed = JSON.parse(project.aiFeedback) as { preliminary_assessment?: StoredAssessment };
    const assessment = parsed.preliminary_assessment;
    return assessment && typeof assessment.overall_readiness_score === "number" ? assessment : null;
  } catch {
    return null;
  }
}

/** Only real, stored agent output is shown. No assessment -> an honest empty state, not filler. */
export default function AiInsights({ projects = [] }: { projects?: StudentProject[] }) {
  const insights = projects.flatMap((project) => {
    const assessment = readAssessment(project);
    if (!assessment) return [];
    const improvement = assessment.weaknesses?.[0];
    return [
      {
        id: project.id,
        project: project.name,
        headline: `Overall readiness ${assessment.overall_readiness_score}/100 (advisory)`,
        detail: improvement ? `Suggested improvement: ${improvement}` : null,
      },
    ];
  });

  return (
    <section aria-label="AI insights">
      <SectionHeading title="AI Insights" />

      <Card>
        {insights.length === 0 ? (
          <p className="p-5 text-center text-xs text-muted-ink">
            No AI assessment is stored yet. One is produced when you submit an application, if the AI service is available.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {insights.slice(0, 2).map((insight) => (
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
                  {insight.detail && (
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">{insight.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

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
