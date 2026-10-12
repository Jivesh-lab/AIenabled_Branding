"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  Lightbulb,
  Search,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  BookOpen,
  TrendingUp,
} from "lucide-react";

type IPStatus = "Filed" | "Pending" | "Granted" | "Draft";

const IP_RECORDS = [
  {
    id: "1",
    title: "Machine Learning Model for Early Crop Disease Detection",
    type: "Patent",
    applicationNo: "202341032147",
    student: "Priya Sharma",
    filedDate: "14 Aug 2024",
    status: "Filed" as IPStatus,
    trl: 5,
    description: "Novel ML-based visual detection system with 94.2% accuracy for early-stage fungal and bacterial crop diseases.",
  },
  {
    id: "2",
    title: "Sugarcane-derived Biodegradable Packaging Formulation",
    type: "Provisional Patent",
    applicationNo: "TBD",
    student: "Arjun Mehta",
    filedDate: "—",
    status: "Draft" as IPStatus,
    trl: 3,
    description: "Composite material formulation using bagasse and natural binders achieving 180-day biodegradation cycle.",
  },
  {
    id: "3",
    title: "IoT-based Smart Water Quality Monitoring Algorithm",
    type: "Copyright",
    applicationNo: "SW-2024-00892",
    student: "Kavita Nair",
    filedDate: "02 Oct 2024",
    status: "Granted" as IPStatus,
    trl: 6,
    description: "Embedded signal processing algorithm for real-time multi-parameter water quality assessment.",
  },
  {
    id: "4",
    title: "Decentralised Patient Health Record Architecture",
    type: "Patent",
    applicationNo: "Pending Review",
    student: "Rohan Das",
    filedDate: "28 Nov 2024",
    status: "Pending" as IPStatus,
    trl: 2,
    description: "Blockchain-based distributed record system enabling patient-controlled health data sovereignty.",
  },
];

const STATUS_TONE: Record<IPStatus, "success" | "attention" | "progress" | "neutral"> = {
  Granted: "success",
  Filed: "progress",
  Pending: "attention",
  Draft: "neutral",
};

export default function FacultyIPPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<IPStatus | "All">("All");
  const [showNewDialog, setShowNewDialog] = useState(false);

  const filtered = IP_RECORDS.filter((ip) => {
    const matchSearch = ip.title.toLowerCase().includes(search.toLowerCase()) || ip.student.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || ip.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: IP_RECORDS.length,
    granted: IP_RECORDS.filter((ip) => ip.status === "Granted").length,
    pending: IP_RECORDS.filter((ip) => ip.status === "Pending" || ip.status === "Filed").length,
    draft: IP_RECORDS.filter((ip) => ip.status === "Draft").length,
  };

  return (
    <PageContainer
      title="Intellectual Property Management"
      description="Track patent filings, copyright registrations, and technology transfer activities across your supervised research portfolio."
    >
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total IP Assets", value: stats.total, icon: Shield, color: "bg-brand/10 text-brand" },
            { label: "Granted / Registered", value: stats.granted, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Filed / Pending", value: stats.pending, icon: Clock, color: "bg-amber-50 text-amber-700" },
            { label: "Drafts in Progress", value: stats.draft, icon: FileText, color: "bg-slate-50 text-slate-600" },
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

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["All", "Granted", "Filed", "Pending", "Draft"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === f ? "bg-brand text-white border-brand" : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
              <input
                type="text"
                placeholder="Search IP records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 w-52"
              />
            </div>
            <button
              onClick={() => setShowNewDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="size-3.5" /> New IP Filing
            </button>
          </div>
        </div>

        {/* IP Records */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-ink text-sm">No IP records match your filters.</div>
          )}
          {filtered.map((ip) => (
            <Card key={ip.id} interactive className="p-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-line text-muted-ink uppercase tracking-wider">{ip.type}</span>
                    <StatusBadge label={ip.status} tone={STATUS_TONE[ip.status]} />
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan-ink">TRL {ip.trl}</span>
                  </div>
                  <h3 className="text-sm font-bold text-ink leading-snug">{ip.title}</h3>
                  <p className="text-[12px] text-muted-ink mt-1 leading-relaxed">{ip.description}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-ink">
                    <span className="flex items-center gap-1"><BookOpen className="size-3" /> {ip.student}</span>
                    <span className="flex items-center gap-1"><FileText className="size-3" /> App No: {ip.applicationNo}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3" /> Filed: {ip.filedDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ip.status === "Draft" && (
                    <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                      <Plus className="size-3.5" /> Submit
                    </button>
                  )}
                  <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                    <ExternalLink className="size-3.5" /> Details
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* New IP Dialog (simple inline modal) */}
        {showNewDialog && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowNewDialog(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
                <Lightbulb className="size-5 text-brand-gold" /> New IP Filing
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Title of Innovation *</label>
                  <input type="text" placeholder="Describe your innovation..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">IP Type *</label>
                    <select className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
                      <option>Patent</option>
                      <option>Provisional Patent</option>
                      <option>Copyright</option>
                      <option>Trademark</option>
                      <option>Design Patent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Inventor / Student *</label>
                    <select className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
                      <option>Aria Winters</option>
                      <option>Chen Wei</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Brief Description *</label>
                  <textarea rows={3} placeholder="Describe the innovation in detail..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowNewDialog(false)} className="px-4 py-2 text-xs font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas transition-colors">Cancel</button>
                <button onClick={() => setShowNewDialog(false)} className="px-4 py-2 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors">Save as Draft</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
