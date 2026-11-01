import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton, LoadingRegion, PageHeadingSkeleton } from "@/components/shared/loading/primitives";

/** Rows inside a panel while its data loads. `tile` adds the date tile, `withActions` the buttons, `compact` the icon node. */
export function PanelRowsSkeleton({
  rows = 3,
  tile = false,
  withActions = false,
  compact = false,
  bare = false,
}: {
  rows?: number;
  tile?: boolean;
  withActions?: boolean;
  compact?: boolean;
  /** No dividers or side padding, for use inside a padded container (the activity timeline). */
  bare?: boolean;
}) {
  return (
    <div role="status" aria-label="Loading" className={bare ? "flex flex-col" : compact ? "p-2" : "divide-y divide-line"}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`flex items-center gap-3 ${bare ? "py-2.5" : compact ? "px-3 py-2.5" : "px-5 py-4"}`}>
          {tile && <Skeleton className="h-12 w-11 shrink-0 rounded-lg" />}
          {(compact || bare) && <Skeleton className="size-8 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {withActions && (
            <div className="hidden gap-2 sm:flex">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PanelSkeleton({ children, titleWidth = "w-36" }: { children: React.ReactNode; titleWidth?: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <Skeleton className={`h-4 ${titleWidth}`} />
        <Skeleton className="h-3.5 w-14" />
      </div>
      {children}
    </Card>
  );
}

/** Route-level skeleton in the page's own order: heading, four KPI cards, then the two columns. */
export default function MentorDashboardSkeleton() {
  return (
    <LoadingRegion label="Loading your dashboard">
      <PageContainer className="space-y-0">
        <div className="flex flex-col gap-5">
          <PageHeadingSkeleton />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <KpiCardSkeleton key={i} withCaption />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <PanelSkeleton titleWidth="w-40">
                <PanelRowsSkeleton rows={4} withActions />
              </PanelSkeleton>
            </div>
            <div className="flex flex-col gap-5">
              <PanelSkeleton>
                <PanelRowsSkeleton rows={3} compact />
              </PanelSkeleton>
              <PanelSkeleton>
                <PanelRowsSkeleton rows={3} tile />
              </PanelSkeleton>
              <PanelSkeleton>
                <div className="p-4">
                  <PanelRowsSkeleton rows={3} bare />
                </div>
              </PanelSkeleton>
            </div>
          </div>
        </div>
      </PageContainer>
    </LoadingRegion>
  );
}
