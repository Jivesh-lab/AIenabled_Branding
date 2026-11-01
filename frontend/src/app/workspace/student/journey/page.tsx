import type { Metadata } from "next";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/shared/Surface";
import { journeysFor } from "@/lib/overviewJourneys";
import { loadStudentOverview } from "@/lib/studentOverview";
import { istNow } from "@/lib/workflowState";
import LoadError from "../_components/LoadError";
import JourneyBoard from "./_components/JourneyBoard";

export const metadata: Metadata = {
  title: "Journey Timeline | DBIT Incubation Centre",
};

export default async function JourneyPage() {
  const overview = await loadStudentOverview({ withMonitoring: true });
  const header = (
    <PageHeader
      title="Journey Timeline"
      description="Where each of your projects stands, what is blocking it, and what to do next. Built from your saved records."
    />
  );

  if (!overview.projects.ok) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          {header}
          <LoadError title="We couldn't load your journey" message={overview.projects.message} canRetry={overview.projects.kind === "unavailable"} />
        </div>
      </PageContainer>
    );
  }

  const journeys = journeysFor(overview, istNow());
  const statusOf = new Map(overview.projects.data.map((p) => [p.id, p.reviewStatus]));

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        {header}
        {journeys.length === 0 ? (
          <Card className="p-8 text-center">
            <h2 className="text-[16px] font-semibold text-ink">Your journey starts with an idea</h2>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-ink">You have not saved or submitted a project yet.</p>
            <Link href="/workspace/student/submit" className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover">
              Submit an idea
            </Link>
          </Card>
        ) : (
          journeys.map((journey) => <JourneyBoard key={journey.projectId} journey={journey} status={statusOf.get(journey.projectId)!} />)
        )}
      </div>
    </PageContainer>
  );
}
