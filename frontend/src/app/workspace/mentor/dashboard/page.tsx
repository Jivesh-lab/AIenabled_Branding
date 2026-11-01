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
import { SectionDivider } from "@/components/shared/Surface";

/**
 * Mentor Dashboard - premium SaaS layout.
 * Each panel loads its own data, so one failing source never hides the rest.
 * Consistent 20px rhythm between heading, KPI row and panels.
 */
export default function MentorDashboardPage() {
  return (
    <PageContainer
      title="Mentor Workspace"
      description="Your assigned startups, pending mentorship requests, upcoming sessions, and agent-driven updates."
    >
      <div className="space-y-8">
        <DashboardHeader />

        <MentorRequests />

        <SectionDivider label="At a Glance" />
        <MentorKpiRow />

        <SectionDivider label="Your Startups & Sessions" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Primary column */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            <AssignedMentees />
            <AgentMeetings title="Meetings, preparation and follow-up" canRecord />
          </div>

          {/* Time-sensitive column */}
          <div className="flex min-w-0 flex-col gap-8">
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
