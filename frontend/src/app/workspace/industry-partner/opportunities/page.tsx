"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  Target,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  IndianRupee,
  Users,
  ChevronDown,
  ExternalLink,
  Bookmark,
  Tag,
  TrendingUp,
  Sparkles,
} from "lucide-react";

type OppStatus = "Open" | "Closing Soon" | "Closed";

const OPPORTUNITIES = [
  {
    id: "1",
    title: "TATA Technologies Innovation Challenge — Industry 4.0",
    organizer: "TATA Technologies",
    type: "Corporate Challenge",
    category: "Industry 4.0 / Smart Manufacturing",
    prize: "₹50L + Commercial PoC",
    deadline: "Feb 28, 2025",
    status: "Open" as OppStatus,
    description: "TATA Technologies invites Indian startups and student teams to develop AI, IoT, and automation solutions for modern manufacturing environments. Open to all incubated startups.",
    eligibility: ["Indian registered entity", "Prototype stage or beyond (TRL 3+)", "Team size: 2–8 members"],
    benefits: ["₹50L prize pool across 5 winners", "6-month paid PoC at TATA plant", "Access to mentors and industry data"],
    tags: ["Industry 4.0", "Manufacturing", "AI/ML", "IoT"],
    saved: false,
  },
  {
    id: "2",
    title: "Mahindra Sustainability Innovation Fund 2025",
    organizer: "Mahindra Group",
    type: "Grant / Investment",
    category: "CleanTech / ESG",
    prize: "₹1Cr grant + co-investment",
    deadline: "Jan 31, 2025",
    status: "Closing Soon" as OppStatus,
    description: "Mahindra Group's sustainability arm is committing ₹5Cr across 5 cleantech startups focused on carbon reduction, circular economy, and ESG reporting automation in manufacturing.",
    eligibility: ["CleanTech focus", "Measurable carbon impact metrics", "Revenue-generating preferred"],
    benefits: ["₹1Cr non-dilutive grant", "Co-investment at Series A", "Piloting at Mahindra facilities"],
    tags: ["CleanTech", "ESG", "Sustainability", "Grant"],
    saved: true,
  },
  {
    id: "3",
    title: "AgriTech Connect: NABARD Innovation Grants 2025",
    organizer: "NABARD & DST",
    type: "Government Grant",
    category: "AgriTech / Rural Innovation",
    prize: "₹25L–₹1Cr",
    deadline: "Mar 15, 2025",
    status: "Open" as OppStatus,
    description: "NABARD and DST jointly invite proposals from incubated AgriTech startups addressing farmer income, post-harvest losses, and agricultural supply chain innovations.",
    eligibility: ["AgriTech focus with rural impact", "Indian startup < 5 years old", "At least 1 pilot with farmers/FPOs"],
    benefits: ["₹25L–₹1Cr non-dilutive funding", "NABARD distribution network access", "DST technology support"],
    tags: ["AgriTech", "Government", "Rural", "Grant"],
    saved: false,
  },
  {
    id: "4",
    title: "L&T Innovation Grid — Smart Cities & Infrastructure",
    organizer: "L&T Group",
    type: "Corporate Challenge",
    category: "Smart Cities / Infrastructure",
    prize: "₹30L + Pilot Contract",
    deadline: "Dec 31, 2024",
    status: "Closed" as OppStatus,
    description: "L&T's innovation grid challenge focused on smart city, water management, and urban infrastructure technology solutions.",
    eligibility: ["Open to all incubated startups"],
    benefits: ["₹30L award + 1-year pilot contract"],
    tags: ["Smart Cities", "Infrastructure", "Water", "Urban"],
    saved: false,
  },
];

const STATUS_TONE: Record<OppStatus, "success" | "attention" | "neutral"> = {
  Open: "success",
  "Closing Soon": "attention",
  Closed: "neutral",
};

export default function IndustryOpportunitiesPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(OPPORTUNITIES.map((o) => [o.id, o.saved]))
  );
  const [filter, setFilter] = useState<OppStatus | "All">("All");

  const filtered = OPPORTUNITIES.filter((o) => filter === "All" || o.status === filter);

  return (
    <PageContainer
      title="Opportunities"
      description="Discover corporate challenges, government grants, and partnership programs relevant to your industry focus areas."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Opportunities", value: OPPORTUNITIES.length, icon: Target, color: "bg-brand/10 text-brand" },
            { label: "Open", value: OPPORTUNITIES.filter((o) => o.status === "Open").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Closing Soon", value: OPPORTUNITIES.filter((o) => o.status === "Closing Soon").length, icon: Clock, color: "bg-amber-50 text-amber-700" },
            { label: "Saved", value: Object.values(saved).filter(Boolean).length, icon: Bookmark, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
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
          {(["All", "Open", "Closing Soon", "Closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === f ? "bg-brand text-white border-brand" : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Opportunity Cards */}
        <div className="space-y-4">
          {filtered.map((opp) => (
            <Card key={opp.id} className="overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                onClick={() => setExpanded(expanded === opp.id ? null : opp.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <StatusBadge label={opp.status} tone={STATUS_TONE[opp.status]} />
                      <span className="text-[11px] text-muted-ink">{opp.type}</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink leading-snug">{opp.title}</h3>
                    <p className="text-[12px] text-muted-ink mt-0.5">{opp.organizer} · {opp.category}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><IndianRupee className="size-3" /> {opp.prize}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> Deadline: {opp.deadline}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {opp.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSaved((prev) => ({ ...prev, [opp.id]: !prev[opp.id] })); }}
                      className={`size-7 rounded flex items-center justify-center border transition-colors ${saved[opp.id] ? "bg-brand-gold/10 border-brand-gold/40 text-brand-gold-ink" : "border-line text-muted-ink hover:border-brand-gold/40"}`}
                    >
                      <Bookmark className={`size-3.5 ${saved[opp.id] ? "fill-current" : ""}`} />
                    </button>
                    <ChevronDown className={`size-4 text-muted-ink transition-transform ${expanded === opp.id ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </div>

              {expanded === opp.id && (
                <div className="border-t border-line p-5 bg-canvas/50 space-y-4">
                  <p className="text-xs text-muted-ink leading-relaxed">{opp.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-ink mb-2">Eligibility</p>
                      <ul className="space-y-1">
                        {opp.eligibility.map((e) => (
                          <li key={e} className="text-xs text-muted-ink flex items-start gap-2"><CheckCircle2 className="size-3 text-success mt-0.5 shrink-0" /> {e}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink mb-2">Benefits</p>
                      <ul className="space-y-1">
                        {opp.benefits.map((b) => (
                          <li key={b} className="text-xs text-muted-ink flex items-start gap-2"><Sparkles className="size-3 text-brand-cyan mt-0.5 shrink-0" /> {b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {opp.status !== "Closed" && (
                    <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                      <ExternalLink className="size-3.5" /> Apply Now
                    </button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
