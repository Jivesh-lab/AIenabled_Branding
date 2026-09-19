import PageContainer from "@/components/shared/PageContainer";
import DashboardHeader from "./_components/DashboardHeader";
import MentorKpiRow from "./_components/MentorKpiRow";
import AssignedMentees from "./_components/AssignedMentees";
import PendingActions from "./_components/PendingActions";
import UpcomingSessions from "./_components/UpcomingSessions";
import RecentActivity from "./_components/RecentActivity";

export default function MentorDashboardPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <DashboardHeader />

        <MentorKpiRow />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Primary column */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <AssignedMentees />
          </div>

          {/* Time-sensitive column */}
          <div className="flex flex-col gap-6">
            <PendingActions />
            <UpcomingSessions />
            <RecentActivity />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
