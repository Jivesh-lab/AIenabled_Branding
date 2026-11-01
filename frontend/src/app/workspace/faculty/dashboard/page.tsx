"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { useSession } from "next-auth/react";
import ApprovalsPanel from "@/components/agentic/ApprovalsPanel";
import AgentActivityFeed from "@/components/agentic/AgentActivityFeed";
import AttentionPanel from "@/components/agentic/AttentionPanel";
import AgentMeetings from "@/components/agentic/AgentMeetings";
import { friendlyThrown } from "@/lib/friendlyError";
import { FacultyListSkeleton } from "@/components/shared/loading/facultySkeletons";
import { Card, KpiCard, SectionHeading, SectionDivider, StatusBadge, ProgressBar } from "@/components/shared/Surface";
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
  pendingMentorDecisions?: number;
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
  const { data: session } = useSession();
  const firstName = (session?.user?.name || "").replace(/\s*\([^)]*\)\s*$/, "") || "Professor";
  const [tab, setTab] = useState<"home" | "portfolio">("home");
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
        setError(friendlyThrown(err, "We couldn't load this right now. Please try again in a moment."));
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
      title="Faculty Workspace"
      description="Mentor allocations waiting for you, what the agents did for your startups, and anything they could not resolve."
    >
      <div className="space-y-8">
        <div role="tablist" aria-label="Faculty views" className="flex gap-1 border-b border-line">
          {([["home", "Approvals & activity"], ["portfolio", "Cohort portfolio"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)} className={`-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-medium ${tab === id ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink"}`}>{label}</button>
          ))}
        </div>

        {tab === "home" && (
          <div className="space-y-8">
            <SectionDivider label="Approvals needed" />
            <ApprovalsPanel title="Approvals needed" types={["mentor_allocation"]} emptyMessage="When a mentor accepts a request for one of your startups, the Mentor-Matching Agent proposes them here with who it asked and why. You confirm; it then arranges the onboarding meeting." />

            <SectionDivider label="Agent activity & escalations" />
            <div className="grid gap-8 xl:grid-cols-2">
              <AgentActivityFeed title="Agent activity on your startups" limit={12} />
              <AttentionPanel title="Escalations for your startups" />
            </div>

            <SectionDivider label="Meetings" />
            <AgentMeetings title="Meetings the agents arranged" canRecord />
          </div>
        )}

        {tab === "portfolio" && (
          <div className="space-y-8">
            {/* KPI Row */}
            <SectionDivider label="At a Glance" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
              <KpiCard label="Supervised Projects" value={metrics?.activeProjects ?? "-"} sub="Active this semester" icon={GraduationCap} accent="brand" />
              <KpiCard label="Mentor decisions waiting" value={metrics?.pendingMentorDecisions ?? "-"} sub="Proposals awaiting your approval" icon={FileText} accent="brand" />
              <KpiCard label="Upcoming Meetings" value={metrics?.upcomingMeetings ?? "-"} sub="Scheduled sessions" icon={Award} accent="brand-cyan" />
              <KpiCard label="Overdue Milestones" value={metrics?.overdueMilestones ?? "-"} sub="Across all projects" icon={TrendingUp} accent="brand-gold" />
            </div>

            {/* Quick Actions Banner */}
            <SectionDivider label="Faculty actions" />
            <Card variant="elevated" className="rounded-2xl border border-brand-deep/30 bg-brand-deep p-6 text-white shadow-[0_12px_28px_rgba(16,27,53,0.12)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold uppercase tracking-wider mb-2">
                    Faculty Actions
                  </span>
                  <h2 className="text-lg font-bold">{greeting}, {firstName}</h2>
                  <p className="text-xs text-slate-200 mt-1">
                    {metrics ? `${metrics.overdueMilestones} overdue milestones. ${metrics.pendingMentorDecisions ?? 0} mentor decisions waiting.` : "Loading your activity summary…"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Link href="/workspace/faculty" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-brand-deep text-xs font-bold hover:bg-white/90 transition-colors shadow-sm">
                    <Briefcase className="size-3.5" /> Faculty Management Module
                  </Link>
                  <Link href="/workspace/faculty/trl-calculator" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/30 bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors">
                    <Microscope className="size-3.5" /> TRL Calculator
                  </Link>
                  <Link href="/workspace/faculty/ip" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/30 bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors">
                    <Lightbulb className="size-3.5" /> File IP
                  </Link>
                </div>
              </div>
            </Card>

            {/* Supervised Projects */}
            <SectionDivider label="Supervised projects" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionHeading title="Supervised Researcher Projects & AI Health Tracking" action={{ label: "View all", href: "/workspace/faculty/student-projects" }} />
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/30 text-[11px] font-bold uppercase tracking-[0.04em]">
                  <span className="size-1 rounded-full bg-brand" aria-hidden="true" />
                  Monitoring Agent Active
                </span>
              </div>

              {loading ? (
                <FacultyListSkeleton />
              ) : error ? (
                <Card variant="elevated" className="p-8 text-center">
                  <AlertCircle className="size-8 text-brand mx-auto mb-3" />
                  <p className="text-sm font-semibold text-ink">Failed to load projects</p>
                  <p className="text-xs text-muted-ink mt-1">{error}</p>
                </Card>
              ) : projects.length === 0 ? (
                <Card variant="subtle" className="p-10 text-center">
                  <GraduationCap className="size-10 text-muted-ink mx-auto mb-3 opacity-50" />
                  <h3 className="text-[16px] font-bold text-ink">No supervised projects yet</h3>
                  <p className="text-xs text-muted-ink mt-1">Projects will appear here once researchers are enrolled in your cohort.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => (
                    <Card key={proj.id} interactive className="p-4 rounded-xl border border-line bg-white shadow-xs hover:shadow-[0_8px_24px_rgba(16,27,53,0.06)] transition-all duration-200 group">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-ink leading-tight group-hover:text-brand transition-colors">{proj.title}</p>
                          <p className="text-[12px] text-muted-ink mt-0.5 flex items-center gap-1">
                            <Users className="size-3" /> {proj.leadStudent}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-line text-muted-ink">TRL {proj.trl}</span>
                          <StatusBadge label={proj.stage} tone={stageToStatus(proj.health)} />
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${proj.health === "On Track" ? "bg-brand-soft text-brand border-brand/30" : proj.health === "Needs Attention" ? "bg-brand-gold-soft text-brand-gold-ink border-brand-gold/30" : "bg-red-50 text-red-700 border-red-200"}`}
                          >
                            {proj.health}
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={proj.progress} label={`Completion: ${proj.progress}%`} />

                      {proj.health !== "On Track" && (
                        <div className="mt-3 p-2.5 rounded-lg bg-brand-gold-soft border border-brand-gold/30 text-[11px] text-brand-gold-ink flex items-start gap-2">
                          <AlertCircle className="size-3.5 text-brand-gold-ink shrink-0 mt-0.5" />
                          <div>
                            <strong>Monitoring Agent Intervention:</strong>{" "}
                            {proj.overdueMilestonesCount > 1
                              ? `${proj.overdueMilestonesCount} milestones overdue. Coordinator check-in recommended.`
                              : "1 milestone overdue. Review sprint task deadlines with researcher founder."}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
