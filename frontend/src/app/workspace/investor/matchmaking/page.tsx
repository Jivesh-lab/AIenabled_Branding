"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  Sparkles,
  Target,
  Building2,
  Bookmark,
  AlertCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Activity,
  Check,
} from "lucide-react";

interface ProfileDetails {
  firmName?: string;
  firmType?: string;
  investmentThesis?: string;
  preferredSectors?: string[];
  preferredStages?: string[];
  ticketSizeMin?: number;
  ticketSizeMax?: number;
}

interface MatchRecommendation {
  startupId: string;
  startupName: string;
  sector: string;
  stage: string;
  tagline: string;
  problem: string;
  solution: string;
  readinessScore: number;
  tags: string[];
  matchScore: number;
  matchTier: "strong" | "partial" | "insufficient_data";
  scoreBreakdown?: {
    sectorScore: number;
    stageScore: number;
    thesisScore: number;
    readinessScore: number;
  };
  breakdown?: Record<string, number>;
  reasons: string[];
  missingCriteria: string[];
  isSaved?: boolean;
  interestLevel?: string | null;
}

export default function MatchmakingPage() {
  const [details, setDetails] = useState<ProfileDetails>({
    firmName: "",
    firmType: "angel",
    investmentThesis: "",
    preferredSectors: [],
    preferredStages: [],
    ticketSizeMin: 0,
    ticketSizeMax: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Matchmaking State
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<MatchRecommendation[] | null>(null);
  const [totalCandidates, setTotalCandidates] = useState<number>(0);
  const [evaluatedCandidates, setEvaluatedCandidates] = useState<number>(0);
  const [globalMissingCriteria, setGlobalMissingCriteria] = useState<string[]>([]);
  const [savingWatchlistId, setSavingWatchlistId] = useState<string | null>(null);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/investor/profile");
      if (res.ok) {
        const data = await res.json();
        setIsVerified(Boolean(data.profile?.isInvestorVerified));
        if (data.profile?.details) {
          setDetails({
            firmName: data.profile.details.firmName || "",
            firmType: data.profile.details.firmType || "angel",
            investmentThesis: data.profile.details.investmentThesis || "",
            preferredSectors: data.profile.details.preferredSectors || [],
            preferredStages: data.profile.details.preferredStages || [],
            ticketSizeMin: data.profile.details.ticketSizeMin || 0,
            ticketSizeMax: data.profile.details.ticketSizeMax || 0,
          });
        }
      }
    } catch {
      toast.error("Failed to load thesis criteria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) {
        await fetchProfile();
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSaveThesis(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/investor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details }),
      });
      if (res.ok) {
        toast.success("Investment criteria saved successfully.");
      } else {
        toast.error("Failed to save criteria.");
      }
    } catch {
      toast.error("Network error saving criteria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRunMatchmaking() {
    setMatching(true);
    setMatchError(null);
    try {
      const res = await fetch("/api/investor/matchmaking", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMatchError(data.message || "Matchmaking evaluation failed. Please verify service availability.");
        toast.error(data.message || "Failed to run matchmaking.");
        return;
      }

      setRecommendations(data.recommendations || []);
      setTotalCandidates(data.totalCandidates || 0);
      setEvaluatedCandidates(data.evaluatedCandidates || 0);
      setGlobalMissingCriteria(data.missingCriteria || []);
      toast.success(`Evaluated ${data.evaluatedCandidates} approved startups.`);
    } catch {
      const msg = "Unable to connect to matchmaking agent. Check if services are running.";
      setMatchError(msg);
      toast.error(msg);
    } finally {
      setMatching(false);
    }
  }

  async function handleToggleWatchlist(startupId: string, currentSaved: boolean) {
    setSavingWatchlistId(startupId);
    try {
      const res = await fetch("/api/investor/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId,
          interestLevel: currentSaved ? "passed" : "watching",
        }),
      });

      if (res.ok) {
        setRecommendations((prev) =>
          prev
            ? prev.map((item) =>
                item.startupId === startupId
                  ? { ...item, isSaved: !currentSaved, interestLevel: currentSaved ? null : "watching" }
                  : item
              )
            : null
        );
        toast.success(currentSaved ? "Removed from watchlist" : "Saved to watchlist");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to update watchlist");
      }
    } catch {
      toast.error("Network error updating watchlist");
    } finally {
      setSavingWatchlistId(null);
    }
  }

  const allSectors = ["AgriTech", "FinTech", "HealthTech", "CleanTech", "EdTech", "DeepTech", "AI/ML"];
  const allStages = ["idea", "concept", "prototype", "mvp", "growth"];

  function toggleSector(s: string) {
    const current = details.preferredSectors || [];
    setDetails({
      ...details,
      preferredSectors: current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
    });
  }

  function toggleStage(stg: string) {
    const current = details.preferredStages || [];
    setDetails({
      ...details,
      preferredStages: current.includes(stg) ? current.filter((x) => x !== stg) : [...current, stg],
    });
  }

  return (
    <PageContainer
      title="AI-Powered Investor–Startup Matchmaking"
      description="Define your thesis and trigger deterministic AI evaluations across approved incubation ventures based on sector, stage maturity, and thesis relevance."
    >
      <div className="space-y-8 max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-ink">
            <Loader2 className="size-6 animate-spin text-brand mb-2" />
          </div>
        ) : (
          <>
            {/* THESIS CONFIGURATION SECTION */}
            <form onSubmit={handleSaveThesis} className="space-y-5">
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-brand" />
                    <h3 className="text-sm font-bold text-ink">Investment Thesis & Criteria</h3>
                  </div>
                  <span className="text-[11px] font-medium text-muted-ink bg-canvas px-2.5 py-0.5 rounded-full border border-line">
                    {isVerified ? "✓ Accredited Investor" : "Unverified Directory View"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Firm / Syndicate Name</label>
                    <input
                      type="text"
                      value={details.firmName || ""}
                      onChange={(e) => setDetails({ ...details, firmName: e.target.value })}
                      placeholder="e.g. Apex Angels or Individual"
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Entity Type</label>
                    <select
                      value={details.firmType || "angel"}
                      onChange={(e) => setDetails({ ...details, firmType: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none"
                    >
                      <option value="angel">Angel Investor</option>
                      <option value="vc">Venture Capital Fund</option>
                      <option value="syndicate">Angel Syndicate</option>
                      <option value="corporate">Corporate VC / Strategic</option>
                      <option value="family_office">Family Office</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Investment Thesis</label>
                  <textarea
                    rows={3}
                    value={details.investmentThesis || ""}
                    onChange={(e) => setDetails({ ...details, investmentThesis: e.target.value })}
                    placeholder="Describe specific themes, problem statements, founder qualities, and technological advantages you back..."
                    className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                  />
                  <p className="text-[11px] text-muted-ink mt-1">
                    The matchmaking agent uses keyword resonance and semantic matching between your thesis and approved startup problems/solutions.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Target Sectors</label>
                  <div className="flex flex-wrap gap-1.5">
                    {allSectors.map((s) => {
                      const active = (details.preferredSectors || []).includes(s);
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() => toggleSector(s)}
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                            active
                              ? "bg-brand text-white border-brand shadow-xs"
                              : "bg-canvas text-muted-ink border-line hover:border-brand/40"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Target Venture Stages</label>
                  <div className="flex flex-wrap gap-1.5">
                    {allStages.map((stg) => {
                      const active = (details.preferredStages || []).includes(stg);
                      return (
                        <button
                          type="button"
                          key={stg}
                          onClick={() => toggleStage(stg)}
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors uppercase ${
                            active
                              ? "bg-brand text-white border-brand shadow-xs"
                              : "bg-canvas text-muted-ink border-line hover:border-brand/40"
                          }`}
                        >
                          {stg}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-line">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-card border border-line text-xs font-bold text-ink hover:bg-canvas transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving Criteria..." : "Update Saved Criteria"}
                  </button>

                  <button
                    type="button"
                    onClick={handleRunMatchmaking}
                    disabled={matching}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover shadow-sm transition-all disabled:opacity-50"
                  >
                    {matching ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Evaluating Ventures...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Find AI Matches
                      </>
                    )}
                  </button>
                </div>
              </Card>
            </form>

            {/* SCORING METHODOLOGY SUMMARY */}
            <div className="p-4 rounded-xl border border-line bg-canvas/60 text-xs text-muted-ink space-y-2">
              <div className="flex items-center gap-2 text-ink font-semibold">
                <HelpCircle className="size-4 text-brand" />
                <span>Deterministic Scoring Model (100 pts max)</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Matches are evaluated systematically against approved active ventures using 4 transparent pillars:
                <strong className="text-ink"> Sector Fit (35 pts)</strong>,
                <strong className="text-ink"> Stage Maturity (25 pts)</strong>,
                <strong className="text-ink"> Thesis Resonance (20 pts)</strong>, and
                <strong className="text-ink"> Incubation Readiness Score (20 pts)</strong>.
                Recommendations are categorized as <span className="text-emerald-700 font-semibold">Strong (≥75)</span>, <span className="text-amber-700 font-semibold">Partial (45–74)</span>, or <span className="text-zinc-600 font-semibold">Insufficient Data (&lt;45)</span>.
              </p>
            </div>

            {/* MATCHMAKING RESULTS SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Activity className="size-4 text-brand" />
                    Recommended Ventures
                  </h3>
                  {recommendations && (
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      Evaluated {evaluatedCandidates} of {totalCandidates} candidate startups against your criteria.
                    </p>
                  )}
                </div>

                {recommendations && (
                  <button
                    type="button"
                    onClick={handleRunMatchmaking}
                    disabled={matching}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-medium text-ink hover:bg-canvas transition-colors"
                  >
                    <RefreshCw className={`size-3.5 ${matching ? "animate-spin" : ""}`} />
                    Refresh Matches
                  </button>
                )}
              </div>

              {/* LOADING STATE */}
              {matching && (
                <Card className="p-12 text-center space-y-3">
                  <Loader2 className="size-8 text-brand animate-spin mx-auto" />
                  <h4 className="text-sm font-bold text-ink">Analyzing Candidate Startups</h4>
                  <p className="text-xs text-muted-ink max-w-md mx-auto">
                    Retrieving approved incubation records from MongoDB and computing deterministic match scores...
                  </p>
                </Card>
              )}

              {/* ERROR STATE */}
              {!matching && matchError && (
                <Card className="p-6 border-red-200 bg-red-50/50 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-900">Matchmaking Service Error</h4>
                      <p className="text-xs text-red-700 mt-1">{matchError}</p>
                    </div>
                  </div>
                  <div className="pl-8">
                    <button
                      type="button"
                      onClick={handleRunMatchmaking}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      Retry Analysis
                    </button>
                  </div>
                </Card>
              )}

              {/* UNINITIALIZED STATE */}
              {!matching && !matchError && recommendations === null && (
                <Card className="p-10 text-center space-y-3 border-dashed">
                  <div className="size-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
                    <Sparkles className="size-6" />
                  </div>
                  <h4 className="text-sm font-bold text-ink">Ready for Matchmaking</h4>
                  <p className="text-xs text-muted-ink max-w-md mx-auto">
                    Click <strong>Find AI Matches</strong> above to evaluate approved incubation startups against your thesis, target sectors, and stage criteria.
                  </p>
                </Card>
              )}

              {/* EMPTY STATE */}
              {!matching && !matchError && recommendations !== null && recommendations.length === 0 && (
                <Card className="p-10 text-center space-y-3">
                  <Building2 className="size-10 text-muted-ink mx-auto opacity-50" />
                  <h4 className="text-sm font-bold text-ink">No Matching Startups Found</h4>
                  <p className="text-xs text-muted-ink max-w-md mx-auto">
                    No approved startups currently match your strict criteria. Try broadening your sectors or venture stages, or explore the general directory.
                  </p>
                  <Link
                    href="/workspace/investor/opportunities"
                    className="inline-flex items-center text-xs font-semibold text-brand hover:underline mt-2"
                  >
                    Browse Opportunities Directory
                  </Link>
                </Card>
              )}

              {/* GLOBAL MISSING CRITERIA WARNING */}
              {!matching && globalMissingCriteria.length > 0 && recommendations !== null && (
                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Investor Criteria Incomplete:</strong> {globalMissingCriteria.join(" ")} Results may be broader than expected.
                  </span>
                </div>
              )}

              {/* POPULATED RESULTS LIST */}
              {!matching && !matchError && recommendations !== null && recommendations.length > 0 && (
                <div className="space-y-4">
                  {recommendations.map((rec, idx) => {
                    const tierColors = {
                      strong: "bg-emerald-50 text-emerald-800 border-emerald-200",
                      partial: "bg-amber-50 text-amber-800 border-amber-200",
                      insufficient_data: "bg-zinc-50 text-zinc-700 border-zinc-200",
                    }[rec.matchTier];

                    const tierLabel = {
                      strong: "Strong Match",
                      partial: "Partial Match",
                      insufficient_data: "Insufficient Data",
                    }[rec.matchTier];

                    return (
                      <Card key={rec.startupId} className="p-5 space-y-4 hover:border-brand/30 transition-all">
                        {/* Header: Rank, Score Badge, Tier, Name */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center size-7 rounded-full bg-brand/10 text-brand text-xs font-bold shrink-0">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-ink">{rec.startupName}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierColors}`}>
                                  {tierLabel}
                                </span>
                              </div>
                              <p className="text-xs text-muted-ink mt-0.5 line-clamp-1">{rec.tagline}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-lg font-black text-ink">{rec.matchScore}%</span>
                              <span className="block text-[10px] text-muted-ink uppercase font-semibold">Match Score</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleWatchlist(rec.startupId, Boolean(rec.isSaved))}
                              disabled={savingWatchlistId === rec.startupId}
                              className={`p-2 rounded-lg border transition-colors ${
                                rec.isSaved
                                  ? "bg-brand/10 border-brand text-brand"
                                  : "bg-card border-line text-muted-ink hover:text-ink hover:border-brand/30"
                              }`}
                              title={rec.isSaved ? "Saved in Watchlist" : "Save to Watchlist"}
                            >
                              <Bookmark className={`size-4 ${rec.isSaved ? "fill-brand" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Startup Context: Problem & Solution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-canvas/40 p-3 rounded-lg border border-line/60">
                          <div>
                            <span className="text-[10px] font-bold text-muted-ink uppercase tracking-wider block mb-0.5">Problem</span>
                            <p className="text-ink line-clamp-2">{rec.problem || "No problem statement provided."}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-muted-ink uppercase tracking-wider block mb-0.5">Solution</span>
                            <p className="text-ink line-clamp-2">{rec.solution || "No solution statement provided."}</p>
                          </div>
                        </div>

                        {/* Metadata Tags & Score Breakdown Chips */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="px-2 py-0.5 rounded bg-brand/10 text-brand text-[11px] font-semibold">
                            {rec.sector}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-canvas text-muted-ink border border-line text-[11px] uppercase font-semibold">
                            {rec.stage}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-canvas text-muted-ink border border-line text-[11px] font-semibold">
                            Readiness: {rec.readinessScore}/100
                          </span>

                          <div className="ml-auto flex items-center gap-2 text-[10px] font-medium text-muted-ink">
                            <span>Sector: {rec.scoreBreakdown?.sectorScore ?? rec.breakdown?.sector ?? 0}/35</span>
                            <span>•</span>
                            <span>Stage: {rec.scoreBreakdown?.stageScore ?? rec.breakdown?.stage ?? 0}/25</span>
                            <span>•</span>
                            <span>Thesis: {rec.scoreBreakdown?.thesisScore ?? rec.breakdown?.thesis ?? 0}/20</span>
                            <span>•</span>
                            <span>Readiness: {rec.scoreBreakdown?.readinessScore ?? rec.breakdown?.readiness ?? 0}/20</span>
                          </div>
                        </div>

                        {/* Evidence-Based Explanations */}
                        <div className="space-y-1.5 pt-2 border-t border-line/50">
                          <span className="text-[11px] font-bold text-ink block">Evaluation Evidence:</span>
                          <ul className="space-y-1">
                            {rec.reasons.map((r, rIdx) => (
                              <li key={rIdx} className="text-xs text-muted-ink flex items-start gap-1.5">
                                <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Startup Incomplete Data Warnings */}
                          {rec.missingCriteria && rec.missingCriteria.length > 0 && (
                            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                              <strong>Missing Profile Data:</strong> {rec.missingCriteria.join("; ")}
                            </div>
                          )}
                        </div>

                        {/* Footer Link to Startup Detail */}
                        <div className="pt-2 flex items-center justify-between border-t border-line text-xs">
                          <span className="text-muted-ink text-[11px]">
                            {rec.isSaved ? "Saved to your investor watchlist." : "Available in directory."}
                          </span>
                          <Link
                            href="/workspace/investor/opportunities"
                            className="inline-flex items-center font-semibold text-brand hover:underline"
                          >
                            Explore in Opportunities Directory
                          </Link>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
