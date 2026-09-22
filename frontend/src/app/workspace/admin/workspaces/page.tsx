"use client";

import Link from "next/link";
import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Eye,
  UserCheck,
  GraduationCap,
  Briefcase,
  Award,
  Building2,
  TrendingUp,
  Rocket,
  ArrowRight,
  Shield,
  Search,
  User,
} from "lucide-react";

const WORKSPACE_TILES = [
  {
    title: "Student Workspace Oversight",
    role: "student",
    path: "/workspace/student/dashboard",
    icon: GraduationCap,
    color: "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200",
    description: "Inspect project submissions, team wizard progress, milestone trackers, and meeting requests.",
  },
  {
    title: "Faculty Workspace Oversight",
    role: "faculty",
    path: "/workspace/faculty/dashboard",
    icon: Award,
    color: "from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-200",
    description: "Inspect research project supervision, evaluation grade rubrics, and academic approvals.",
  },
  {
    title: "Mentor Workspace Oversight",
    role: "mentor",
    path: "/workspace/mentor/dashboard",
    icon: Briefcase,
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200",
    description: "Inspect assigned mentees, calendar slots, session logs, and guidance feedback.",
  },
  {
    title: "Industry Partner Oversight",
    role: "industry",
    path: "/workspace/industry-partner/dashboard",
    icon: Building2,
    color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200",
    description: "Inspect corporate challenge statements, co-R&D partnerships, and talent matching.",
  },
  {
    title: "Investor Workspace Oversight",
    role: "investor",
    path: "/workspace/investor/dashboard",
    icon: TrendingUp,
    color: "from-cyan-500/10 to-blue-500/10 text-cyan-600 border-cyan-200",
    description: "Inspect venture pitch decks, cap tables, funding pipeline, and deal flows.",
  },
  {
    title: "Startup / Alumni Oversight",
    role: "startup",
    path: "/workspace/startup/dashboard",
    icon: Rocket,
    color: "from-rose-500/10 to-red-500/10 text-rose-600 border-rose-200",
    description: "Inspect incubation KPIs, product traction metrics, grant utilization, and scaling roadmaps.",
  },
];

export default function WorkspaceOversightPage() {
  const [impersonateQuery, setImpersonateQuery] = useState("");
  const [impersonateUser, setImpersonateUser] = useState<{ id?: string; name: string; email: string; role?: string } | null>(null);

  async function handleLaunchImpersonation() {
    const queryTarget = impersonateUser?.id || impersonateUser?.email || impersonateQuery.trim();

    if (!queryTarget) {
      toast.error("Please enter a user email or ID to impersonate.");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/impersonate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ targetUserId: queryTarget }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        toast.success(`Impersonation mode active! Redirecting to ${data.targetUser.name}'s workspace...`);
        window.location.href = data.targetUser.workspaceUrl;
      } else {
        toast.error(data.message || "Failed to launch impersonation session.");
      }
    } catch {
      toast.error("Network error launching impersonation session.");
    }
  }

  return (
    <PageContainer
      title="Workspace Oversight & User Impersonation"
      description="Inspect any workspace or temporarily view the system as a specific user to troubleshoot issues."
    >
      <div className="space-y-6">
        {/* Impersonation Launcher Box */}
        <Card className="p-6 border border-indigo-200 bg-gradient-to-r from-slate-900 to-indigo-950 text-white space-y-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-indigo-400/30">
              <Shield className="size-3" /> User Impersonation ("View as User")
            </span>
            <h2 className="text-lg font-bold tracking-tight">Troubleshoot & Support Users Directly</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Select a user below to view the platform exactly as they see it. Every impersonation session is logged in the Admin Audit Log with your admin identity and timestamp.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                placeholder="Type user email or ID (e.g. aarav.sharma@student.edu)..."
                value={impersonateQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setImpersonateQuery(val);
                  if (val.trim()) {
                    setImpersonateUser({
                      id: val.trim(),
                      name: val.includes("@") ? val.split("@")[0] : val,
                      email: val.trim(),
                      role: "USER",
                    });
                  } else {
                    setImpersonateUser(null);
                  }
                }}
                className="pl-9 text-xs h-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-indigo-400"
              />
            </div>

            <button
              onClick={handleLaunchImpersonation}
              disabled={!impersonateQuery.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
            >
              <Eye className="size-4" /> Launch View as User
            </button>
          </div>

          {impersonateUser && (
            <div className="p-3 rounded-lg bg-white/10 border border-white/20 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400">Selected Target: </span>
                <strong className="text-white">{impersonateUser.email}</strong>
              </div>
              <span className="text-[11px] text-amber-300 flex items-center gap-1">
                ⚠️ Audit Log Entry Will Be Generated
              </span>
            </div>
          )}
        </Card>

        {/* Workspace Tiles Grid */}
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight mb-3">
            Role Workspace Inspection Grid
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WORKSPACE_TILES.map((ws) => {
              const IconComponent = ws.icon;
              return (
                <Card
                  key={ws.role}
                  className={`p-5 bg-gradient-to-br ${ws.color} flex flex-col justify-between hover:shadow-md transition-all duration-200 group`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
                        <IconComponent className="size-5" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-800 border uppercase">
                        {ws.role}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {ws.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {ws.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Read / Edit Oversight</span>
                    <Link
                      href={ws.path}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors shadow-sm"
                    >
                      Inspect <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
