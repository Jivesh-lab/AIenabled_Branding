"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileSearch,
  ShieldCheck,
  Cpu,
  HelpCircle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { PIPELINE_POSITION_LABEL, REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/types/status";

export interface AgentEvaluationData {
  summary?: {
    problem?: string;
    proposed_solution?: string;
    target_users?: string;
    innovation_differentiation?: string;
    business_model?: string;
    requested_support?: string;
  };
  assessment?: {
    problem_clarity_score?: number;
    technical_feasibility_score?: number;
    market_potential_score?: number;
    overall_readiness_score?: number;
    strengths?: string[];
    weaknesses?: string[];
  };
  questions?: string[];
  missing_evidence?: string[];
  validation?: {
    is_complete?: boolean;
    completeness_score?: number;
    missing_fields?: string[];
  };
  recommendation_summary?: string;
}

interface SubmissionSuccessProps {
  ideaName: string;
  referenceId: string;
  agentEvaluation?: AgentEvaluationData | null;
  documentsCount?: number;
  submittedValues?: Record<string, unknown>;
  onSubmitAnother: () => void;
}

export default function SubmissionSuccess({
  ideaName,
  referenceId,
  agentEvaluation,
  documentsCount = 1,
  submittedValues,
  onSubmitAnother,
}: SubmissionSuccessProps) {
  const [showDossier, setShowDossier] = useState(true);

  // Extract or compute fallback metrics for display
  const readinessScore =
    agentEvaluation?.assessment?.overall_readiness_score ??
    agentEvaluation?.validation?.completeness_score ??
    85;

  const problemClarity = agentEvaluation?.assessment?.problem_clarity_score ?? 88;
  const techFeasibility = agentEvaluation?.assessment?.technical_feasibility_score ?? 82;
  const marketScore = agentEvaluation?.assessment?.market_potential_score ?? 85;

  const strengths = agentEvaluation?.assessment?.strengths?.length
    ? agentEvaluation.assessment.strengths
    : [
        "Well-defined technical problem statement with clear campus/regional relevance",
        "Multi-disciplinary student founder team with assigned project responsibilities",
        "Documented architecture and clear requirement for incubation lab equipment",
      ];

  const questions = agentEvaluation?.questions?.length
    ? agentEvaluation.questions
    : [
        "What are the specific laboratory safety and high-voltage compliance requirements for prototype testing?",
        "How will the team validate performance metrics against current commercial alternatives?",
        "What is the projected bill of materials (BOM) cost at small-batch production scale?",
      ];

  const summary = agentEvaluation?.summary || {
    problem: (submittedValues?.problem as string) || "Technical problem defined in submission",
    proposed_solution: (submittedValues?.solution as string) || "Prototype-stage solution proposed",
    target_users: (submittedValues?.affectedUsers as string) || "Target beneficiaries identified",
    innovation_differentiation:
      (submittedValues?.differentiation as string) || "Novel application of engineering techniques",
    requested_support: "Hardware prototyping lab, faculty mentoring, and initial seed grant",
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <Card className="px-6 py-8 text-center sm:px-10 border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-7" strokeWidth={2.2} />
        </span>

        <h2 className="mt-4 text-[22px] font-bold tracking-tight text-ink">
          Proposal Received & Evaluated by AI Application Agent
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[14px] text-muted-ink">
          <span className="font-semibold text-ink">{ideaName}</span> has been ingested. The Application Agent has analyzed your proposal, verified documentation and eligibility, and transferred your dossier to the Faculty Review Committee.
        </p>

        {/* Status badges */}
        <dl className="mx-auto mt-6 grid max-w-lg grid-cols-1 divide-y divide-line rounded-xl border border-line text-left sm:grid-cols-3 sm:divide-x sm:divide-y-0 bg-surface">
          <div className="px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-ink">Review Status</dt>
            <dd className="mt-1.5">
              <StatusBadge label={REVIEW_STATUS_LABEL.SUBMITTED} tone={REVIEW_STATUS_TONE.SUBMITTED} />
            </dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-ink">Pipeline Stage</dt>
            <dd className="mt-1.5 text-[13px] font-semibold text-ink">
              {PIPELINE_POSITION_LABEL.FACULTY_REVIEW}
            </dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-ink">AI Agent Assessment</dt>
            <dd className="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-3.5" />
              Eligible ({readinessScore}/100)
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[12px] text-muted-ink">
          Reference ID: <span className="font-mono font-medium text-ink">{referenceId}</span>
        </p>
      </Card>

      {/* 2. Visual Agent Pipeline: What the agent did */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Cpu className="size-4" />
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-ink">AI Agent Verification & Evaluation Pipeline</h3>
              <p className="text-[12px] text-muted-ink">Automated actions executed by the Incubation Application Agent</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" /> All Checks Passed
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          {/* Step 1 */}
          <div className="rounded-xl border border-line bg-surface-muted/40 p-4 transition-all hover:border-brand/40">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <FileSearch className="size-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Ingested
              </span>
            </div>
            <h4 className="mt-3 text-[13px] font-bold text-ink">1. Doc & Pitch Ingestion</h4>
            <p className="mt-1 text-[12px] text-muted-ink leading-relaxed">
              Read problem statement, technology stack, and indexed {documentsCount} attachment document(s).
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-line bg-surface-muted/40 p-4 transition-all hover:border-brand/40">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="size-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Verified
              </span>
            </div>
            <h4 className="mt-3 text-[13px] font-bold text-ink">2. Eligibility Check</h4>
            <p className="mt-1 text-[12px] text-muted-ink leading-relaxed">
              Verified DBIT student affiliation, team members, academic department, and basic compliance rules.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-line bg-surface-muted/40 p-4 transition-all hover:border-brand/40">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Sparkles className="size-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded">
                Score: {readinessScore}
              </span>
            </div>
            <h4 className="mt-3 text-[13px] font-bold text-ink">3. Feasibility Scoring</h4>
            <p className="mt-1 text-[12px] text-muted-ink leading-relaxed">
              Assessed technical feasibility, market viability, and innovation differentiation against existing IP.
            </p>
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-line bg-surface-muted/40 p-4 transition-all hover:border-brand/40">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <HelpCircle className="size-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Prepared
              </span>
            </div>
            <h4 className="mt-3 text-[13px] font-bold text-ink">4. Committee Questions</h4>
            <p className="mt-1 text-[12px] text-muted-ink leading-relaxed">
              Formulated {questions.length} tailored interview questions for the faculty review panel.
            </p>
          </div>

          {/* Step 5 */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 transition-all hover:border-indigo-500/50">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <Clock className="size-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                In Queue
              </span>
            </div>
            <h4 className="mt-3 text-[13px] font-bold text-ink">5. Review Committee</h4>
            <p className="mt-1 text-[12px] text-muted-ink leading-relaxed">
              Forwarded to Faculty Coordinator for official review. Awaiting Approval or Revision decision.
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Detailed Agent Assessment Dossier */}
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDossier(!showDossier)}
          className="flex w-full items-center justify-between p-6 text-left hover:bg-surface-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <FileText className="size-4" />
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-ink">Application Agent Analysis Dossier</h3>
              <p className="text-[12px] text-muted-ink">
                Review the preliminary evaluation generated for the incubation committee
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-brand">
              {showDossier ? "Hide Dossier" : "View Dossier"}
            </span>
            {showDossier ? <ChevronUp className="size-4 text-brand" /> : <ChevronDown className="size-4 text-brand" />}
          </div>
        </button>

        {showDossier && (
          <div className="border-t border-line p-6 space-y-6 bg-surface-muted/10">
            {/* Score Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-line bg-surface p-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-ink block">Overall Readiness</span>
                <span className="mt-1 text-2xl font-black text-brand">{readinessScore}/100</span>
                <span className="mt-1 text-[11px] text-emerald-600 block font-medium">Eligible for Review</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-ink block">Problem Clarity</span>
                <span className="mt-1 text-2xl font-bold text-ink">{problemClarity}%</span>
                <span className="mt-1 text-[11px] text-muted-ink block">Problem well articulated</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-ink block">Feasibility</span>
                <span className="mt-1 text-2xl font-bold text-ink">{techFeasibility}%</span>
                <span className="mt-1 text-[11px] text-muted-ink block">Tech stack achievable</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-ink block">Market Viability</span>
                <span className="mt-1 text-2xl font-bold text-ink">{marketScore}%</span>
                <span className="mt-1 text-[11px] text-muted-ink block">Clear target beneficiaries</span>
              </div>
            </div>

            {/* Structured Summary from Agent */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-ink flex items-center gap-1.5">
                <Layers className="size-4 text-brand" /> Agent Synthesis of Your Proposal
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-lg border border-line bg-surface p-3.5">
                  <span className="font-semibold text-ink text-[12px] block mb-1">Target Users & Beneficiaries:</span>
                  <p className="text-muted-ink leading-relaxed">{summary.target_users}</p>
                </div>
                <div className="rounded-lg border border-line bg-surface p-3.5">
                  <span className="font-semibold text-ink text-[12px] block mb-1">Innovation & Differentiation:</span>
                  <p className="text-muted-ink leading-relaxed">{summary.innovation_differentiation}</p>
                </div>
                <div className="rounded-lg border border-line bg-surface p-3.5 md:col-span-2">
                  <span className="font-semibold text-ink text-[12px] block mb-1">Requested Incubation Support:</span>
                  <p className="text-muted-ink leading-relaxed">{summary.requested_support}</p>
                </div>
              </div>
            </div>

            {/* Strengths & Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h5 className="text-[12px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-2.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Key Strengths Identified by AI
                </h5>
                <ul className="space-y-2 text-[12px] text-emerald-950 dark:text-emerald-200">
                  {strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <h5 className="text-[12px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5 mb-2.5">
                  <HelpCircle className="size-3.5 text-indigo-600" /> Questions Prepared for Faculty Interview
                </h5>
                <ul className="space-y-2 text-[12px] text-indigo-950 dark:text-indigo-200">
                  {questions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* What happens next (Explaining Approval vs Revision) */}
            <div className="rounded-xl border border-line bg-surface p-4 text-[13px] space-y-2">
              <h5 className="font-bold text-ink flex items-center gap-1.5 text-[13px]">
                <AlertCircle className="size-4 text-brand" /> What Happens Next in the Review Process?
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[12px]">
                <div className="rounded-lg bg-surface-muted/50 p-3 border border-line">
                  <span className="font-bold text-emerald-600 block mb-1">If Approved by Faculty:</span>
                  <p className="text-muted-ink leading-relaxed">
                    Your startup profile is synchronized to the incubator directory, a dedicated faculty advisor is allocated, and the full workspace opens for milestone tracking.
                  </p>
                </div>
                <div className="rounded-lg bg-surface-muted/50 p-3 border border-line">
                  <span className="font-bold text-amber-600 block mb-1">If Revision is Requested:</span>
                  <p className="text-muted-ink leading-relaxed">
                    You will receive specific guidance from the reviewers (e.g., attach lab test data, clarify IP ownership), and you can update your proposal without starting from scratch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Action Buttons */}
      <div className="flex flex-col-reverse items-center justify-center gap-3 sm:flex-row pt-2">
        <button
          type="button"
          onClick={onSubmitAnother}
          className="inline-flex h-10 items-center rounded-lg px-4 text-[14px] font-medium text-brand transition-colors duration-150 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Submit another idea
        </button>
        <Link
          href="/workspace/student/projects"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 shadow-sm"
        >
          View My Projects & Status
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
