import PageContainer from "@/components/shared/PageContainer";
import DashboardHeader from "./_components/DashboardHeader";
import KpiRow from "./_components/KpiRow";
import MyProjects from "./_components/MyProjects";
import UpcomingMeetings from "./_components/UpcomingMeetings";
import IncubationJourney from "./_components/IncubationJourney";
import NextActions from "./_components/NextActions";
import AiInsights from "./_components/AiInsights";
import RecentActivity from "./_components/RecentActivity";
import FundingOpportunities from "./_components/FundingOpportunities";

/**
 * Student Dashboard.
 *
 * Intent: "here is what is happening with your innovation, and here is what you
 * should do next" — work and deadlines over vanity metrics.
 *
 * Layout: KPI row, then a 3-column grid where the left 2 columns carry the
 * weight (Projects, Journey, AI Insights) and the right column carries the
 * time-sensitive lists (Meetings, Next Actions, Activity). Funding spans full
 * width as a preview. Everything collapses to a single column below `lg`.
 *
 * Fully static — no client components, no state, no effects.
 */
export default function DashboardPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <DashboardHeader />

        <KpiRow />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Primary column */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <MyProjects />
            <IncubationJourney />
            <AiInsights />
          </div>

          {/* Time-sensitive column */}
          <div className="flex flex-col gap-6">
            <UpcomingMeetings />
            <NextActions />
            <RecentActivity />
          </div>
        </div>

        <FundingOpportunities />
      </div>
    </PageContainer>
  );
}
