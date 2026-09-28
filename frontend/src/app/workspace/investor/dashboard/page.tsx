"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  TrendingUp,
  Briefcase,
  Star,
  Clock,
  ArrowRight,
  IndianRupee,
  Target,
  BarChart3,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

const PORTFOLIO = [
  { id: "1", name: "AgroVision AI", domain: "AgriTech", stage: "Series A", invested: 2500000, valuation: 18000000, growth: "+34%", status: "progress" as const },
  { id: "2", name: "CleanWater IoT", domain: "CleanTech", stage: "Seed", invested: 800000, valuation: 4200000, growth: "+18%", status: "success" as const },
  { id: "3", name: "MedChain", domain: "HealthTech", stage: "Pre-Seed", invested: 500000, valuation: 1800000, growth: "-5%", status: "attention" as const },
];

const PITCHES = [
  { id: "1", startup: "Agri-Drone Solutions", domain: "AgriTech / Drones", stage: "Seed", ask: "₹1.2Cr", score: 87, deadline: "Jan 30, 2025", matchPct: 94 },
  { id: "2", startup: "EduMetrics AI", domain: "EdTech / AI", stage: "Pre-Seed", ask: "₹40L", score: 81, deadline: "Feb 8, 2025", matchPct: 88 },
  { id: "3", startup: "RuralPay", domain: "FinTech / Rural", stage: "Seed", ask: "₹80L", score: 76, deadline: "Feb 15, 2025", matchPct: 79 },
];

const ACTIVITY = [
  { text: "AgroVision AI shared Q3 traction report", time: "2h ago" },
  { text: "New pitch match: Agri-Drone Solutions (94% fit)", time: "Yesterday" },
  { text: "CleanWater IoT milestone: Series A term sheet signed", time: "3 days ago" },
  { text: "MedChain requested follow-on meeting", time: "5 days ago" },
];

function formatCrore(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function InvestorDashboardPage() {
  const totalInvested = PORTFOLIO.reduce((a, p) => a + p.invested, 0);
  const totalValuation = PORTFOLIO.reduce((a, p) => a + p.valuation, 0);
  const portfolioReturn = (((totalValuation - totalInvested) / totalInvested) * 100).toFixed(1);

  return (
    <PageContainer
      title="Investor Dashboard"
      description="Your curated deal flow, portfolio performance, and AI-matched pitch opportunities — all in one place."
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Deployed Capital", value: formatCrore(totalInvested), sub: "Across 3 portfolio companies", icon: IndianRupee, color: "bg-brand/10 text-brand" },
            { label: "Portfolio Valuation", value: formatCrore(totalValuation), sub: `+${portfolioReturn}% paper gain`, icon: TrendingUp, color: "bg-emerald-50 text-emerald-700" },
            { label: "AI-Matched Pitches", value: PITCHES.length, sub: "Pending your review", icon: Sparkles, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Portfolio Companies", value: PORTFOLIO.length, sub: "1 in Series A", icon: Building2, color: "bg-amber-50 text-amber-700" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{kpi.label}</p>
                  <p className="text-2xl font-bold text-ink mt-1">{kpi.value}</p>
                  <p className="text-[11px] text-muted-ink mt-0.5">{kpi.sub}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                  <kpi.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Action Banner */}
        <div className="rounded-xl border border-brand/20 bg-gradient-to-r from-brand-deep to-brand p-5 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold uppercase tracking-wider mb-2">
                Deal Flow
              </span>
              <h2 className="text-lg font-bold">3 AI-Curated Pitches Match Your Thesis</h2>
              <p className="text-xs text-blue-200 mt-1">Based on your investment criteria: AgriTech, FinTech, CleanTech · Seed & Series A · ₹40L–₹2Cr ticket</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/workspace/investor/pitch-queue" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-brand-deep text-xs font-bold transition-colors">
                <Sparkles className="size-3.5" /> Review Pitches
              </Link>
              <Link href="/workspace/investor/matchmaking" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors">
                <Target className="size-3.5" /> Update Criteria
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio */}
          <div className="lg:col-span-2 space-y-4">
            <SectionHeading title="Portfolio Companies" action={{ label: "Full portfolio", href: "/workspace/investor/portfolio" }} />
            <div className="space-y-3">
              {PORTFOLIO.map((co) => (
                <Card key={co.id} interactive className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-ink">{co.name}</h3>
                        <StatusBadge label={co.stage} tone={co.status} />
                      </div>
                      <p className="text-xs text-muted-ink">{co.domain}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-ink">{formatCrore(co.valuation)}</p>
                      <p className="text-[11px] text-muted-ink">Invested: {formatCrore(co.invested)}</p>
                      <p className={`text-xs font-bold mt-0.5 ${co.growth.startsWith("+") ? "text-success" : "text-danger"}`}>{co.growth}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Pitch Queue Preview */}
            <Card className="p-4">
              <SectionHeading title="Pitch Queue" action={{ label: "View all", href: "/workspace/investor/pitch-queue" }} />
              <div className="space-y-3">
                {PITCHES.map((pitch) => (
                  <div key={pitch.id} className="p-3 rounded-lg bg-canvas border border-line">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[12px] font-bold text-ink">{pitch.startup}</p>
                      <span className="text-[11px] font-black text-brand-cyan">{pitch.matchPct}% fit</span>
                    </div>
                    <p className="text-[11px] text-muted-ink">{pitch.domain} · Ask: {pitch.ask}</p>
                    <div className="mt-2">
                      <ProgressBar value={pitch.score} label={`AI Score: ${pitch.score}/100`} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-4">
              <SectionHeading title="Activity Feed" />
              <div className="space-y-3">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="mt-1 size-1.5 rounded-full bg-brand shrink-0" />
                    <div>
                      <p className="text-[12px] text-ink leading-tight">{item.text}</p>
                      <p className="text-[11px] text-muted-ink mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
