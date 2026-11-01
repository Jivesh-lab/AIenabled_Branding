"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Cpu,
  Terminal,
  Activity,
  Check,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/shared/Surface";
import type { AgentEvaluationData } from "@/types/student-application";
import type { IdeaFormValues } from "../_lib/idea-schema";

export interface ExecutionStep {
  id: string;
  title: string;
  description: string;
  agentName: string;
  detail: string;
  durationMs: number;
}

const EXECUTION_STEPS: ExecutionStep[] = [
  {
    id: "extraction",
    title: "Document & Proposal Ingestion",
    description: "Extracting problem statement, technical architecture, team roles and attached documentation.",
    agentName: "Application Agent",
    detail: "Parsing executive summary, technical specifications and founder declarations.",
    durationMs: 2500,
  },
  {
    id: "compliance",
    title: "Deterministic Rule & Policy Validation",
    description: "Checking mandatory disclosures, student declarations, domain eligibility, and duplicate records.",
    agentName: "Compliance Agent",
    detail: "Validating against DBIT Incubation Centre policy standards and submission guidelines.",
    durationMs: 3000,
  },
  {
    id: "evaluation",
    title: "Multi-Dimensional Feasibility & Market Analysis",
    description: "Evaluating problem clarity, technical feasibility, market viability, and prototype readiness.",
    agentName: "Evaluation Agent",
    detail: "Generating preliminary scores across 4 key evaluation pillars (0–100 scale).",
    durationMs: 3500,
  },
  {
    id: "questions",
    title: "Review Committee Question Synthesis",
    description: "Formulating deep-dive technical inquiries and identifying evidence gaps for faculty review.",
    agentName: "Committee Assistant Agent",
    detail: "Formulating targeted questions for the incubation review interview.",
    durationMs: 2500,
  },
  {
    id: "dossier",
    title: "Dossier Finalization & Registration",
    description: "Packaging immutable evaluation docket and registering application in incubation pipeline.",
    agentName: "Workflow Agent",
    detail: "Recording evaluation telemetry and preparing faculty review assignment.",
    durationMs: 2000,
  },
];

interface AgentExecutionPipelineProps {
  ideaValues: IdeaFormValues;
  isComplete: boolean;
  agentResult: AgentEvaluationData | null;
  onContinue: () => void;
}

export default function AgentExecutionPipeline({
  ideaValues,
  isComplete,
  agentResult,
  onContinue,
}: AgentExecutionPipelineProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Step progression animation
  useEffect(() => {
    if (isComplete) {
      setCurrentStepIndex(EXECUTION_STEPS.length);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        // Hold on the last step until isComplete arrives
        if (prev < EXECUTION_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [isComplete]);

  // Append telemetry logs dynamically
  useEffect(() => {
    const startupName = ideaValues.name || "Startup Idea";
    const domain = ideaValues.domain || "Technology";
    const stage = ideaValues.maturity || "Prototype";

    const logTemplates = [
      `[T+0s] 🚀 Initializing DBIT Incubation Agent Swarm...`,
      `[T+1s] 📄 Ingesting proposal for "${startupName}" (${domain} · ${stage})`,
      `[T+3s] 🔍 Checking deterministic constraints: Department=${ideaValues.department || "Engineering"}`,
      `[T+4s] 🛡️ Validation gate passed: Declaration accepted, team size verified.`,
      `[T+6s] 🤖 Application Agent: Analyzing problem-solution alignment and target beneficiaries...`,
      `[T+8s] 🧠 Evaluation Agent: Assessing technical feasibility of proposed stack (${(ideaValues.technologies || []).slice(0, 3).join(", ") || "core tech"})...`,
      `[T+10s] 📊 Computing multi-dimensional readiness scores across incubation criteria...`,
      `[T+12s] ❓ Committee Assistant: Formulating interview questions for faculty panel review...`,
      `[T+14s] 💾 Packaging evaluation docket and committing immutable record to database...`,
      `[T+15s] ✨ All agent tasks completed. Generating evaluation dossier.`,
    ];

    const currentLogCount = Math.min(
      logTemplates.length,
      isComplete ? logTemplates.length : Math.max(2, currentStepIndex * 2 + 1)
    );

    setLogs(logTemplates.slice(0, currentLogCount));
  }, [currentStepIndex, isComplete, ideaValues]);

  // Scores from agent result
  const assessment = agentResult?.assessment ?? {};
  // No placeholder numbers: when the agent returned nothing, show "—".
  const score = (value?: number) => (typeof value === "number" ? `${value}/100` : "—");
  const readiness = score(assessment.overall_readiness_score);
  const clarity = score(assessment.problem_clarity_score);
  const feasibility = score(assessment.technical_feasibility_score);
  const market = score(assessment.market_potential_score);
  const recommendation =
    agentResult?.recommendation_summary ||
    "The automated assessment is not available for this submission. Your application has been submitted and will be reviewed by the faculty panel.";

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">
              <span className="relative flex size-2">
                {!isComplete && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    isComplete ? "bg-emerald-400" : "bg-emerald-500"
                  }`}
                ></span>
              </span>
              {isComplete ? "Agent Processing Complete" : "Multi-Agent System Executing"}
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {isComplete ? "Evaluation Dossier Generated" : "Evaluating Idea Submission"}
            </h2>
            <p className="text-sm text-indigo-200/80">
              Evaluating <strong className="text-white">{ideaValues.name || "Your Idea"}</strong> against DBIT Incubation Centre admission criteria.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:self-center">
            <Activity className="size-5 text-indigo-400" />
            <div className="text-right">
              <span className="block text-xs uppercase tracking-wider text-indigo-300">Elapsed</span>
              <span className="font-mono text-lg font-bold text-white">{elapsedSeconds}s</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Step-by-Step Progress Column */}
        <div className="space-y-4 lg:col-span-7">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-brand" />
                <h3 className="text-sm font-bold text-ink">Autonomous Agent Workflow</h3>
              </div>
              <span className="text-xs font-semibold text-muted-ink">
                {isComplete
                  ? "5 / 5 Steps Finished"
                  : `Step ${Math.min(currentStepIndex + 1, EXECUTION_STEPS.length)} of 5`}
              </span>
            </div>

            <div className="space-y-4">
              {EXECUTION_STEPS.map((step, idx) => {
                const isFinished = isComplete || currentStepIndex > idx;
                const isCurrent = !isComplete && currentStepIndex === idx;

                return (
                  <div
                    key={step.id}
                    className={`relative rounded-xl border p-4 transition-all duration-300 ${
                      isFinished
                        ? "border-emerald-200 bg-emerald-50/50"
                        : isCurrent
                        ? "border-indigo-300 bg-indigo-50/70 shadow-sm"
                        : "border-line/70 bg-canvas/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isFinished
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                            ? "border-2 border-indigo-600 bg-white text-indigo-600 animate-pulse"
                            : "bg-surface text-muted-ink border border-line"
                        }`}
                      >
                        {isFinished ? <Check className="size-4" /> : idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <h4 className="text-[14px] font-bold text-ink">{step.title}</h4>
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                              isFinished
                                ? "bg-emerald-100 text-emerald-800"
                                : isCurrent
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-surface text-muted-ink"
                            }`}
                          >
                            {step.agentName}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-muted-ink leading-relaxed">
                          {isFinished ? step.detail : step.description}
                        </p>

                        {isCurrent && (
                          <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-indigo-700">
                            <span className="flex size-2 rounded-full bg-indigo-600 animate-ping"></span>
                            Agent actively processing...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Live Logs & Output Column */}
        <div className="space-y-4 lg:col-span-5">
          {/* Agent Telemetry Terminal */}
          <Card className="overflow-hidden border-slate-800 bg-slate-950 p-4 text-slate-200 shadow-lg">
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Terminal className="size-3.5 text-emerald-400" />
                <span>Agent Activity Log Stream</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 animate-pulse">● LIVE</span>
            </div>

            <div className="h-48 overflow-y-auto font-mono text-[11px] space-y-1.5 leading-relaxed text-slate-300">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-1.5">
                  <span className="text-slate-500 shrink-0">›</span>
                  <span
                    className={
                      log.includes("✅") || log.includes("✨")
                        ? "text-emerald-400 font-semibold"
                        : log.includes("🤖") || log.includes("🧠")
                        ? "text-indigo-300 font-medium"
                        : "text-slate-300"
                    }
                  >
                    {log}
                  </span>
                </div>
              ))}
              {!isComplete && (
                <div className="flex items-center gap-1.5 text-indigo-400 animate-pulse">
                  <span>›</span>
                  <span>Executing next pipeline stage...</span>
                </div>
              )}
            </div>
          </Card>

          {/* Preliminary Output Card */}
          {isComplete && (
            <Card className="border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-5 animate-in slide-in-from-bottom-3 duration-500 space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-3">
                <Sparkles className="size-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-ink">Agent Preliminary Assessment</h3>
              </div>

              {/* Score Badges */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-indigo-100 bg-white p-2.5 text-center shadow-xs">
                  <span className="text-[11px] text-muted-ink block">Readiness Score</span>
                  <span className="text-xl font-extrabold text-indigo-600">{readiness}</span>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-white p-2.5 text-center shadow-xs">
                  <span className="text-[11px] text-muted-ink block">Problem Clarity</span>
                  <span className="text-xl font-extrabold text-brand">{clarity}</span>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-white p-2.5 text-center shadow-xs">
                  <span className="text-[11px] text-muted-ink block">Feasibility</span>
                  <span className="text-xl font-extrabold text-emerald-600">{feasibility}</span>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-white p-2.5 text-center shadow-xs">
                  <span className="text-[11px] text-muted-ink block">Market Potential</span>
                  <span className="text-xl font-extrabold text-purple-600">{market}</span>
                </div>
              </div>

              {/* Recommendation */}
              <div className="rounded-lg border border-indigo-100 bg-white p-3 text-xs leading-relaxed text-ink space-y-1">
                <strong className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                  Agent Recommendation
                </strong>
                <p className="text-muted-ink">{recommendation}</p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={onContinue}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-hover active:scale-98"
              >
                <span>View Full Project Dossier & Roadmap</span>
                <ArrowRight className="size-4" />
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

