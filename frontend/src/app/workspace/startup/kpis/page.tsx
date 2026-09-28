"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading } from "@/components/shared/Surface";
import {
  BarChart4,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Activity,
  Sparkles,
  Target,
  Edit2,
  Save,
  Plus,
  X,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const KPI_DATA = [
  {
    id: "1",
    label: "Monthly Recurring Revenue (MRR)",
    value: "₹13.6L",
    rawValue: 1360000,
    prevValue: 1180000,
    unit: "₹",
    category: "Revenue",
    target: "₹20L by Q2 2025",
    targetProgress: 68,
    trend: "up" as const,
    history: [7.2, 8.4, 9.0, 10.1, 11.8, 13.6],
    months: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  },
  {
    id: "2",
    label: "Active Clients",
    value: "38",
    rawValue: 38,
    prevValue: 28,
    unit: "",
    category: "Growth",
    target: "60 clients by Q3 2025",
    targetProgress: 63,
    trend: "up" as const,
    history: [14, 18, 22, 26, 28, 38],
    months: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  },
  {
    id: "3",
    label: "Gross Margin",
    value: "64%",
    rawValue: 64,
    prevValue: 58,
    unit: "%",
    category: "Profitability",
    target: "70% by end of 2025",
    targetProgress: 91,
    trend: "up" as const,
    history: [48, 52, 55, 58, 58, 64],
    months: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  },
  {
    id: "4",
    label: "Customer Acquisition Cost (CAC)",
    value: "₹18K",
    rawValue: 18000,
    prevValue: 14500,
    unit: "₹",
    category: "Efficiency",
    target: "< ₹15K by Q2 2025",
    targetProgress: 33,
    trend: "down" as const,
    history: [24, 22, 20, 14.5, 14.5, 18],
    months: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  },
  {
    id: "5",
    label: "Net Revenue Retention (NRR)",
    value: "118%",
    rawValue: 118,
    prevValue: 112,
    unit: "%",
    category: "Retention",
    target: "> 120% NRR",
    targetProgress: 98,
    trend: "up" as const,
    history: [98, 103, 107, 112, 112, 118],
    months: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  },
  {
    id: "6",
    label: "Churn Rate",
    value: "1.8%",
    rawValue: 1.8,
    prevValue: 2.4,
    unit: "%",
    category: "Retention",
    target: "< 1.5% monthly churn",
    targetProgress: 83,
    trend: "up" as const,
    history: [4.2, 3.8, 3.1, 2.7, 2.4, 1.8],
    months: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  },
];

function pctChange(current: number, prev: number) {
  const pct = (((current - prev) / prev) * 100).toFixed(1);
  return { pct, positive: current >= prev };
}

function MiniSparkline({ data, trend }: { data: number[]; trend: "up" | "down" }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={trend === "up" ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StartupKPIsPage() {
  const [editMode, setEditMode] = useState(false);

  return (
    <PageContainer
      title="KPI Dashboard"
      description="Track your startup's key performance indicators in real time — revenue, growth, retention, and efficiency metrics."
    >
      <div className="space-y-6">
        {/* Summary Banner */}
        <div className="rounded-xl border border-brand/20 bg-gradient-to-r from-brand-deep to-brand p-5 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">Monthly Performance — January 2025</p>
              <h2 className="text-lg font-bold">₹13.6L MRR · 38 Clients · 64% Gross Margin</h2>
              <p className="text-xs text-blue-200 mt-1">Strong revenue growth (+15.3% MoM). CAC increase needs monitoring.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditMode(!editMode)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors"
              >
                <Edit2 className="size-3.5" /> {editMode ? "Done Editing" : "Edit Targets"}
              </button>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <Card className="p-4 border-brand-cyan/20">
          <div className="flex items-start gap-2.5">
            <Sparkles className="size-4 text-brand-cyan shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-ink mb-1">AI Performance Insight</p>
              <p className="text-xs text-muted-ink leading-relaxed">
                Your NRR of <strong className="text-ink">118%</strong> is excellent — it means existing clients are expanding their usage faster than you're churning. However, CAC has risen by <strong className="text-ink">24% MoM</strong>. Consider A/B testing referral-led acquisition channels to bring CAC back under ₹15K while maintaining growth pace. Gross margin trajectory is healthy — at 64%, you have room for measured team expansion.
              </p>
            </div>
          </div>
        </Card>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {KPI_DATA.map((kpi) => {
            const change = pctChange(kpi.rawValue, kpi.prevValue);
            const isGoodTrend = kpi.id === "4" || kpi.id === "6" ? !change.positive : change.positive;

            return (
              <Card key={kpi.id} className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-muted-ink uppercase tracking-wider">{kpi.category}</p>
                    <p className="text-xs font-semibold text-ink mt-0.5 leading-snug">{kpi.label}</p>
                  </div>
                  <MiniSparkline data={kpi.history} trend={kpi.trend} />
                </div>

                <div className="flex items-end justify-between gap-2 mb-3">
                  <div>
                    <p className="text-2xl font-bold text-ink">{kpi.value}</p>
                    <div className={`flex items-center gap-1 mt-0.5 text-xs font-semibold ${isGoodTrend ? "text-success" : "text-danger"}`}>
                      {isGoodTrend ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                      {change.positive ? "+" : ""}{change.pct}% MoM
                    </div>
                  </div>
                </div>

                {/* Target progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 text-muted-ink font-semibold"><Target className="size-2.5" /> {kpi.target}</span>
                    <span className="font-bold text-ink">{kpi.targetProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${kpi.targetProgress >= 90 ? "bg-success" : kpi.targetProgress >= 60 ? "bg-brand" : "bg-brand-gold"}`}
                      style={{ width: `${kpi.targetProgress}%` }}
                    />
                  </div>
                </div>

                {/* Monthly trend mini table */}
                <div className="mt-3 pt-3 border-t border-line grid grid-cols-6 gap-1">
                  {kpi.history.map((v, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[9px] text-muted-ink">{kpi.months[i]}</p>
                      <p className="text-[10px] font-bold text-ink">{kpi.unit === "₹" ? `${v}L` : `${v}${kpi.unit}`}</p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
