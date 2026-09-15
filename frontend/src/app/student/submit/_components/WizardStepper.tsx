"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, type StepIndex } from "../_lib/idea-schema";

/**
 * Compact step indicator. Steps the student has already reached are buttons
 * (click to edit); steps not yet reached are inert.
 *
 * completed → cyan check · current → primary blue · upcoming → muted
 */
export default function WizardStepper({
  current,
  furthest,
  onSelect,
}: {
  current: StepIndex;
  furthest: StepIndex;
  onSelect: (step: StepIndex) => void;
}) {
  return (
    <nav aria-label="Submission progress">
      {/* Mobile: a single line — full labels do not fit four across */}
      <p className="text-[13px] text-muted-ink sm:hidden">
        Step <span className="font-semibold text-ink">{current + 1}</span> of {WIZARD_STEPS.length}
        <span className="mx-1.5 text-line">|</span>
        <span className="font-medium text-brand">{WIZARD_STEPS[current].title}</span>
      </p>

      <ol className="hidden items-center gap-2 sm:flex">
        {WIZARD_STEPS.map((step, i) => {
          const index = i as StepIndex;
          const isCurrent = index === current;
          const isComplete = index < furthest && !isCurrent;
          const isReachable = index <= furthest;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => onSelect(index)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex min-w-0 items-center gap-2 rounded-md py-1 pr-1.5 text-left outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand/40",
                  isReachable && !isCurrent ? "cursor-pointer" : "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-150",
                    isCurrent && "bg-brand text-white",
                    isComplete && "bg-brand-cyan text-white",
                    !isCurrent && !isComplete && "border border-line bg-white text-muted-ink"
                  )}
                >
                  {isComplete ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-[13px] transition-colors duration-150",
                    isCurrent ? "font-semibold text-ink" : "font-medium text-muted-ink",
                    isReachable && !isCurrent && "group-hover:text-brand"
                  )}
                >
                  {step.title}
                </span>
              </button>

              {i < WIZARD_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn("h-px min-w-3 flex-1", index < furthest ? "bg-brand-cyan" : "bg-line")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
