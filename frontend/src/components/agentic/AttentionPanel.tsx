"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { EmptyState, ErrorState, ListItemSkeleton } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import { AGENTIC, timeAgo, useAgentic, type AttentionItem } from "@/lib/agentic";

const STATE_LABEL: Record<string, { label: string; tone: "danger" | "attention" | "neutral" }> = {
  escalated: { label: "Needs a person", tone: "attention" },
  failed: { label: "Agent gave up", tone: "danger" },
  retrying: { label: "Retrying", tone: "neutral" },
};

function Row({ item }: { item: AttentionItem }) {
  const [open, setOpen] = useState(false);
  const state = STATE_LABEL[item.state] ?? { label: item.state, tone: "neutral" as const };
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={state.label} tone={state.tone} />
        {item.startup && <span className="text-[12.5px] font-medium text-ink">{item.startup}</span>}
        <span className="text-[11.5px] text-muted-ink">{item.agent} · updated {timeAgo(item.updatedAt)}</span>
      </div>
      <p className="mt-1.5 text-[13.5px] text-ink">{item.headline}</p>
      {item.detail && <p className="mt-0.5 text-[12.5px] text-muted-ink">{item.detail}</p>}
      {item.attempts.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
            {open ? "Hide what was tried" : `What the agents tried (${item.attempts.length})`}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
          {open && (
            <ol className="mt-2 space-y-1.5 border-l-2 border-line pl-3">
              {item.attempts.map((a) => (
                <li key={a.id} className="text-[12.5px] text-ink">
                  {a.summary}
                  <span className="ml-1.5 text-muted-ink">{timeAgo(a.at)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </li>
  );
}

/** Things the agents tried and could not resolve, with the attempts made as evidence. */
export default function AttentionPanel({
  title = "Needs attention",
  emptyMessage = "Agents handle routine follow-ups themselves. When one cannot resolve something - a mentor who never replies, a startup gone quiet - it is raised here with what was already tried.",
  className,
}: {
  title?: string;
  emptyMessage?: string;
  className?: string;
}) {
  const { data, error, loading, reload } = useAgentic<AttentionItem[]>(`${AGENTIC}/attention`);
  return (
    <section aria-label={title} className={className}>
      <SectionHeading title={title} />
      <Card>
        {loading && !data ? (
          <div className="divide-y divide-line"><ListItemSkeleton /><ListItemSkeleton /></div>
        ) : error && !data ? (
          <ErrorState title="Could not load this" message={error} onRetry={reload} />
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-line">{data.map((item) => <Row key={item.id} item={item} />)}</ul>
        ) : (
          <EmptyState icon={AlertTriangle} title="Nothing needs your attention" description={emptyMessage} />
        )}
      </Card>
    </section>
  );
}
