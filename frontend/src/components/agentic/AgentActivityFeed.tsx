"use client";

import { Activity, CalendarClock, ClipboardCheck, Handshake, Radar, Sparkles, UserSearch, Bot } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { EmptyState, ErrorState, ListItemSkeleton } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import { AGENTIC, timeAgo, useAgentic, type FeedItem } from "@/lib/agentic";

const AGENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Application Agent": ClipboardCheck,
  "Mentor-Matching Agent": UserSearch,
  "Workflow Agent": CalendarClock,
  "Monitoring Agent": Radar,
  "Investor Agent": Handshake,
  "Incubation Assistant": Sparkles,
  Scheduler: Activity,
};

const STATUS_STYLE: Record<FeedItem["status"], string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  simulated: "bg-amber-50 text-amber-800 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  pending_approval: "bg-blue-50 text-blue-700 border-blue-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  skipped: "bg-slate-50 text-slate-600 border-slate-200",
};

function FeedRow({ item }: { item: FeedItem }) {
  const Icon = AGENT_ICON[item.agent] ?? Bot;
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-ink">{item.summary}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-ink">
          <span className="font-medium text-ink/80">{item.agent}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.at} title={new Date(item.at).toLocaleString()}>{timeAgo(item.at)}</time>
          <span aria-hidden="true">·</span>
          <span>{item.trigger}</span>
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[item.status])}>{item.statusLabel}</span>
        </div>
        {item.followUp && (
          <p className="mt-1.5 text-[12px] text-muted-ink">
            <span className="font-medium text-ink/80">What happens next: </span>
            {item.followUp}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The human-readable Action Log: what the agents did, because of what, with what result and what follows.
 * It refreshes by itself, so a page left open fills as the agents work.
 */
export default function AgentActivityFeed({
  title = "Agent activity",
  projectId,
  limit = 12,
  emptyTitle = "No agent activity yet",
  emptyMessage = "As soon as an agent does something for you - checking an application, asking a mentor, booking a meeting - it appears here with the result and what happens next.",
  className,
}: {
  title?: string;
  projectId?: string;
  limit?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
}) {
  const query = `${AGENTIC}/feed?limit=${limit}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""}`;
  const { data, error, loading, reload } = useAgentic<FeedItem[]>(query);

  return (
    <section aria-label={title} className={className}>
      <SectionHeading title={title} />
      <Card>
        {loading && !data ? (
          <div className="divide-y divide-line"><ListItemSkeleton /><ListItemSkeleton /><ListItemSkeleton /></div>
        ) : error && !data ? (
          <ErrorState title="Could not load activity" message={error} onRetry={reload} />
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-line">{data.map((item) => <FeedRow key={item.id} item={item} />)}</ul>
        ) : (
          <EmptyState title={emptyTitle} description={emptyMessage} />
        )}
      </Card>
    </section>
  );
}
