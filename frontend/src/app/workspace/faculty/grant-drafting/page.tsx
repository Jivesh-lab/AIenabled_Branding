"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  IndianRupee,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
} from "lucide-react";

const GRANTS = [
  {
    id: "1",
    title: "DST NIDHI Seed Fund – Cohort 2024",
    agency: "Department of Science & Technology",
    amount: 1500000,
    status: "Active",
    stage: "Utilisation Report",
    deadline: "31 Mar 2025",
    utilised: 62,
    description: "Seed funding for early-stage deep tech innovations with market potential. Supports prototype development and initial market validation.",
    eligibility: "Registered startups < 2 years, Indian founders",
    submitted: "12 Jan 2024",
    draftScore: 91,
  },
  {
    id: "2",
    title: "BIRAC BIG 15 – Biotechnology Grant",
    agency: "Biotechnology Industry Research Assistance Council",
    amount: 5000000,
    stage: "Milestone 2 Report",
    status: "Active",
    deadline: "30 Jun 2025",
    utilised: 28,
    description: "BIG 15 supports young innovators in biotechnology including agri-biotech, healthcare, and industrial biotech sectors.",
    eligibility: "Individual or startup teams, Indian nationals",
    submitted: "05 Mar 2024",
    draftScore: 88,
  },
  {
    id: "3",
    title: "ICMR Young Scientist Grant – Healthcare Innovation",
    agency: "Indian Council of Medical Research",
    amount: 2500000,
    status: "Draft",
    stage: "Application Drafting",
    deadline: "15 Feb 2025",
    utilised: 0,
    description: "Supports young researchers developing innovative diagnostic, therapeutic, and public health interventions.",
    eligibility: "Faculty age < 40, registered institution",
    submitted: "—",
    draftScore: 74,
  },
  {
    id: "4",
    title: "SERB CRG – Core Research Grant 2025",
    agency: "Science and Engineering Research Board",
    amount: 3500000,
    status: "Submitted",
    stage: "Under Review",
    deadline: "—",
    utilised: 0,
    description: "Competitive research grant for fundamental and applied research in engineering and technology.",
    eligibility: "Regular faculty at recognized institutions",
    submitted: "18 Dec 2024",
    draftScore: 85,
  },
];

const TONE_MAP: Record<string, "success" | "progress" | "attention" | "neutral"> = {
  Active: "success",
  Draft: "neutral",
  Submitted: "progress",
  Rejected: "danger" as never,
};

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function GrantDraftingPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = GRANTS.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase()) || g.agency.toLowerCase().includes(search.toLowerCase())
  );

  function simulateAI() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      setAiOutput(`**AI-Drafted Grant Objectives for: "${aiPrompt}"**\n\n1. **Primary Objective**: To develop and validate a scalable prototype addressing the identified problem, achieving measurable impact within the first 12 months of the funding period.\n\n2. **Technical Objective**: To conduct systematic research and iterative testing cycles targeting ≥85% efficacy benchmarks as defined by relevant IS/BIS/international standards.\n\n3. **Commercial Objective**: To establish proof-of-market through pilot deployments with at least 3 industry partners, generating documented Letters of Intent valued at ₹25L+.\n\n4. **IP Objective**: To file at least one provisional patent protecting the core innovation and engage with the Institution's Technology Transfer Office for commercialisation advisory.\n\n**Suggested Deliverables Timeline**:\n- Month 3: Prototype v1.0 + Lab validation report\n- Month 6: Pilot deployment + User feedback cycle\n- Month 9: IP filing + Industry LoI collection\n- Month 12: Final utilisation report + Outcome summary`);
      setAiLoading(false);
    }, 1500);
  }

  return (
    <PageContainer
      title="Grant Drafting & Management"
      description="Draft, track, and manage research grant applications across DST, BIRAC, ICMR, and SERB with AI-assisted objective writing."
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Grants Tracked", value: GRANTS.length, icon: FileText, color: "bg-brand/10 text-brand" },
            { label: "Active Grants", value: GRANTS.filter((g) => g.status === "Active").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Drafts In Progress", value: GRANTS.filter((g) => g.status === "Draft").length, icon: Clock, color: "bg-amber-50 text-amber-700" },
            { label: "Total Sanctioned", value: formatINR(GRANTS.filter((g) => g.status === "Active").reduce((a, g) => a + g.amount, 0)), icon: IndianRupee, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
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

        {/* AI Grant Objective Generator */}
        <Card className="p-5 border-brand/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-brand-cyan" />
            <h2 className="text-sm font-bold text-ink">AI Grant Objective Generator</h2>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-cyan/10 text-brand-cyan-ink border border-brand-cyan/20">BETA</span>
          </div>
          <p className="text-xs text-muted-ink mb-3">Describe your research area and the AI will draft structured grant objectives, deliverables, and milestones.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && simulateAI()}
              placeholder="e.g. AI-powered diagnostic tool for early tuberculosis detection in rural clinics..."
              className="flex-1 px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              onClick={simulateAI}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {aiLoading ? "Generating..." : <><Sparkles className="size-3.5" /> Generate</>}
            </button>
          </div>
          {aiOutput && (
            <div className="mt-4 p-4 rounded-lg bg-canvas border border-line text-xs text-ink whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
              {aiOutput}
            </div>
          )}
        </Card>

        {/* Search & Filters */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
            <input
              type="text"
              placeholder="Search grants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-56"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors">
            <Plus className="size-3.5" /> Add Grant
          </button>
        </div>

        {/* Grant Cards */}
        <div className="space-y-3">
          {filtered.map((grant) => (
            <Card key={grant.id} className="overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                onClick={() => setExpanded(expanded === grant.id ? null : grant.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <StatusBadge label={grant.status} tone={TONE_MAP[grant.status] ?? "neutral"} />
                      <span className="text-[11px] text-muted-ink">{grant.agency}</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink">{grant.title}</h3>
                    <p className="text-[12px] text-muted-ink mt-1">{grant.stage}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-brand">{formatINR(grant.amount)}</p>
                    {grant.deadline !== "—" && (
                      <p className="text-[11px] text-muted-ink flex items-center gap-1 mt-0.5 justify-end">
                        <Calendar className="size-3" /> {grant.deadline}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {expanded === grant.id ? <ChevronUp className="size-4 text-muted-ink" /> : <ChevronDown className="size-4 text-muted-ink" />}
                  </div>
                </div>
                {grant.status === "Active" && (
                  <div className="mt-3">
                    <ProgressBar value={grant.utilised} label={`Fund Utilised: ${grant.utilised}%`} />
                  </div>
                )}
                {grant.status === "Draft" && (
                  <div className="mt-3">
                    <ProgressBar value={grant.draftScore} label={`Draft Strength: ${grant.draftScore}%`} />
                  </div>
                )}
              </div>
              {expanded === grant.id && (
                <div className="border-t border-line p-5 bg-canvas/50 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-ink mb-1">Description</p>
                    <p className="text-xs text-muted-ink leading-relaxed">{grant.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink mb-1">Eligibility</p>
                    <p className="text-xs text-muted-ink">{grant.eligibility}</p>
                  </div>
                  {grant.submitted !== "—" && (
                    <p className="text-xs text-muted-ink">Submitted: {grant.submitted}</p>
                  )}
                  <div className="flex gap-2">
                    {grant.status === "Draft" && (
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                        <FileText className="size-3.5" /> Edit Draft
                      </button>
                    )}
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                      <Download className="size-3.5" /> Export PDF
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                      <ExternalLink className="size-3.5" /> Agency Portal
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
