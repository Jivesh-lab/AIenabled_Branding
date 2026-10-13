"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import {
  Users,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  Megaphone,
  BarChart3,
  ShieldAlert,
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
  totalUsers: 142,
  activeUsers: 128,
  inactiveUsers: 8,
  pendingUsers: 6,
  rejectedUsers: 0,
  roleBreakdown: {
    student: 84,
    faculty: 18,
    mentor: 22,
    investor: 4,
  },
  pendingApprovalsCount: 6,
  moderationItemsCount: 2,
  mentorStudentRatio: "1:3.8",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData>(INITIAL_STATS);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/stats`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setStats(data.stats);
        }
      } catch {
        // Fallback to initial stats
      }
    }
    fetchStats();
  }, []);

  return (
    <PageContainer
      title="Incubation Operations & Governance"
      description="Central command desk for cohort user provisioning, partner vetting queues, and institutional compliance."
    >
      <div className="space-y-6">
        {/* Urgent Vetting Alert (Single Bold Operational Element) */}
        {stats.pendingApprovalsCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-800 mt-0.5">
                <UserCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-amber-950">
                  {stats.pendingApprovalsCount} Registration Applications Awaiting Review
                </h3>
                <p className="text-[13px] text-amber-900 mt-0.5 max-w-2xl">
                  New mentor and industry partner credentials require centre vetting before workspace access is granted.
                </p>
              </div>
            </div>
            <Link
              href="/workspace/admin/approvals"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-amber-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            >
              Open vetting queue
            </Link>
          </div>
        )}

        {/* Operational Metric Strip */}
        <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-ink">
              <span className="text-[13px] font-medium">Managed Accounts</span>
              <Users className="size-4 text-slate-400" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">
              {stats.totalUsers}
            </p>
            <p className="text-[12px] text-emerald-700 mt-0.5">
              {stats.activeUsers} active, {stats.inactiveUsers} inactive
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[13px] font-medium">Vetting Queue</span>
              <UserCheck className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-amber-800 tabular-nums">
              {stats.pendingApprovalsCount}
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">Awaiting credential check</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[13px] font-medium">Advisory Ratio</span>
              <BarChart3 className="size-4 text-slate-400" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">
              {stats.mentorStudentRatio}
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {stats.roleBreakdown.mentor} mentors for {stats.roleBreakdown.student} students
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[13px] font-medium">Flagged Items</span>
              <ShieldAlert className="size-4 text-slate-400" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">
              {stats.moderationItemsCount}
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5">Reported items for audit</p>
          </div>
        </div>

        {/* Operational Hub & Management Actions */}
        <div className="rounded-lg border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line/60">
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Cohort Management & User Provisioning</h2>
              <p className="text-[13px] text-muted-ink mt-0.5 max-w-xl">
                Provision accounts, import cohort batches, broadcast centre announcements, or audit platform access logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/workspace/admin/users?action=create"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
              >
                <UserPlus className="size-3.5" />
                Add User
              </Link>
              <Link
                href="/workspace/admin/users?action=bulk"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-slate-50"
              >
                <FileSpreadsheet className="size-3.5 text-slate-400" />
                Import Batch CSV
              </Link>
              <Link
                href="/workspace/admin/announcements"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-slate-50"
              >
                <Megaphone className="size-3.5 text-slate-400" />
                Post Announcement
              </Link>
            </div>
          </div>

          {/* Stakeholder Cohort Ledger */}
          <div className="pt-4">
            <h3 className="text-[13px] font-semibold text-ink mb-3">Stakeholder Distribution</h3>
            <div className="grid grid-cols-2 divide-y divide-line rounded-md border border-line bg-[#FAFBFB] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <div className="p-3.5 text-center">
                <span className="text-[12px] font-medium text-muted-ink">Students</span>
                <p className="text-[20px] font-semibold text-ink mt-1 tabular-nums">{stats.roleBreakdown.student}</p>
              </div>
              <div className="p-3.5 text-center">
                <span className="text-[12px] font-medium text-muted-ink">Faculty Guides</span>
                <p className="text-[20px] font-semibold text-ink mt-1 tabular-nums">{stats.roleBreakdown.faculty}</p>
              </div>
              <div className="p-3.5 text-center">
                <span className="text-[12px] font-medium text-muted-ink">Industry Mentors</span>
                <p className="text-[20px] font-semibold text-ink mt-1 tabular-nums">{stats.roleBreakdown.mentor}</p>
              </div>
              <div className="p-3.5 text-center">
                <span className="text-[12px] font-medium text-muted-ink">Capital Partners</span>
                <p className="text-[20px] font-semibold text-ink mt-1 tabular-nums">{stats.roleBreakdown.investor}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
