"use client";

import { Bot, Hourglass, UserRound } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { ErrorState, ListItemSkeleton } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import { AGENTIC, useAgentic, type AgentWork } from "@/lib/agentic";

/**
 * "What your agents are doing" - one plain sentence per open piece of agent work for the signed-in person,
 * saying who the agent is waiting for. Empty states explain what happens next.
 */
export default function AgentStrip({ title = "What your agents are doing", className }: { title?: string; className?: string }) {
  const { data, error, loading, reload } = useAgentic<AgentWork[]>(`${AGENTIC}/my-agents`, { refreshMs: 15000 });

  return (
    <section aria-label={title} className={className}>
      <SectionHeading title={title} />
      <Card>
        {loading && !data ? (
          <div className="divide-y divide-line"><ListItemSkeleton /></div>
        ) : error && !data ? (
          <ErrorState title="Could not load this" message={error} onRetry={reload} />
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.map((work) => {
              const onYou = work.waitingOn === "you";
              return (
                <li key={work.id} className="flex gap-3 px-4 py-3.5">
                  <span aria-hidden="true" className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", onYou ? "bg-brand-gold/15 text-brand-gold-ink" : "bg-brand-soft text-brand")}>
                    {onYou ? <UserRound className="size-4" /> : <Hourglass className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug text-ink"><span className="font-semibold">{work.agent}</span> - {work.headline.charAt(0).toLowerCase() + work.headline.slice(1)}</p>
                    {work.detail && <p className="mt-0.5 text-[12.5px] text-muted-ink">{work.detail}</p>}
                    {onYou && <p className="mt-1 text-[12px] font-medium text-brand-gold-ink">This one needs you.</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-start gap-3 px-4 py-5">
            <Bot className="mt-0.5 size-5 shrink-0 text-muted-ink/60" aria-hidden="true" />
            <div>
              <p className="text-[13.5px] font-medium text-ink">No agent is waiting on anything right now.</p>
              <p className="mt-0.5 max-w-xl text-[12.5px] text-muted-ink">
                When you submit an application, the Application Agent checks it and tells you exactly what is missing. After approval, the Mentor-Matching Agent asks mentors for you, and the Workflow Agent books your first meeting. You will see each step here.
              </p>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
