"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  Inbox,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  MapPin,
  Building2,
  Clock,
  Star,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Calendar,
  ExternalLink,
  Filter,
} from "lucide-react";

type AppStatus = "New" | "Shortlisted" | "Declined" | "Meeting Scheduled";

const APPLICATIONS = [
  {
    id: "1",
    startup: "AgroVision AI",
    tagline: "AI-powered crop disease detection drones for precision agriculture",
    domain: "AgriTech / Deep Tech",
    stage: "Seed",
    location: "Pune, MH",
    problemStatement: "AI-Powered Smart Inventory Prediction",
    appliedDate: "Jan 18, 2025",
    score: 94,
    status: "Shortlisted" as AppStatus,
    founders: "Rajesh Kumar, Anita Desai",
    traction: "₹18L ARR · 6 farms",
    highlights: ["DGCA approved prototype", "Patent pending algorithm", "IISc incubated"],
    proposalSummary: "We propose adapting our computer vision platform to analyze warehouse inventory imagery using the same CNN architecture trained for field crop analysis. Estimated accuracy: 93.5%. Full integration with SAP ERP in 8 weeks.",
    tags: ["AI/ML", "Computer Vision", "IoT"],
  },
  {
    id: "2",
    startup: "CleanBuild Materials",
    tagline: "Fly-ash based sustainable construction blocks reducing carbon by 65%",
    domain: "CleanTech / Construction",
    stage: "Seed",
    location: "Hyderabad, TS",
    problemStatement: "Carbon Footprint Tracking & ESG Reporting",
    appliedDate: "Jan 15, 2025",
    score: 87,
    status: "New" as AppStatus,
    founders: "Arjun Reddy, Neha Singh",
    traction: "2 pilot buildings · CSIR certified",
    highlights: ["CSIR certification", "Telangana state MoU", "BRSR expertise"],
    proposalSummary: "Our material tracking platform already monitors carbon footprint per unit of construction material. We can extend this to a full Scope 1, 2, 3 tracking dashboard with BRSR and GRI auto-reporting in a 12-week engagement.",
    tags: ["ESG", "CleanTech", "Compliance"],
  },
  {
    id: "3",
    startup: "WaterSafe IoT",
    tagline: "Real-time industrial effluent and water quality monitoring",
    domain: "CleanTech / IoT",
    stage: "Pre-Seed",
    location: "Chennai, TN",
    problemStatement: "Carbon Footprint Tracking & ESG Reporting",
    appliedDate: "Jan 12, 2025",
    score: 82,
    status: "Meeting Scheduled" as AppStatus,
    founders: "Kavita Rajan, Sameer Ali",
    traction: "3 industrial deployments · ₹8L ARR",
    highlights: ["CPCB certified sensors", "Real-time API", "BRSR module ready"],
    proposalSummary: "WaterSafe's ESG module provides plug-and-play BRSR reporting for manufacturing companies. We can integrate with your procurement and logistics ERP in 6 weeks, with live GHG dashboards from day one.",
    tags: ["IoT", "ESG", "Compliance", "Real-time"],
  },
  {
    id: "4",
    startup: "IndusPredict",
    tagline: "Predictive maintenance for CNC and heavy industrial machinery",
    domain: "Industry 4.0 / AI",
    stage: "Seed",
    location: "Pune, MH",
    problemStatement: "Predictive Maintenance for CNC Equipment",
    appliedDate: "Jan 8, 2025",
    score: 91,
    status: "Shortlisted" as AppStatus,
    founders: "Vikram Mehta, Priya Kaur",
    traction: "₹22L ARR · 4 manufacturing clients",
    highlights: ["86% failure prediction accuracy", "CNC-specific ML models", "Edge deployment"],
    proposalSummary: "IndusPredict has deployed predictive maintenance on 40+ CNC machines across 4 factories. For your pilot, we propose deploying edge sensors on 3 machines with 72-hour failure prediction, targeting 90%+ precision within 2 months.",
    tags: ["Industry 4.0", "IoT", "Predictive Analytics", "Manufacturing"],
  },
];

const STATUS_TONE: Record<AppStatus, "success" | "progress" | "neutral" | "attention"> = {
  "Shortlisted": "success",
  "New": "info" as never,
  "Declined": "neutral",
  "Meeting Scheduled": "progress",
};

export default function IndustryApplicationsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppStatus | "All">("All");
  const [actions, setActions] = useState<Record<string, AppStatus>>(
    Object.fromEntries(APPLICATIONS.map((a) => [a.id, a.status]))
  );

  const filtered = APPLICATIONS.filter((a) => statusFilter === "All" || actions[a.id] === statusFilter);

  function changeStatus(id: string, status: AppStatus) {
    setActions((prev) => ({ ...prev, [id]: status }));
  }

  return (
    <PageContainer
      title="Applications"
      description="Review startup applications submitted in response to your problem statements — shortlist, decline, or schedule meetings."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Applications", value: APPLICATIONS.length, icon: Inbox, color: "bg-brand/10 text-brand" },
            { label: "New (Unreviewed)", value: Object.values(actions).filter((a) => a === "New").length, icon: Sparkles, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Shortlisted", value: Object.values(actions).filter((a) => a === "Shortlisted").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Meetings Set", value: Object.values(actions).filter((a) => a === "Meeting Scheduled").length, icon: Calendar, color: "bg-amber-50 text-amber-700" },
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
        <div className="flex items-center gap-2 flex-wrap">
          {(["All", "New", "Shortlisted", "Meeting Scheduled", "Declined"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === f ? "bg-brand text-white border-brand" : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Application Cards */}
        <div className="space-y-4">
          {filtered.map((app) => (
            <Card key={app.id} className="overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Score */}
                  <div className={`shrink-0 size-12 rounded-lg flex items-center justify-center text-base font-black border-2 ${app.score >= 90 ? "border-success text-success bg-emerald-50" : app.score >= 80 ? "border-brand text-brand bg-brand/5" : "border-brand-gold text-brand-gold-ink bg-amber-50"}`}>
                    {app.score}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-ink">{app.startup}</h3>
                      <StatusBadge label={actions[app.id]} tone={STATUS_TONE[actions[app.id]]} />
                    </div>
                    <p className="text-xs text-muted-ink italic mb-1">{app.tagline}</p>
                    <p className="text-[11px] text-muted-ink mb-1.5">Problem: <span className="font-semibold text-ink">{app.problemStatement}</span></p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><Building2 className="size-3" /> {app.domain} · {app.stage}</span>
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {app.location}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {app.appliedDate}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {app.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => changeStatus(app.id, "Shortlisted")} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${actions[app.id] === "Shortlisted" ? "bg-success text-white border-success" : "border-line text-muted-ink hover:border-success hover:text-success"}`}>
                      <ThumbsUp className="size-3.5" />
                    </button>
                    <button onClick={() => changeStatus(app.id, "Declined")} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${actions[app.id] === "Declined" ? "bg-danger text-white border-danger" : "border-line text-muted-ink hover:border-danger hover:text-danger"}`}>
                      <ThumbsDown className="size-3.5" />
                    </button>
                    <ChevronDown className={`size-4 text-muted-ink transition-transform mt-1 ${expanded === app.id ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </div>

              {expanded === app.id && (
                <div className="border-t border-line p-5 bg-canvas/50 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-ink mb-1.5">Startup Proposal</p>
                    <p className="text-xs text-muted-ink leading-relaxed">{app.proposalSummary}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink mb-2">Key Highlights</p>
                    <ul className="space-y-1">
                      {app.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-xs text-muted-ink">
                          <CheckCircle2 className="size-3 text-success mt-0.5 shrink-0" /> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => changeStatus(app.id, "Meeting Scheduled")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                      <Calendar className="size-3.5" /> Schedule Meeting
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                      <MessageSquare className="size-3.5" /> Message
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                      <ExternalLink className="size-3.5" /> Full Profile
                    </button>
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
