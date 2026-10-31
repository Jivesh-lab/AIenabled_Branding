"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import {
  Users,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  Megaphone,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Loader2,
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

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/stats`,
          { credentials: "include" }
        );
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

  const studentCount = stats.roleBreakdown?.student ?? 0;
  const facultyCount = stats.roleBreakdown?.faculty ?? 0;
  const mentorCount = stats.roleBreakdown?.mentor ?? 0;
  const investorCount = stats.roleBreakdown?.investor ?? 0;

  return (
    <PageContainer
      title="Incubation Operations Dashboard"
      description="Centralized operational hub for user onboarding, account approvals, cohort oversight, and ecosystem reports."
    >
      <div className="space-y-6">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Managed Accounts</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? "—" : stats.totalUsers}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  {loading
                    ? "Loading metrics..."
                    : stats.totalUsers === 0
                    ? "No registered accounts yet"
                    : `${stats.activeUsers} Active • ${stats.inactiveUsers} Inactive`}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Pending Registration Queue</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    stats.pendingApprovalsCount > 0 ? "text-amber-600" : "text-slate-900"
                  }`}
                >
                  {loading ? "—" : stats.pendingApprovalsCount}
                </p>
                <p
                  className={`text-[11px] font-medium mt-0.5 ${
                    stats.pendingApprovalsCount > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {loading
                    ? "Checking queue..."
                    : stats.pendingApprovalsCount > 0
                    ? "Vetting Review Required"
                    : "Queue Clear (0 Pending)"}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <UserCheck className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Mentor-to-Student Ratio</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? "—" : stats.mentorStudentRatio || "0:0"}
                </p>
                <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                  {loading
                    ? "Calculating..."
                    : `${mentorCount} Mentors • ${studentCount} Students`}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <BarChart3 className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Flagged Moderation Items</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? "—" : stats.moderationItemsCount}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {loading
                    ? "Checking flags..."
                    : stats.moderationItemsCount === 0
                    ? "No Flagged Content"
                    : "Action Required"}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <ShieldAlert className="size-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Action Hub */}
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2 border border-indigo-400/30">
                Operational Actions
              </span>
              <h2 className="text-xl font-bold tracking-tight">Onboard & Manage Incubation Cohorts</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Create user accounts individually or in bulk via CSV upload, manage vetting queues, publish announcements, or launch workspace oversight mode.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/workspace/admin/users?action=create"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow transition-colors"
              >
                <UserPlus className="size-4" /> Add New User
              </Link>
              <Link
                href="/workspace/admin/users?action=bulk"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-colors"
              >
                <FileSpreadsheet className="size-4 text-emerald-400" /> Bulk CSV Import
              </Link>
              <Link
                href="/workspace/admin/announcements"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-colors"
              >
                <Megaphone className="size-4 text-amber-400" /> Post Announcement
              </Link>
            </div>
          </div>
        </div>

        {/* Pending Approvals Alert Banner */}
        {loading ? null : stats.pendingApprovalsCount > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <UserCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {stats.pendingApprovalsCount} Registration Application(s) Awaiting Review
                </h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  New Mentor and Industry Partner registrations require vetting before account activation.
                </p>
              </div>
            </div>
            <Link
              href="/workspace/admin/approvals"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm shrink-0"
            >
              Review Queue <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">
                  Registration Vetting Queue is Clear
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  All applicant registrations have been processed. No pending approval actions required.
                </p>
              </div>
            </div>
            <Link
              href="/workspace/admin/approvals"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 text-xs font-semibold hover:bg-emerald-50 transition-colors shadow-sm shrink-0"
            >
              View Queue
            </Link>
          </div>
        )}

        {/* Role Breakdown Distribution Cards */}
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight mb-3">
            Ecosystem Stakeholder Distribution
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                role: "Student",
                key: "student",
                count: studentCount,
                color: "border-blue-200 bg-blue-50/50 text-blue-700",
              },
              {
                role: "Faculty",
                key: "faculty",
                count: facultyCount,
                color: "border-purple-200 bg-purple-50/50 text-purple-700",
              },
              {
                role: "Mentor",
                key: "mentor",
                count: mentorCount,
                color: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
              },
              {
                role: "Investor",
                key: "investor",
                count: investorCount,
                color: "border-cyan-200 bg-cyan-50/50 text-cyan-700",
              },
            ].map((item) => (
              <div key={item.key} className={`rounded-lg border ${item.color} p-3 text-center`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider">{item.role}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {loading ? "—" : item.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
