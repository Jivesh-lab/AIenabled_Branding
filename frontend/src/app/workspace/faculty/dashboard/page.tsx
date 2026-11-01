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
  Briefcase,
  Loader2,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  leadStudent: string;
  stage: string;
  progress: number;
  trl: number;
  health: string;
  overdueMilestonesCount: number;
}

interface Metrics {
  activeProjects: number;
  totalStudents: number;
  pendingMentorRequests: number;
  upcomingMeetings: number;
  pendingTasks: number;
  overdueMilestones: number;
}

const HEALTH_STATUS_TONE: Record<string, "success" | "attention" | "danger" | "neutral"> = {
  "On Track": "success",
  "Needs Attention": "attention",
  "At Risk": "danger",
};

export default function FacultyDashboardPage() {
  const [greeting, setGreeting] = useState("Good morning");
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
  }, []);

  useEffect(() => {
    async function fetchOverview() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/overview");
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        if (json.success) {
          setProjects(json.data.projects || []);
          setMetrics(json.data.metrics || null);
        } else {
          throw new Error(json.message || "Failed to load data");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  const stageToStatus = (health: string): "success" | "attention" | "danger" | "progress" | "neutral" => {
    if (health === "On Track") return "success";
    if (health === "Needs Attention") return "attention";
    if (health === "At Risk") return "danger";
    return "progress";
  };

  return (
    <PageContainer
      title="Faculty Research Dashboard"
      description="Oversight of supervised student projects, IP filings, grant management, and research progression."
    >
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Supervised Projects", value: metrics?.activeProjects ?? "—", sub: "Active this semester", icon: GraduationCap, color: "bg-brand/10 text-brand" },
            { label: "Pending Mentor Requests", value: metrics?.pendingMentorRequests ?? "—", sub: "Awaiting coordinator action", icon: FileText, color: "bg-amber-50 text-amber-700" },
            { label: "Upcoming Meetings", value: metrics?.upcomingMeetings ?? "—", sub: "Scheduled sessions", icon: Award, color: "bg-emerald-50 text-emerald-700" },
            { label: "Overdue Milestones", value: metrics?.overdueMilestones ?? "—", sub: "Across all projects", icon: TrendingUp, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
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
              <p className="text-xs text-blue-200 mt-1">
                {metrics ? `${metrics.overdueMilestones} overdue milestones. ${metrics.pendingMentorRequests} mentor requests pending.` : "Loading your activity summary…"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/workspace/faculty" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-brand-deep text-xs font-bold transition-colors shadow-xs">
                <Briefcase className="size-3.5" /> Faculty Management Module
              </Link>
              <Link href="/workspace/faculty/trl-calculator" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors">
                <Microscope className="size-3.5" /> TRL Calculator
              </Link>
              <Link href="/workspace/faculty/ip" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors">
                <Lightbulb className="size-3.5" /> File IP
              </Link>
            </div>
          </div>
        </div>

        {/* Supervised Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeading title="Supervised Student Projects & AI Health Tracking" action={{ label: "View all", href: "/workspace/faculty/student-projects" }} />
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              Monitoring Agent Active
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-ink gap-2">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading projects from database…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
              <AlertCircle className="size-8 text-danger mx-auto mb-2" />
              <p className="text-sm font-semibold text-danger">Failed to load projects</p>
              <p className="text-xs text-muted-ink mt-1">{error}</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-line bg-canvas p-10 text-center">
              <GraduationCap className="size-10 text-muted-ink mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold text-ink">No supervised projects yet</p>
              <p className="text-xs text-muted-ink mt-1">Projects will appear here once students are enrolled in your cohort.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((proj) => (
                <Card key={proj.id} interactive className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-ink leading-tight">{proj.title}</p>
                      <p className="text-[12px] text-muted-ink mt-0.5 flex items-center gap-1">
                        <Users className="size-3" /> {proj.leadStudent}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-line text-muted-ink">TRL {proj.trl}</span>
                      <StatusBadge label={proj.stage} tone={stageToStatus(proj.health)} />
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          proj.health === "On Track"
                            ? "bg-emerald-100 text-emerald-800"
                            : proj.health === "Needs Attention"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {proj.health}
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={proj.progress} label={`Completion: ${proj.progress}%`} />

                  {proj.health !== "On Track" && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2">
                      <AlertCircle className="size-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Monitoring Agent Intervention:</strong>{" "}
                        {proj.overdueMilestonesCount > 1
                          ? `${proj.overdueMilestonesCount} milestones overdue. Coordinator check-in recommended.`
                          : "1 milestone overdue. Review sprint task deadlines with student founder."}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
