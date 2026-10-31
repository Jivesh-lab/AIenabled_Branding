"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  Search, AlertTriangle, CheckCircle2, Clock,
  Users, MessageSquare, ExternalLink, ChevronDown,
  Loader2, AlertCircle,
} from "lucide-react";

interface Milestone {
  name: string;
  done: boolean;
}

interface Project {
  id: string;
  title: string;
  leadStudent: string;
  stage: string;
  progress: number;
  trl: number;
  health: string;
  overdueMilestonesCount: number;
  nextMilestone: string;
  nextMilestoneDate: string;
}

const HEALTH_TONE: Record<string, "success" | "attention" | "danger" | "neutral"> = {
  "On Track": "success",
  "Needs Attention": "attention",
  "At Risk": "danger",
};

export default function FacultyOversightPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "On Track" | "Needs Attention" | "At Risk">("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/projects");
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        if (json.success) {
          setProjects(json.data || []);
        } else {
          throw new Error(json.message || "Failed to load projects");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.leadStudent?.toLowerCase().includes(search.toLowerCase()) ||
      p.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || p.health === filter;
    return matchSearch && matchFilter;
  });

  return (
    <PageContainer
      title="Student Project Oversight"
      description="Real-time supervision of student progress, milestone completion, health status, and intervention flags across your cohort."
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Supervised", value: projects.length, icon: Users, color: "bg-brand/10 text-brand" },
            { label: "On Track", value: projects.filter((p) => p.health === "On Track").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Needs Attention", value: projects.filter((p) => p.health === "Needs Attention").length, icon: Clock, color: "bg-amber-50 text-amber-700" },
            { label: "At Risk", value: projects.filter((p) => p.health === "At Risk").length, icon: AlertTriangle, color: "bg-red-50 text-danger" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{s.label}</p>
                  <p className="text-2xl font-bold text-ink mt-1">{s.value}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["All", "On Track", "Needs Attention", "At Risk"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === f ? "bg-brand text-white border-brand" : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
            <input
              type="text"
              placeholder="Search student or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-52"
            />
          </div>
        </div>

        {/* Project Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-ink gap-2">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading oversight data from database…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="size-8 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-danger">Failed to load projects</p>
            <p className="text-xs text-muted-ink mt-1">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-line bg-canvas p-10 text-center">
            <Users className="size-10 text-muted-ink mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-ink">No cohort projects enrolled yet</p>
            <p className="text-xs text-muted-ink mt-1">
              Supervised student capstones and startup projects will appear here as cohorts begin.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-line bg-canvas p-10 text-center">
            <Users className="size-10 text-muted-ink mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-ink">No projects match your filter</p>
            <p className="text-xs text-muted-ink mt-1">Try changing the health status filter or search term.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((proj) => (
              <Card key={proj.id} className="overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                  onClick={() => setExpanded(expanded === proj.id ? null : proj.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <StatusBadge label={proj.health} tone={HEALTH_TONE[proj.health] ?? "neutral"} />
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-line text-muted-ink">TRL {proj.trl}</span>
                        <span className="text-[11px] font-semibold text-muted-ink">{proj.stage}</span>
                      </div>
                      <h3 className="text-sm font-bold text-ink">{proj.title}</h3>
                      <p className="text-[12px] text-muted-ink mt-0.5 flex items-center gap-1">
                        <Users className="size-3" /> {proj.leadStudent}
                      </p>
                      {proj.overdueMilestonesCount > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-danger bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                            <AlertTriangle className="size-3" /> {proj.overdueMilestonesCount} milestone(s) overdue
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="w-32 shrink-0">
                      <ProgressBar value={proj.progress} label={`${proj.progress}%`} />
                    </div>
                    <ChevronDown className={`size-4 text-muted-ink transition-transform shrink-0 ${expanded === proj.id ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {expanded === proj.id && (
                  <div className="border-t border-line p-5 bg-canvas/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-bold text-ink mb-2">Next Milestone</p>
                        <div className="p-3 rounded-lg bg-white border border-line">
                          <p className="text-sm font-semibold text-ink">{proj.nextMilestone || "—"}</p>
                          <p className="text-[11px] text-muted-ink mt-0.5">Due: {proj.nextMilestoneDate || "TBD"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-end">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                          <MessageSquare className="size-3.5" /> Send Nudge
                        </button>
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                          <ExternalLink className="size-3.5" /> Full Report
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
