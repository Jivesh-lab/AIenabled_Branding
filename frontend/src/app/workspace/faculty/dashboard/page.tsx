"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  BookOpen,
  Lightbulb,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Users,
  Award,
  Microscope,
  GraduationCap,
} from "lucide-react";

const SUPERVISED_PROJECTS = [
  { id: "1", title: "AI-Driven Crop Disease Detection", student: "Priya Sharma", stage: "Prototype", progress: 68, trl: 4, status: "progress" as const },
  { id: "2", title: "Biodegradable Packaging from Sugarcane Waste", student: "Arjun Mehta", stage: "Research", progress: 35, trl: 2, status: "attention" as const },
  { id: "3", title: "Smart Water Quality Monitoring IoT", student: "Kavita Nair", stage: "Validation", progress: 82, trl: 6, status: "success" as const },
  { id: "4", title: "Decentralized Health Records on Blockchain", student: "Rohan Das", stage: "Ideation", progress: 15, trl: 1, status: "neutral" as const },
];

const PENDING_IP_FILINGS = [
  { id: "1", title: "ML Model for Early Disease Detection (Patent)", student: "Priya Sharma", dueIn: 7 },
  { id: "2", title: "Packaging Formulation (Provisional Patent)", student: "Arjun Mehta", dueIn: 21 },
  { id: "3", title: "IoT Monitoring Algorithm (Copyright)", student: "Kavita Nair", dueIn: 45 },
];

const ACTIVE_GRANTS = [
  { id: "1", title: "DST NIDHI Seed Fund 2024", amount: "₹15L", deadline: "31 Mar 2025", utilised: 62 },
  { id: "2", title: "BIRAC BIG 15 Grant", amount: "₹50L", deadline: "30 Jun 2025", utilised: 28 },
];

const RECENT_ACTIVITY = [
  { text: "Priya Sharma submitted Stage-3 milestone report", time: "2h ago", type: "submission" },
  { text: "Kavita Nair's TRL assessment upgraded to Level 6", time: "Yesterday", type: "milestone" },
  { text: "New IP filing request from Arjun Mehta", time: "2 days ago", type: "ip" },
  { text: "Grant DST NIDHI: Utilisation report due in 7 days", time: "3 days ago", type: "deadline" },
];

export default function FacultyDashboardPage() {
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
  }, []);

  return (
    <PageContainer
      title="Faculty Research Dashboard"
      description="Oversight of supervised student projects, IP filings, grant management, and research progression."
    >
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Supervised Projects", value: 12, sub: "4 Active this semester", icon: GraduationCap, color: "bg-brand/10 text-brand" },
            { label: "Pending IP Filings", value: 3, sub: "2 due within 30 days", icon: FileText, color: "bg-amber-50 text-amber-700" },
            { label: "Active Grants", value: 2, sub: "₹65L total sanctioned", icon: Award, color: "bg-emerald-50 text-emerald-700" },
            { label: "TRL Avg (Cohort)", value: "3.4", sub: "Up from 2.8 last quarter", icon: TrendingUp, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{kpi.label}</p>
                  <p className="text-2xl font-bold text-ink mt-1">{kpi.value}</p>
                  <p className="text-[11px] text-muted-ink mt-0.5">{kpi.sub}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                  <kpi.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions Banner */}
        <div className="rounded-xl border border-brand/20 bg-gradient-to-r from-brand-deep to-brand p-5 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold uppercase tracking-wider mb-2">
                Faculty Actions
              </span>
              <h2 className="text-lg font-bold">{greeting}, Professor</h2>
              <p className="text-xs text-blue-200 mt-1">3 student milestones need your review. 1 IP deadline in 7 days.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/workspace/faculty/trl-calculator" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-brand-deep text-xs font-bold transition-colors">
                <Microscope className="size-3.5" /> TRL Calculator
              </Link>
              <Link href="/workspace/faculty/grant-drafting" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors">
                <FileText className="size-3.5" /> Draft Grant
              </Link>
              <Link href="/workspace/faculty/ip" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors">
                <Lightbulb className="size-3.5" /> File IP
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Supervised Projects */}
          <div className="lg:col-span-2 space-y-4">
            <SectionHeading title="Supervised Student Projects" action={{ label: "View all", href: "/workspace/faculty/student-projects" }} />
            <div className="space-y-3">
              {SUPERVISED_PROJECTS.map((proj) => (
                <Card key={proj.id} interactive className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-ink leading-tight">{proj.title}</p>
                      <p className="text-[12px] text-muted-ink mt-0.5 flex items-center gap-1">
                        <Users className="size-3" /> {proj.student}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-line text-muted-ink">TRL {proj.trl}</span>
                      <StatusBadge label={proj.stage} tone={proj.status} />
                    </div>
                  </div>
                  <ProgressBar value={proj.progress} label={`Completion: ${proj.progress}%`} />
                </Card>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Pending IP Filings */}
            <Card className="p-4">
              <SectionHeading title="Pending IP Filings" action={{ label: "Manage", href: "/workspace/faculty/ip" }} />
              <div className="space-y-3">
                {PENDING_IP_FILINGS.map((ip) => (
                  <div key={ip.id} className="flex items-start gap-3 p-3 rounded-lg bg-canvas border border-line">
                    <div className={`mt-0.5 size-2 rounded-full shrink-0 ${ip.dueIn <= 7 ? "bg-danger" : ip.dueIn <= 21 ? "bg-brand-gold" : "bg-success"}`} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-ink leading-tight">{ip.title}</p>
                      <p className="text-[11px] text-muted-ink mt-0.5">{ip.student}</p>
                      <p className={`text-[11px] font-semibold mt-1 ${ip.dueIn <= 7 ? "text-danger" : "text-muted-ink"}`}>Due in {ip.dueIn} days</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Active Grants */}
            <Card className="p-4">
              <SectionHeading title="Active Grants" action={{ label: "Manage", href: "/workspace/faculty/grant-drafting" }} />
              <div className="space-y-3">
                {ACTIVE_GRANTS.map((grant) => (
                  <div key={grant.id} className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[12px] font-semibold text-ink leading-tight">{grant.title}</p>
                      <span className="text-[11px] font-bold text-emerald-700 shrink-0">{grant.amount}</span>
                    </div>
                    <ProgressBar value={grant.utilised} label={`Utilised: ${grant.utilised}%`} />
                    <p className="text-[11px] text-muted-ink mt-1.5 flex items-center gap-1">
                      <Clock className="size-3" /> Deadline: {grant.deadline}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-4">
              <SectionHeading title="Recent Activity" />
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`mt-0.5 size-1.5 rounded-full shrink-0 ${item.type === "deadline" ? "bg-danger" : item.type === "milestone" ? "bg-success" : "bg-brand"}`} />
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
