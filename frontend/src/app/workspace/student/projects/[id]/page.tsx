import Link from "next/link";
import { fetchAgent } from "@/lib/agentProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";
import type { ApplicationDetail } from "@/types/student-application";
import LoadError from "../../_components/LoadError";
import MentorCard from "../../_components/MentorCard";
import TaskList from "../../_components/TaskList";
import MilestonesPanel from "../../_components/MilestonesPanel";
import MonitoringCard from "../../_components/MonitoringCard";
import { getProjectMonitoring } from "@/lib/projectMonitoring";
import { fetchBackend } from "@/lib/backendProxy";
import { formatIstDateTime, istNow } from "@/lib/workflowState";
import type { StudentTask } from "@/types/student-workflow";
import type { MilestonesResponse } from "@/types/student-application";
import { getMentorInfo } from "@/lib/mentorAllocation";
import PageContainer from "@/components/shared/PageContainer";
import { Card, MaturityTag, StatusBadge } from "@/components/shared/Surface";
import {
  ArrowLeft,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Users,
  Code,
  ExternalLink,
  GitBranch,
  Calendar,
  ShieldCheck,
  Building,
  Target,
  Compass,
} from "lucide-react";
import {
  MATURITY_LABEL,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_TONE,
  type Maturity,
  type ReviewStatus,
} from "@/types/status";

interface StoredAssessment {
  overall_readiness_score?: number;
  problem_clarity_score?: number;
  technical_feasibility_score?: number;
  market_potential_score?: number;
  strengths?: string[];
  weaknesses?: string[];
}
interface StoredFeedback {
  preliminary_assessment?: StoredAssessment;
  questions_for_reviewers?: string[];
  missing_evidence?: string[];
}

const LOAD_TITLE = {
  "not-found": "Project not found",
  forbidden: "No access",
  unauthenticated: "Sign in required",
  unavailable: "We couldn't load this project",
} as const;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchAgent<ApplicationDetail>({
    path: `/api/applications/${encodeURIComponent(id)}`,
    permissions: ["view_applications"],
    roles: STUDENT_READ_ROLES,
    tag: "Project Page",
  });

  if (!result.ok) {
    return (
      <PageContainer>
        <LoadError
          title={LOAD_TITLE[result.kind]}
          message={result.kind === "not-found" ? `No application exists with reference ID ${id}.` : result.message}
          canRetry={result.kind === "unavailable"}
          backHref="/workspace/student/projects"
          backLabel="Back to My Projects"
        />
      </PageContainer>
    );
  }

  const project = result.data;
  const mentor = await getMentorInfo(project.id, project.status);
  const approved = project.status.toUpperCase() === "APPROVED";
  const milestones = approved
    ? await fetchAgent<MilestonesResponse>({
        path: `/api/applications/${encodeURIComponent(project.id)}/milestones`,
        permissions: ["view_applications"],
        roles: STUDENT_READ_ROLES,
        tag: "Project Milestones",
      })
    : null;
  // Tasks only exist for approved projects (they are keyed by the synced project record).
  const tasks =
    project.status.toUpperCase() === "APPROVED"
      ? await fetchBackend<StudentTask[]>({ path: "/api/student/tasks", roles: STUDENT_READ_ROLES, tag: "Project Tasks" }, [])
      : null;
  const monitoring = approved ? await getProjectMonitoring(project.id, tasks && tasks.ok ? tasks.data : null) : null;

  // Parse AI outputs safely
  let aiSummaryObj: { requested_support?: string } = {};
  let aiFeedbackObj: StoredFeedback = {};

  try {
    if (project.aiSummary) {
      aiSummaryObj = typeof project.aiSummary === "string" ? JSON.parse(project.aiSummary) : project.aiSummary;
    }
  } catch {}

  try {
    if (project.aiFeedback) {
      aiFeedbackObj = typeof project.aiFeedback === "string" ? JSON.parse(project.aiFeedback) : project.aiFeedback;
    }
  } catch {}

  const assessment = aiFeedbackObj.preliminary_assessment || {};
  // Only persisted agent output is shown; a missing score is "—", never a placeholder number.
  const hasAssessment = typeof assessment.overall_readiness_score === "number";
  const score = (value?: number) => (typeof value === "number" ? `${value}/100` : "—");
  const readinessScore = score(assessment.overall_readiness_score);
  const problemScore = score(assessment.problem_clarity_score);
  const feasibilityScore = score(assessment.technical_feasibility_score);
  const marketScore = score(assessment.market_potential_score);
  const strengths: string[] = assessment.strengths || [];
  const weaknesses: string[] = assessment.weaknesses || [];
  const questions: string[] = aiFeedbackObj.questions_for_reviewers || [];
  const missingEvidence: string[] = aiFeedbackObj.missing_evidence || [];

  // Status comes straight from the persisted record - no default is substituted when it is unexpected.
  const rawStatus = String(project.status).toUpperCase() as ReviewStatus;
  const statusLabel = REVIEW_STATUS_LABEL[rawStatus] ?? rawStatus;
  const statusTone = REVIEW_STATUS_TONE[rawStatus] ?? "neutral";

  const rawMaturity = String(project.startup.stage).toUpperCase() as Maturity;
  const maturityLabel = MATURITY_LABEL[rawMaturity] ?? rawMaturity;

  const teamMembers = project.formData.teamMembers || [];
  const technologies = project.formData.technologies || [];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        {/* Navigation back */}
        <div>
          <Link
            href="/workspace/student/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-ink transition-colors hover:text-brand"
          >
            <ArrowLeft className="size-3.5" />
            Back to My Projects
          </Link>
        </div>

        {/* Top Header Card */}
        <Card className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={statusLabel} tone={statusTone} />
                <MaturityTag label={maturityLabel} />
                <span className="rounded-md border border-line bg-canvas px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                  {project.startup.sector}
                </span>
                {project.formData.department && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-ink">
                    <Building className="size-3" />
                    {project.formData.department}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {project.startup.name}
              </h1>

              <p className="max-w-2xl text-[14px] leading-relaxed text-muted-ink">
                {project.startup.tagline}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-[12px] text-muted-ink">
                <span>
                  Reference ID: <span className="font-mono font-medium text-ink">{project.id}</span>
                </span>
                {project.submittedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    Submitted: {formatIstDateTime(project.submittedAt).split(",").slice(0, 2).join(",")}
                  </span>
                )}
              </div>
            </div>

            {/* Project Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
              <Link
                href="/workspace/student/meetings"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
              >
                <Calendar className="size-3.5" />
                Schedule Mentor Meeting
              </Link>
              <Link
                href="/workspace/student/journey"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-brand/40 hover:text-brand"
              >
                <Compass className="size-3.5 text-brand" />
                Milestone Roadmap
              </Link>
              {rawStatus === "REVISION_REQUESTED" && (
                <Link
                  href={`/workspace/student/submit?applicationId=${encodeURIComponent(project.id)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
                >
                  <Pencil className="size-3.5" />
                  Update Proposal
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* AI Application Agent Assessment Dossier */}
        {rawStatus === "REVISION_REQUESTED" && (
          <Card className="border-amber-200 bg-amber-50/60 p-5">
            <h2 className="text-[15px] font-bold text-amber-950">Reviewer feedback</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-900">
              {project.reviewerComments?.trim() || "The reviewer did not leave written comments. Contact your faculty reviewer for details."}
            </p>
          </Card>
        )}

        {/* AI Application Agent Assessment Dossier */}
        {hasAssessment ? (
          <Card className="overflow-hidden border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-white p-6">
            <div className="flex items-center justify-between border-b border-indigo-100/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h2 className="text-[16px] font-bold text-ink">AI Application Agent Evaluation Dossier</h2>
                  <p className="text-[12px] text-muted-ink">
                    Preliminary multi-dimensional feasibility scoring and committee interview preparation
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Advisory only
              </span>
            </div>

            {/* Metric Badges Grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-ink">Overall Readiness</span>
                <span className="mt-1 block text-2xl font-black text-brand">{readinessScore}</span>
                </div>
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-ink">Problem Clarity</span>
                <span className="mt-1 block text-2xl font-bold text-ink">{problemScore}</span>
                <span className="mt-0.5 block text-[11px] text-muted-ink">Pain point articulated</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-ink">Tech Feasibility</span>
                <span className="mt-1 block text-2xl font-bold text-ink">{feasibilityScore}</span>
                <span className="mt-0.5 block text-[11px] text-muted-ink">Achievable architecture</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-ink">Market Viability</span>
                <span className="mt-1 block text-2xl font-bold text-ink">{marketScore}</span>
                <span className="mt-0.5 block text-[11px] text-muted-ink">Target users identified</span>
              </div>
            </div>

            {/* AI Strengths & Committee Questions */}
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h3 className="mb-2.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-emerald-800">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Key Strengths Identified by AI
                </h3>
                <ul className="space-y-1.5 text-[12px] text-emerald-950">
                  {strengths.length > 0 ? (
                    strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-0.5 text-emerald-500">•</span>
                        <span>{str}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-ink">No strengths recorded.</li>
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <h3 className="mb-2.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-indigo-900">
                  <HelpCircle className="size-3.5 text-indigo-600" /> Questions Prepared for Faculty Committee
                </h3>
                <ul className="space-y-1.5 text-[12px] text-indigo-950">
                  {questions.length > 0 ? (
                    questions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-0.5 text-indigo-500">•</span>
                        <span>{q}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-ink">No reviewer questions recorded.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Missing Evidence / Weaknesses Notice if any */}
            {(missingEvidence.length > 0 || weaknesses.length > 0) && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 text-[12px] text-amber-950">
                <span className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                  <AlertTriangle className="size-3.5 text-amber-600" /> Items for Further Clarification:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[12px]">
                  {missingEvidence.map((m, idx) => (
                    <li key={`ev-${idx}`}>{m}</li>
                  ))}
                  {weaknesses.map((w, idx) => (
                    <li key={`wk-${idx}`}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">AI preliminary assessment</h2>
            <p className="mt-1 text-[13px] text-muted-ink">
              No AI assessment is stored for this application (the assessment service was unavailable when it was submitted, or this is a draft). Your application is reviewed by the faculty panel regardless.
            </p>
          </Card>
        )}

        {/* Mentor - persisted allocation; recommendations are labelled as such */}
        <MentorCard result={mentor} />

        {/* Tasks assigned to the student on this project */}
        {tasks &&
          (tasks.ok ? (
            <TaskList tasks={tasks.data.filter((t) => t.projectId === project.id)} today={istNow().date} />
          ) : (
            <LoadError
              title="We couldn't load your tasks"
              message={tasks.message}
              canRetry={tasks.kind === "unavailable"}
            />
          ))}

        {/* Milestones and monitoring (approved projects only). Monitoring uses the same tasks and milestones shown here. */}
        {milestones &&
          (milestones.ok ? (
            <MilestonesPanel applicationId={project.id} data={milestones.data} />
          ) : (
            <LoadError title="We couldn't load your milestones" message={milestones.message} canRetry={milestones.kind === "unavailable"} />
          ))}
        {monitoring && <MonitoringCard projectId={project.id} result={monitoring} />}

        {/* Activity - persisted status transitions (application_audit_logs) */}
        <Card className="p-6">
          <h2 className="text-[15px] font-bold text-ink">Activity</h2>
          {project.history.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-ink">No status changes recorded yet.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-4">
              {[...project.history].reverse().map((entry, idx) => (
                <li key={`${entry.at}-${idx}`} className="flex gap-3">
                  <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-cyan" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">
                      {entry.from
                        ? `${REVIEW_STATUS_LABEL[entry.from as ReviewStatus] ?? entry.from} → ${REVIEW_STATUS_LABEL[entry.to as ReviewStatus] ?? entry.to}`
                        : REVIEW_STATUS_LABEL[entry.to as ReviewStatus] ?? entry.to}
                    </p>
                    {entry.at && (
                      <p className="text-[12px] text-muted-ink">{formatIstDateTime(entry.at)} IST</p>
                    )}
                    {entry.comments && (
                      <p className="mt-1 whitespace-pre-line text-[13px] text-muted-ink">{entry.comments}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Section: The Submitted Proposal (Problem & Solution) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Problem Statement Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                <Target className="size-4" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">Problem Statement</h3>
            </div>

            <div className="space-y-3 text-[13px]">
              <div>
                <span className="block font-semibold text-ink text-[12px] mb-1">Identified Challenge:</span>
                <p className="rounded-lg border border-line bg-canvas/40 p-3 leading-relaxed text-ink whitespace-pre-line">
                  {project.startup.problem}
                </p>
              </div>

              {project.formData.affectedUsers && (
                <div>
                  <span className="block font-semibold text-ink text-[12px] mb-1">Target Users & Beneficiaries:</span>
                  <p className="rounded-lg border border-line bg-canvas/40 p-3 leading-relaxed text-muted-ink">
                    {project.formData.affectedUsers}
                  </p>
                </div>
              )}

              {project.formData.currentSolutions && (
                <div>
                  <span className="block font-semibold text-ink text-[12px] mb-1">Current Alternatives / Existing Workarounds:</span>
                  <p className="rounded-lg border border-line bg-canvas/40 p-3 leading-relaxed text-muted-ink">
                    {project.formData.currentSolutions}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Solution & Differentiation Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">Proposed Solution & Innovation</h3>
            </div>

            <div className="space-y-3 text-[13px]">
              <div>
                <span className="block font-semibold text-ink text-[12px] mb-1">Technical Solution:</span>
                <p className="rounded-lg border border-line bg-canvas/40 p-3 leading-relaxed text-ink whitespace-pre-line">
                  {project.startup.solution}
                </p>
              </div>

              {project.formData.differentiation && (
                <div>
                  <span className="block font-semibold text-ink text-[12px] mb-1">What Makes It Unique / Competitive Moat:</span>
                  <p className="rounded-lg border border-line bg-canvas/40 p-3 leading-relaxed text-muted-ink">
                    {project.formData.differentiation}
                  </p>
                </div>
              )}

              {aiSummaryObj.requested_support && (
                <div>
                  <span className="block font-semibold text-ink text-[12px] mb-1">Requested Incubation Support:</span>
                  <p className="rounded-lg border border-line bg-canvas/40 p-3 leading-relaxed text-muted-ink">
                    {aiSummaryObj.requested_support}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Technical Architecture & Team Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tech Stack & Prototype */}
          <Card className="p-6 space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Code className="size-4" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">Technical Stack & Prototype Readiness</h3>
            </div>

            <div className="space-y-4 text-[13px]">
              <div>
                <span className="block font-semibold text-ink text-[12px] mb-2">Technologies Specified:</span>
                {technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {technologies.map((t, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-ink"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-ink italic">No specific software packages declared in initial submission.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg border border-line bg-canvas/30 p-3">
                  <span className="text-[11px] font-medium text-muted-ink uppercase block">Prototype Availability</span>
                  <span className="text-sm font-bold text-ink mt-0.5 block">
                    {project.formData.prototypeAvailable === "YES" ? "Working Prototype Available" : "In Development (Concept / Design)"}
                  </span>
                </div>

                <div className="rounded-lg border border-line bg-canvas/30 p-3">
                  <span className="text-[11px] font-medium text-muted-ink uppercase block">Project Type</span>
                  <span className="text-sm font-bold text-ink mt-0.5 block">
                    {project.formData.projectType || "College Startup Incubation"}
                  </span>
                </div>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-3 pt-2">
                {project.formData.githubUrl ? (
                  <a
                    href={project.formData.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand/40 hover:text-brand"
                  >
                    <GitBranch className="size-3.5" />
                    Source Code Repository
                    <ExternalLink className="size-3 text-muted-ink" />
                  </a>
                ) : null}

                {project.formData.demoUrl ? (
                  <a
                    href={project.formData.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand/40 hover:text-brand"
                  >
                    <ExternalLink className="size-3.5 text-brand" />
                    Live Demo / Video
                  </a>
                ) : null}
              </div>
            </div>
          </Card>

          {/* Team Members Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Users className="size-4" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">Founder Team</h3>
            </div>

            <div className="space-y-3 text-[13px]">
              {teamMembers.length > 0 ? (
                teamMembers.map((member, idx) => (
                  <div key={idx} className="rounded-lg border border-line bg-canvas/40 p-3">
                    <strong className="block text-[13px] text-ink">{member.name}</strong>
                    {member.rollNumber && (
                      <span className="block text-[11px] text-muted-ink">Roll No: {member.rollNumber}</span>
                    )}
                    {member.email && (
                      <span className="block text-[11px] text-brand">{member.email}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-line bg-canvas/40 p-3 text-muted-ink">
                  <p className="text-xs">Primary applicant / Founder account attached.</p>
                </div>
              )}

              <div className="rounded-lg border border-line bg-surface p-3 text-[12px] space-y-1">
                <span className="font-semibold text-ink block">Faculty Advisor:</span>
                <span className="text-muted-ink block">
                  Coordinator allocation managed in Faculty Workspace.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

