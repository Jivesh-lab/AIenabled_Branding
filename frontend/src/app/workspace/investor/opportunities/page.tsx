"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  Search,
  Building2,
  Bookmark,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Lock,
  MessageSquare,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Startup {
  id: string;
  name: string;
  tagline: string;
  problem: string;
  solution: string;
  sector: string;
  stage: string;
  status: string;
  readinessScore: number;
  tags: string[];
  isSaved: boolean;
  interestLevel: string | null;
  pitchDeckAvailable: boolean;
  pitchVideoAvailable: boolean;
  tractionSummary: string | null;
}

export default function OpportunitiesPage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Filters
  const [query, setQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  // EOI / Meeting request modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStartup, setTargetStartup] = useState<Startup | null>(null);
  const [requestType, setRequestType] = useState<"expression_of_interest" | "meeting_request">("expression_of_interest");
  const [introMessage, setIntroMessage] = useState("");
  const [submittingIntro, setSubmittingIntro] = useState(false);

  useEffect(() => {
    fetchStartups();
  }, [selectedSector, selectedStage]);

  async function fetchStartups() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedSector !== "all") params.append("sector", selectedSector);
      if (selectedStage !== "all") params.append("stage", selectedStage);
      if (query.trim()) params.append("search", query.trim());

      const res = await fetch(`/api/investor/startups?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("Your account is pending review or inactive. Please contact support.");
        } else {
          setError("Failed to load approved startups directory.");
        }
        return;
      }

      const data = await res.json();
      setStartups(data.startups || []);
      setIsVerified(Boolean(data.isVerified));
    } catch {
      setError("Network error fetching startups.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleWatchlist(startup: Startup) {
    const isCurrentlySaved = startup.isSaved;
    try {
      if (isCurrentlySaved) {
        const res = await fetch(`/api/investor/watchlist/${startup.id}`, { method: "DELETE" });
        if (res.ok) {
          setStartups((prev) =>
            prev.map((s) => (s.id === startup.id ? { ...s, isSaved: false, interestLevel: null } : s))
          );
          toast.success("Removed from watchlist");
        } else {
          toast.error("Failed to remove from watchlist");
        }
      } else {
        const res = await fetch("/api/investor/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startupId: startup.id, interestLevel: "watching" }),
        });
        if (res.ok) {
          setStartups((prev) =>
            prev.map((s) => (s.id === startup.id ? { ...s, isSaved: true, interestLevel: "watching" } : s))
          );
          toast.success("Saved to watchlist");
        } else {
          toast.error("Failed to save to watchlist");
        }
      }
    } catch {
      toast.error("Network error updating watchlist");
    }
  }

  function openIntroModal(startup: Startup, type: "expression_of_interest" | "meeting_request") {
    if (!isVerified) {
      toast.error("Investor verification required to request introductions.");
      return;
    }
    setTargetStartup(startup);
    setRequestType(type);
    setIntroMessage("");
    setModalOpen(true);
  }

  async function submitIntroduction() {
    if (!targetStartup || introMessage.trim().length < 20) {
      toast.error("Message must be at least 20 characters.");
      return;
    }

    setSubmittingIntro(true);
    try {
      const res = await fetch("/api/investor/introductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId: targetStartup.id,
          type: requestType,
          message: introMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Introduction submitted for admin review.");
        setModalOpen(false);
      } else {
        toast.error(data.message || "Failed to submit request.");
      }
    } catch {
      toast.error("Network error submitting introduction.");
    } finally {
      setSubmittingIntro(false);
    }
  }

  const sectors = ["all", "AgriTech", "FinTech", "HealthTech", "CleanTech", "EdTech", "DeepTech", "AI/ML"];
  const stages = ["all", "idea", "concept", "prototype", "mvp", "growth"];

  const filtered = startups.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
  });

  return (
    <PageContainer
      title="Investment Opportunities"
      description="Curated directory of approved startups actively incubated at AAI–DBITIC."
    >
      <div className="space-y-6">
        {/* Verification Alert Banner if unverified */}
        {!isVerified && !loading && !error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
            <Lock className="size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Unverified Investor Account</p>
              <p className="text-amber-700 mt-0.5">
                You are viewing a sanitized public directory. Verified accredited investors receive full pitch materials and introduction capabilities.
              </p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-ink" />
            <input
              type="text"
              placeholder="Search by startup name, sector, or keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-card text-ink"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none"
            >
              <option value="all">All Sectors</option>
              {sectors.filter((s) => s !== "all").map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2 text-xs border border-line rounded-lg bg-card text-ink focus:outline-none"
            >
              <option value="all">All Stages</option>
              {stages.filter((s) => s !== "all").map((stg) => (
                <option key={stg} value={stg}>{stg.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-ink">
            <Loader2 className="size-6 animate-spin text-brand mb-2" />
            <p className="text-xs">Loading approved startups...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center p-6 border border-line rounded-xl bg-card">
            <AlertCircle className="size-8 text-danger mb-2" />
            <p className="text-sm font-semibold text-ink">{error}</p>
            <button
              onClick={fetchStartups}
              className="mt-3 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-line rounded-xl bg-card p-6">
            <Building2 className="size-10 text-muted-ink/40 mb-3" />
            <h3 className="text-sm font-semibold text-ink">No approved startups found</h3>
            <p className="text-xs text-muted-ink mt-1 max-w-sm">
              There are currently no approved startups matching your chosen criteria. Check back soon as new ventures are admitted.
            </p>
          </div>
        )}

        {/* Startup cards list */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((opp) => (
              <Card key={opp.id} className="overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-ink">{opp.name}</h3>
                        <StatusBadge label={opp.sector} tone="info" />
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-canvas border border-line text-muted-ink uppercase">
                          {opp.stage}
                        </span>
                        {opp.readinessScore > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles className="size-2.5" /> Score: {opp.readinessScore}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-ink/80 mb-2">{opp.tagline}</p>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {opp.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-canvas text-muted-ink border border-line">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleWatchlist(opp)}
                          title={opp.isSaved ? "Remove from Watchlist" : "Save to Watchlist"}
                          className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${
                            opp.isSaved
                              ? "bg-brand-gold/10 border-brand-gold/40 text-brand-gold-ink"
                              : "border-line text-muted-ink hover:border-brand/40"
                          }`}
                        >
                          <Bookmark className={`size-4 ${opp.isSaved ? "fill-current" : ""}`} />
                        </button>

                        <button
                          onClick={() => setExpanded(expanded === opp.id ? null : opp.id)}
                          className="size-8 rounded-lg flex items-center justify-center border border-line text-muted-ink hover:border-brand/40 hover:text-brand transition-colors"
                        >
                          <ChevronDown className={`size-4 transition-transform ${expanded === opp.id ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {expanded === opp.id && (
                  <div className="border-t border-line p-5 bg-canvas/40 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-ink mb-1">Problem Statement</p>
                        <p className="text-xs text-muted-ink leading-relaxed">{opp.problem}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-ink mb-1">Proposed Solution</p>
                        <p className="text-xs text-muted-ink leading-relaxed">{opp.solution}</p>
                      </div>
                    </div>

                    {isVerified && opp.tractionSummary && (
                      <div className="p-3 rounded-lg border border-line bg-card">
                        <p className="text-xs font-bold text-ink mb-1">Traction & Verified Progress</p>
                        <p className="text-xs text-muted-ink leading-relaxed">{opp.tractionSummary}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                      <button
                        onClick={() => openIntroModal(opp, "expression_of_interest")}
                        disabled={!isVerified}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isVerified
                            ? "bg-brand text-white hover:bg-brand-hover"
                            : "bg-muted text-muted-ink cursor-not-allowed border border-line"
                        }`}
                      >
                        {!isVerified && <Lock className="size-3" />}
                        Express Interest
                      </button>

                      <button
                        onClick={() => openIntroModal(opp, "meeting_request")}
                        disabled={!isVerified}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          isVerified
                            ? "border-line text-ink hover:border-brand/40 hover:text-brand"
                            : "border-line text-muted-ink cursor-not-allowed bg-canvas"
                        }`}
                      >
                        {!isVerified && <Lock className="size-3" />}
                        <MessageSquare className="size-3" /> Request Meeting
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Modal for Expression of Interest or Meeting Request */}
        {modalOpen && targetStartup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-card border border-line p-5 shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {requestType === "expression_of_interest" ? "Express Interest" : "Request Founder Meeting"}
                  </h3>
                  <p className="text-xs text-muted-ink mt-0.5">{targetStartup.name}</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-muted-ink hover:text-ink text-xs font-semibold"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-muted-ink bg-canvas/60 p-3 rounded-lg border border-line leading-relaxed">
                <Clock className="size-3.5 inline mr-1 text-brand-gold" />
                Requests are reviewed by the Incubation Centre admin team before forwarding to the founder.
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Message to Admin & Founders (minimum 20 characters)
                </label>
                <textarea
                  rows={4}
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  placeholder="Introduce yourself, mention your investment thesis, or specify your proposed meeting agenda..."
                  className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-card text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-muted-ink hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  onClick={submitIntroduction}
                  disabled={submittingIntro || introMessage.trim().length < 20}
                  className="px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover disabled:opacity-50"
                >
                  {submittingIntro ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
