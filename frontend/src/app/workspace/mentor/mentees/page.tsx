"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  Users, Search, MessageSquare, Calendar, TrendingUp, Star,
  ChevronDown, BookOpen, Clock, CheckCircle2, AlertTriangle,
  ExternalLink, Video, Loader2, AlertCircle,
} from "lucide-react";

interface Mentee {
  _id: string;
  name: string;
  rollNumber?: string;
  department?: string;
  projectTitle?: string;
  domain?: string;
  progress?: number;
  trl?: number;
  stage?: string;
  sessionsCompleted?: number;
  healthStatus?: string;
  openTasks?: number;
}

const HEALTH_TONE: Record<string, "success" | "attention" | "danger" | "neutral"> = {
  "On Track": "success",
  "Needs Attention": "attention",
  "At Risk": "danger",
};

const AVATAR_COLORS = ["bg-brand text-white", "bg-brand-cyan text-white", "bg-emerald-600 text-white", "bg-amber-500 text-white"];

export default function MentorMenteesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMentees() {
      try {
        setLoading(true);
        // Fetch from faculty projects — mentees are the students on projects
        const res = await fetch("/api/faculty/projects");
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        if (json.success) {
          // Map projects to mentee-like structure
          const mapped: Mentee[] = (json.data || []).map((p: any) => ({
            _id: p._id || p.id,
            name: p.leadStudent || "Student",
            rollNumber: p.rollNumber,
            department: p.department,
            projectTitle: p.title,
            domain: p.domain,
            progress: p.progress,
            trl: p.trl,
            stage: p.stage,
            healthStatus: p.health || "On Track",
            openTasks: p.overdueMilestonesCount || 0,
          }));
          setMentees(mapped);
        } else {
          throw new Error(json.message || "Failed to load mentees");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMentees();
  }, []);

  const filtered = mentees.filter((m) => {
    const matchSearch =
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.projectTitle?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || m.healthStatus === filter;
    return matchSearch && matchFilter;
  });

  return (
    <PageContainer
      title="My Mentees"
      description="Manage and monitor all students assigned to you — track progress, session history, health flags, and growth areas."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Mentees", value: mentees.length, icon: Users, color: "bg-brand/10 text-brand" },
            { label: "On Track", value: mentees.filter((m) => m.healthStatus === "On Track").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Needs Attention", value: mentees.filter((m) => m.healthStatus === "Needs Attention").length, icon: AlertTriangle, color: "bg-amber-50 text-amber-700" },
            { label: "At Risk", value: mentees.filter((m) => m.healthStatus === "At Risk").length, icon: AlertTriangle, color: "bg-red-50 text-danger" },
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
            {["All", "On Track", "Needs Attention", "At Risk"].map((f) => (
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
              placeholder="Search mentees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-48"
            />
          </div>
        </div>

        {/* Mentee Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-ink gap-2">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading mentees from database…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="size-8 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-danger">Failed to load mentees</p>
            <p className="text-xs text-muted-ink mt-1">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-line bg-canvas p-10 text-center">
            <Users className="size-10 text-muted-ink mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-ink">No mentees found</p>
            <p className="text-xs text-muted-ink mt-1">
              {mentees.length === 0
                ? "No students are currently assigned to you as mentees."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((mentee, idx) => (
              <Card key={mentee._id} className="overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                  onClick={() => setExpanded(expanded === mentee._id ? null : mentee._id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                      {mentee.name?.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-ink">{mentee.name}</span>
                        <StatusBadge label={mentee.healthStatus || "On Track"} tone={HEALTH_TONE[mentee.healthStatus || "On Track"]} />
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">TRL {mentee.trl}</span>
                      </div>
                      <p className="text-[12px] text-muted-ink mb-1">{mentee.department} · {mentee.rollNumber}</p>
                      <p className="text-[12px] font-semibold text-ink">{mentee.projectTitle}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-muted-ink">
                        <span className="flex items-center gap-1"><BookOpen className="size-3" /> Stage: {mentee.stage}</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="size-3" /> {mentee.openTasks} overdue milestone(s)</span>
                      </div>
                    </div>

                    <div className="w-28 shrink-0">
                      <ProgressBar value={mentee.progress || 0} label={`${mentee.progress || 0}%`} />
                    </div>

                    <ChevronDown className={`size-4 text-muted-ink transition-transform shrink-0 ${expanded === mentee._id ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {expanded === mentee._id && (
                  <div className="border-t border-line p-5 bg-canvas/50">
                    <div className="flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                        <MessageSquare className="size-3.5" /> Message
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                        <Video className="size-3.5" /> Schedule
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                        <ExternalLink className="size-3.5" /> Project
                      </button>
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
