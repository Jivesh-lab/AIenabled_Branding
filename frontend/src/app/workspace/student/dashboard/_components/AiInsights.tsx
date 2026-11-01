import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { EmptyState } from "@/components/shared/loading/primitives";
import type { StudentProject } from "@/types/student-application";

interface StoredAssessment {
  overall_readiness_score?: number;
  strengths?: string[];
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

/**
 * Shows stored agent output, at most two insights, one per project, labelled as an advisory AI assessment.
 */
export default function AiInsights({ projects }: { projects: StudentProject[] }) {
  const insights = (projects || []).flatMap((project) => {
    const assessment = readAssessment(project);
    return assessment ? [{ project, assessment }] : [];
  });

  return (
    <section aria-label="Ecosystem and AI insights">
      <SectionHeading title="Advisory & AI Insights" />
      <Card>
        {insights.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No AI assessment recorded yet"
            description="Assessments are automatically generated when you submit an application through the platform."
          />
        ) : (
          <ul className="divide-y divide-line">
            {insights.slice(0, 2).map(({ project, assessment }) => (
              <li key={project.id} className="p-5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-800">
                  <Sparkles className="size-3.5 text-teal-600" aria-hidden="true" />
                  <span>Submission Advisory Assessment</span>
                </div>
                <p className="mt-1.5 truncate text-[15px] font-semibold text-ink">{project.name}</p>
                <p className="mt-1 text-[13px] text-ink">
                  Overall readiness score: <span className="font-semibold">{assessment.overall_readiness_score}/100</span>
                </p>
                {assessment.strengths?.[0] && (
                  <p className="mt-2 text-[13px] text-muted-ink">
                    <span className="font-medium text-emerald-700">Key strength:</span> {assessment.strengths[0]}
                  </p>
                )}
                {assessment.weaknesses?.[0] && (
                  <p className="mt-1 text-[13px] text-muted-ink">
                    <span className="font-medium text-amber-800">Growth priority:</span> {assessment.weaknesses[0]}
                  </p>
                )}
                <div className="mt-3 pt-2 border-t border-line/60">
                  <Link
                    href={`/workspace/student/projects/${encodeURIComponent(project.id)}`}
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
                  >
                    View project evaluation <ArrowRight className="size-3" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
