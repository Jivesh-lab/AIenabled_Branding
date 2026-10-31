import { Card } from "@/components/shared/Surface";
import {
  KpiCardSkeleton,
  ListItemSkeleton,
  LoadingRegion,
  PageHeadingSkeleton,
  ProjectCardSkeleton,
  SectionHeadingSkeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/shared/loading/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "./DashboardLayout";

/** Section skeletons. Each mirrors the real section's structure and size. They contain no data. */

export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProjectsSectionSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function MeetingsSectionSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton />
      <Card className="divide-y divide-line">
        <ListItemSkeleton withAction />
        <ListItemSkeleton withAction />
      </Card>
    </section>
  );
}

export function ActionsSectionSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton withAction={false} />
      <Card className="divide-y divide-line">
        {Array.from({ length: 3 }, (_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </Card>
    </section>
  );
}

export function ActivitySectionSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton withAction={false} />
      <SkeletonCard className="space-y-3.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-1.5 shrink-0 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </SkeletonCard>
    </section>
  );
}

export function JourneySectionSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton />
      <SkeletonCard className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-1.5 w-40 rounded-full" />
        </div>
        <div className="flex items-start">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex min-w-[104px] flex-1 flex-col items-center gap-2">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <SkeletonText lines={1} widths={["w-2/3"]} />
      </SkeletonCard>
    </section>
  );
}

export function InsightsSectionSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton withAction={false} />
      <Card className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="space-y-3 p-5">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-5 w-2/3" />
            <SkeletonText lines={2} />
          </div>
        ))}
      </Card>
    </section>
  );
}

export function FundingSectionSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton />
      <SkeletonCard className="flex items-center justify-between gap-4 p-6">
        <div className="flex flex-1 items-start gap-4">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-56" />
            <SkeletonText lines={2} widths={["w-full", "w-3/4"]} />
          </div>
        </div>
        <Skeleton className="hidden h-9 w-40 rounded-lg sm:block" />
      </SkeletonCard>
    </section>
  );
}

/** Whole-page skeleton: also used as the route's loading.tsx so the first paint already has the right shape. */
export default function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading your dashboard">
      <DashboardLayout
        heading={<PageHeadingSkeleton />}
        kpis={<KpiRowSkeleton />}
        main={<ProjectsSectionSkeleton />}
        side={
          <>
            <MeetingsSectionSkeleton />
            <ActionsSectionSkeleton />
            <ActivitySectionSkeleton />
          </>
        }
        lower={
          <>
            <JourneySectionSkeleton />
            <InsightsSectionSkeleton />
            <FundingSectionSkeleton />
          </>
        }
      />
    </LoadingRegion>
  );
}
