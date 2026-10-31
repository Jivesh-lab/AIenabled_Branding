import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/shared/Surface";

const STAGES = [
  { id: "1", label: "Idea Submitted" },
  { id: "2", label: "Faculty Review" },
  { id: "3", label: "Department Review" },
  { id: "4", label: "Incubation Review" },
  { id: "5", label: "In Development" },
  { id: "6", label: "Market Ready" },
  { id: "7", label: "Startup / Product" },
];

export default function IncubationJourney({ projects = [] }: { projects?: any[] }) {
  // Determine highest reached stage from student's projects
  const hasProjects = projects.length > 0;
  const highestStageIndex = !hasProjects
    ? -1
    : Math.min(
        STAGES.length - 1,
        Math.max(
          0,
          projects.reduce((maxIdx, p) => {
            const stageName = (p.stage || "").toLowerCase();
            if (stageName.includes("product") || stageName.includes("startup")) return Math.max(maxIdx, 6);
            if (stageName.includes("market")) return Math.max(maxIdx, 5);
            if (stageName.includes("development")) return Math.max(maxIdx, 4);
            if (stageName.includes("incubation")) return Math.max(maxIdx, 3);
            if (stageName.includes("department")) return Math.max(maxIdx, 2);
            if (stageName.includes("faculty")) return Math.max(maxIdx, 1);
            return Math.max(maxIdx, 0);
          }, 0)
        )
      );

  const stagesWithState = STAGES.map((st, i) => {
    let state: "complete" | "current" | "upcoming" = "upcoming";
    if (highestStageIndex >= 0) {
      if (i < highestStageIndex) state = "complete";
      else if (i === highestStageIndex) state = "current";
    }
    return { ...st, state };
  });

  const DOT: Record<"complete" | "current" | "upcoming", string> = {
    complete: "border-brand-cyan bg-brand-cyan",
    current: "border-brand bg-brand ring-4 ring-brand-cyan-soft",
    upcoming: "border-line bg-white",
  };

  const LABEL: Record<"complete" | "current" | "upcoming", string> = {
    complete: "text-ink",
    current: "font-semibold text-brand",
    upcoming: "text-muted-ink",
  };

  return (
    <section aria-label="Incubation journey">
      <SectionHeading
        title="Incubation Journey"
        action={{ label: "View timeline", href: "/workspace/student/journey" }}
      />

      <Card className="p-5 sm:p-6">
        {/* Desktop — horizontal stepper */}
        <ol className="hidden items-start md:flex">
          {stagesWithState.map((stage, i) => (
            <li key={stage.id} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-0.5 flex-1",
                    i <= highestStageIndex ? "bg-brand-cyan" : "bg-line",
                    i === 0 && "invisible"
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn("size-3 shrink-0 rounded-full border-2", DOT[stage.state])}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-0.5 flex-1",
                    i < highestStageIndex ? "bg-brand-cyan" : "bg-line",
                    i === stagesWithState.length - 1 && "invisible"
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2.5 px-1 text-center text-[11px] leading-tight",
                  LABEL[stage.state]
                )}
              >
                {stage.label}
              </span>
            </li>
          ))}
        </ol>

        {/* Mobile — vertical timeline */}
        <ol className="flex flex-col md:hidden">
          {stagesWithState.map((stage, i) => (
            <li key={stage.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={cn("size-3 shrink-0 rounded-full border-2", DOT[stage.state])}
                />
                {i < stagesWithState.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "w-0.5 flex-1",
                      i < highestStageIndex ? "bg-brand-cyan" : "bg-line"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[13px] leading-none",
                  LABEL[stage.state],
                  i < stagesWithState.length - 1 && "pb-5"
                )}
              >
                {stage.label}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
