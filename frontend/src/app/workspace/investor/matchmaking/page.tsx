"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  Sparkles,
  Target,
  Sliders,
  Check,
  RefreshCw,
  Building2,
  TrendingUp,
  MapPin,
  IndianRupee,
  Star,
  StarOff,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Filter,
} from "lucide-react";

const MATCHES = [
  {
    id: "1",
    startup: "Agri-Drone Solutions",
    tagline: "Autonomous precision farming drones for small & marginal farmers",
    domain: "AgriTech",
    stage: "Seed",
    location: "Pune, Maharashtra",
    ask: 12000000,
    traction: "₹18L ARR, 6 paying farms, 2 LoIs from FPOs",
    score: 94,
    founders: 2,
    founded: "2023",
    reasons: ["Strong AgriTech thesis alignment", "Early traction with recurring revenue", "IP-protected proprietary flight algorithm", "Scalable B2B2C model"],
    tags: ["Drones", "Precision Agriculture", "Deep Tech", "Rural"],
    saved: false,
  },
  {
    id: "2",
    startup: "EduMetrics AI",
    tagline: "Adaptive learning analytics platform for tier-2 and tier-3 college students",
    domain: "EdTech",
    stage: "Pre-Seed",
    location: "Bengaluru, Karnataka",
    ask: 4000000,
    traction: "3,200 active users, 8 college partnerships, 22% month-on-month growth",
    score: 88,
    founders: 3,
    founded: "2024",
    reasons: ["Fast-growing EdTech vertical", "Viral college-to-college referral model", "Founding team ex-IIT with education research background"],
    tags: ["AI/ML", "EdTech", "B2B", "Tier-2 India"],
    saved: true,
  },
  {
    id: "3",
    startup: "RuralPay",
    tagline: "Offline-first UPI payment infra for kirana stores in rural India",
    domain: "FinTech",
    stage: "Seed",
    location: "Jaipur, Rajasthan",
    ask: 8000000,
    traction: "₹2.3Cr GMV/month, 840 active merchants, RBI sandbox approved",
    score: 79,
    founders: 2,
    founded: "2023",
    reasons: ["Addresses financial inclusion gap", "Regulatory sandbox approval reduces risk", "Large addressable market (800M rural users)"],
    tags: ["FinTech", "Rural", "UPI", "Offline-First"],
    saved: false,
  },
  {
    id: "4",
    startup: "CleanBuild Materials",
    tagline: "Fly-ash based construction material reducing carbon footprint by 65%",
    domain: "CleanTech",
    stage: "Seed",
    location: "Hyderabad, Telangana",
    ask: 10000000,
    traction: "2 pilot buildings, CSIR certification, state govt MoU",
    score: 75,
    founders: 2,
    founded: "2022",
    reasons: ["Strong ESG/green investment thesis", "Government partnership reduces GTM risk", "Material science IP filings in progress"],
    tags: ["CleanTech", "Construction", "Sustainability", "B2B"],
    saved: false,
  },
];

function formatAmount(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString()}`;
}

export default function InvestorMatchmakingPage() {
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(MATCHES.map((m) => [m.id, m.saved]))
  );
  const [interest, setInterest] = useState<Record<string, "up" | "down" | null>>(
    Object.fromEntries(MATCHES.map((m) => [m.id, null]))
  );
  const [showCriteria, setShowCriteria] = useState(false);

  const toggleSaved = (id: string) => setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  const setInterestVal = (id: string, val: "up" | "down") =>
    setInterest((prev) => ({ ...prev, [id]: prev[id] === val ? null : val }));

  return (
    <PageContainer
      title="AI Matchmaking"
      description="Startups matched to your investment thesis using AI scoring across domain, stage, traction signals, and founder background."
    >
      <div className="space-y-6">
        {/* Header with Criteria button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-cyan/10">
              <Sparkles className="size-5 text-brand-cyan" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{MATCHES.length} Matches Found</p>
              <p className="text-xs text-muted-ink">Based on your current investment profile</p>
            </div>
          </div>
          <button
            onClick={() => setShowCriteria(!showCriteria)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors"
          >
            <Sliders className="size-3.5" /> Investment Criteria
          </button>
        </div>

        {/* Criteria Panel */}
        {showCriteria && (
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <Target className="size-4 text-brand" /> Your Investment Thesis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Preferred Domains</label>
                <div className="flex flex-wrap gap-1.5">
                  {["AgriTech", "FinTech", "CleanTech", "EdTech", "HealthTech"].map((d) => (
                    <button key={d} className="px-2 py-0.5 text-[11px] font-semibold rounded-full border border-brand/30 bg-brand/5 text-brand">{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Investment Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {["Pre-Seed", "Seed", "Series A"].map((s) => (
                    <button key={s} className="px-2 py-0.5 text-[11px] font-semibold rounded-full border border-brand/30 bg-brand/5 text-brand">{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Ticket Size</label>
                <p className="text-xs text-ink font-semibold">₹40L – ₹2Cr</p>
                <p className="text-[11px] text-muted-ink">Per deal, equity or convertible note</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                <Check className="size-3.5" /> Update Criteria
              </button>
            </div>
          </Card>
        )}

        {/* Match Cards */}
        <div className="space-y-4">
          {MATCHES.map((match) => (
            <Card key={match.id} interactive className="p-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Score circle */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className={`size-14 rounded-full flex items-center justify-center text-lg font-black border-2 ${match.score >= 90 ? "border-success text-success bg-emerald-50" : match.score >= 80 ? "border-brand text-brand bg-brand/5" : "border-brand-gold text-brand-gold-ink bg-amber-50"}`}>
                    {match.score}
                  </div>
                  <span className="text-[10px] text-muted-ink font-semibold">AI Score</span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-ink">{match.startup}</h3>
                    <StatusBadge label={match.stage} tone={match.score >= 90 ? "success" : "progress"} />
                    <span className="text-[11px] text-muted-ink">{match.domain}</span>
                  </div>
                  <p className="text-xs text-muted-ink italic mb-2">{match.tagline}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-ink mb-3">
                    <span className="flex items-center gap-1"><MapPin className="size-3" /> {match.location}</span>
                    <span className="flex items-center gap-1"><IndianRupee className="size-3" /> Ask: {formatAmount(match.ask)}</span>
                    <span className="flex items-center gap-1"><Building2 className="size-3" /> Founded: {match.founded}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="size-3" /> {match.traction}</span>
                  </div>

                  {/* Why matched */}
                  <div className="bg-canvas border border-line rounded-lg p-3 mb-3">
                    <p className="text-[11px] font-bold text-ink mb-1.5 flex items-center gap-1">
                      <Sparkles className="size-3 text-brand-cyan" /> Why it matches your thesis:
                    </p>
                    <ul className="space-y-1">
                      {match.reasons.map((r) => (
                        <li key={r} className="text-[11px] text-muted-ink flex items-start gap-1.5">
                          <Check className="size-3 text-success mt-0.5 shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {match.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row md:flex-col items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleSaved(match.id)}
                    className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${saved[match.id] ? "bg-brand-gold/10 border-brand-gold/40 text-brand-gold-ink" : "border-line text-muted-ink hover:border-brand-gold/40 hover:text-brand-gold-ink"}`}
                    title={saved[match.id] ? "Remove from saved" : "Save"}
                  >
                    {saved[match.id] ? <Star className="size-4 fill-current" /> : <StarOff className="size-4" />}
                  </button>
                  <button
                    onClick={() => setInterestVal(match.id, "up")}
                    className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${interest[match.id] === "up" ? "bg-success/10 border-success/40 text-success" : "border-line text-muted-ink hover:border-success/40 hover:text-success"}`}
                  >
                    <ThumbsUp className="size-4" />
                  </button>
                  <button
                    onClick={() => setInterestVal(match.id, "down")}
                    className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${interest[match.id] === "down" ? "bg-danger/10 border-danger/40 text-danger" : "border-line text-muted-ink hover:border-danger/40 hover:text-danger"}`}
                  >
                    <ThumbsDown className="size-4" />
                  </button>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors mt-1">
                    <ExternalLink className="size-3" /> View
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
