"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  GraduationCap,
  Search,
  Plus,
  Eye,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  BookOpen,
  ChevronDown,
  FileText,
  ExternalLink,
} from "lucide-react";

const STUDENT_PROJECTS = [
  {
    id: "1",
    student: "Priya Sharma",
    rollNo: "CSE21B042",
    year: "Final Year B.Tech",
    projectTitle: "AI-Driven Crop Disease Detection using CNNs",
    domain: "AgriTech / ML",
    stage: "Prototype",
    progress: 68,
    trl: 4,
    status: "Active" as const,
    lastUpdate: "2 days ago",
    nextMilestone: "Prototype Submission",
    nextMilestoneDate: "15 Feb 2025",
    documents: ["Project Proposal", "Literature Review", "Model Architecture Doc", "Progress Report Q1"],
    tags: ["AI/ML", "Agriculture", "Computer Vision"],
  },
  {
    id: "2",
    student: "Arjun Mehta",
    rollNo: "CHEM22A018",
    year: "3rd Year B.Tech",
    projectTitle: "Biodegradable Packaging from Sugarcane Bagasse",
    domain: "GreenTech / Materials",
    stage: "Research",
    progress: 35,
    trl: 2,
    status: "Active" as const,
    lastUpdate: "12 days ago",
    nextMilestone: "Lab Formulation Tests",
    nextMilestoneDate: "28 Jan 2025",
    documents: ["Project Proposal", "Raw Material Report"],
    tags: ["Sustainability", "Materials", "Circular Economy"],
  },
  {
    id: "3",
    student: "Kavita Nair",
    rollNo: "ECE21C077",
    year: "Final Year B.Tech",
    projectTitle: "Smart IoT Water Quality Monitor",
    domain: "IoT / Environment",
    stage: "Validation",
    progress: 82,
    trl: 6,
    status: "Active" as const,
    lastUpdate: "Yesterday",
    nextMilestone: "Regulatory Pre-Submission",
    nextMilestoneDate: "10 Mar 2025",
    documents: ["Project Proposal", "Design Doc", "Testing Report", "Field Data", "IP Filing"],
    tags: ["IoT", "Environment", "Hardware"],
  },
  {
    id: "4",
    student: "Rohan Das",
    rollNo: "IT22D031",
    year: "3rd Year B.Tech",
    projectTitle: "Decentralised Health Records on Blockchain",
    domain: "HealthTech / Web3",
    stage: "Ideation",
    progress: 15,
    trl: 1,
    status: "Lagging" as const,
    lastUpdate: "1 week ago",
    nextMilestone: "Architecture Design",
    nextMilestoneDate: "20 Jan 2025",
    documents: ["Project Proposal"],
    tags: ["Blockchain", "Healthcare", "Privacy"],
  },
  {
    id: "5",
    student: "Sneha Pillai",
    rollNo: "MBA23E009",
    year: "2nd Year MBA",
    projectTitle: "Rural Women Microfinance Platform",
    domain: "FinTech / Social",
    stage: "Research",
    progress: 40,
    trl: 2,
    status: "Completed" as const,
    lastUpdate: "1 month ago",
    nextMilestone: "Thesis Submission",
    nextMilestoneDate: "30 Apr 2025",
    documents: ["Project Proposal", "Market Research", "Business Model Canvas", "Survey Data"],
    tags: ["FinTech", "Social Impact", "Microfinance"],
  },
];

const STATUS_TONE: Record<string, "success" | "progress" | "attention" | "neutral" | "danger"> = {
  Active: "progress",
  Lagging: "attention",
  Completed: "success",
  "On Hold": "neutral",
};

export default function FacultyStudentProjectsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = STUDENT_PROJECTS.filter((p) => {
    const matchSearch =
      p.student.toLowerCase().includes(search.toLowerCase()) ||
      p.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
      p.domain.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <PageContainer
      title="Student Projects"
      description="View and manage all student projects under your faculty supervision — track progress, review documents, and schedule milestone reviews."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Projects", value: STUDENT_PROJECTS.length, icon: GraduationCap, color: "bg-brand/10 text-brand" },
            { label: "Active", value: STUDENT_PROJECTS.filter((p) => p.status === "Active").length, icon: TrendingUp, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Lagging", value: STUDENT_PROJECTS.filter((p) => p.status === "Lagging").length, icon: AlertTriangle, color: "bg-amber-50 text-amber-700" },
            { label: "Completed", value: STUDENT_PROJECTS.filter((p) => p.status === "Completed").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
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

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {["All", "Active", "Lagging", "Completed"].map((f) => (
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
              placeholder="Search projects or students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-52"
            />
          </div>
        </div>

        {/* Project List */}
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
                      <StatusBadge label={proj.status} tone={STATUS_TONE[proj.status] ?? "neutral"} />
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-line text-muted-ink">TRL {proj.trl}</span>
                      <span className="text-[11px] text-muted-ink">{proj.domain}</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink leading-snug">{proj.projectTitle}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><Users className="size-3" /> {proj.student} ({proj.rollNo})</span>
                      <span className="flex items-center gap-1"><BookOpen className="size-3" /> {proj.year}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> Updated {proj.lastUpdate}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proj.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="w-32 shrink-0 space-y-1">
                    <ProgressBar value={proj.progress} label={`${proj.progress}%`} />
                  </div>
                  <ChevronDown className={`size-4 text-muted-ink transition-transform shrink-0 ${expanded === proj.id ? "rotate-180" : ""}`} />
                </div>
              </div>

              {expanded === proj.id && (
                <div className="border-t border-line p-5 bg-canvas/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-ink mb-2">Submitted Documents</p>
                      <div className="space-y-1.5">
                        {proj.documents.map((doc) => (
                          <div key={doc} className="flex items-center gap-2 text-xs text-muted-ink">
                            <CheckCircle2 className="size-3 text-success shrink-0" /> {doc}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink mb-2">Next Milestone</p>
                      <div className="p-3 rounded-lg bg-white border border-line">
                        <p className="text-sm font-semibold text-ink">{proj.nextMilestone}</p>
                        <p className="text-[11px] text-muted-ink mt-0.5 flex items-center gap-1">
                          <Calendar className="size-3" /> Due: {proj.nextMilestoneDate}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                          <MessageSquare className="size-3.5" /> Message
                        </button>
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                          <ExternalLink className="size-3.5" /> Full Project
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
