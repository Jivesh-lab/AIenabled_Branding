import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton, LoadingRegion, PageHeadingSkeleton } from "@/components/shared/loading/primitives";

export function SummaryListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} role="status" aria-label="Loading session" className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          <div className="space-y-2 rounded-lg border border-line p-3.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Route-level skeleton in the page's order: heading, three KPI cards, the note, tabs, then the sessions. */
export default function SummariesPageSkeleton() {
  return (
    <LoadingRegion label="Loading meeting summaries">
      <PageContainer>
        <PageHeadingSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <KpiCardSkeleton key={i} withCaption />
          ))}
        </div>
        <Skeleton className="h-[52px] w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-lg" />
          ))}
        </div>
        <SummaryListSkeleton />
      </PageContainer>
    </LoadingRegion>
  );
}
