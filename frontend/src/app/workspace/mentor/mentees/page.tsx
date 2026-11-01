"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  Users,
  Search,
  MessageSquare,
  Calendar,
  ChevronDown,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Video,
  Loader2,
  ExternalLink,
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
  healthStatus: "On Track" | "Needs Attention" | "At Risk";
  openTasks?: number;
  recentNote?: string;
}

const HEALTH_TONE: Record<string, "success" | "attention" | "danger" | "neutral"> = {
  "On Track": "success",
  "Needs Attention": "attention",
  "At Risk": "danger",
};

const AVATAR_COLORS = ["bg-brand text-white", "bg-teal-700 text-white", "bg-emerald-700 text-white", "bg-amber-700 text-white"];

const DEFAULT_MENTEES: Mentee[] = [
  {
    _id: "m1",
    name: "Riya Patel",
    rollNumber: "DBIT-2023-CS-042",
    department: "Computer Engineering",
    projectTitle: "HealthFlow AI — Autonomous Clinical Triage",
    domain: "HealthTech / AI",
    progress: 72,
    trl: 4,
    stage: "MVP Validation",
    sessionsCompleted: 6,
    healthStatus: "On Track",
    openTasks: 0,
    recentNote: "Clinical validation partner identified. Need to finalize pilot protocol before next sprint review.",
  },
  {
    _id: "m2",
    name: "Amit Sharma",
    rollNumber: "DBIT-2023-ET-018",
    department: "Electronics & Telecom",
    projectTitle: "EcoCharge Solutions — Battery Swapping Grid",
    domain: "CleanTech / IoT",
    progress: 48,
    trl: 3,
    stage: "Prototyping",
    sessionsCompleted: 4,
    healthStatus: "Needs Attention",
    openTasks: 2,
    recentNote: "BMS sensor calibration delayed due to component shipment. Exploring local supplier alternative.",
  },
  {
    _id: "m3",
    name: "John D'Souza",
    rollNumber: "DBIT-2023-IT-089",
    department: "Information Technology",
    projectTitle: "FinTrack — Micro-SME Cash Flow Engine",
    domain: "FinTech / SaaS",
    progress: 35,
    trl: 2,
    stage: "Concept Validation",
    sessionsCompleted: 2,
    healthStatus: "On Track",
    openTasks: 1,
    recentNote: "Customer discovery interviews with 15 local merchants completed. Data analysis in progress.",
  },
];

export default function MentorMenteesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mentees, setMentees] = useState<Mentee[]>(DEFAULT_MENTEES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMentees() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/projects");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const mapped: Mentee[] = json.data.map((p: any) => ({
              _id: p._id || p.id,
              name: p.leadStudent || "Student Founder",
              rollNumber: p.rollNumber || "DBIT Cohort",
              department: p.department || "Engineering",
              projectTitle: p.title || "Incubation Project",
              domain: p.domain || "Technology",
              progress: p.progress || 50,
              trl: p.trl || 3,
              stage: p.stage || `TRL ${p.trl || 3}`,
              healthStatus: p.health === "At Risk" ? "At Risk" : p.health === "Needs Attention" ? "Needs Attention" : "On Track",
              openTasks: p.overdueMilestonesCount || 0,
              recentNote: p.summary || "Active mentoring in progress.",
            }));
            setMentees(mapped);
          }
        }
      } catch {
        // Fall back to defaults
      } finally {
        setLoading(false);
      }
    }
    fetchMentees();
  }, []);

  const filtered = mentees.filter((m) => {
    const matchSearch =
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.projectTitle?.toLowerCase().includes(search.toLowerCase()) ||
      m.department?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || m.healthStatus === filter;
    return matchSearch && matchFilter;
  });

  return (
    <PageContainer
      title="Advised Student Startups"
      description="Manage and monitor students assigned to your clinic. Track milestone progression, consultation logs, and growth roadblocks."
    >
      <div className="space-y-6">
        {/* Cohort Mentee Health Strip */}
        <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-ink">
              <span className="text-[13px] font-medium">Total Mentees</span>
              <Users className="size-4 text-slate-400" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">
              {loading ? "—" : mentees.length}
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5">Enrolled founders</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[13px] font-medium">On Track</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-emerald-800 tabular-nums">
              {loading ? "—" : mentees.filter((m) => m.healthStatus === "On Track").length}
            </p>
            <p className="text-[12px] text-emerald-700 mt-0.5">Meeting targets</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[13px] font-medium">Needs Attention</span>
              <AlertTriangle className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-amber-800 tabular-nums">
              {loading ? "—" : mentees.filter((m) => m.healthStatus === "Needs Attention").length}
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">Action pending</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-red-800">
              <span className="text-[13px] font-medium">At Risk</span>
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-red-800 tabular-nums">
              {loading ? "—" : mentees.filter((m) => m.healthStatus === "At Risk").length}
            </p>
            <p className="text-[12px] text-red-700 mt-0.5">Immediate check-in</p>
          </div>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {["All", "On Track", "Needs Attention", "At Risk"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors ${
                  filter === f
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-muted-ink border-line hover:border-slate-300 hover:text-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
            <input
              type="text"
              placeholder="Search by student or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-[13px] border border-line rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-64"
            />
          </div>
        </div>

        {/* Mentee Roster */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-ink gap-2">
            <Loader2 className="size-5 animate-spin text-brand" />
            <span className="text-sm">Loading mentees from database…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-line bg-white p-10 text-center">
            <Users className="size-8 text-slate-300 mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-ink">No mentees found</p>
            <p className="text-[12px] text-muted-ink mt-1">Try adjusting your search query or filter selection.</p>
          </div>
        ) : (
          <div className="divide-y divide-line rounded-lg border border-line bg-white">
            {filtered.map((mentee, idx) => (
              <div key={mentee._id} className="transition-colors">
                <div
                  className="p-5 cursor-pointer hover:bg-[#FAFBFB] transition-colors"
                  onClick={() => setExpanded(expanded === mentee._id ? null : mentee._id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Initials Avatar */}
                    <div className={`size-10 rounded-md flex items-center justify-center text-[13px] font-semibold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                      {mentee.name?.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[15px] font-semibold text-ink">{mentee.name}</span>
                        <StatusBadge label={mentee.healthStatus} tone={HEALTH_TONE[mentee.healthStatus]} />
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-line bg-canvas text-muted-ink">
                          TRL {mentee.trl} ({mentee.stage})
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-ink mb-1">
                        {mentee.department}, Roll {mentee.rollNumber}
                      </p>
                      <p className="text-[14px] font-medium text-ink">{mentee.projectTitle}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-muted-ink">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="size-3 text-slate-400" />
                          Stage: {mentee.stage}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="size-3 text-slate-400" />
                          {mentee.openTasks} open deliverable(s)
                        </span>
                      </div>
                    </div>

                    <div className="w-28 shrink-0 hidden sm:block">
                      <ProgressBar value={mentee.progress || 0} label={`${mentee.progress || 0}%`} />
                    </div>

                    <ChevronDown className={`size-4 text-muted-ink transition-transform shrink-0 mt-1 ${expanded === mentee._id ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {expanded === mentee._id && (
                  <div className="px-5 pb-5 pt-2 border-t border-line/60 bg-[#FAFBFB]">
                    {mentee.recentNote && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-ink text-[13px] mb-1">Latest Advisory Notes</h4>
                        <p className="text-[13px] text-muted-ink leading-relaxed">{mentee.recentNote}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/60">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-slate-50"
                      >
                        <MessageSquare className="size-3.5 text-slate-400" />
                        Add Session Note
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-hover"
                      >
                        <Video className="size-3.5" />
                        Schedule 1:1 Review
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
