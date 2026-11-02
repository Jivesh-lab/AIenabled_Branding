"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  ExternalLink,
  Plus,
  Loader2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  PieChart,
  ShieldCheck,
  Trash2,
  Clock,
  Sparkles,
} from "lucide-react";

interface PortfolioHolding {
  id: string;
  _id?: string;
  startupId: {
    _id?: string;
    name?: string;
    tagline?: string;
    sector?: string;
    stage?: string;
    readinessScore?: number;
    pitchDeckUrl?: string | null;
  } | string;
  startupName: string;
  sector: string;
  stage: string;
  round: string;
  investmentAmount: number;
  equityPercentage: number;
  currentValuation: number;
  status: string;
  leadMentor: string;
  governanceNotes: string;
  monthlyMetrics: Array<{
    month: string;
    mrr: number;
    activeUsers: number;
    burnRate: number;
    runwayMonths: number;
    keyMilestone: string;
    trlLevel: number;
  }>;
  createdAt: string;
}

interface PortfolioStats {
  totalInvested: number;
  totalValuation: number;
  avgEquity: number;
  activeVentures: number;
  totalHoldings: number;
}

interface StartupOption {
  id: string;
  name: string;
  sector: string;
  stage: string;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New investment modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [availableStartups, setAvailableStartups] = useState<StartupOption[]>([]);
  const [selectedStartupId, setSelectedStartupId] = useState("");
  const [round, setRound] = useState("Seed");
  const [investmentAmount, setInvestmentAmount] = useState<number>(2000000);
  const [equityPercentage, setEquityPercentage] = useState<number>(5.0);
  const [currentValuation, setCurrentValuation] = useState<number>(40000000);
  const [governanceNotes, setGovernanceNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPortfolio();
    fetchStartupOptions();
  }, []);

  async function fetchPortfolio() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/investor/portfolio");
      if (!res.ok) {
        setError("Failed to load portfolio holdings.");
        return;
      }
      const data = await res.json();
      setHoldings(data.portfolio || []);
      setStats(data.stats || null);
    } catch {
      setError("Network error fetching portfolio.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStartupOptions() {
    try {
      const res = await fetch("/api/investor/startups");
      if (res.ok) {
        const data = await res.json();
        const opts = (data.startups || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          sector: s.sector,
          stage: s.stage,
        }));
        setAvailableStartups(opts);
        if (opts.length > 0) {
          setSelectedStartupId(opts[0].id);
        }
      }
    } catch {
      // Non-fatal
    }
  }

  async function handleRecordInvestment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStartupId) {
      toast.error("Please select an approved startup.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/investor/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId: selectedStartupId,
          round,
          investmentAmount: Number(investmentAmount),
          equityPercentage: Number(equityPercentage),
          currentValuation: Number(currentValuation),
          governanceNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Investment recorded in active portfolio!");
        setModalOpen(false);
        fetchPortfolio();
      } else {
        toast.error(data.message || "Failed to record investment.");
      }
    } catch {
      toast.error("Network error recording investment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveHolding(id: string) {
    if (!confirm("Are you sure you want to remove this portfolio holding?")) return;
    try {
      const res = await fetch(`/api/investor/portfolio/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Portfolio holding removed.");
        fetchPortfolio();
      } else {
        toast.error("Failed to remove holding.");
      }
    } catch {
      toast.error("Network error removing holding.");
    }
  }

  return (
    <PageContainer
      title="Venture Portfolio Desk"
      description="Track equity holdings, capital disbursements, and governance oversight across invested DBIT student spin-outs."
    >
      <div className="space-y-6">
        {/* Top actions bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Active Capital Positions</h2>
            <p className="text-xs text-muted-ink">
              Direct institutional and angel holdings managed under DBIT Innovation Centre agreements.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors shadow-xs"
          >
            <Plus className="size-4" /> Record New Investment
          </button>
        </div>

        {/* Portfolio Stats Strip */}
        {stats && (
          <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0 shadow-xs">
            <div className="p-4 sm:p-5">
              <span className="text-[13px] font-medium text-muted-ink">Total Capital Deployed</span>
              <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">
                ₹{(stats.totalInvested / 100000).toFixed(1)} Lakhs
              </p>
              <p className="text-[12px] text-slate-500 mt-0.5">Across {stats.activeVentures} ventures</p>
            </div>

            <div className="p-4 sm:p-5">
              <span className="text-[13px] font-medium text-muted-ink">Total Holding Valuation</span>
              <p className="mt-2 text-[26px] font-semibold tracking-tight text-brand tabular-nums">
                ₹{(stats.totalValuation / 10000000).toFixed(2)} Cr
              </p>
              <p className="text-[12px] text-slate-500 mt-0.5">Mark-to-market round valuation</p>
            </div>

            <div className="p-4 sm:p-5">
              <span className="text-[13px] font-medium text-muted-ink">Average Equity Stake</span>
              <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">
                {stats.avgEquity}%
              </p>
              <p className="text-[12px] text-slate-500 mt-0.5">Fully diluted cap table</p>
            </div>

            <div className="p-4 sm:p-5">
              <span className="text-[13px] font-medium text-muted-ink">Portfolio Health</span>
              <p className="mt-2 text-[26px] font-semibold tracking-tight text-emerald-800 tabular-nums">
                Active & On-Track
              </p>
              <p className="text-[12px] text-emerald-700 mt-0.5">Quarterly governance current</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-ink">
            <Loader2 className="size-6 animate-spin text-brand mb-2" />
            <p className="text-xs">Loading portfolio holdings...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-6 border border-line rounded-xl bg-card text-center">
            <AlertCircle className="size-6 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">{error}</p>
            <button
              onClick={fetchPortfolio}
              className="mt-3 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && holdings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-line rounded-xl bg-card p-6">
            <Briefcase className="size-10 text-muted-ink/40 mb-3" />
            <h3 className="text-sm font-semibold text-ink">No portfolio companies recorded</h3>
            <p className="text-xs text-muted-ink mt-1 max-w-sm">
              Once an introduction progresses into a formal investment term sheet, your incubated portfolio positions will be tracked here.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
              >
                <Plus className="size-3.5" /> Record Investment
              </button>
              <Link
                href="/workspace/investor/opportunities"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-card text-xs font-semibold text-ink hover:border-brand/40 hover:text-brand transition-colors"
              >
                <Building2 className="size-3.5" /> Explore Startups
              </Link>
            </div>
          </div>
        )}

        {/* Holdings Cards */}
        {!loading && !error && holdings.length > 0 && (
          <div className="space-y-4">
            {holdings.map((h) => {
              const latestMetric = h.monthlyMetrics && h.monthlyMetrics.length > 0
                ? h.monthlyMetrics[h.monthlyMetrics.length - 1]
                : null;
              const holdingId = h.id || h._id || "";

              return (
                <Card key={holdingId} className="p-5 shadow-xs hover:border-line-hover transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-ink">{h.startupName}</h3>
                        <StatusBadge label={h.sector} tone="info" />
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {h.round} Round
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-canvas border border-line text-muted-ink uppercase">
                          {h.stage}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-canvas/60 border border-line">
                          <span className="text-muted-ink text-[11px]">Capital Invested</span>
                          <p className="font-bold text-ink text-sm mt-0.5 tabular-nums">
                            ₹{(h.investmentAmount / 100000).toFixed(1)} Lakhs
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-canvas/60 border border-line">
                          <span className="text-muted-ink text-[11px]">Equity Stake</span>
                          <p className="font-bold text-ink text-sm mt-0.5 tabular-nums">
                            {h.equityPercentage}%
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-canvas/60 border border-line">
                          <span className="text-muted-ink text-[11px]">Round Valuation</span>
                          <p className="font-bold text-ink text-sm mt-0.5 tabular-nums">
                            ₹{(h.currentValuation / 10000000).toFixed(2)} Cr
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-canvas/60 border border-line">
                          <span className="text-muted-ink text-[11px]">Runway & Burn</span>
                          <p className="font-bold text-emerald-700 text-sm mt-0.5 tabular-nums">
                            {latestMetric ? `${latestMetric.runwayMonths} Mo Runway` : "Stable"}
                          </p>
                        </div>
                      </div>

                      {latestMetric && (
                        <div className="flex items-center gap-4 text-xs text-muted-ink pt-1 flex-wrap">
                          <span>
                            Latest MRR: <strong className="text-ink">₹{(latestMetric.mrr / 1000).toFixed(0)}k/mo</strong>
                          </span>
                          <span>
                            Active Users/Pilots: <strong className="text-ink">{latestMetric.activeUsers}</strong>
                          </span>
                          <span>
                            Maturity: <strong className="text-ink">TRL {latestMetric.trlLevel}/9</strong>
                          </span>
                          {latestMetric.keyMilestone && (
                            <span className="text-brand font-medium">
                              &bull; Milestone: {latestMetric.keyMilestone}
                            </span>
                          )}
                        </div>
                      )}

                      {h.governanceNotes && (
                        <p className="text-xs text-muted-ink bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60 leading-relaxed">
                          <strong className="text-amber-900">Governance Note:</strong> {h.governanceNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-line">
                      <Link
                        href="/workspace/investor/traction"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors shadow-xs"
                      >
                        <TrendingUp className="size-3.5" /> View Telemetry
                      </Link>

                      <button
                        onClick={() => handleRemoveHolding(holdingId)}
                        title="Remove holding"
                        className="size-8 rounded-lg flex items-center justify-center border border-line text-muted-ink hover:text-danger hover:border-danger/40 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Record New Investment */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-card border border-line p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <Briefcase className="size-4 text-brand" /> Record Venture Investment
                  </h3>
                  <p className="text-xs text-muted-ink mt-0.5">
                    Log an executed term sheet or equity participation in DBIT incubated startups.
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="size-7 rounded-lg hover:bg-canvas flex items-center justify-center text-muted-ink hover:text-ink text-sm font-semibold transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordInvestment} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Target Startup</label>
                  <select
                    value={selectedStartupId}
                    onChange={(e) => setSelectedStartupId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none"
                    required
                  >
                    {availableStartups.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.sector} &bull; {s.stage.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Funding Round</label>
                    <select
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none"
                    >
                      <option value="Pre-Seed">Pre-Seed</option>
                      <option value="Seed">Seed</option>
                      <option value="Pre-Series A">Pre-Series A</option>
                      <option value="Angel Round">Angel Round</option>
                      <option value="Convertible Note">Convertible Note</option>
                      <option value="Grant Cohort">Grant Cohort</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Equity Stake (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={equityPercentage}
                      onChange={(e) => setEquityPercentage(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Investment Amount (₹)</label>
                    <input
                      type="number"
                      step="100000"
                      min="10000"
                      value={investmentAmount}
                      onChange={(e) => {
                        const amt = Number(e.target.value);
                        setInvestmentAmount(amt);
                        if (equityPercentage > 0) {
                          setCurrentValuation(Math.round(amt / (equityPercentage / 100)));
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Estimated Valuation (₹)</label>
                    <input
                      type="number"
                      step="500000"
                      value={currentValuation}
                      onChange={(e) => setCurrentValuation(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Governance Notes / Key Terms</label>
                  <textarea
                    rows={2}
                    value={governanceNotes}
                    onChange={(e) => setGovernanceNotes(e.target.value)}
                    placeholder="Enter board advisory terms, milestone disbursement conditions..."
                    className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-muted-ink hover:bg-canvas transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {submitting ? "Recording..." : "Save Holding"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
