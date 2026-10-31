import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
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
 * Only STORED agent output is shown, one insight per project (so nothing repeats), each labelled as an advisory AI
 * assessment made when the application was submitted. No assessment -> an honest empty state, never filler.
 */
export default function AiInsights({ projects }: { projects: StudentProject[] }) {
  const insights = projects.flatMap((project) => {
    const assessment = readAssessment(project);
    return assessment ? [{ project, assessment }] : [];
  });

  return (
    <section aria-label="AI insights">
      <SectionHeading title="AI Insights" />
      <Card>
        {insights.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No AI assessment stored yet"
            description="One is produced when you submit an application, if the AI service is available."
          />
        ) : (
          <ul className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
            {insights.slice(0, 4).map(({ project, assessment }) => (
              <li key={project.id} className="p-5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-brand-cyan-ink">
                  <Sparkles className="size-3.5" aria-hidden="true" /> AI assessment at submission · advisory
                </p>
                <p className="mt-1.5 truncate text-[15px] font-semibold text-ink">{project.name}</p>
                <p className="mt-1 text-[13px] text-ink">
                  Overall readiness <span className="font-semibold">{assessment.overall_readiness_score}/100</span>
                </p>
                {assessment.strengths?.[0] && <p className="mt-2 text-[13px] text-muted-ink"><span className="font-medium text-success">Strength:</span> {assessment.strengths[0]}</p>}
                {assessment.weaknesses?.[0] && <p className="mt-1 text-[13px] text-muted-ink"><span className="font-medium text-brand-gold-ink">To improve:</span> {assessment.weaknesses[0]}</p>}
                <Link href={`/workspace/student/projects/${encodeURIComponent(project.id)}`} className="group mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:text-brand-hover">
                  View project <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
