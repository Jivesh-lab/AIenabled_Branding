import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton, LoadingRegion, PageHeadingSkeleton } from "@/components/shared/loading/primitives";

export function RoadblockListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} role="status" aria-label="Loading" className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-44 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Route-level skeleton in the page's order: heading, three KPI cards, then the flagged projects. */
export default function RoadblocksPageSkeleton() {
  return (
    <LoadingRegion label="Loading roadblocks">
      <PageContainer>
        <PageHeadingSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <KpiCardSkeleton key={i} withCaption />
          ))}
        </div>
        <RoadblockListSkeleton />
      </PageContainer>
    </LoadingRegion>
  );
}
