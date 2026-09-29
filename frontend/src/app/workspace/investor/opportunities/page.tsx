"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  Search,
  Filter,
  MapPin,
  Building2,
  IndianRupee,
  TrendingUp,
  Clock,
  Star,
  ExternalLink,
  ChevronDown,
  Bookmark,
  Share2,
} from "lucide-react";

const OPPORTUNITIES = [
  {
    id: "1",
    title: "Seed Investment in Precision Agriculture Platform",
    startup: "Agri-Drone Solutions",
    domain: "AgriTech",
    stage: "Seed",
    type: "Equity",
    ask: "₹1.2Cr",
    equity: "8–12%",
    location: "Pune, MH",
    deadline: "Jan 30, 2025",
    traction: "₹18L ARR",
    description: "Seeking seed investment to scale autonomous drone fleet for 500+ farms in Maharashtra and Karnataka. Funds to be deployed towards drone procurement, pilot hiring, and regulatory compliance for DGCA approvals.",
    highlights: ["DGCA-approved prototype", "6 paying farm clients", "Patent pending navigation algorithm"],
    tags: ["AgriTech", "Deep Tech", "Hardware"],
    bookmarked: true,
    urgency: "high",
  },
  {
    id: "2",
    title: "Pre-Seed Round for EdTech Analytics SaaS",
    startup: "EduMetrics AI",
    domain: "EdTech",
    stage: "Pre-Seed",
    type: "Convertible Note",
    ask: "₹40L",
    equity: "SAFE @ ₹4Cr cap",
    location: "Bengaluru, KA",
    deadline: "Feb 8, 2025",
    traction: "3,200 MAU",
    description: "Pre-seed convertible note to fund 12-month runway for product development and college partnership expansion. Targeting 50 college tie-ups and ₹1L MRR by Q3 2025.",
    highlights: ["8 colleges already onboarded", "22% MoM user growth", "Ex-IIT founding team"],
    tags: ["EdTech", "B2B SaaS", "AI/ML"],
    bookmarked: false,
    urgency: "medium",
  },
  {
    id: "3",
    title: "Seed Funding for Rural Payment Infrastructure",
    startup: "RuralPay",
    domain: "FinTech",
    stage: "Seed",
    type: "Equity",
    ask: "₹80L",
    equity: "6–8%",
    location: "Jaipur, RJ",
    deadline: "Feb 15, 2025",
    traction: "₹2.3Cr GMV/mo",
    description: "Raising seed capital to expand offline-first UPI merchant network across 3 new states. Funds for BLE hardware production, BD team hiring, and state government pilots.",
    highlights: ["RBI Regulatory Sandbox approved", "840 active merchants", "Zero fraud incidents in 18 months"],
    tags: ["FinTech", "Rural", "B2B"],
    bookmarked: false,
    urgency: "medium",
  },
  {
    id: "4",
    title: "Series A for Sustainable Construction Materials",
    startup: "CleanBuild Materials",
    domain: "CleanTech",
    stage: "Series A",
    type: "Equity",
    ask: "₹3Cr",
    equity: "15–18%",
    location: "Hyderabad, TS",
    deadline: "Mar 31, 2025",
    traction: "2 pilot buildings",
    description: "Series A to scale manufacturing capacity for fly-ash based construction blocks. State government MoU for 200-unit low-cost housing project as anchor pilot.",
    highlights: ["CSIR certified", "Telangana govt MoU", "65% carbon footprint reduction vs traditional bricks"],
    tags: ["CleanTech", "Sustainability", "B2G"],
    bookmarked: true,
    urgency: "low",
  },
];

const URGENCY_COLOR: Record<string, string> = {
  high: "bg-danger/10 border-danger/20 text-danger",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low: "bg-canvas border-line text-muted-ink",
};

export default function InvestorOpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>(
    Object.fromEntries(OPPORTUNITIES.map((o) => [o.id, o.bookmarked]))
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = OPPORTUNITIES.filter((o) => {
    const matchSearch =
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.startup.toLowerCase().includes(search.toLowerCase()) ||
      o.domain.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || o.stage === filter || o.domain === filter;
    return matchSearch && matchFilter;
  });

  return (
    <PageContainer
      title="Investment Opportunities"
      description="Curated fundraising opportunities from incubated startups — filtered by your investment thesis."
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {["All", "Pre-Seed", "Seed", "Series A", "AgriTech", "FinTech", "EdTech", "CleanTech"].map((f) => (
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
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-52"
            />
          </div>
        </div>

        {/* Opportunity Cards */}
        <div className="space-y-4">
          {filtered.map((opp) => (
            <Card key={opp.id} interactive className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <StatusBadge label={opp.stage} tone={opp.stage === "Series A" ? "progress" : "info"} />
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${URGENCY_COLOR[opp.urgency]}`}>
                        {opp.urgency === "high" ? "Closing Soon" : opp.urgency === "medium" ? "Active" : "Open"}
                      </span>
                      <span className="text-[11px] text-muted-ink">{opp.type}</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink leading-snug">{opp.title}</h3>
                    <p className="text-[12px] text-muted-ink mt-0.5">{opp.startup} · {opp.domain}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><IndianRupee className="size-3" /> Ask: {opp.ask}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="size-3" /> Equity: {opp.equity}</span>
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {opp.location}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> Deadline: {opp.deadline}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {opp.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 items-end">
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand">{opp.ask}</p>
                      <p className="text-[11px] text-muted-ink">{opp.traction}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBookmarks((prev) => ({ ...prev, [opp.id]: !prev[opp.id] }))}
                        className={`size-7 rounded flex items-center justify-center border transition-colors ${bookmarks[opp.id] ? "bg-brand-gold/10 border-brand-gold/40 text-brand-gold-ink" : "border-line text-muted-ink hover:border-brand-gold/40"}`}
                      >
                        <Bookmark className={`size-3.5 ${bookmarks[opp.id] ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => setExpanded(expanded === opp.id ? null : opp.id)}
                        className="size-7 rounded flex items-center justify-center border border-line text-muted-ink hover:border-brand/40 hover:text-brand transition-colors"
                      >
                        <ChevronDown className={`size-3.5 transition-transform ${expanded === opp.id ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {expanded === opp.id && (
                <div className="border-t border-line p-5 bg-canvas/50 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-ink mb-1.5">Use of Funds</p>
                    <p className="text-xs text-muted-ink leading-relaxed">{opp.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink mb-2">Key Highlights</p>
                    <ul className="space-y-1.5">
                      {opp.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-xs text-muted-ink">
                          <Star className="size-3 text-brand-gold mt-0.5 shrink-0 fill-current" /> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                      <ExternalLink className="size-3.5" /> View Full Pitch
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                      <Share2 className="size-3.5" /> Express Interest
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
