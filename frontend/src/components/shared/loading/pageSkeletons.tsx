import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KpiCardSkeleton,
  LoadingRegion,
  PageHeadingSkeleton,
  ProjectCardSkeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/shared/loading/primitives";

/**
 * Whole-page skeletons for route-level loading.tsx files. They render INSIDE the existing application shell, so the
 * sidebar and header stay visible during navigation; only the page area shows a placeholder shaped like the page.
 */

/** My Projects: heading, four summary cards, toolbar, project cards. */
export function ListPageSkeleton() {
  return (
    <LoadingRegion label="Loading your projects">
      <PageContainer>
        <PageHeadingSkeleton />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </PageContainer>
    </LoadingRegion>
  );
}

/** Funding & Grants: heading, three KPI cards, search toolbar, grant cards. */
export function FundingPageSkeleton() {
  return (
    <LoadingRegion label="Loading funding opportunities">
      <PageContainer>
        <PageHeadingSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg lg:w-36" />
          <Skeleton className="h-10 w-full rounded-lg lg:w-36" />
          <Skeleton className="h-10 w-full rounded-lg lg:w-36" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <SkeletonText lines={2} widths={["w-full", "w-2/3"]} />
              <div className="flex items-center justify-between border-t border-line pt-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </PageContainer>
    </LoadingRegion>
  );
}

/** Journey Timeline: heading and journey boards. */
export function JourneyPageSkeleton() {
  return (
    <LoadingRegion label="Loading your journey">
      <PageContainer>
        <PageHeadingSkeleton />
        {Array.from({ length: 2 }, (_, i) => (
          <SkeletonCard key={i} className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-5 w-32 rounded-md" />
              </div>
              <Skeleton className="h-8 w-52" />
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, s) => (
                  <div key={s} className="flex gap-3">
                    <Skeleton className="size-7 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </PageContainer>
    </LoadingRegion>
  );
}

/** Meetings: heading, four KPI cards, investor docket, then the schedule (list about 70%, calendar about 30%). */
export function MeetingsPageSkeleton() {
  return (
    <LoadingRegion label="Loading your meetings">
      <PageContainer>
        <PageHeadingSkeleton />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-3.5 w-28" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            <SkeletonCard className="p-0">
              <div className="flex gap-2 border-b border-line px-4 py-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-lg" />
                ))}
              </div>
              <div className="divide-y divide-line">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
                    <Skeleton className="h-12 w-11 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-3.5 w-48" />
          <SkeletonCard className="space-y-3 p-4">
            <div className="flex gap-2">
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-7 w-32 rounded-lg" />
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <SkeletonText lines={2} widths={["w-full", "w-2/3"]} />
              </div>
            </div>
          </SkeletonCard>
        </div>
      </PageContainer>
    </LoadingRegion>
  );
}

/** Generic detail / form page: back link, header card, content cards. */
export function DetailPageSkeleton() {
  return (
    <LoadingRegion label="Loading page">
      <PageContainer>
        <Skeleton className="h-4 w-36" />
        <SkeletonCard className="space-y-3 p-6">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <SkeletonText lines={2} widths={["w-full", "w-1/2"]} />
        </SkeletonCard>
        {Array.from({ length: 2 }, (_, i) => (
          <SkeletonCard key={i} className="space-y-4 p-6">
            <Skeleton className="h-5 w-40" />
            <SkeletonText lines={3} />
          </SkeletonCard>
        ))}
      </PageContainer>
    </LoadingRegion>
  );
}
