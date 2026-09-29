"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  Users,
  Clock,
  CheckCircle2,
  Eye,
  Sparkles,
  Tag,
} from "lucide-react";

type ProblemStatus = "Open" | "Under Review" | "Closed" | "Draft";

const PROBLEMS = [
  {
    id: "1",
    title: "AI-Powered Smart Inventory Prediction for Distribution Warehouses",
    category: "Supply Chain / AI",
    description: "We operate 14 distribution warehouses across India and face ~12% inventory wastage due to inaccurate demand forecasting. We are looking for startups that can deploy an AI/ML solution to predict demand at SKU level with 90%+ accuracy using our historical ERP data.",
    budget: "₹25–50L (pilot phase)",
    timeline: "6-month pilot starting Q2 2025",
    lookingFor: ["ML engineers with supply chain experience", "API integration with SAP ERP", "Real-time dashboard", "Automated re-order triggers"],
    applications: 8,
    status: "Open" as ProblemStatus,
    postedDate: "Jan 5, 2025",
    deadline: "Feb 28, 2025",
    tags: ["AI/ML", "Supply Chain", "Enterprise SaaS"],
  },
  {
    id: "2",
    title: "Carbon Footprint Tracking & ESG Reporting Automation",
    category: "CleanTech / ESG",
    description: "Our company has committed to net-zero by 2035 under the SBTi framework. We need a startup partner to build a real-time carbon tracking platform integrated with our procurement, logistics, and manufacturing data. The solution should auto-generate BRSR and GRI-compliant ESG reports.",
    budget: "₹15–30L (MVP + annual license)",
    timeline: "4-month MVP delivery",
    lookingFor: ["GHG protocol and BRSR expertise", "ERP/logistics integrations", "Automated reporting dashboards", "Third-party data verification support"],
    applications: 4,
    status: "Open" as ProblemStatus,
    postedDate: "Jan 10, 2025",
    deadline: "Feb 15, 2025",
    tags: ["CleanTech", "ESG", "Compliance", "Automation"],
  },
  {
    id: "3",
    title: "Predictive Maintenance for CNC Manufacturing Equipment",
    category: "Industry 4.0 / IoT",
    description: "Unplanned equipment downtime costs our manufacturing division approximately ₹40L per month. We need an IoT + ML solution that can predict failures 48–72 hours in advance using vibration, temperature, and pressure sensor data from our CNC machines.",
    budget: "₹20–40L (pilot, 3 machines)",
    timeline: "3-month pilot, ongoing SLA",
    lookingFor: ["IoT hardware + edge computing expertise", "Sensor integration with legacy CNC systems", "Failure prediction with >85% precision", "Mobile alert system for floor managers"],
    applications: 6,
    status: "Under Review" as ProblemStatus,
    postedDate: "Dec 20, 2024",
    deadline: "Jan 31, 2025",
    tags: ["IoT", "Industry 4.0", "Predictive Analytics", "Manufacturing"],
  },
];

const STATUS_TONE: Record<ProblemStatus, "success" | "progress" | "neutral" | "attention"> = {
  Open: "success",
  "Under Review": "progress",
  Closed: "neutral",
  Draft: "attention",
};

export default function IndustryProblemStatementsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <PageContainer
      title="Problem Statements"
      description="Post real business challenges your organization faces and connect with incubated startups who can solve them."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Problems", value: PROBLEMS.filter((p) => p.status === "Open").length, icon: FileText, color: "bg-brand/10 text-brand" },
            { label: "Total Applications", value: PROBLEMS.reduce((a, p) => a + p.applications, 0), icon: Users, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Under Review", value: PROBLEMS.filter((p) => p.status === "Under Review").length, icon: Eye, color: "bg-amber-50 text-amber-700" },
            { label: "Avg Applications", value: Math.round(PROBLEMS.reduce((a, p) => a + p.applications, 0) / PROBLEMS.length), icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">{PROBLEMS.length} Problem Statements</h2>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
          >
            <Plus className="size-3.5" /> Post New Problem
          </button>
        </div>

        {/* Problem Cards */}
        <div className="space-y-4">
          {PROBLEMS.map((prob) => (
            <Card key={prob.id} className="overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                onClick={() => setExpanded(expanded === prob.id ? null : prob.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge label={prob.status} tone={STATUS_TONE[prob.status]} />
                      <span className="text-[11px] text-muted-ink">{prob.category}</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink leading-snug">{prob.title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><Users className="size-3" /> {prob.applications} applications</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> Deadline: {prob.deadline}</span>
                      <span className="flex items-center gap-1"><Tag className="size-3" /> {prob.budget}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {prob.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); }} className="size-7 rounded flex items-center justify-center border border-line text-muted-ink hover:border-brand/40 hover:text-brand transition-colors">
                      <Edit2 className="size-3.5" />
                    </button>
                    <ChevronDown className={`size-4 text-muted-ink transition-transform ${expanded === prob.id ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </div>

              {expanded === prob.id && (
                <div className="border-t border-line p-5 bg-canvas/50 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-ink mb-1.5">Challenge Description</p>
                    <p className="text-xs text-muted-ink leading-relaxed">{prob.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink mb-2">We Are Looking For</p>
                    <ul className="space-y-1">
                      {prob.lookingFor.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-muted-ink">
                          <CheckCircle2 className="size-3 text-success mt-0.5 shrink-0" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white border border-line">
                      <p className="text-[10px] font-bold text-muted-ink uppercase tracking-wider">Budget Range</p>
                      <p className="text-sm font-bold text-ink mt-0.5">{prob.budget}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-line">
                      <p className="text-[10px] font-bold text-muted-ink uppercase tracking-wider">Timeline</p>
                      <p className="text-sm font-bold text-ink mt-0.5">{prob.timeline}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* New Problem Dialog */}
        {showNew && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-base font-bold text-ink mb-4">Post New Problem Statement</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Title *</label>
                  <input type="text" placeholder="e.g. AI-powered demand forecasting for FMCG distribution..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Category *</label>
                    <select className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none bg-white">
                      <option>AI/ML</option><option>IoT</option><option>CleanTech</option><option>FinTech</option><option>Supply Chain</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Budget Range</label>
                    <input type="text" placeholder="e.g. ₹20–40L" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Problem Description *</label>
                  <textarea rows={5} placeholder="Describe the business challenge in detail..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Application Deadline</label>
                  <input type="date" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-xs font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas">Cancel</button>
                <button onClick={() => setShowNew(false)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover">
                  <FileText className="size-3.5" /> Publish Problem
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
