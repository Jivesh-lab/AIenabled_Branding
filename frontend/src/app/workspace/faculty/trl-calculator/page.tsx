"use client";

import { useState, useCallback } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, ProgressBar } from "@/components/shared/Surface";
import {
  Microscope,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Save,
  Printer,
} from "lucide-react";

const TRL_LEVELS = [
  {
    level: 1,
    title: "Basic Principles Observed",
    description: "Scientific research begins. Basic properties of the technology are observed and reported. No practical applications considered yet.",
    examples: ["Literature survey", "Hypothesis formation", "Initial lab observations"],
    questions: [
      "Have you identified and documented the fundamental scientific principles underlying your technology?",
      "Is there peer-reviewed literature supporting the feasibility of your concept?",
    ],
    color: "bg-red-100 text-red-800 border-red-200",
  },
  {
    level: 2,
    title: "Technology Concept Formulated",
    description: "Practical applications of the observed phenomena are proposed. The technology concept is now speculative but identified.",
    examples: ["Application conceptualization", "Speculative design docs", "Concept papers"],
    questions: [
      "Have you formulated a specific application for the basic principles observed?",
      "Can you describe how the technology could solve a real-world problem?",
    ],
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    level: 3,
    title: "Experimental Proof of Concept",
    description: "Active R&D is initiated. Studies and laboratory measurements validate the analytical predictions.",
    examples: ["Lab experiments", "Analytical models", "Proof-of-concept demos in lab"],
    questions: [
      "Have you conducted experiments that validate the technology concept?",
      "Do you have laboratory measurements supporting your analytical models?",
    ],
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  {
    level: 4,
    title: "Technology Validated in Lab",
    description: "The technology is validated in a laboratory environment. Basic components are integrated to establish the technology works.",
    examples: ["Integrated lab prototype", "Benchmarking against existing solutions", "Component integration"],
    questions: [
      "Have you integrated basic components of the technology into a working laboratory model?",
      "Have you benchmarked your prototype against existing solutions or baseline metrics?",
    ],
    color: "bg-lime-100 text-lime-800 border-lime-200",
  },
  {
    level: 5,
    title: "Technology Validated in Relevant Environment",
    description: "The basic technological components are integrated with reasonably realistic supporting elements. Validated in a simulated environment.",
    examples: ["Pilot environment testing", "Simulated real-world conditions", "Field-relevant benchmarks"],
    questions: [
      "Has your technology been tested in a simulated or representative environment?",
      "Have you identified and resolved key technical challenges at this stage?",
    ],
    color: "bg-green-100 text-green-800 border-green-200",
  },
  {
    level: 6,
    title: "Technology Demonstrated in Relevant Environment",
    description: "Prototype system near final form demonstrated in a relevant environment. Represents a major technology development milestone.",
    examples: ["Representative prototype", "Industry partner pilots", "Near-final system demo"],
    questions: [
      "Have you demonstrated a near-final prototype in a relevant operating environment?",
      "Have you received feedback from potential end-users or industry partners?",
    ],
    color: "bg-teal-100 text-teal-800 border-teal-200",
  },
  {
    level: 7,
    title: "System Prototype Demonstrated in Operational Environment",
    description: "Prototype near production-readiness demonstrated in an operational environment. Resolves most manufacturing issues.",
    examples: ["Pre-production prototype", "Operational environment testing", "System safety validation"],
    questions: [
      "Has your system prototype been demonstrated in a real operational environment?",
      "Have key manufacturing and engineering issues been resolved?",
    ],
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  {
    level: 8,
    title: "System Complete and Qualified",
    description: "Technology is proven to work in its final form. Qualified through tests and demonstrations in actual operational environments.",
    examples: ["Final system qualification", "Regulatory approvals", "Pre-commercial production"],
    questions: [
      "Has the final system been tested and qualified through comprehensive testing?",
      "Have you obtained necessary regulatory or safety certifications?",
    ],
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    level: 9,
    title: "Actual System Proven in Operational Environment",
    description: "The technology is in its final form and operated under full operational conditions. Commercial deployment achieved.",
    examples: ["Commercial deployment", "Market launch", "Revenue-generating operations"],
    questions: [
      "Is the technology commercially deployed and generating value?",
      "Have you validated the technology through successful operational missions or customer deployments?",
    ],
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
];

export default function TRLCalculatorPage() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  const setAnswer = useCallback((levelIdx: number, qIdx: number, val: boolean) => {
    setAnswers((prev) => ({ ...prev, [`${levelIdx}-${qIdx}`]: val }));
  }, []);

  // Calculate current TRL: highest level where all questions answered "yes"
  const currentTRL = (() => {
    for (let i = TRL_LEVELS.length - 1; i >= 0; i--) {
      const level = TRL_LEVELS[i];
      const allYes = level.questions.every((_, qi) => answers[`${i}-${qi}`] === true);
      if (allYes) return i + 1;
    }
    return 0;
  })();

  const progressPct = Math.round((currentTRL / 9) * 100);

  return (
    <PageContainer
      title="TRL Calculator"
      description="Assess the Technology Readiness Level (TRL) of your student's research project using a structured questionnaire aligned with DST/BIRAC standards."
    >
      <div className="space-y-6">
        {/* Current TRL Banner */}
        <div className="rounded-xl border border-brand/20 bg-gradient-to-r from-brand-deep to-brand p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">Current Assessment</p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black">TRL {currentTRL}</span>
                <span className="text-blue-200 text-sm mb-1.5">/ 9</span>
              </div>
              <p className="text-sm text-blue-100 mt-1">
                {currentTRL === 0 ? "Answer the questionnaire to determine your TRL" : TRL_LEVELS[currentTRL - 1]?.title}
              </p>
            </div>
            <div className="md:w-64">
              <p className="text-xs text-blue-200 mb-2">Technology Maturity</p>
              <div className="h-3 w-full rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-cyan transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-blue-200 mt-1 text-right">{progressPct}% ready</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-ink">
            <div className="size-3 rounded-full bg-success" /> Validated Level
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-ink">
            <div className="size-3 rounded-full bg-brand-gold" /> In Progress
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-ink">
            <div className="size-3 rounded-full bg-line" /> Not Started
          </div>
        </div>

        {/* TRL Level Questionnaire */}
        <div className="space-y-3">
          {TRL_LEVELS.map((level, levelIdx) => {
            const answeredYes = level.questions.filter((_, qi) => answers[`${levelIdx}-${qi}`] === true).length;
            const isComplete = answeredYes === level.questions.length;
            const isPartial = answeredYes > 0 && !isComplete;
            const isExpanded = expanded === levelIdx;

            return (
              <Card key={level.level} className={`overflow-hidden ${isComplete ? "border-success/30" : isPartial ? "border-brand-gold/30" : ""}`}>
                <div
                  className="p-4 cursor-pointer hover:bg-canvas/50 transition-colors flex items-start gap-4"
                  onClick={() => setExpanded(isExpanded ? null : levelIdx)}
                >
                  {/* TRL Badge */}
                  <div className={`shrink-0 size-10 rounded-lg flex items-center justify-center text-sm font-black border ${level.color}`}>
                    {level.level}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-ink">TRL {level.level}: {level.title}</h3>
                      {isComplete && <CheckCircle2 className="size-4 text-success shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-ink line-clamp-1">{level.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-line overflow-hidden max-w-32">
                        <div
                          className={`h-full rounded-full transition-all ${isComplete ? "bg-success" : "bg-brand-gold"}`}
                          style={{ width: `${(answeredYes / level.questions.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-ink">{answeredYes}/{level.questions.length} criteria met</span>
                    </div>
                  </div>

                  {isExpanded ? <ChevronUp className="size-4 text-muted-ink shrink-0 mt-1" /> : <ChevronDown className="size-4 text-muted-ink shrink-0 mt-1" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-line p-5 bg-canvas/50 space-y-5">
                    <p className="text-xs text-muted-ink leading-relaxed">{level.description}</p>

                    <div>
                      <p className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5">
                        <HelpCircle className="size-3.5 text-brand" /> Assessment Questions
                      </p>
                      <div className="space-y-3">
                        {level.questions.map((q, qi) => (
                          <div key={qi} className="p-3 rounded-lg bg-white border border-line">
                            <p className="text-xs text-ink mb-2 leading-relaxed">{q}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setAnswer(levelIdx, qi, true)}
                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${answers[`${levelIdx}-${qi}`] === true ? "bg-success text-white" : "border border-line text-muted-ink hover:border-success hover:text-success"}`}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setAnswer(levelIdx, qi, false)}
                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${answers[`${levelIdx}-${qi}`] === false ? "bg-danger text-white" : "border border-line text-muted-ink hover:border-danger hover:text-danger"}`}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5">
                        <Info className="size-3.5 text-brand-cyan" /> Typical Evidence at this Level
                      </p>
                      <ul className="space-y-1">
                        {level.examples.map((ex) => (
                          <li key={ex} className="text-xs text-muted-ink flex items-start gap-2">
                            <span className="mt-1 size-1.5 rounded-full bg-brand-cyan shrink-0" /> {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Export */}
        <div className="flex justify-end gap-2">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
            <Printer className="size-3.5" /> Print Report
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
            <Save className="size-3.5" /> Save Assessment
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
