import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton, LoadingRegion, PageHeadingSkeleton } from "@/components/shared/loading/primitives";

/**
 * Placeholders for the Faculty workspace. Each one is built in the SAME ORDER and at the SAME HEIGHTS as the page it
 * stands in for (heading, banner, KPI row, tabs, filters, content), and the route-level loading.tsx files and the
 * in-page loading states share these pieces. That is what keeps the page from jumping when real content replaces a
 * skeleton: everything above the content is already where it will end up.
 */

const KPI_COLUMNS: Record<number, string> = {
  3: "sm:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-3 lg:grid-cols-6",
};

/** A row of KPI cards, the same shape as MetricCard (with a caption line, like the faculty KPIs have). */
export function FacultyKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-3 lg:gap-4 ${KPI_COLUMNS[count] ?? "lg:grid-cols-4"}`}>
      {Array.from({ length: count }, (_, i) => (
        <KpiCardSkeleton key={i} withCaption />
      ))}
    </div>
  );
}

/** The identity / role banner at the top of the coordinator, volunteer and hub pages. */
export function FacultyBannerSkeleton({ height = 130 }: { height?: number }) {
  return <Skeleton className="w-full rounded-2xl" style={{ height }} />;
}

/** The section tab strip. */
export function FacultyTabsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex h-11 items-center gap-1.5 overflow-hidden border-b border-line pb-1">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-lg sm:w-36" />
      ))}
    </div>
  );
}

/** Search box on the left, filter chips on the right. */
export function FacultyFilterBarSkeleton() {
  return (
    <div className="flex h-16 items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 shadow-sm">
      <Skeleton className="h-9 w-full max-w-[260px] rounded-lg" />
      <div className="hidden gap-2 sm:flex">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** A grid of project-style cards. */
export function FacultyCardGridSkeleton({ count = 4, columns = 2 }: { count?: number; columns?: 2 | 3 }) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} role="status" aria-label="Loading" className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A list of project/record rows: title and meta on the left, status and action on the right. */
export function FacultyListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-52 max-w-full" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-1.5 w-40 rounded-full" />
            </div>
            <Skeleton className="hidden h-8 w-24 shrink-0 rounded-lg sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** What the tab area shows while a workspace page (coordinator / volunteer) loads: filters, then cards. */
export function FacultyTabContentSkeleton({ withFilters = true }: { withFilters?: boolean }) {
  return (
    <div className="space-y-6">
      {withFilters && <FacultyFilterBarSkeleton />}
      <FacultyCardGridSkeleton count={4} />
    </div>
  );
}

/** The Management Hub's overview tab: KPI row, then the two-thirds / one-third grid. */
export function FacultyOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <FacultyKpiSkeleton count={6} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FacultyListSkeleton rows={3} />
          <FacultyListSkeleton rows={2} />
        </div>
        <div className="space-y-6">
          <FacultyListSkeleton rows={2} />
          <FacultyListSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
}

export type FacultySkeletonKind = "hub" | "coordinator" | "volunteer" | "list";

/**
 * Route-level skeleton, in the same order as the real page:
 *   hub          role bar -> tabs -> overview (KPIs + grid)
 *   coordinator  banner   -> KPIs -> tabs -> filters + cards
 *   volunteer    banner   -> KPIs -> tabs -> cards
 *   list         KPIs     -> filters -> rows           (oversight, projects, IP, grants, dashboard)
 */
export function FacultyRouteSkeleton({ kind }: { kind: FacultySkeletonKind }) {
  return (
    <LoadingRegion label="Loading faculty workspace">
      <PageContainer>
        <PageHeadingSkeleton />
        {kind === "hub" && (
          <>
            <FacultyBannerSkeleton height={140} />
            <FacultyTabsSkeleton count={6} />
            <FacultyOverviewSkeleton />
          </>
        )}
        {kind === "coordinator" && (
          <>
            <FacultyBannerSkeleton />
            <FacultyKpiSkeleton count={5} />
            <FacultyTabsSkeleton count={5} />
            <FacultyTabContentSkeleton />
          </>
        )}
        {kind === "volunteer" && (
          <>
            <FacultyBannerSkeleton />
            <FacultyKpiSkeleton count={5} />
            <FacultyTabsSkeleton count={5} />
            <FacultyTabContentSkeleton withFilters={false} />
          </>
        )}
        {kind === "list" && (
          <>
            <FacultyKpiSkeleton count={4} />
            <FacultyFilterBarSkeleton />
            <FacultyListSkeleton rows={4} />
          </>
        )}
      </PageContainer>
    </LoadingRegion>
  );
}

/** Kept for existing imports: the generic faculty page skeleton is the list layout. */
export function FacultyPageSkeleton() {
  return <FacultyRouteSkeleton kind="list" />;
}
