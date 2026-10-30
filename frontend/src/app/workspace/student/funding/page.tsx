"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  Coins,
  Sparkles,
  Calendar,
  Building,
  CheckCircle2,
  ArrowRight,
  Search,
  FileText,
  Award,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Check,
} from "lucide-react";

interface GrantOpportunity {
  id: string;
  name: string;
  provider: string;
  category: "Institutional" | "Government Scheme" | "Industry Partner";
  domain: string;
  amount: string;
  deadline: string;
  stage: string;
  description: string;
  eligibility: string[];
  disbursement: string[];
  openCall: boolean;
}

const GRANT_OPPORTUNITIES: GrantOpportunity[] = [
  {
    id: "f1",
    name: "AI Innovation Grant",
    provider: "DBIT Incubation Centre & AI Research Lab",
    category: "Institutional",
    domain: "AI / Deep Tech",
    amount: "Up to ₹2 Lakh",
    deadline: "28 Sep 2026",
    stage: "TRL 3 - Proof of Concept",
    description:
      "Catalyst grant to fund computational resources, cloud GPUs, edge sensor hardware, and dataset procurement for student AI innovations.",
    eligibility: [
      "DBIT student founder team (min 2 members)",
      "Clear AI/ML architecture & problem definition",
      "Endorsement by department faculty guide",
    ],
    disbursement: ["50% on grant sanction", "30% upon algorithm benchmark test", "20% on final demo day"],
    openCall: true,
  },
  {
    id: "f2",
    name: "Student Startup Seed Fund",
    provider: "Institutional Innovation Corpus",
    category: "Institutional",
    domain: "Any Domain",
    amount: "Up to ₹5 Lakh",
    deadline: "05 Oct 2026",
    stage: "TRL 4 - Lab Prototype",
    description:
      "Early-stage seed capital for promising college startups transitioning from academic capstones to commercial legal entities.",
    eligibility: [
      "Admitted DBIT incubation startup",
      "Formal corporate incorporation / DPIIT registration plan",
      "Completed milestone roadmap agreed with Faculty Coordinator",
    ],
    disbursement: ["40% upon incubation agreement", "30% upon MVP pilot test", "30% on incorporation & compliance"],
    openCall: true,
  },
  {
    id: "f3",
    name: "AgriTech Incubation Support Grant",
    provider: "AgriCore Diagnostics & BioVentures Partnership",
    category: "Industry Partner",
    domain: "AgriTech",
    amount: "Up to ₹3 Lakh",
    deadline: "12 Oct 2026",
    stage: "TRL 4 - Field Prototype",
    description:
      "Industry-sponsored grant supporting pilot field trials, sensor fabrication, and rural deployment testing for automated farming solutions.",
    eligibility: [
      "Startup addressing agriculture or food supply chain",
      "Willingness to conduct on-site field testing",
      "Pass AI Application Agent screening with readiness score ≥ 75",
    ],
    disbursement: ["50% hardware fabrication advance", "50% post 30-day field deployment report"],
    openCall: true,
  },
  {
    id: "f4",
    name: "DST NIDHI-PRAYAS Prototype Grant",
    provider: "Department of Science & Technology (Govt. of India)",
    category: "Government Scheme",
    domain: "Hardware / CleanTech / IoT",
    amount: "Up to ₹10 Lakh",
    deadline: "30 Nov 2026",
    stage: "TRL 3-5 - Idea to Prototype",
    description:
      "Flagship national grant dedicated to turning innovative hardware and technology ideas into tangible market-ready prototypes with zero equity taken.",
    eligibility: [
      "Indian citizen student innovators aged 18-35",
      "Original intellectual property not commercially launched yet",
      "Tangible product development (physical device/component)",
    ],
    disbursement: ["30% upon grant sanction", "40% upon mid-stage prototype review", "30% on final prototype delivery"],
    openCall: true,
  },
  {
    id: "f5",
    name: "MeitY TIDE 2.0 Incubation Scheme",
    provider: "Ministry of Electronics & Information Technology",
    category: "Government Scheme",
    domain: "ICT / Software / Electronics",
    amount: "Up to ₹7 Lakh",
    deadline: "15 Dec 2026",
    stage: "TRL 4 - Validation",
    description:
      "Technology Incubation and Development of Entrepreneurs grant promoting emerging technologies in IoT, AI, blockchain, and robotics.",
    eligibility: [
      "Registered with a recognized TIDE 2.0 incubation center",
      "Technology solving national priority area",
      "Structured product roadmap with defined milestones",
    ],
    disbursement: ["40% initial tranche", "30% on technical milestone", "30% on customer pilot report"],
    openCall: true,
  },
  {
    id: "f6",
    name: "BIRAC BIG (Biotechnology Ignition Grant)",
    provider: "Biotechnology Industry Research Assistance Council",
    category: "Government Scheme",
    domain: "HealthTech / BioTech",
    amount: "Up to ₹50 Lakh",
    deadline: "15 Jan 2027",
    stage: "TRL 3 - Pre-commercial",
    description:
      "High-value ignition funding for healthcare, medical diagnostics, biomedical engineering, and sustainable biopolymer startups.",
    eligibility: [
      "BioTech / MedTech focus with laboratory validation requirements",
      "Dedicated faculty researcher or technical co-founder",
      "Formal institutional lab safety pre-clearance",
    ],
    disbursement: ["Tranche-based release tied to strict laboratory milestone audits"],
    openCall: true,
  },
];

export default function StudentFundingPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrant, setSelectedGrant] = useState<GrantOpportunity | null>(null);
  const [applicationSuccess, setApplicationSuccess] = useState(false);

  const domains = ["All", "AI / Deep Tech", "Any Domain", "AgriTech", "Hardware / CleanTech / IoT", "ICT / Software / Electronics", "HealthTech / BioTech"];
  const categories = ["All", "Institutional", "Government Scheme", "Industry Partner"];

  const filtered = GRANT_OPPORTUNITIES.filter((item) => {
    const matchDomain = selectedDomain === "All" || item.domain.toLowerCase().includes(selectedDomain.toLowerCase());
    const matchCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDomain && matchCategory && matchSearch;
  });

  function handleOpenApply(grant: GrantOpportunity) {
    setSelectedGrant(grant);
    setApplicationSuccess(false);
  }

  function handleConfirmApply() {
    setApplicationSuccess(true);
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Funding & Grant Opportunities"
          description="Institutional incubation grants, DST PRAYAS, MeitY TIDE, and corporate seed funds available for student innovators at DBIT."
          action={{ label: "My Projects", href: "/workspace/student/projects" }}
        />

        {/* Overview Banner Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3.5 bg-gradient-to-r from-emerald-50/50 to-transparent">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Coins className="size-5" />
            </span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Total Grant Corpus</span>
              <p className="text-xl font-bold text-ink">₹77+ Lakhs</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3.5 bg-gradient-to-r from-indigo-50/50 to-transparent">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <Award className="size-5" />
            </span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Active Funding Calls</span>
              <p className="text-xl font-bold text-ink">6 Available Schemes</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3.5 bg-gradient-to-r from-blue-50/50 to-transparent">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Grant Equity Policy</span>
              <p className="text-xl font-bold text-ink">0% Equity (Pure Grant)</p>
            </div>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-ink" />
              <input
                type="text"
                placeholder="Search grant by name, provider, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-line rounded-lg bg-canvas/30 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-ink">Category:</span>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    selectedCategory === c
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-line text-xs">
            <span className="font-semibold text-muted-ink mr-1">Domain:</span>
            {domains.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDomain(d)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  selectedDomain === d
                    ? "bg-brand/10 text-brand font-bold"
                    : "text-muted-ink hover:text-ink hover:bg-canvas"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </Card>

        {/* Opportunity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((grant) => (
            <Card key={grant.id} interactive className="flex flex-col justify-between p-5 border-line hover:border-brand/50 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-cyan-soft text-brand">
                    {grant.domain}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700">
                    {grant.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink leading-snug">{grant.name}</h3>
                  <p className="text-xs text-muted-ink mt-0.5 flex items-center gap-1">
                    <Building className="size-3 text-muted-ink" /> {grant.provider}
                  </p>
                </div>

                <div className="rounded-lg bg-canvas/60 p-3 border border-line/60">
                  <span className="text-[11px] font-medium text-muted-ink block">Grant Amount</span>
                  <span className="text-xl font-black text-brand block mt-0.5">{grant.amount}</span>
                  <span className="text-[11px] text-muted-ink block mt-0.5">Target: {grant.stage}</span>
                </div>

                <p className="text-xs text-muted-ink line-clamp-3 leading-relaxed">
                  {grant.description}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-line/60 text-[11px]">
                  <span className="font-semibold text-ink block">Key Eligibility:</span>
                  {grant.eligibility.slice(0, 2).map((e, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-muted-ink">
                      <Check className="size-3 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-line flex items-center justify-between">
                <span className="text-xs text-muted-ink flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Due: <strong className="text-ink font-medium">{grant.deadline}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => handleOpenApply(grant)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold shadow-sm hover:bg-brand-hover transition-colors"
                >
                  View Details & Apply
                  <ArrowRight className="size-3" />
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Modal / Drawer for Grant Details & Applying */}
        {selectedGrant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-6 border-b border-line shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand/10 text-brand">
                        {selectedGrant.category}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-canvas border border-line text-muted-ink">
                        {selectedGrant.domain}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-ink">{selectedGrant.name}</h2>
                    <p className="text-xs text-muted-ink mt-0.5">{selectedGrant.provider}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGrant(null)}
                    className="rounded-lg p-1 text-muted-ink hover:bg-canvas hover:text-ink transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-ink leading-relaxed">
                {applicationSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="size-7" />
                    </span>
                    <h3 className="text-lg font-bold text-ink">Grant Application Registered</h3>
                    <p className="text-muted-ink max-w-md mx-auto text-xs">
                      Your interest in <strong className="text-ink">{selectedGrant.name}</strong> has been forwarded to the DBIT Incubation Committee. Your faculty guide will be notified to endorse the preliminary grant docket.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/workspace/student/projects"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover"
                      >
                        Return to Projects
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="p-3 rounded-xl border border-line bg-canvas/30">
                        <span className="text-[11px] text-muted-ink block uppercase font-medium">Grant Value</span>
                        <span className="text-lg font-bold text-brand block mt-0.5">{selectedGrant.amount}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-line bg-canvas/30">
                        <span className="text-[11px] text-muted-ink block uppercase font-medium">Application Deadline</span>
                        <span className="text-sm font-bold text-ink block mt-0.5">{selectedGrant.deadline}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-line bg-canvas/30 col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-muted-ink block uppercase font-medium">Target Stage</span>
                        <span className="text-sm font-bold text-ink block mt-0.5">{selectedGrant.stage}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-ink text-sm mb-1">Grant Overview</h4>
                      <p className="text-muted-ink leading-relaxed">{selectedGrant.description}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-ink text-sm mb-2">Mandatory Eligibility Criteria</h4>
                      <div className="space-y-1.5">
                        {selectedGrant.eligibility.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-canvas/40 border border-line/60">
                            <CheckCircle2 className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-ink text-sm mb-2">Disbursement Tranches</h4>
                      <div className="space-y-1.5">
                        {selectedGrant.disbursement.map((tranche, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-canvas/40 border border-line/60 text-muted-ink">
                            <span className="size-5 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <span>{tranche}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-start gap-2.5">
                      <Sparkles className="size-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-indigo-950">
                        <strong>AI Assistant Support:</strong> Need help structuring your grant budget or drafting the technical methodology? Use the Incubation AI Assistant in the bottom right corner to verify your proposal against {selectedGrant.name} requirements.
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              {!applicationSuccess && (
                <div className="p-4 bg-canvas/30 border-t border-line flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedGrant(null)}
                    className="px-3.5 py-2 rounded-lg border border-line bg-white text-xs font-semibold text-ink hover:bg-canvas transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApply}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-xs font-semibold text-white hover:bg-brand-hover shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Submit Grant Application Docket
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

