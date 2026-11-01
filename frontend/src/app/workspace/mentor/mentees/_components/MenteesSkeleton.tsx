import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton, LoadingRegion, PageHeadingSkeleton } from "@/components/shared/loading/primitives";

/** Same boxes as MenteeRow: avatar, name + badges, project line, meta line, progress on the right. */
export function MenteeRowSkeleton() {
  return (
    <div role="status" aria-label="Loading mentee" className="flex items-start gap-4 rounded-xl border border-line bg-white p-5 shadow-sm">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="hidden h-8 w-36 shrink-0 sm:block" />
    </div>
  );
}

export function MenteeListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <MenteeRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Route-level skeleton: heading, four stat cards, the toolbar, then the rows - in the page's own order. */
export default function MenteesPageSkeleton() {
  return (
    <LoadingRegion label="Loading your mentees">
      <PageContainer>
        <PageHeadingSkeleton />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-10 w-full rounded-lg sm:max-w-sm" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
        </div>
        <MenteeListSkeleton />
      </PageContainer>
    </LoadingRegion>
  );
}
