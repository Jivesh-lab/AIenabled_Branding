"use client";

import { useState } from "react";
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
} from "lucide-react";

const MENTEES = [
  {
    id: "1",
    name: "Priya Sharma",
    rollNo: "CSE21B042",
    program: "Final Year B.Tech CSE",
    avatar: "PS",
    projectTitle: "AI-Driven Crop Disease Detection",
    domain: "AgriTech / ML",
    progress: 68,
    trl: 4,
    stage: "Prototype",
    sessionsCompleted: 8,
    lastSession: "Jan 20, 2025",
    nextSession: "Jan 27, 2025",
    healthStatus: "On Track",
    rating: 5,
    openTasks: 2,
    strengths: ["Fast learner", "Data-driven approach", "Strong technical foundation"],
    areasToImprove: ["Business model articulation", "Market sizing methodology"],
    recentNote: "Excellent progress on model accuracy. Needs guidance on pivot from B2C to B2B2C distribution.",
  },
  {
    id: "2",
    name: "Arjun Mehta",
    rollNo: "CHEM22A018",
    program: "3rd Year B.Tech Chemical",
    avatar: "AM",
    projectTitle: "Biodegradable Packaging from Sugarcane Waste",
    domain: "GreenTech / Materials",
    progress: 35,
    trl: 2,
    stage: "Research",
    sessionsCompleted: 3,
    lastSession: "Jan 15, 2025",
    nextSession: "Feb 5, 2025",
    healthStatus: "Needs Attention",
    rating: 4,
    openTasks: 5,
    strengths: ["Innovative material thinking", "Strong lab skills"],
    areasToImprove: ["Consistency in milestone completion", "Communication frequency"],
    recentNote: "Has been slow to respond to follow-ups. Lab formulation tests overdue by 5 days. Need to schedule catch-up.",
  },
  {
    id: "3",
    name: "Kavita Nair",
    rollNo: "ECE21C077",
    program: "Final Year B.Tech ECE",
    avatar: "KN",
    projectTitle: "Smart IoT Water Quality Monitor",
    domain: "IoT / CleanTech",
    progress: 82,
    trl: 6,
    stage: "Validation",
    sessionsCompleted: 15,
    lastSession: "Jan 22, 2025",
    nextSession: "Jan 29, 2025",
    healthStatus: "On Track",
    rating: 5,
    openTasks: 1,
    strengths: ["Proactive", "Excellent documentation", "Strong pitch skills"],
    areasToImprove: ["Regulatory process navigation"],
    recentNote: "Ready for Series A conversations. Should focus on regulatory pre-submission in parallel.",
  },
  {
    id: "4",
    name: "Rohan Das",
    rollNo: "IT22D031",
    program: "3rd Year B.Tech IT",
    avatar: "RD",
    projectTitle: "Decentralised Health Records on Blockchain",
    domain: "HealthTech / Web3",
    progress: 15,
    trl: 1,
    stage: "Ideation",
    sessionsCompleted: 2,
    lastSession: "Jan 5, 2025",
    nextSession: "Feb 10, 2025",
    healthStatus: "At Risk",
    rating: 3,
    openTasks: 8,
    strengths: ["Visionary thinking", "Strong blockchain technical knowledge"],
    areasToImprove: ["Scope management", "Regulatory awareness for healthcare", "Communication discipline"],
    recentNote: "Progress is significantly behind cohort average. Need to have a frank conversation about scope and commitment.",
  },
];

const HEALTH_TONE: Record<string, "success" | "attention" | "danger" | "neutral"> = {
  "On Track": "success",
  "Needs Attention": "attention",
  "At Risk": "danger",
};

const AVATAR_COLORS = ["bg-brand text-white", "bg-teal-700 text-white", "bg-emerald-700 text-white", "bg-amber-700 text-white"];

export default function MentorMenteesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = MENTEES.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.projectTitle.toLowerCase().includes(search.toLowerCase());
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
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">{MENTEES.length}</p>
            <p className="text-[12px] text-slate-500 mt-0.5">Enrolled founders</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[13px] font-medium">On Track</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-emerald-800 tabular-nums">
              {MENTEES.filter((m) => m.healthStatus === "On Track").length}
            </p>
            <p className="text-[12px] text-emerald-700 mt-0.5">Meeting targets</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[13px] font-medium">Needs Attention</span>
              <AlertTriangle className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-amber-800 tabular-nums">
              {MENTEES.filter((m) => m.healthStatus === "Needs Attention").length}
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">Action pending</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-red-800">
              <span className="text-[13px] font-medium">At Risk</span>
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-red-800 tabular-nums">
              {MENTEES.filter((m) => m.healthStatus === "At Risk").length}
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
        <div className="divide-y divide-line rounded-lg border border-line bg-white">
          {filtered.map((mentee, idx) => (
            <div key={mentee.id} className="transition-colors">
              <div
                className="p-5 cursor-pointer hover:bg-[#FAFBFB] transition-colors"
                onClick={() => setExpanded(expanded === mentee.id ? null : mentee.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Initials Avatar */}
                  <div className={`size-10 rounded-md flex items-center justify-center text-[13px] font-semibold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                    {mentee.avatar}
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
                      {mentee.program}, Roll {mentee.rollNo}
                    </p>
                    <p className="text-[14px] font-medium text-ink">{mentee.projectTitle}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-muted-ink">
                      <span className="flex items-center gap-1.5"><Calendar className="size-3 text-slate-400" /> Last session: {mentee.lastSession}</span>
                      <span className="flex items-center gap-1.5"><Clock className="size-3 text-slate-400" /> Next session: {mentee.nextSession}</span>
                      <span className="flex items-center gap-1.5"><BookOpen className="size-3 text-slate-400" /> {mentee.sessionsCompleted} sessions completed</span>
                      <span className="flex items-center gap-1.5"><AlertTriangle className="size-3 text-slate-400" /> {mentee.openTasks} open deliverables</span>
                    </div>
                  </div>

                  <div className="w-28 shrink-0 hidden sm:block">
                    <ProgressBar value={mentee.progress} label="Readiness" />
                  </div>

                  <ChevronDown className={`size-4 text-muted-ink transition-transform shrink-0 mt-1 ${expanded === mentee.id ? "rotate-180" : ""}`} />
                </div>
              </div>

              {expanded === mentee.id && (
                <div className="px-5 pb-5 pt-2 border-t border-line/60 bg-[#FAFBFB]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
                    <div>
                      <h4 className="font-semibold text-ink mb-1">Key Strengths</h4>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-ink">
                        {mentee.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-ink mb-1">Development Areas</h4>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-ink">
                        {mentee.areasToImprove.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-line/60">
                    <h4 className="font-semibold text-ink text-[13px] mb-1">Latest Advisory Notes</h4>
                    <p className="text-[13px] text-muted-ink leading-relaxed">{mentee.recentNote}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-line/60">
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
      </div>
    </PageContainer>
  );
}
