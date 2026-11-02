"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import AdminPipeline from "@/components/agentic/AdminPipeline";
import ApprovalsPanel from "@/components/agentic/ApprovalsPanel";
import AgentActivityFeed from "@/components/agentic/AgentActivityFeed";
import AttentionPanel from "@/components/agentic/AttentionPanel";
import { Card, SectionHeading, SectionDivider, StatusBadge } from "@/components/shared/Surface";
import {
  Users,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  Megaphone,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

type StatsData = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  rejectedUsers: number;
  roleBreakdown: Record<string, number>;
  pendingApprovalsCount: number;
  moderationItemsCount: number;
  mentorStudentRatio: string;
};

const INITIAL_STATS: StatsData = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  pendingUsers: 0,
  rejectedUsers: 0,
  roleBreakdown: {
    student: 0,
    faculty: 0,
    mentor: 0,
    investor: 0,
  },
  pendingApprovalsCount: 0,
  moderationItemsCount: 0,
  mentorStudentRatio: "0:0",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const mentorCount = stats.roleBreakdown.mentor || 0;
  const studentCount = stats.roleBreakdown.student || 0;
  const facultyCount = stats.roleBreakdown.faculty || 0;
  const investorCount = stats.roleBreakdown.investor || 0;


  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await fetch(`/api/backend/admin/stats`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            setStats({
              ...INITIAL_STATS,
              ...data.stats,
              roleBreakdown: {
                student: 0,
                faculty: 0,
                mentor: 0,
                investor: 0,
                ...(data.stats.roleBreakdown || {}),
              },
            });
          }
        }
      } catch {
        // Silently catch
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <PageContainer
      title="Incubation Operations"
      description="What the agents have prepared for your decision, what they have done on their own, and what they could not resolve."
    >
      <div className="space-y-8">
        <SectionDivider label="Agent pipeline" />
        <AdminPipeline />
        <SectionDivider label="Approvals needed" />
        <ApprovalsPanel title="Approvals needed" types={["admission", "investor_intro"]} emptyMessage="Complete applications and investor introductions arrive here with the agent's assessment and evidence. You decide; the agents then carry the decision out." />
        <SectionDivider label="Agent activity & attention" />
        <div className="grid gap-8 xl:grid-cols-2">
          <AgentActivityFeed title="Agent activity" limit={15} />
          <AttentionPanel title="Needs attention across the centre" />
        </div>

        <SectionDivider label="People & account management" />
        <details className="group rounded-2xl border border-line bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-4 text-[15px] font-semibold text-ink marker:hidden">
            People and account management <span className="ml-2 text-[12.5px] font-normal text-muted-ink">user accounts, vetting queue, CSV import (secondary)</span>
          </summary>
          <div className="space-y-6 border-t border-line p-5">
            {/* Metric Cards Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border border-line bg-white shadow-xs">
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <p className="block truncate text-xs font-semibold uppercase tracking-wider text-muted-ink">Total Managed Accounts</p>
                    <p className="mt-2 block text-[26px] lg:text-[32px] font-black tracking-tight tabular-nums text-ink">
                      {loading ? "-" : stats.totalUsers}
                    </p>
                    <p className="mt-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-muted-ink">
                      {loading ? "Loading metrics..." : stats.totalUsers === 0 ? "No registered accounts yet" : `${stats.activeUsers} Active • ${stats.inactiveUsers} Inactive`}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Users className="size-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-line bg-white shadow-xs">
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <p className="block truncate text-xs font-semibold uppercase tracking-wider text-muted-ink">Pending Registration Queue</p>
                    <p className={`mt-2 block text-[26px] lg:text-[32px] font-black tracking-tight tabular-nums text-ink`}>{loading ? "-" : stats.pendingApprovalsCount}</p>
                    <p className="mt-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-muted-ink">
                      {loading ? "Checking queue..." : stats.pendingApprovalsCount > 0 ? "Vetting Review Required" : "Queue Clear (0 Pending)"}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold-soft text-brand-gold-ink">
                    <UserCheck className="size-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-line bg-white shadow-xs">
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <p className="block truncate text-xs font-semibold uppercase tracking-wider text-muted-ink">Mentor-to-Researcher Ratio</p>
                    <p className="mt-2 block text-[26px] lg:text-[32px] font-black tracking-tight tabular-nums text-ink">
                      {loading ? "-" : stats.mentorStudentRatio || "0:0"}
                    </p>
                    <p className="mt-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-muted-ink">
                      {loading ? "Calculating..." : `${mentorCount} Mentors • ${studentCount} Researchers`}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <BarChart3 className="size-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-line bg-white shadow-xs">
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <p className="block truncate text-xs font-semibold uppercase tracking-wider text-muted-ink">Flagged Moderation Items</p>
                    <p className="mt-2 block text-[26px] lg:text-[32px] font-black tracking-tight tabular-nums text-ink">
                      {loading ? "-" : stats.moderationItemsCount}
                    </p>
                    <p className="mt-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-muted-ink">
                      {loading ? "Checking flags..." : stats.moderationItemsCount === 0 ? "No Flagged Content" : "Action Required"}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <ShieldAlert className="size-5" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Action Hub */}
            <SectionDivider label="Operational actions" />
            <Card className="p-6 rounded-2xl border border-line bg-canvas shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/30 text-[11px] font-bold uppercase tracking-wider mb-2">
                    Operational Actions
                  </span>
                  <h2 className="text-lg font-bold tracking-tight text-ink">Onboard & Manage Incubation Cohorts</h2>
                  <p className="text-xs text-muted-ink mt-1 max-w-xl leading-relaxed">
                    Create user accounts individually or in bulk via CSV upload, manage vetting queues, publish announcements, or launch workspace oversight mode.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/workspace/admin/users?action=create"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover shadow-sm"
                  >
                    <UserPlus className="size-4" /> Add New User
                  </Link>
                  <Link
                    href="/workspace/admin/users?action=bulk"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    <FileSpreadsheet className="size-4 text-brand" /> Bulk CSV Import
                  </Link>
                  <Link
                    href="/workspace/admin/announcements"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    <Megaphone className="size-4 text-brand" /> Post Announcement
                  </Link>
                </div>
              </div>
          </Card>

          {/* Pending Approvals Alert Banner */}
            {loading ? null : stats.pendingApprovalsCount > 0 ? (
              <Card className="rounded-2xl border border-brand-gold/30 bg-brand-gold-soft p-5 text-brand-gold-ink shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-gold text-white">
                      <UserCheck className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-brand-gold-ink">{stats.pendingApprovalsCount} Registration Application(s) Awaiting Review</h3>
                      <p className="text-xs text-brand-gold-ink/80 mt-0.5">
                        New Mentor and Industry Partner registrations require vetting before account activation.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/workspace/admin/approvals"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-gold text-white text-xs font-semibold hover:bg-brand-gold-hover transition-colors shadow-sm shrink-0"
                  >
                    Review Queue <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan-soft p-5 text-brand-cyan-ink shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-cyan text-white">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-brand-cyan-ink">Registration Vetting Queue is Clear</h3>
                      <p className="text-xs text-brand-cyan-ink/80 mt-0.5">
                        All applicant registrations have been processed. No pending approval actions required.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/workspace/admin/approvals"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-cyan/30 bg-white text-brand-cyan-ink text-xs font-semibold hover:bg-brand-cyan/50 transition-colors shadow-sm shrink-0"
                  >
                    View Queue
                  </Link>
                </div>
              </Card>
            )}

            {/* Role Breakdown Distribution Cards */}
            <SectionDivider label="Ecosystem stakeholder distribution" />
            <div className="space-y-4">
              <SectionHeading title="Ecosystem stakeholder distribution" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { role: "Researcher", key: "student", count: studentCount, accent: "brand" },
                  { role: "Faculty", key: "faculty", count: facultyCount, accent: "brand" },
                  { role: "Mentor", key: "mentor", count: mentorCount, accent: "brand-cyan" },
                  { role: "Investor", key: "investor", count: investorCount, accent: "brand-gold" },
                ].map((item) => (
                  <div key={item.key} className={`rounded-2xl border border-line bg-white p-5 shadow-xs`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-ink">{item.role}</p>
                    <p className="text-[26px] font-black tracking-tight tabular-nums text-ink mt-1">
                      {loading ? "-" : item.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>
    </PageContainer>
  );
}
