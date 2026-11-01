import Link from "next/link";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The one "Recent Activity" timeline used across the portal: a hairline spine, a softly tinted icon node per entry,
 * the event on top (who / what, in ink) and its date beneath (muted). Colour is deliberately quiet; it only
 * distinguishes the kind of event and never competes with the page's primary actions.
 */

export type ActivityTone = "neutral" | "info" | "success" | "attention" | "teal";

const NODE_TONE: Record<ActivityTone, string> = {
  neutral: "border-line bg-canvas text-icon",
  info: "border-brand/15 bg-brand-soft text-brand",
  success: "border-success/20 bg-success/10 text-success",
  attention: "border-brand-gold/25 bg-brand-gold/10 text-brand-gold-ink",
  teal: "border-brand-cyan/20 bg-brand-cyan-soft/60 text-brand-cyan-ink",
};

export interface ActivityEntry {
  id: string;
  /** The event itself, e.g. <><strong>Priya</strong> updated a milestone</>. */
  title: React.ReactNode;
  /** Date / time / actor, shown muted under the title. */
  meta?: string;
  icon?: React.ElementType;
  tone?: ActivityTone;
  /** Makes the whole entry a link. */
  href?: string;
  /** A small status badge shown after the title. */
  badge?: React.ReactNode;
}

function Row({ entry }: { entry: ActivityEntry }) {
  const Icon = entry.icon ?? CheckCircleIcon;
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border", NODE_TONE[entry.tone ?? "neutral"])}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug text-ink">
          <span className="min-w-0">{entry.title}</span>
          {entry.badge}
        </span>
        {entry.meta && <span className="mt-0.5 block text-[12px] text-muted-ink">{entry.meta}</span>}
      </span>
    </>
  );

  return entry.href ? (
    <Link
      href={entry.href}
      className="flex items-start gap-3 rounded-lg py-2.5 pr-2 outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      {body}
    </Link>
  ) : (
    <div className="flex items-start gap-3 py-2.5">{body}</div>
  );
}

/** Placeholder rows with the same footprint as real entries. */
export function ActivityTimelineSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading activity" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ActivityTimeline({
  entries,
  loading = false,
  emptyMessage = "No recent activity yet.",
  skeletonRows = 4,
  className,
}: {
  entries: ActivityEntry[];
  loading?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  className?: string;
}) {
  if (loading) return <ActivityTimelineSkeleton rows={skeletonRows} />;
  if (entries.length === 0) {
    return <p className={cn("py-4 text-center text-[13px] text-muted-ink", className)}>{emptyMessage}</p>;
  }
  return (
    <ol className={cn("relative flex flex-col", className)}>
      {/* The spine runs behind the nodes, from the first node's centre to the last. */}
      {entries.length > 1 && <span aria-hidden="true" className="absolute bottom-6 left-4 top-6 w-px -translate-x-1/2 bg-line" />}
      {entries.map((entry) => (
        <li key={entry.id}>
          <Row entry={entry} />
        </li>
      ))}
    </ol>
  );
}
