"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  Eye,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  BookOpen,
  MessageSquare,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

const STUDENT_PROJECTS = [
  {
    id: "1",
    student: "Priya Sharma",
    projectTitle: "AI-Driven Crop Disease Detection",
    stage: "Prototype",
    progress: 68,
    trl: 4,
    lastCheckIn: "3 days ago",
    healthStatus: "On Track" as const,
    alerts: [],
    milestones: [
      { name: "Literature Review", done: true },
      { name: "Dataset Collection", done: true },
      { name: "ML Model Training", done: true },
      { name: "Prototype v1.0", done: false },
      { name: "Field Validation", done: false },
    ],
    mentorSessions: 8,
    documents: 14,
  },
  {
    id: "2",
    student: "Arjun Mehta",
    projectTitle: "Biodegradable Packaging from Sugarcane Waste",
    stage: "Research",
    progress: 35,
    trl: 2,
    lastCheckIn: "12 days ago",
    healthStatus: "Needs Attention" as const,
    alerts: ["No mentor check-in in 12 days", "Milestone 2 overdue by 5 days"],
    milestones: [
      { name: "Raw Material Sourcing", done: true },
      { name: "Lab Formulation Tests", done: false },
      { name: "Biodegradation Study", done: false },
      { name: "Industry Sample Approval", done: false },
      { name: "Scale-up Feasibility", done: false },
    ],
    mentorSessions: 3,
    documents: 6,
  },
  {
    id: "3",
    student: "Kavita Nair",
    projectTitle: "Smart Water Quality Monitoring IoT",
    stage: "Validation",
    progress: 82,
    trl: 6,
    lastCheckIn: "1 day ago",
    healthStatus: "On Track" as const,
    alerts: [],
    milestones: [
      { name: "Sensor Hardware Design", done: true },
      { name: "Firmware Development", done: true },
      { name: "Lab Accuracy Testing", done: true },
      { name: "Field Pilot (3 sites)", done: true },
      { name: "Regulatory Pre-Submission", done: false },
    ],
    mentorSessions: 15,
    documents: 28,
  },
  {
    id: "4",
    student: "Rohan Das",
    projectTitle: "Decentralised Health Records on Blockchain",
    stage: "Ideation",
    progress: 15,
    trl: 1,
    lastCheckIn: "1 week ago",
    healthStatus: "At Risk" as const,
    alerts: ["TRL 1 after 3 months — progress slower than cohort average", "IP strategy not defined"],
    milestones: [
      { name: "Problem Statement", done: true },
      { name: "Architecture Design", done: false },
      { name: "Smart Contract POC", done: false },
      { name: "User Testing", done: false },
      { name: "Regulatory Compliance Review", done: false },
    ],
    mentorSessions: 2,
    documents: 3,
  },
];

const HEALTH_TONE: Record<string, "success" | "attention" | "danger" | "neutral"> = {
  "On Track": "success",
  "Needs Attention": "attention",
  "At Risk": "danger",
};

export default function FacultyOversightPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "On Track" | "Needs Attention" | "At Risk">("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = STUDENT_PROJECTS.filter((p) => {
    const matchSearch = p.student.toLowerCase().includes(search.toLowerCase()) || p.projectTitle.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || p.healthStatus === filter;
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
            { label: "Total Supervised", value: STUDENT_PROJECTS.length, icon: Users, color: "bg-brand/10 text-brand" },
            { label: "On Track", value: STUDENT_PROJECTS.filter((p) => p.healthStatus === "On Track").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Needs Attention", value: STUDENT_PROJECTS.filter((p) => p.healthStatus === "Needs Attention").length, icon: Clock, color: "bg-amber-50 text-amber-700" },
            { label: "At Risk", value: STUDENT_PROJECTS.filter((p) => p.healthStatus === "At Risk").length, icon: AlertTriangle, color: "bg-red-50 text-danger" },
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
                      <StatusBadge label={proj.healthStatus} tone={HEALTH_TONE[proj.healthStatus]} />
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-line text-muted-ink">TRL {proj.trl}</span>
                      <span className="text-[11px] font-semibold text-muted-ink">{proj.stage}</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink">{proj.projectTitle}</h3>
                    <p className="text-[12px] text-muted-ink mt-0.5 flex items-center gap-1">
                      <Users className="size-3" /> {proj.student} · Last check-in: {proj.lastCheckIn}
                    </p>
                    {proj.alerts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {proj.alerts.map((alert, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[11px] text-danger bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                            <AlertTriangle className="size-3" /> {alert}
                          </span>
                        ))}
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
                    {/* Milestone tracker */}
                    <div>
                      <p className="text-xs font-bold text-ink mb-3">Milestone Progress</p>
                      <div className="space-y-2">
                        {proj.milestones.map((m, i) => (
                          <div key={i} className="flex items-center gap-2.5">
                            <div className={`size-4 rounded-full flex items-center justify-center shrink-0 ${m.done ? "bg-success" : "border-2 border-line bg-white"}`}>
                              {m.done && <CheckCircle2 className="size-3 text-white" />}
                            </div>
                            <span className={`text-xs ${m.done ? "text-muted-ink line-through" : "text-ink"}`}>{m.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-white border border-line flex items-center justify-between">
                        <span className="text-xs text-muted-ink">Mentor Sessions Completed</span>
                        <span className="text-sm font-bold text-ink">{proj.mentorSessions}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-line flex items-center justify-between">
                        <span className="text-xs text-muted-ink">Documents Submitted</span>
                        <span className="text-sm font-bold text-ink">{proj.documents}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                          <MessageSquare className="size-3.5" /> Send Nudge
                        </button>
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                          <ExternalLink className="size-3.5" /> Full Report
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
