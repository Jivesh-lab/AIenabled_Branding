import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import {
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

/** My Projects: heading, summary filters, toolbar, project cards. */
export function ListPageSkeleton() {
  return (
    <LoadingRegion label="Loading your projects">
      <PageContainer>
        <PageHeadingSkeleton />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-xl" />
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

/** Meetings: heading, summary strip, calendar, meeting list. */
export function MeetingsPageSkeleton() {
  return (
    <LoadingRegion label="Loading your meetings">
      <PageContainer>
        <PageHeadingSkeleton />
        <Skeleton className="h-[74px] w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[19.5rem_minmax(0,1fr)]">
          <Skeleton className="h-[320px] rounded-xl" />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <SkeletonCard key={i} className="flex gap-4">
                <Skeleton className="h-14 w-12 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <SkeletonText lines={1} widths={["w-3/4"]} />
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
              </SkeletonCard>
            ))}
          </div>
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
