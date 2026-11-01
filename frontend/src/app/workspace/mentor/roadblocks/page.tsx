"use client";

import Link from "next/link";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { ErrorState } from "@/components/shared/loading/primitives";
import { useApiList } from "@/lib/useApiList";
import RoadblockCard from "./_components/RoadblockCard";
import { RoadblockListSkeleton } from "./_components/RoadblocksSkeleton";
import RoadblockStats from "./_components/RoadblockStats";
import { toRoadblocks } from "./_components/roadblocks";

export default function StartupRoadblocksPage() {
  const { items: roadblocks, loading, failed, reload } = useApiList("/api/faculty/projects", toRoadblocks);

  return (
    <PageContainer
      title="Startup Roadblocks & Escalations"
      description="Monitor critical blockers, overdue milestones, and operational bottlenecks across advised projects."
    >
      <RoadblockStats roadblocks={roadblocks} loading={loading} failed={failed} />

      {loading ? (
        <RoadblockListSkeleton />
      ) : failed ? (
        <Card>
          <ErrorState
            title="We couldn't load your roadblocks"
            message="Something went wrong on our side. Please try again in a moment."
            onRetry={() => void reload()}
          />
        </Card>
      ) : roadblocks.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <CheckCircleIcon className="size-8 text-success" aria-hidden="true" />
          <h3 className="mt-3 text-[15px] font-semibold text-ink">No roadblocks right now</h3>
          <p className="mt-1 max-w-md text-[13px] text-muted-ink">
            None of the projects you advise are flagged At Risk or Needs Attention, and none have overdue milestones.
          </p>
          <Link
            href="/workspace/mentor/mentees"
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-brand transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            View my mentees
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {roadblocks.map((roadblock) => (
            <RoadblockCard key={roadblock.id} roadblock={roadblock} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
