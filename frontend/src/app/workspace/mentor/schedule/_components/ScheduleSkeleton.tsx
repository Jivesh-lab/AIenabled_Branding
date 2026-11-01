import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton, LoadingRegion, PageHeadingSkeleton } from "@/components/shared/loading/primitives";

/** The list panel while sessions load: tab strip, then rows with a date tile. */
export function ScheduleListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading sessions" className="min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex gap-2 border-b border-line px-4 py-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-lg" />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
            <Skeleton className="h-12 w-11 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="hidden h-9 w-20 shrink-0 rounded-lg sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Route-level skeleton in the page's order: heading with its action, four KPI cards, list (70%) and calendar (30%). */
export default function SchedulePageSkeleton() {
  return (
    <LoadingRegion label="Loading your schedule">
      <PageContainer>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeadingSkeleton />
          <Skeleton className="h-10 w-40 shrink-0 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiCardSkeleton key={i} withCaption />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start">
          <ScheduleListSkeleton />
          <Skeleton className="h-[330px] rounded-xl" />
        </div>
      </PageContainer>
    </LoadingRegion>
  );
}
