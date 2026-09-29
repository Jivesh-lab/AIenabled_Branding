"use client";

import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Building2,
  Calendar,
  ExternalLink,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

const PORTFOLIO = [
  {
    id: "1",
    name: "AgroVision AI",
    domain: "AgriTech",
    stage: "Series A",
    invested: 2500000,
    currentValuation: 18000000,
    investedDate: "Mar 2023",
    ownership: "8.4%",
    coInvestors: ["Blume Ventures", "DST NIDHI"],
    lastUpdate: "Jan 2025",
    metrics: {
      arr: "₹42L",
      growth: "+34%",
      runway: "18 months",
      employees: 12,
    },
    milestones: [
      { label: "Series A Term Sheet Signed", done: true, date: "Dec 2024" },
      { label: "DGCA Commercial Drone License", done: true, date: "Sep 2024" },
      { label: "10 Enterprise Farm Contracts", done: false, date: "Q2 2025" },
    ],
    trend: "up" as const,
    status: "Active",
  },
  {
    id: "2",
    name: "CleanWater IoT",
    domain: "CleanTech",
    stage: "Seed",
    invested: 800000,
    currentValuation: 4200000,
    investedDate: "Jul 2023",
    ownership: "6.2%",
    coInvestors: ["Impact Fund India"],
    lastUpdate: "Jan 2025",
    metrics: {
      arr: "₹12L",
      growth: "+18%",
      runway: "14 months",
      employees: 6,
    },
    milestones: [
      { label: "3 Municipal Pilot Sites", done: true, date: "Oct 2024" },
      { label: "CPCB Certification", done: true, date: "Nov 2024" },
      { label: "Series A Fundraise", done: false, date: "Q3 2025" },
    ],
    trend: "up" as const,
    status: "Active",
  },
  {
    id: "3",
    name: "MedChain",
    domain: "HealthTech",
    stage: "Pre-Seed",
    invested: 500000,
    currentValuation: 1800000,
    investedDate: "Jan 2024",
    ownership: "11.2%",
    coInvestors: [],
    lastUpdate: "Dec 2024",
    metrics: {
      arr: "₹2.4L",
      growth: "-5%",
      runway: "6 months",
      employees: 4,
    },
    milestones: [
      { label: "POC Blockchain Architecture", done: true, date: "Jun 2024" },
      { label: "DPDP Act Compliance Review", done: false, date: "Feb 2025" },
      { label: "Hospital Partner Onboarding", done: false, date: "Q2 2025" },
    ],
    trend: "down" as const,
    status: "Watch",
  },
];

function formatCrore(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function ROI(invested: number, current: number) {
  const pct = (((current - invested) / invested) * 100).toFixed(1);
  return { pct, positive: current >= invested };
}

export default function InvestorPortfolioPage() {
  const totalInvested = PORTFOLIO.reduce((a, p) => a + p.invested, 0);
  const totalCurrent = PORTFOLIO.reduce((a, p) => a + p.currentValuation, 0);
  const { pct: totalROI, positive } = ROI(totalInvested, totalCurrent);

  return (
    <PageContainer
      title="Portfolio"
      description="Track valuation, ownership, key milestones, and operational health across all portfolio companies."
    >
      <div className="space-y-6">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Companies", value: PORTFOLIO.length, sub: "Active investments", icon: Building2, color: "bg-brand/10 text-brand" },
            { label: "Total Deployed", value: formatCrore(totalInvested), sub: "Invested capital", icon: IndianRupee, color: "bg-slate-50 text-slate-600" },
            { label: "Portfolio Value", value: formatCrore(totalCurrent), sub: "Current valuation", icon: BarChart3, color: "bg-emerald-50 text-emerald-700" },
            { label: "Unrealised Gain", value: `${positive ? "+" : ""}${totalROI}%`, sub: `${formatCrore(totalCurrent - totalInvested)} paper gain`, icon: TrendingUp, color: positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-danger" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{kpi.label}</p>
                  <p className="text-xl font-bold text-ink mt-1">{kpi.value}</p>
                  <p className="text-[11px] text-muted-ink mt-0.5">{kpi.sub}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                  <kpi.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Portfolio Companies */}
        <div className="space-y-5">
          {PORTFOLIO.map((co) => {
            const roi = ROI(co.invested, co.currentValuation);
            return (
              <Card key={co.id} className="overflow-hidden">
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-ink">{co.name}</h3>
                        <StatusBadge label={co.status === "Watch" ? "Watch" : co.stage} tone={co.status === "Watch" ? "attention" : "progress"} />
                        <span className="text-[11px] text-muted-ink">{co.domain}</span>
                      </div>
                      <p className="text-[12px] text-muted-ink">
                        Invested {co.investedDate} · {co.ownership} ownership
                        {co.coInvestors.length > 0 && ` · Co-investors: ${co.coInvestors.join(", ")}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-ink">{formatCrore(co.currentValuation)}</p>
                      <div className={`flex items-center gap-1 justify-end text-sm font-bold mt-0.5 ${roi.positive ? "text-success" : "text-danger"}`}>
                        {roi.positive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                        {roi.positive ? "+" : ""}{roi.pct}% ({formatCrore(co.currentValuation - co.invested)})
                      </div>
                      <p className="text-[11px] text-muted-ink">on {formatCrore(co.invested)} deployed</p>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "ARR", value: co.metrics.arr },
                      { label: "Growth", value: co.metrics.growth },
                      { label: "Runway", value: co.metrics.runway },
                      { label: "Team", value: `${co.metrics.employees} people` },
                    ].map((m) => (
                      <div key={m.label} className="p-2.5 rounded-lg bg-canvas border border-line text-center">
                        <p className="text-[10px] text-muted-ink uppercase font-semibold tracking-wider">{m.label}</p>
                        <p className={`text-sm font-bold mt-0.5 ${m.label === "Growth" && m.value.startsWith("-") ? "text-danger" : m.label === "Growth" ? "text-success" : "text-ink"}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Milestones */}
                  <div>
                    <p className="text-[11px] font-bold text-ink mb-2 uppercase tracking-wider">Key Milestones</p>
                    <div className="space-y-1.5">
                      {co.milestones.map((m, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <div className={`size-4 rounded-full flex items-center justify-center shrink-0 border ${m.done ? "bg-success border-success" : "border-line bg-white"}`}>
                            {m.done && <span className="text-white text-[10px]">✓</span>}
                          </div>
                          <span className={`text-xs flex-1 ${m.done ? "text-muted-ink line-through" : "text-ink"}`}>{m.label}</span>
                          <span className="text-[11px] text-muted-ink shrink-0">{m.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-line">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                      <ExternalLink className="size-3.5" /> View Reports
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                      Request Update
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
