"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  FileText,
  Inbox,
  CalendarDays,
  Sparkles,
  Building2,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  Users,
  Target,
} from "lucide-react";

const RECENT_APPLICATIONS = [
  { name: "AgroVision AI", focus: "AI-powered crop disease detection drones", date: "Jan 18, 2025", fit: 94, stage: "Seed" },
  { name: "CleanBuild Materials", focus: "Fly-ash sustainable construction blocks", date: "Jan 15, 2025", fit: 87, stage: "Seed" },
  { name: "WaterSafe IoT", focus: "Real-time industrial effluent monitoring", date: "Jan 12, 2025", fit: 82, stage: "Pre-Seed" },
];

const UPCOMING_MEETINGS = [
  { startup: "AgroVision AI", date: "Jan 28, 2025", time: "2:00 PM", type: "Demo Presentation" },
  { startup: "CleanBuild Materials", date: "Feb 3, 2025", time: "11:00 AM", type: "Site Visit" },
];

const ACTIVITY = [
  { text: "AgroVision AI submitted pilot proposal for review", time: "1 day ago" },
  { text: "New application received from WaterSafe IoT (82% match)", time: "3 days ago" },
  { text: "CleanBuild demo scheduled for Feb 3rd", time: "5 days ago" },
  { text: "Problem statement 'Smart Logistics AI' received 6 new applications", time: "1 week ago" },
];

export default function IndustryPartnerDashboardPage() {
  return (
    <PageContainer
      title="Industry Partner Dashboard"
      description="Your engagement hub — monitor problem statements, review startup applications, and manage pilot partnerships."
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Problem Statements", value: 3, icon: FileText, color: "bg-brand/10 text-brand", href: "/workspace/industry-partner/problems" },
            { label: "Pending Applications", value: 12, icon: Inbox, color: "bg-brand-cyan/10 text-brand-cyan-ink", href: "/workspace/industry-partner/applications" },
            { label: "Upcoming Meetings", value: 2, icon: CalendarDays, color: "bg-amber-50 text-amber-700", href: "/workspace/industry-partner/meetings" },
            { label: "Active Pilots", value: 1, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700", href: "/workspace/industry-partner/agreements" },
          ].map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <Card interactive className="p-4 h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-ink">{kpi.label}</p>
                    <p className="text-2xl font-bold text-ink mt-1">{kpi.value}</p>
                  </div>
                  <div className={`flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                    <kpi.icon className="size-4" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Action Banner */}
        <div className="rounded-xl border border-brand/20 bg-gradient-to-r from-brand-deep to-brand p-5 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold uppercase tracking-wider mb-2">
                AI Matchmaking
              </span>
              <h2 className="text-lg font-bold">3 New Startups Match Your Problem Statements</h2>
              <p className="text-xs text-blue-200 mt-1">AgroVision AI, CleanBuild Materials, and WaterSafe IoT — all 75%+ match scores</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/workspace/industry-partner/applications" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-brand-deep text-xs font-bold transition-colors">
                <Inbox className="size-3.5" /> Review Applications
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Applications */}
          <div className="lg:col-span-2 space-y-4">
            <SectionHeading title="Top Matched Applications" action={{ label: "View all", href: "/workspace/industry-partner/applications" }} />
            <div className="space-y-3">
              {RECENT_APPLICATIONS.map((app) => (
                <Card key={app.name} interactive className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-ink">{app.name}</h3>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">{app.stage}</span>
                      </div>
                      <p className="text-xs text-muted-ink">{app.focus}</p>
                      <p className="text-[11px] text-muted-ink mt-0.5 flex items-center gap-1"><Clock className="size-3" /> Applied {app.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-brand">{app.fit}%</p>
                      <p className="text-[10px] text-muted-ink">match score</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Upcoming Meetings */}
            <Card className="p-4">
              <SectionHeading title="Upcoming Meetings" action={{ label: "All meetings", href: "/workspace/industry-partner/meetings" }} />
              <div className="space-y-3">
                {UPCOMING_MEETINGS.map((m) => (
                  <div key={m.startup} className="p-3 rounded-lg bg-canvas border border-line">
                    <p className="text-xs font-bold text-ink">{m.startup}</p>
                    <p className="text-[11px] text-muted-ink mt-0.5">{m.type}</p>
                    <p className="text-[11px] text-brand font-semibold mt-1">{m.date} · {m.time}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Activity Feed */}
            <Card className="p-4">
              <SectionHeading title="Activity Feed" />
              <div className="space-y-3">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="mt-1 size-1.5 rounded-full bg-brand shrink-0" />
                    <div>
                      <p className="text-[12px] text-ink leading-tight">{item.text}</p>
                      <p className="text-[11px] text-muted-ink mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
