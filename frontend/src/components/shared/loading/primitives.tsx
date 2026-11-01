import Link from "next/link";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/shared/Surface";
import { cn } from "@/lib/utils";

/**
 * Shared loading / empty / error building blocks. Skeletons mirror the dimensions of the components they stand in
 * for, so content does not jump when data arrives. None of them contain data.
 */

/** Wraps a skeleton group so assistive tech announces one "loading" instead of every block. */
export function LoadingRegion({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonText({ lines = 2, widths, className }: { lines?: number; widths?: string[]; className?: string }) {
  const defaults = ["w-full", "w-4/5", "w-3/5"];
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3", widths?.[i] ?? defaults[i % defaults.length])} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("size-8 shrink-0 rounded-full", className)} />;
}

/** Card shell with the same radius/border/padding as the real cards. */
export function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <Card className={cn("p-5", className)}>{children}</Card>;
}

export function SectionHeadingSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <Skeleton className="h-5 w-36" />
      {withAction && <Skeleton className="h-4 w-16" />}
    </div>
  );
}

export function PageHeadingSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-7 w-56 sm:w-72" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <SkeletonCard className="flex h-[112px] items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="size-10 shrink-0 rounded-lg" />
    </SkeletonCard>
  );
}

export function ProjectCardSkeleton() {
  return (
    <SkeletonCard className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <Skeleton className="h-3 w-44" />
      <div className="space-y-2">
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </SkeletonCard>
  );
}

export function ListItemSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <Skeleton className="mt-1 size-3 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {withAction ? <Skeleton className="h-8 w-14 rounded-lg" /> : <Skeleton className="h-3 w-14" />}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <SkeletonCard className="p-0">
      <div className="grid gap-4 border-b border-line px-5 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-4 border-b border-line px-5 py-4 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className={cn("h-3", c === 0 ? "w-4/5" : "w-3/5")} />
          ))}
        </div>
      ))}
    </SkeletonCard>
  );
}

/** Small inline spinner for buttons ("Saving…"). */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden="true" className={cn("size-4 animate-spin motion-reduce:animate-none", className)} />;
}

/** "Taking longer than usual" note shown after a long wait. */
export function SlowNotice({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <p role="status" className={cn("text-[13px] text-muted-ink", className)}>
      Taking longer than usual…
    </p>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-8 text-center", className)}>
      {Icon && <Icon className="mb-2 size-7 text-muted-ink/50" aria-hidden="true" />}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted-ink">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-3 text-[13px] font-semibold text-brand hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Honest failure with an optional retry. Never rendered as an empty result. */
export function ErrorState({ title, message, onRetry, className }: { title: string; message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-wrap items-start gap-3 p-5", className)}>
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        {message && <p className="mt-0.5 text-[13px] text-muted-ink">{message}</p>}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex h-9 items-center rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50">
          Try again
        </button>
      )}
    </div>
  );
}
