import PageContainer from "@/components/shared/PageContainer";
import DashboardHeader from "./_components/DashboardHeader";
import MentorKpiRow from "./_components/MentorKpiRow";
import AssignedMentees from "./_components/AssignedMentees";
import PendingActions from "./_components/PendingActions";
import UpcomingSessions from "./_components/UpcomingSessions";
import RecentActivity from "./_components/RecentActivity";
import MentorRequests from "@/components/agentic/MentorRequests";
import AgentMeetings from "@/components/agentic/AgentMeetings";
import AgentActivityFeed from "@/components/agentic/AgentActivityFeed";

/**
 * Each panel loads its own data, so one failing source never hides the rest. Spacing matches the Student Dashboard:
 * a 20px rhythm between heading, KPI row and panels.
 */
export default function MentorDashboardPage() {
  return (
    <PageContainer className="space-y-0">
      <div className="flex flex-col gap-5">
        <DashboardHeader />

        <MentorRequests />

        <MentorKpiRow />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Primary column */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            <AssignedMentees />
            <AgentMeetings title="Meetings, preparation and follow-up" canRecord />
          </div>

          {/* Time-sensitive column */}
          <div className="flex min-w-0 flex-col gap-5">
            <PendingActions />
            <UpcomingSessions />
            <AgentActivityFeed title="What the agents did" limit={8} />
            <RecentActivity />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
