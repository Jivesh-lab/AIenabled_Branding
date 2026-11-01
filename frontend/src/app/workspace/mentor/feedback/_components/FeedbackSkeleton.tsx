import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton, LoadingRegion, PageHeadingSkeleton } from "@/components/shared/loading/primitives";

export function RequestListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} role="status" aria-label="Loading question" className="flex items-start gap-3.5 rounded-xl border border-line bg-white p-5 shadow-sm">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Route-level skeleton in the page's order: heading, three KPI cards, tabs, then the questions. */
export default function FeedbackPageSkeleton() {
  return (
    <LoadingRegion label="Loading feedback">
      <PageContainer>
        <PageHeadingSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <KpiCardSkeleton key={i} withCaption />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
        <RequestListSkeleton />
      </PageContainer>
    </LoadingRegion>
  );
}
