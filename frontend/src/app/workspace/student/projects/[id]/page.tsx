import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";
import PageContainer from "@/components/shared/PageContainer";
import { Card, MaturityTag, ProgressBar, StatusBadge } from "@/components/shared/Surface";
import {
  ArrowLeft,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  FileText,
  Users,
  Code,
  ExternalLink,
  GitBranch,
  Calendar,
  Layers,
  ShieldCheck,
  Building,
  Target,
  Clock,
  Compass,
} from "lucide-react";
import {
  MATURITY_LABEL,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_TONE,
  type Maturity,
  type ReviewStatus,
} from "@/types/status";
import { STUDENT_PROJECTS } from "@/mock/student-projects";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_JWT_SECRET = process.env.INTERNAL_JWT_SECRET || "test_internal_secret_key_123";

interface ApplicationRecord {
  id: string;
  startup: {
    name: string;
    tagline: string;
    problem: string;
    solution: string;
    sector: string;
    stage: string;
  };
  status: string;
  aiSummary: string | null;
  aiFeedback: string | null;
  formData: {
    department?: string;
    projectType?: string;
    affectedUsers?: string;
    currentSolutions?: string;
    differentiation?: string;
    teamMembers?: Array<{
      id?: string;
      name: string;
      rollNumber?: string;
      email?: string;
      inviteStatus?: string;
    }>;
    technologies?: string[];
    githubUrl?: string;
    demoUrl?: string;
    prototypeAvailable?: string;
  };
  documents: Array<Record<string, unknown>>;
  submittedAt: string | null;
}

async function fetchProjectData(id: string): Promise<ApplicationRecord | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !INTERNAL_JWT_SECRET) return null;

  try {
    const secret = new TextEncoder().encode(INTERNAL_JWT_SECRET);
    const token = await new SignJWT({
      sub: session.user.id,
      role: session.user.role,
      permissions: ["view_applications"],
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("next-server")
      .setAudience("fastapi-internal")
      .setExpirationTime("1m")
      .sign(secret);

    const res = await fetch(`${AGENT_SERVICE_URL}/api/applications/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("[ProjectPage] Failed to fetch live application:", err);
  }

  // Fallback to mock data if id matches mock project ID
  const mock = STUDENT_PROJECTS.find((p) => p.id === id);
  if (mock) {
    return {
      id: mock.id,
      startup: {
        name: mock.name,
        tagline: mock.shortDescription,
        problem:
          "Targeted pain point identified in " +
          mock.domain +
          ". Student innovators are developing an automated prototype to improve sector outcomes.",
        solution: mock.shortDescription,
        sector: mock.domain,
        stage: mock.maturity.toLowerCase(),
      },
      status: mock.reviewStatus,
      aiSummary: JSON.stringify({
        problem: "Addressed pain points in " + mock.domain,
        proposed_solution: mock.shortDescription,
        target_users: "Students, institutional stakeholders, and local industry partners",
        innovation_differentiation: "Direct domain integration with DBIT laboratory research facilities",
        requested_support: "Prototyping equipment, faculty mentor guidance, and institutional seed grant",
      }),
      aiFeedback: JSON.stringify({
        preliminary_assessment: {
          problem_clarity_score: 85,
          technical_feasibility_score: 80,
          market_potential_score: 75,
          overall_readiness_score: mock.progress,
          strengths: [
            "Strong domain alignment with college incubation focus",
            "Clearly articulated technical problem and solution scope",
          ],
          weaknesses: ["Needs pilot deployment validation data"],
        },
        questions_for_reviewers: [
          "What is the projected deployment timeline for the MVP pilot?",
          "Are there specific laboratory testing safety approvals required?",
        ],
        missing_evidence: ["Formal bench test reports"],
        validation: { is_complete: true, completeness_score: 85 },
      }),
      formData: {
        department: "Computer Engineering",
        projectType: "Capstone / Incubation",
        affectedUsers: "Target beneficiaries across campus and industry",
        currentSolutions: "Manual and commercial off-the-shelf alternatives",
        differentiation: "Novel student-developed algorithm with low-cost architecture",
        teamMembers: [
          {
            name: "Founder Lead",
            rollNumber: "DBIT-2024-01",
            email: "founder@dbit.ac.in",
            inviteStatus: "accepted",
          },
        ],
        technologies: ["Python", "Next.js", "IoT Sensors", "PostgreSQL"],
        prototypeAvailable: "YES",
      },
      documents: [],
      submittedAt: mock.updatedAt,
    };
  }

  return null;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await fetchProjectData(id);

  if (!project) {
    return (
      <PageContainer>
        <div className="py-12 text-center">
          <h2 className="text-xl font-bold text-ink">Project Not Found</h2>
          <p className="mt-2 text-sm text-muted-ink">
            No proposal found with reference ID <span className="font-mono">{id}</span>.
          </p>
          <div className="mt-6">
            <Link
              href="/workspace/student/projects"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              <ArrowLeft className="size-4" />
              Back to My Projects
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Parse AI outputs safely
  let aiSummaryObj: Record<string, any> = {};
  let aiFeedbackObj: Record<string, any> = {};

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
  const readinessScore = assessment.overall_readiness_score || 80;
  const problemScore = assessment.problem_clarity_score || 85;
  const feasibilityScore = assessment.technical_feasibility_score || 80;
  const marketScore = assessment.market_potential_score || 75;
  const strengths: string[] = assessment.strengths || [];
  const weaknesses: string[] = assessment.weaknesses || [];
  const questions: string[] = aiFeedbackObj.questions_for_reviewers || [];
  const missingEvidence: string[] = aiFeedbackObj.missing_evidence || [];

  const rawStatus = (project.status || "SUBMITTED").toUpperCase() as ReviewStatus;
  const statusLabel = REVIEW_STATUS_LABEL[rawStatus] || rawStatus;
  const statusTone = REVIEW_STATUS_TONE[rawStatus] || "progress";

  const rawMaturity = (project.startup.stage || "PROTOTYPE").toUpperCase() as Maturity;
  const maturityLabel = MATURITY_LABEL[rawMaturity] || rawMaturity;

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
                    Submitted: {new Date(project.submittedAt).toLocaleDateString()}
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
                  href="/workspace/student/submit"
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
              Pre-Screened
            </span>
          </div>

          {/* Metric Badges Grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-ink">Overall Readiness</span>
              <span className="mt-1 block text-2xl font-black text-brand">{readinessScore}/100</span>
              <span className="mt-0.5 block text-[11px] text-emerald-600 font-medium">Eligible for Incubation</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-ink">Problem Clarity</span>
              <span className="mt-1 block text-2xl font-bold text-ink">{problemScore}%</span>
              <span className="mt-0.5 block text-[11px] text-muted-ink">Pain point articulated</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-ink">Tech Feasibility</span>
              <span className="mt-1 block text-2xl font-bold text-ink">{feasibilityScore}%</span>
              <span className="mt-0.5 block text-[11px] text-muted-ink">Achievable architecture</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-ink">Market Viability</span>
              <span className="mt-1 block text-2xl font-bold text-ink">{marketScore}%</span>
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
                  <li className="text-muted-ink">Core technical solution scope meets baseline criteria.</li>
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
                  <li className="text-muted-ink">Standard faculty review questions will be posed during panel interview.</li>
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
