import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { Card, KpiCard, SectionHeading, SectionDivider, StatusBadge } from "@/components/shared/Surface";
import { Handshake, Building2, Users, Calendar, BarChart3 } from "lucide-react";

const OPPORTUNITIES = [
  { name: "AgriTech Pilot with GreenGrow", type: "Pilot project", status: "Open", count: 2 },
  { name: "Healthcare AI Mentorship", type: "Mentorship", status: "Open", count: 3 },
  { name: "Clean Energy Hackathon", type: "Competition", status: "Registering", count: 1 },
  { name: "Industry Speaker Series", type: "Talk", status: "Open", count: 0 },
];

type ActivityItem = [string, string, string, React.ComponentType<any>];

const RECENT_ACTIVITY: ActivityItem[] = [
  ["Weekly startup review", "14 startups reviewed this week", "2 days ago", Calendar],
  ["Investor introduction", "Intro to clean energy investor", "5 days ago", Handshake],
  ["Mentor session", "Biotech mentorship booked", "1 week ago", Users],
];

const STARTUP_DISCOVERY = [
  ["AgriSense", "IoT soil monitoring for small farms", "Deep Tech"],
  ["MediScript", "AI-assisted prescription verification", "HealthTech"],
  ["GreenGrid", "Community solar microgrid platform", "CleanTech"],
  ["SkillBridge", "Student-industry talent matching", "EdTech"],
];

export default function IndustryDashboardPage() {
  return (
    <PageContainer title="Industry Workspace" description="Access authorized collaboration opportunities and incubation guidance.">
      <div className="space-y-8">
        <SectionHeading title="Industry engagement" subtitle="Collaboration requests, startup discovery, and expert participation - all in one view." />

        {/* KPI Row */}
        <SectionDivider label="At a Glance" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          <KpiCard label="Active Collaborations" value={OPPORTUNITIES.length} sub="Open partnerships" icon={Handshake} accent="brand" />
          <KpiCard label="Startups Discovered" value={12} sub="Verified researcher ventures" icon={Building2} accent="brand-cyan" />
          <KpiCard label="Mentorship Requests" value={5} sub="Awaiting expert response" icon={Users} accent="brand" />
          <KpiCard label="Upcoming Meetings" value={3} sub="Scheduled sessions" icon={Calendar} accent="brand-cyan" />
        </div>

        {/* Collaboration Opportunities */}
        <SectionDivider label="Collaboration opportunities" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5 rounded-2xl border border-line bg-white shadow-xs">
            <SectionHeading title="Collaboration opportunities" action={{ label: "View all", href: "/workspace/industry/opportunities" }} />
            <div className="space-y-3">
              {OPPORTUNITIES.map((op) => (
                <div key={op.name} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-line bg-canvas/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-ink">{op.name}</p>
                    <p className="text-[11px] text-muted-ink">{op.type}</p>
                  </div>
                  <StatusBadge label={op.status} tone={op.status === "Open" ? "success" : op.status === "Registering" ? "progress" : "neutral"} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 rounded-2xl border border-line bg-white shadow-xs">
            <SectionHeading title="Recent activity" subtitle="Meetings, introductions, and expert sessions logged this month." />
            <div className="space-y-4">
              {RECENT_ACTIVITY.map(([title, desc, time, Icon], idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="mt-0.5 size-6 shrink-0 flex items-center justify-center rounded-full bg-canvas border border-line text-muted-ink"><Icon className="size-3" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-ink">{title}</p>
                    <p className="text-[11px] text-muted-ink">{desc}</p>
                    <span className="text-[10px] text-muted-ink">{time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Startup discovery */}
        <SectionDivider label="Startup discovery" />
        <Card className="p-5 rounded-2xl border border-line bg-white shadow-xs">
          <SectionHeading title="Startup discovery" subtitle="Browse verified researcher startups aligned with your industry expertise." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STARTUP_DISCOVERY.map(([name, desc, domain]) => (
              <div key={name} className="p-3 rounded-xl border border-line bg-white">
                <p className="text-[12px] font-semibold text-ink">{name}</p>
                <p className="text-[11px] text-muted-ink">{desc}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-brand">
                  <BarChart3 className="size-3" /> {domain}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
