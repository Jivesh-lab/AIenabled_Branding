"use client";

import { useState, useEffect } from "react";
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

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [appsRes, meetingsRes] = await Promise.allSettled([
          fetch("/api/applications"),
          fetch("/api/faculty/meetings"),
        ]);

        if (appsRes.status === "fulfilled" && appsRes.value.ok) {
          const appsData = await appsRes.value.json();
          setProjects(appsData.projects || appsData.applications || []);
        }

        if (meetingsRes.status === "fulfilled" && meetingsRes.value.ok) {
          const meetData = await meetingsRes.value.json();
          setMeetings(meetData.data || meetData.meetings || []);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <DashboardHeader />

        <KpiRow projects={projects} meetings={meetings} loading={loading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Primary column */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <MyProjects projects={projects} loading={loading} />
            <IncubationJourney projects={projects} />
            <AiInsights projects={projects} />
          </div>

          {/* Time-sensitive column */}
          <div className="flex flex-col gap-6">
            <UpcomingMeetings meetings={meetings} loading={loading} />
            <NextActions projects={projects} />
            <RecentActivity projects={projects} />
          </div>
        </div>

        <FundingOpportunities />
      </div>
    </PageContainer>
  );
}
