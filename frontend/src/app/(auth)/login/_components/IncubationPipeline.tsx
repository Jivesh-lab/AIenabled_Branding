/**
 * IncubationPipeline
 * Restrained visual showing the AAI–DBITIC innovation lifecycle:
 * Idea → Research → Prototype → Incubation → Impact
 *
 * Lives at the bottom of the LoginBrandPanel.
 * No animations — purely decorative/informational.
 */

import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  "Idea",
  "Research",
  "Prototype",
  "Incubation",
  "Impact",
] as const;

export default function IncubationPipeline() {
  return (
    <div className="flex flex-wrap items-center gap-y-2 text-xs font-medium text-slate-400">
      {PIPELINE_STAGES.map((stage, index) => (
        <div key={stage} className="flex items-center">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 border text-[11px] tracking-wide",
              index === 0
                ? "border-blue-400/40 text-blue-300 bg-blue-900/30"
                : index === PIPELINE_STAGES.length - 1
                  ? "border-emerald-400/40 text-emerald-300 bg-emerald-900/30"
                  : "border-slate-600/50 text-slate-400 bg-slate-800/40"
            )}
          >
            {stage}
          </span>
          {index < PIPELINE_STAGES.length - 1 && (
            <div
              className="w-4 h-px bg-slate-600 mx-1"
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}
