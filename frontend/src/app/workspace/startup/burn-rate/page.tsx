"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Flame,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  Sparkles,
  Rocket,
} from "lucide-react";

const MONTHLY_DATA = [
  { month: "Aug", revenue: 82000, burn: 320000, balance: 1200000 },
  { month: "Sep", revenue: 95000, burn: 335000, balance: 965000 },
  { month: "Oct", revenue: 110000, burn: 310000, balance: 765000 },
  { month: "Nov", revenue: 128000, burn: 325000, balance: 568000 },
  { month: "Dec", revenue: 142000, burn: 318000, balance: 392000 },
  { month: "Jan", revenue: 163000, burn: 322000, balance: 233000 },
];

const CURRENT = MONTHLY_DATA[MONTHLY_DATA.length - 1];
const PREV = MONTHLY_DATA[MONTHLY_DATA.length - 2];

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function pctChange(a: number, b: number) {
  const pct = (((a - b) / b) * 100).toFixed(1);
  return { pct, positive: a >= b };
}

export default function StartupBurnRatePage() {
  const runway = Math.floor(CURRENT.balance / (CURRENT.burn - CURRENT.revenue));
  const netBurn = CURRENT.burn - CURRENT.revenue;
  const maxBar = Math.max(...MONTHLY_DATA.map((d) => d.burn));

  return (
    <PageContainer
      title="Burn Rate & Runway"
      description="Track your monthly cash burn, revenue offset, and runway health in real time — know your financial position at all times."
    >
      <div className="space-y-6">
        {/* KPI Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Gross Burn / Month",
              value: formatINR(CURRENT.burn),
              change: pctChange(CURRENT.burn, PREV.burn),
              icon: Flame,
              color: "bg-red-50 text-danger",
              note: "Total monthly spend",
            },
            {
              label: "Revenue Offset",
              value: formatINR(CURRENT.revenue),
              change: pctChange(CURRENT.revenue, PREV.revenue),
              icon: TrendingUp,
              color: "bg-emerald-50 text-emerald-700",
              note: "Reducing effective burn",
            },
            {
              label: "Net Burn / Month",
              value: formatINR(netBurn),
              change: pctChange(netBurn, PREV.burn - PREV.revenue),
              icon: IndianRupee,
              color: "bg-amber-50 text-amber-700",
              note: "After revenue offset",
            },
            {
              label: "Runway",
              value: `${runway} months`,
              change: { pct: "N/A", positive: runway >= 12 },
              icon: Clock,
              color: runway >= 12 ? "bg-emerald-50 text-emerald-700" : runway >= 6 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-danger",
              note: runway < 6 ? "⚠️ CRITICAL" : runway < 12 ? "Raise funding soon" : "Healthy",
            },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{kpi.label}</p>
                  <p className="text-2xl font-bold text-ink mt-1">{kpi.value}</p>
                  <div className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${kpi.change.positive ? "text-success" : "text-danger"}`}>
                    {kpi.change.pct !== "N/A" && (
                      <>{kpi.change.positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {kpi.change.positive ? "+" : ""}{kpi.change.pct}% MoM</>
                    )}
                    {kpi.change.pct === "N/A" && <span className="text-muted-ink font-normal">{kpi.note}</span>}
                  </div>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                  <kpi.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Runway alert */}
        {runway < 9 && (
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${runway < 6 ? "border-danger/30 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <AlertTriangle className={`size-5 shrink-0 ${runway < 6 ? "text-danger" : "text-amber-700"}`} />
            <div>
              <p className={`text-sm font-bold ${runway < 6 ? "text-danger" : "text-amber-800"}`}>
                {runway < 6 ? "Critical: Less than 6 months runway remaining" : `Warning: ${runway} months of runway — start fundraising now`}
              </p>
              <p className={`text-xs mt-0.5 ${runway < 6 ? "text-red-700" : "text-amber-700"}`}>
                At current net burn of {formatINR(netBurn)}/month, you'll run out of cash in approximately {runway} months.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Burn Chart */}
          <div className="lg:col-span-2">
            <Card className="p-5">
              <SectionHeading title="Monthly Burn vs Revenue (Last 6 Months)" />
              <div className="space-y-3">
                {MONTHLY_DATA.map((d) => (
                  <div key={d.month}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-ink w-8">{d.month}</span>
                      <div className="flex-1 mx-3 space-y-1">
                        {/* Burn bar */}
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-canvas rounded-full h-2.5 overflow-hidden">
                            <div className="h-full rounded-full bg-danger/70" style={{ width: `${(d.burn / maxBar) * 100}%` }} />
                          </div>
                        </div>
                        {/* Revenue bar */}
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-canvas rounded-full h-2.5 overflow-hidden">
                            <div className="h-full rounded-full bg-success" style={{ width: `${(d.revenue / maxBar) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right w-24 shrink-0">
                        <p className="text-[11px] text-danger font-semibold">{formatINR(d.burn)}</p>
                        <p className="text-[11px] text-success font-semibold">{formatINR(d.revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-line">
                <div className="flex items-center gap-1.5 text-xs text-muted-ink"><div className="size-2.5 rounded-full bg-danger/70" /> Gross Burn</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-ink"><div className="size-2.5 rounded-full bg-success" /> Revenue</div>
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Cash Balance */}
            <Card className="p-4">
              <SectionHeading title="Cash Balance Trend" />
              <div className="space-y-2">
                {MONTHLY_DATA.map((d) => (
                  <div key={d.month} className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-ink w-8">{d.month}</span>
                    <div className="flex-1 h-2 bg-canvas rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${d.balance > 700000 ? "bg-success" : d.balance > 350000 ? "bg-brand-gold" : "bg-danger"}`}
                        style={{ width: `${(d.balance / 1200000) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-ink w-14 text-right">{formatINR(d.balance)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Insight */}
            <Card className="p-4 border-brand-cyan/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="size-4 text-brand-cyan" />
                <span className="text-xs font-bold text-ink">AI Financial Insight</span>
              </div>
              <p className="text-xs text-muted-ink leading-relaxed">
                Your revenue is growing at <strong className="text-ink">+14.8% MoM</strong> while burn is relatively stable (+1.2% MoM). At this trajectory, you'll reach cash flow neutrality in approximately <strong className="text-ink">4.5 months</strong>. Consider a small bridge round to extend runway to 18 months as a safety buffer.
              </p>
              <Link href="/workspace/startup/kpis" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover transition-colors mt-3">
                View KPI Trends <ArrowRight className="size-3" />
              </Link>
            </Card>

            {/* Actions */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-ink mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-2.5 rounded-lg border border-line hover:border-brand/40 hover:bg-canvas text-xs font-semibold text-ink transition-colors flex items-center justify-between">
                  Update Expense Entries <ArrowRight className="size-3.5 text-muted-ink" />
                </button>
                <button className="w-full text-left p-2.5 rounded-lg border border-line hover:border-brand/40 hover:bg-canvas text-xs font-semibold text-ink transition-colors flex items-center justify-between">
                  Generate Burn Report PDF <ArrowRight className="size-3.5 text-muted-ink" />
                </button>
                <Link href="/workspace/startup/pitch-decks" className="w-full text-left p-2.5 rounded-lg border border-brand/20 bg-brand/5 hover:bg-brand/10 text-xs font-semibold text-brand transition-colors flex items-center justify-between">
                  Prepare Investor Update <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
