"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  Sparkles,
  Target,
  Check,
  Sliders,
  Building2,
  MapPin,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Star,
  StarOff,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const MATCHES = [
  {
    id: "1",
    startup: "AgroVision AI",
    tagline: "AI drones for precision crop disease detection",
    domain: "AgriTech",
    stage: "Seed",
    location: "Pune, MH",
    score: 94,
    problem: "AI-Powered Smart Inventory Prediction",
    reasons: [
      "Computer vision AI directly transferable to warehouse bin monitoring",
      "Existing SAP integration experience from agri-ERP deployments",
      "Edge AI capabilities match low-latency warehouse requirements",
    ],
    tags: ["AI/ML", "Computer Vision", "SAP"],
    saved: true,
  },
  {
    id: "2",
    startup: "IndusPredict",
    tagline: "Predictive maintenance for CNC and industrial machinery",
    domain: "Industry 4.0",
    stage: "Seed",
    location: "Pune, MH",
    score: 91,
    problem: "Predictive Maintenance for CNC Equipment",
    reasons: [
      "Domain-specific ML models trained on CNC vibration and temperature data",
      "Edge deployment capability for factory environments without cloud dependency",
      "Proven 86% failure prediction accuracy across 4 existing factory clients",
    ],
    tags: ["IoT", "ML", "Edge AI", "CNC"],
    saved: false,
  },
  {
    id: "3",
    startup: "CleanBuild Materials",
    tagline: "CSIR-certified sustainable construction materials with BRSR platform",
    domain: "CleanTech",
    stage: "Seed",
    location: "Hyderabad, TS",
    score: 87,
    problem: "Carbon Footprint Tracking & ESG Reporting",
    reasons: [
      "Existing BRSR reporting module handles GHG Scope 1, 2, 3 calculations",
      "CSIR certification validates sustainability methodology rigor",
      "Pre-built ERP integration connectors for procurement data ingestion",
    ],
    tags: ["ESG", "BRSR", "CleanTech"],
    saved: true,
  },
  {
    id: "4",
    startup: "WaterSafe IoT",
    tagline: "Industrial effluent and water quality monitoring platform",
    domain: "CleanTech",
    stage: "Pre-Seed",
    location: "Chennai, TN",
    score: 82,
    problem: "Carbon Footprint Tracking & ESG Reporting",
    reasons: [
      "Ready-to-deploy BRSR environmental indicator dashboards",
      "CPCB-certified sensor network reduces compliance risk",
      "API-first architecture enables rapid integration with existing logistics data",
    ],
    tags: ["IoT", "ESG", "CPCB", "Compliance"],
    saved: false,
  },
];

export default function IndustryMatchmakingPage() {
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(MATCHES.map((m) => [m.id, m.saved]))
  );
  const [interest, setInterest] = useState<Record<string, "up" | "down" | null>>(
    Object.fromEntries(MATCHES.map((m) => [m.id, null]))
  );
  const [showCriteria, setShowCriteria] = useState(false);

  return (
    <PageContainer
      title="AI Matchmaking"
      description="Startups intelligently matched to your posted problem statements using AI scoring across technical fit, track record, and domain expertise."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-brand-cyan/10 flex items-center justify-center">
              <Sparkles className="size-5 text-brand-cyan" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{MATCHES.length} Startup Matches</p>
              <p className="text-xs text-muted-ink">Matched across your 3 active problem statements</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCriteria(!showCriteria)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors"
            >
              <Sliders className="size-3.5" /> Matching Criteria
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
              <RefreshCw className="size-3.5" /> Refresh Matches
            </button>
          </div>
        </div>

        {/* Criteria Panel */}
        {showCriteria && (
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2"><Target className="size-4 text-brand" /> Matching Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-ink mb-1.5">Active Problem Domains</p>
                <div className="flex flex-wrap gap-1.5">
                  {["AI/ML", "IoT", "CleanTech", "ESG", "Industry 4.0"].map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-brand/30 bg-brand/5 text-brand">{d}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink mb-1.5">Preferred Engagement</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Pilot Partnership", "Technology Integration", "Data Sharing"].map((e) => (
                    <span key={e} className="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-brand/30 bg-brand/5 text-brand">{e}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink mb-1.5">Minimum Match Score</p>
                <p className="text-sm font-bold text-ink">70 / 100</p>
              </div>
            </div>
          </Card>
        )}

        {/* Match Cards */}
        <div className="space-y-4">
          {MATCHES.map((match) => (
            <Card key={match.id} interactive className="p-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Score */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className={`size-14 rounded-full flex items-center justify-center text-lg font-black border-2 ${match.score >= 90 ? "border-success text-success bg-emerald-50" : match.score >= 80 ? "border-brand text-brand bg-brand/5" : "border-brand-gold text-brand-gold-ink bg-amber-50"}`}>
                    {match.score}
                  </div>
                  <span className="text-[10px] text-muted-ink font-semibold">AI Score</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-ink">{match.startup}</h3>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">{match.stage}</span>
                    <span className="text-[11px] text-muted-ink">{match.domain}</span>
                  </div>
                  <p className="text-xs text-muted-ink italic mb-1.5">{match.tagline}</p>
                  <p className="text-[11px] text-muted-ink mb-2">Matched to: <span className="font-semibold text-ink">{match.problem}</span></p>

                  <div className="bg-canvas border border-line rounded-lg p-3 mb-3">
                    <p className="text-[11px] font-bold text-ink mb-1.5 flex items-center gap-1"><Sparkles className="size-3 text-brand-cyan" /> Why they match your problem:</p>
                    <ul className="space-y-1">
                      {match.reasons.map((r) => (
                        <li key={r} className="text-[11px] text-muted-ink flex items-start gap-1.5">
                          <Check className="size-3 text-success mt-0.5 shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {match.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row md:flex-col items-center gap-2 shrink-0">
                  <button onClick={() => setSaved((prev) => ({ ...prev, [match.id]: !prev[match.id] }))} className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${saved[match.id] ? "bg-brand-gold/10 border-brand-gold/40 text-brand-gold-ink" : "border-line text-muted-ink hover:border-brand-gold/40"}`}>
                    {saved[match.id] ? <Star className="size-4 fill-current" /> : <StarOff className="size-4" />}
                  </button>
                  <button onClick={() => setInterest((prev) => ({ ...prev, [match.id]: prev[match.id] === "up" ? null : "up" }))} className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${interest[match.id] === "up" ? "bg-success/10 border-success/40 text-success" : "border-line text-muted-ink hover:border-success/40 hover:text-success"}`}>
                    <ThumbsUp className="size-4" />
                  </button>
                  <button onClick={() => setInterest((prev) => ({ ...prev, [match.id]: prev[match.id] === "down" ? null : "down" }))} className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${interest[match.id] === "down" ? "bg-danger/10 border-danger/40 text-danger" : "border-line text-muted-ink hover:border-danger/40 hover:text-danger"}`}>
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
