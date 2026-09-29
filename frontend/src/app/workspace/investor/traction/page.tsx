"use client";

import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  TrendingUp,
  TrendingDown,
  Users,
  IndianRupee,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Activity,
  Target,
  ExternalLink,
} from "lucide-react";

const PORTFOLIO_TRACTION = [
  {
    id: "1",
    name: "AgroVision AI",
    domain: "AgriTech",
    stage: "Series A",
    kpis: [
      { label: "ARR", value: "₹42L", prev: "₹28L", trend: "up" as const, change: "+50%" },
      { label: "Active Farm Clients", value: "38", prev: "22", trend: "up" as const, change: "+73%" },
      { label: "Drone Operational Hours", value: "1,840h", prev: "1,100h", trend: "up" as const, change: "+67%" },
      { label: "Avg Revenue / Farm", value: "₹1.1L", prev: "₹1.3L", trend: "down" as const, change: "-15%" },
    ],
    runway: 18,
    lastReport: "Jan 2025",
    reportFrequency: "Monthly",
    burnRate: "₹3.2L/mo",
    nextMilestone: "10 enterprise contracts · Q2 2025",
  },
  {
    id: "2",
    name: "CleanWater IoT",
    domain: "CleanTech",
    stage: "Seed",
    kpis: [
      { label: "ARR", value: "₹12L", prev: "₹9L", trend: "up" as const, change: "+33%" },
      { label: "Deployed Sensors", value: "320", prev: "210", trend: "up" as const, change: "+52%" },
      { label: "Municipalities Served", value: "3", prev: "1", trend: "up" as const, change: "+200%" },
      { label: "Uptime SLA", value: "99.2%", prev: "97.8%", trend: "up" as const, change: "+1.4pp" },
    ],
    runway: 14,
    lastReport: "Jan 2025",
    reportFrequency: "Monthly",
    burnRate: "₹1.8L/mo",
    nextMilestone: "Series A fundraise · Q3 2025",
  },
  {
    id: "3",
    name: "MedChain",
    domain: "HealthTech",
    stage: "Pre-Seed",
    kpis: [
      { label: "ARR", value: "₹2.4L", prev: "₹2.8L", trend: "down" as const, change: "-14%" },
      { label: "Pilot Hospital Partners", value: "1", prev: "2", trend: "down" as const, change: "-50%" },
      { label: "Patient Records On-chain", value: "4,200", prev: "3,100", trend: "up" as const, change: "+35%" },
      { label: "DPDP Compliance Score", value: "62%", prev: "N/A", trend: "up" as const, change: "New" },
    ],
    runway: 6,
    lastReport: "Dec 2024",
    reportFrequency: "Quarterly",
    burnRate: "₹1.2L/mo",
    nextMilestone: "DPDP compliance · Feb 2025",
  },
];

const RUNWAY_COLOR = (months: number) => {
  if (months >= 15) return "bg-success";
  if (months >= 9) return "bg-brand-gold";
  return "bg-danger";
};

export default function InvestorTractionPage() {
  return (
    <PageContainer
      title="Portfolio Traction"
      description="Quarterly and monthly KPI reports from your portfolio companies — monitor growth signals, burn rates, and runway health."
    >
      <div className="space-y-6">
        {/* Summary Banner */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Companies Reporting", value: `${PORTFOLIO_TRACTION.length}/${PORTFOLIO_TRACTION.length}`, icon: Building2, color: "bg-brand/10 text-brand" },
            { label: "Aggregate ARR", value: "₹56.4L", icon: IndianRupee, color: "bg-emerald-50 text-emerald-700" },
            { label: "Avg Runway", value: `${Math.round(PORTFOLIO_TRACTION.reduce((a, p) => a + p.runway, 0) / PORTFOLIO_TRACTION.length)} mo`, icon: Activity, color: "bg-amber-50 text-amber-700" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{s.label}</p>
                  <p className="text-xl font-bold text-ink mt-1">{s.value}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Per-company traction */}
        <div className="space-y-5">
          {PORTFOLIO_TRACTION.map((co) => (
            <Card key={co.id} className="overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-line">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-ink">{co.name}</h3>
                      <span className="text-[11px] text-muted-ink">{co.domain} · {co.stage}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><Calendar className="size-3" /> Last report: {co.lastReport} ({co.reportFrequency})</span>
                      <span className="flex items-center gap-1"><IndianRupee className="size-3" /> Burn rate: {co.burnRate}</span>
                      <span className="flex items-center gap-1"><Target className="size-3" /> Next: {co.nextMilestone}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-muted-ink mb-1">Runway</p>
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <div className="h-2 rounded-full bg-line overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${RUNWAY_COLOR(co.runway)}`} style={{ width: `${Math.min((co.runway / 24) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${co.runway < 9 ? "text-danger" : co.runway < 15 ? "text-brand-gold-ink" : "text-success"}`}>{co.runway} mo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="p-5">
                <p className="text-xs font-bold text-ink mb-3 uppercase tracking-wider">Key Performance Indicators (vs Prior Period)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {co.kpis.map((kpi) => (
                    <div key={kpi.label} className={`p-3 rounded-lg border ${kpi.trend === "up" ? "bg-emerald-50/40 border-emerald-100" : "bg-red-50/40 border-red-100"}`}>
                      <p className="text-[11px] text-muted-ink font-semibold uppercase tracking-wide">{kpi.label}</p>
                      <p className="text-lg font-bold text-ink mt-1">{kpi.value}</p>
                      <div className={`flex items-center gap-1 mt-0.5 text-xs font-semibold ${kpi.trend === "up" ? "text-success" : "text-danger"}`}>
                        {kpi.trend === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                        {kpi.change} vs prev
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                    <ExternalLink className="size-3.5" /> Full Report
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
