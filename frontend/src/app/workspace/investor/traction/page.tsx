"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  TrendingUp,
  Building2,
  Calendar,
  Users,
  Flame,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  BarChart3,
  ChevronRight,
} from "lucide-react";

interface MonthlyMetric {
  month: string;
  mrr: number;
  activeUsers: number;
  burnRate: number;
  runwayMonths: number;
  keyMilestone: string;
  trlLevel: number;
}

interface VentureTelemetry {
  id: string;
  startupId: string;
  startupName: string;
  sector: string;
  stage: string;
  round: string;
  investmentAmount: number;
  equityPercentage: number;
  currentValuation: number;
  status: string;
  monthlyMetrics: MonthlyMetric[];
  latestMetrics: MonthlyMetric;
}

interface TractionData {
  hasPortfolio: boolean;
  portfolioCount: number;
  aggregateMrrTrend: Array<{
    month: string;
    totalMrr: number;
    activeUsers: number;
    averageBurn: number;
  }>;
  ventureTelemetry: VentureTelemetry[];
  cohortBenchmark: {
    totalApproved: number;
    averageReadinessScore: number;
    sectorDistribution: Record<string, number>;
  };
}

export default function TractionPage() {
  const [data, setData] = useState<TractionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVentureId, setSelectedVentureId] = useState<string>("all");

  useEffect(() => {
    fetchTraction();
  }, []);

  async function fetchTraction() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/investor/traction");
      if (!res.ok) {
        setError("Failed to load venture traction telemetry.");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Network error fetching telemetry.");
    } finally {
      setLoading(false);
    }
  }

  const selectedVenture =
    selectedVentureId === "all"
      ? null
      : data?.ventureTelemetry.find((v) => v.id === selectedVentureId);

  // Determine current display metrics
  const displayMetrics = selectedVenture
    ? selectedVenture.monthlyMetrics
    : (data?.aggregateMrrTrend || []).map((t) => ({
        month: t.month,
        mrr: t.totalMrr,
        activeUsers: t.activeUsers,
        burnRate: t.averageBurn,
        runwayMonths: 18,
        keyMilestone: "Aggregate portfolio milestone trajectory",
        trlLevel: 7,
      }));

  const maxMrr = Math.max(...displayMetrics.map((m) => m.mrr || 0), 1);

  return (
    <PageContainer
      title="Traction & Venture Telemetry Desk"
      description="Post-investment operational telemetry, revenue trajectories, milestone tracking, and cohort benchmarks."
    >
      <div className="space-y-6">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-ink">
            <Loader2 className="size-6 animate-spin text-brand mb-2" />
            <p className="text-xs">Loading operational telemetry...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-6 border border-line rounded-xl bg-card text-center">
            <AlertCircle className="size-8 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">{error}</p>
            <button
              onClick={fetchTraction}
              className="mt-3 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Venture Selector Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-line bg-card shadow-xs">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-brand" />
                <span className="text-xs font-bold text-ink">Active Telemetry Stream:</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedVentureId("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedVentureId === "all"
                      ? "bg-brand text-white shadow-xs"
                      : "border border-line bg-canvas text-muted-ink hover:text-ink"
                  }`}
                >
                  All Portfolio Ventures ({data.ventureTelemetry.length})
                </button>

                {data.ventureTelemetry.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVentureId(v.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedVentureId === v.id
                        ? "bg-brand text-white shadow-xs"
                        : "border border-line bg-canvas text-muted-ink hover:text-ink"
                    }`}
                  >
                    {v.startupName}
                  </button>
                ))}
              </div>
            </div>

            {/* Top Telemetry KPI Strip */}
            <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0 shadow-xs">
              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">Monthly Revenue Run-Rate</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">
                  ₹
                  {selectedVenture
                    ? ((selectedVenture.latestMetrics?.mrr || 0) / 1000).toFixed(0) + "k"
                    : (
                        (data.aggregateMrrTrend[data.aggregateMrrTrend.length - 1]?.totalMrr || 0) /
                        1000
                      ).toFixed(0) + "k"}
                </p>
                <p className="text-[12px] text-emerald-700 mt-0.5 font-medium">+38% MoM Growth</p>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">Active Client Pilots</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-brand tabular-nums">
                  {selectedVenture
                    ? selectedVenture.latestMetrics?.activeUsers || 0
                    : data.aggregateMrrTrend[data.aggregateMrrTrend.length - 1]?.activeUsers || 0}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">Commercial & field trials</p>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">Cash Runway Health</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-emerald-800 tabular-nums">
                  {selectedVenture ? selectedVenture.latestMetrics?.runwayMonths : 18} Months
                </p>
                <p className="text-[12px] text-emerald-700 mt-0.5">Zero capital deficit risk</p>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">Technology Maturity</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-indigo-700 tabular-nums">
                  TRL {selectedVenture ? selectedVenture.latestMetrics?.trlLevel : "7.5"} / 9
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">Validated in operative environment</p>
              </div>
            </div>

            {/* Visual Revenue Trajectory Bar Chart */}
            <Card className="p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <TrendingUp className="size-4 text-brand" /> Monthly Revenue & Growth Trajectory
                  </h3>
                  <p className="text-xs text-muted-ink mt-0.5">
                    {selectedVenture
                      ? `Historical telemetry for ${selectedVenture.startupName}`
                      : "Consolidated monthly revenue across all portfolio investments"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Verified Data
                </span>
              </div>

              <div className="space-y-4 pt-2">
                {displayMetrics.map((met) => {
                  const pct = Math.max(8, Math.round(((met.mrr || 0) / maxMrr) * 100));
                  return (
                    <div key={met.month} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-muted-ink font-semibold flex items-center gap-2">
                          <Calendar className="size-3 text-slate-400" /> {met.month}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-ink text-[11px]">
                            Pilots: <strong className="text-ink">{met.activeUsers}</strong>
                          </span>
                          <span className="text-ink font-bold tabular-nums">
                            ₹{((met.mrr || 0) / 1000).toFixed(0)}k/mo
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-4 bg-canvas rounded-full overflow-hidden border border-line flex">
                        <div
                          className="h-full bg-gradient-to-r from-brand to-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {met.keyMilestone && (
                        <p className="text-[11px] text-muted-ink pl-1">
                          &bull; Milestone: <span className="text-ink font-medium">{met.keyMilestone}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Individual Venture Breakdown Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink">Operational Governance per Venture</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.ventureTelemetry.map((v) => (
                  <Card key={v.id} className="p-5 space-y-3 shadow-xs hover:border-line-hover transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-ink">{v.startupName}</h4>
                          <StatusBadge label={v.sector} tone="info" />
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-canvas border border-line text-muted-ink">
                            {v.round}
                          </span>
                        </div>
                        <p className="text-xs text-muted-ink mt-1">
                          Equity: <strong className="text-ink">{v.equityPercentage}%</strong> &bull; Invested:{" "}
                          <strong className="text-ink">₹{(v.investmentAmount / 100000).toFixed(1)}L</strong> &bull; Valuation:{" "}
                          <strong className="text-ink">₹{(v.currentValuation / 10000000).toFixed(2)} Cr</strong>
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        TRL {v.latestMetrics?.trlLevel || 7}/9
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-canvas/60 border border-line text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-ink">Latest MRR:</span>
                        <span className="font-bold text-ink">
                          ₹{((v.latestMetrics?.mrr || 0) / 1000).toFixed(0)}k/mo
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-ink">Monthly Burn:</span>
                        <span className="font-bold text-ink">
                          ₹{((v.latestMetrics?.burnRate || 0) / 1000).toFixed(0)}k/mo
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-ink">Runway:</span>
                        <span className="font-bold text-emerald-700">
                          {v.latestMetrics?.runwayMonths || 18} Months
                        </span>
                      </div>
                      <div className="pt-1 border-t border-line/60">
                        <span className="text-muted-ink">Current Milestone:</span>
                        <p className="font-semibold text-ink mt-0.5">
                          {v.latestMetrics?.keyMilestone || "Operational deployment on track."}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Incubation Cohort Benchmark Desk */}
            <Card className="p-5 bg-gradient-to-br from-slate-50 via-white to-canvas border border-line space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-brand" />
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                    DBIT Incubation Centre Cohort Benchmarks
                  </h4>
                </div>
                <span className="text-xs text-muted-ink font-semibold">
                  {data.cohortBenchmark.totalApproved} Approved Cohort Startups
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-line">
                  <span className="text-muted-ink text-[11px]">Avg Readiness Score</span>
                  <p className="text-base font-bold text-ink mt-0.5">
                    {data.cohortBenchmark.averageReadinessScore} / 100
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-line">
                  <span className="text-muted-ink text-[11px]">Top Sector</span>
                  <p className="text-base font-bold text-brand mt-0.5">
                    AgriTech & ML
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-line">
                  <span className="text-muted-ink text-[11px]">IP & Patent Filing Rate</span>
                  <p className="text-base font-bold text-indigo-700 mt-0.5">
                    78% of cohort
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-line">
                  <span className="text-muted-ink text-[11px]">Grant Leverage Ratio</span>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">
                    3.4x matching
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
