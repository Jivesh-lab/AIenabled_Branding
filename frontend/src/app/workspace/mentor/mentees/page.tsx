"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  Users,
  Search,
  MessageSquare,
  Calendar,
  TrendingUp,
  Star,
  ChevronDown,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Phone,
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

const AVATAR_COLORS = ["bg-brand text-white", "bg-brand-cyan text-white", "bg-emerald-600 text-white", "bg-amber-500 text-white"];

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
      title="My Mentees"
      description="Manage and monitor all students assigned to you — track progress, session history, health flags, and growth areas."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Mentees", value: MENTEES.length, icon: Users, color: "bg-brand/10 text-brand" },
            { label: "On Track", value: MENTEES.filter((m) => m.healthStatus === "On Track").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Needs Attention", value: MENTEES.filter((m) => m.healthStatus === "Needs Attention").length, icon: AlertTriangle, color: "bg-amber-50 text-amber-700" },
            { label: "At Risk", value: MENTEES.filter((m) => m.healthStatus === "At Risk").length, icon: AlertTriangle, color: "bg-red-50 text-danger" },
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
        <div className="space-y-3">
          {filtered.map((mentee, idx) => (
            <Card key={mentee.id} className="overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                onClick={() => setExpanded(expanded === mentee.id ? null : mentee.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                    {mentee.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-ink">{mentee.name}</span>
                      <StatusBadge label={mentee.healthStatus} tone={HEALTH_TONE[mentee.healthStatus]} />
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">TRL {mentee.trl}</span>
                    </div>
                    <p className="text-[12px] text-muted-ink mb-1">{mentee.program} · {mentee.rollNo}</p>
                    <p className="text-[12px] font-semibold text-ink">{mentee.projectTitle}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><Calendar className="size-3" /> Last: {mentee.lastSession}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> Next: {mentee.nextSession}</span>
                      <span className="flex items-center gap-1"><BookOpen className="size-3" /> {mentee.sessionsCompleted} sessions</span>
                      <span className="flex items-center gap-1"><AlertTriangle className="size-3" /> {mentee.openTasks} open tasks</span>
                    </div>
                  </div>

                  <div className="w-28 shrink-0">
                    <ProgressBar value={mentee.progress} label={`${mentee.progress}%`} />
                  </div>

                  <ChevronDown className={`size-4 text-muted-ink transition-transform shrink-0 ${expanded === mentee.id ? "rotate-180" : ""}`} />
                </div>
              </div>

              {expanded === mentee.id && (
                <div className="border-t border-line p-5 bg-canvas/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs font-bold text-ink mb-2">Strengths</p>
                      <ul className="space-y-1">
                        {mentee.strengths.map((s) => (
                          <li key={s} className="flex items-start gap-2 text-xs text-muted-ink">
                            <CheckCircle2 className="size-3 text-success mt-0.5 shrink-0" /> {s}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs font-bold text-ink mb-2 mt-4">Areas to Improve</p>
                      <ul className="space-y-1">
                        {mentee.areasToImprove.map((a) => (
                          <li key={a} className="flex items-start gap-2 text-xs text-muted-ink">
                            <TrendingUp className="size-3 text-brand-cyan mt-0.5 shrink-0" /> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink mb-2">Recent Mentor Note</p>
                      <p className="text-xs text-muted-ink italic leading-relaxed p-3 bg-white border border-line rounded-lg">{mentee.recentNote}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
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
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
