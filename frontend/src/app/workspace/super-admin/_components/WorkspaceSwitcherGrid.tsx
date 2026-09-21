"use client";

import Link from "next/link";
import {
  GraduationCap,
  Briefcase,
  Award,
  Building2,
  TrendingUp,
  Rocket,
  ArrowRight,
  Eye,
  ShieldCheck,
} from "lucide-react";

const WORKSPACES = [
  {
    title: "Student Workspace",
    role: "student",
    path: "/workspace/student/dashboard",
    icon: GraduationCap,
    color: "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800",
    description: "Inspect student project submissions, milestone trackers, meeting requests, and team profiles.",
  },
  {
    title: "Faculty Workspace",
    role: "faculty",
    path: "/workspace/faculty/dashboard",
    icon: Award,
    color: "from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-800",
    description: "Inspect project evaluations, academic research supervision, grade rubric assignments, and approvals.",
  },
  {
    title: "Mentor Workspace",
    role: "mentor",
    path: "/workspace/mentor/dashboard",
    icon: Briefcase,
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200",
    badgeColor: "bg-emerald-100 text-emerald-800",
    description: "Inspect assigned mentorship sessions, feedback logs, availability calendar, and guidance history.",
  },
  {
    title: "Industry Partner Workspace",
    role: "industry",
    path: "/workspace/industry-partner/dashboard",
    icon: Building2,
    color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-800",
    description: "Inspect industry challenge statements, corporate sponsorships, co-R&D partnerships, and talent matching.",
  },
  {
    title: "Investor Workspace",
    role: "investor",
    path: "/workspace/investor/dashboard",
    icon: TrendingUp,
    color: "from-cyan-500/10 to-blue-500/10 text-cyan-600 border-cyan-200",
    badgeColor: "bg-cyan-100 text-cyan-800",
    description: "Inspect deal flow pipeline, venture evaluation decks, funding rounds, cap tables, and pitch requests.",
  },
  {
    title: "Startup / Alumni Workspace",
    role: "startup",
    path: "/workspace/startup/dashboard",
    icon: Rocket,
    color: "from-rose-500/10 to-red-500/10 text-rose-600 border-rose-200",
    badgeColor: "bg-rose-100 text-rose-800",
    description: "Inspect incubation progress, product metrics, grant utilization, and scaling roadmaps.",
  },
];

export default function WorkspaceSwitcherGrid() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Eye className="size-5 text-blue-600" /> System Workspace Inspection Switcher
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any role workspace below to instantly view and inspect that workspace without requiring separate credentials.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <ShieldCheck className="size-3.5" /> Full Access Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKSPACES.map((ws) => {
          const IconComponent = ws.icon;
          return (
            <div
              key={ws.role}
              className={`rounded-xl border bg-gradient-to-br ${ws.color} p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 group`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
                    <IconComponent className="size-5" />
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ws.badgeColor}`}>
                    {ws.role.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {ws.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {ws.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Eye className="size-3" /> Read / Inspect Mode
                </span>
                <Link
                  href={ws.path}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Inspect View
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
