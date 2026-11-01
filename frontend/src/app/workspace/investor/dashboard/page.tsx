"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import Introductions from "@/components/agentic/Introductions";
import AgentActivityFeed from "@/components/agentic/AgentActivityFeed";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  Bookmark,
  Building2,
  Send,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Video,
  Sparkles,
  ArrowRight,
  Briefcase,
  TrendingUp,
  Calendar,
  ExternalLink,
} from "lucide-react";

interface InvestorProfile {
  id: string;
  name: string;
  email: string;
  status: string;
  isInvestorVerified: boolean;
  details: {
    firmName?: string;
    firmType?: string;
    investmentThesis?: string;
  };
}

interface ScheduledMeetingInfo {
  date: string | null;
  time: string | null;
  timeZone?: string;
  meetingLink: string | null;
  scheduledByAgent?: boolean;
}

interface IntroductionItem {
  id: string;
  startupId: string;
  startupName: string;
  sector?: string;
  stage?: string;
  founderName?: string;
  founderEmail?: string | null;
  type: string;
  message?: string;
  status: string;
  scheduledMeeting?: ScheduledMeetingInfo | null;
  createdAt: string;
}

interface PortfolioStats {
  totalInvested: number;
  totalValuation: number;
  avgEquity: number;
  activeVentures: number;
  totalHoldings: number;
}

export default function InvestorDashboardPage() {
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [startupsCount, setStartupsCount] = useState<number>(0);
  const [watchlistCount, setWatchlistCount] = useState<number>(0);
  const [introductions, setIntroductions] = useState<IntroductionItem[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDashboardData() {
    setError(null);
    try {
      const [profileRes, startupsRes, watchlistRes, introsRes, portfolioRes] = await Promise.all([
        fetch("/api/investor/profile"),
        fetch("/api/investor/startups"),
        fetch("/api/investor/watchlist"),
        fetch("/api/investor/introductions"),
        fetch("/api/investor/portfolio"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);
      }
      if (startupsRes.ok) {
        const data = await startupsRes.json();
        setStartupsCount((data.startups || []).length);
      }
      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        setWatchlistCount((data.watchlist || []).length);
      }
      if (introsRes.ok) {
        const data = await introsRes.json();
        setIntroductions(data.introductions || []);
      }
      if (portfolioRes.ok) {
        const data = await portfolioRes.json();
        if (data.stats) {
          setPortfolioStats(data.stats);
        }
      }
    } catch {
      setError("Unable to load partner dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) {
        await fetchDashboardData();
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const isVerified = Boolean(profile?.isInvestorVerified);
  const scheduledIntros = introductions.filter((i) => i.status === "scheduled" && i.scheduledMeeting?.meetingLink);
  const pendingIntros = introductions.filter((i) => i.status === "pending_admin_review").length;
  const forwardedIntros = introductions.filter((i) => i.status === "forwarded_to_founder").length;

  return (
    <PageContainer
      title="Deal Flow & Venture Capital Desk"
      description="Track verified startup cohorts, diligence queues, founder introduction requests, and portfolio governance across DBIT Innovation Centre."
    >
      <div className="space-y-6">
        <Introductions role="investor" title="Matches and introductions" />
        <AgentActivityFeed title="Introduction activity" limit={8} emptyMessage="When the Investor Agent introduces a startup to you, and when meetings are arranged, it shows here." />
        {/* Verification Status Banner */}
        {profile && (
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-lg border ${
              isVerified
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <div className="flex items-start gap-3">
              {isVerified ? (
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Lock className="size-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-[14px] font-semibold">
                  {isVerified ? "Verified Industry Partner" : "Account Accreditation Pending"}
                </p>
                <p className="text-[13px] opacity-85 mt-0.5 max-w-2xl">
                  {isVerified
                    ? "Full access granted to technical pitch decks, founder dossiers, AI matchmaking, and direct introduction requests."
                    : "Browsing in directory preview mode. Direct founder introductions require centre accreditation."}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded text-[12px] font-medium shrink-0 ${
                isVerified ? "bg-emerald-600 text-white" : "bg-amber-700 text-white"
              }`}
            >
              {isVerified ? "Verified partner" : "Verification in progress"}
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-ink">
            <Loader2 className="size-6 animate-spin text-brand mb-2" />
            <p className="text-[13px]">Loading deal flow metrics...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="p-4 rounded-lg border border-line bg-white text-center">
            <AlertCircle className="size-5 text-danger mx-auto mb-2" />
            <p className="text-[13px] font-medium text-ink">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-3 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && (
          <>
            {/* Deal Flow Metrics Strip */}
            <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0 shadow-xs">
              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">Approved Startups</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">{startupsCount}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">Active directory listings</p>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">In Pitch Queue</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink tabular-nums">{watchlistCount}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">Bookmarked for diligence</p>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">Active Intros & Calls</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-brand tabular-nums">
                  {scheduledIntros.length + forwardedIntros}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {scheduledIntros.length} scheduled, {pendingIntros} in review
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">Portfolio Holdings</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-emerald-800 tabular-nums">
                  {portfolioStats ? portfolioStats.activeVentures : 0}
                </p>
                <p className="text-[12px] text-emerald-700 mt-0.5">
                  {portfolioStats && portfolioStats.totalInvested > 0
                    ? `₹${(portfolioStats.totalInvested / 100000).toFixed(1)}L Deployed`
                    : "Ready to deploy"}
                </p>
              </div>
            </div>

            {/* Scheduled AI Founder Call Notification Box if present */}
            {scheduledIntros.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="size-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Video className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                          AI-Coordinated Founder Call
                        </span>
                        <span className="text-xs text-muted-ink">
                          {scheduledIntros[0].scheduledMeeting?.date} at {scheduledIntros[0].scheduledMeeting?.time}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-ink mt-1">
                        {scheduledIntros[0].startupName} &mdash; Founder Introduction Call
                      </h4>
                      <p className="text-xs text-muted-ink mt-0.5">
                        Founder: <span className="text-ink font-semibold">{scheduledIntros[0].founderName || "Lead Student Founder"}</span>
                        {" "}&bull; Technical briefing and seed co-investment exploration.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <a
                      href={scheduledIntros[0].scheduledMeeting?.meetingLink || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                    >
                      <Video className="size-4" /> Join Video Room
                    </a>
                    <Link
                      href="/workspace/investor/pitch-queue"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-white text-xs font-semibold text-ink hover:border-brand/40 hover:text-brand transition-colors"
                    >
                      <Bookmark className="size-3.5" /> Diligence Notes
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Asymmetric Split: Intros vs Directory Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Introduction tracking ledger */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-ink">Introduction Requests & Diligence Pipeline</h3>
                  <Link
                    href="/workspace/investor/opportunities"
                    className="text-[13px] font-medium text-brand hover:underline flex items-center gap-1"
                  >
                    Browse directory <ArrowRight className="size-3" />
                  </Link>
                </div>

                {introductions.length === 0 ? (
                  <div className="p-8 text-center rounded-lg border border-dashed border-line bg-white">
                    <Send className="size-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-[14px] font-semibold text-ink">No introduction requests submitted</p>
                    <p className="text-[13px] text-muted-ink mt-1 max-w-md mx-auto">
                      Explore active cohort startups to request direct founder introductions or pitch deck access.
                    </p>
                    <Link
                      href="/workspace/investor/opportunities"
                      className="mt-4 inline-flex items-center rounded-md bg-brand px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
                    >
                      Explore Startups
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-line rounded-lg border border-line bg-white shadow-xs overflow-hidden">
                    {introductions.slice(0, 6).map((intro) => (
                      <div key={intro.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-[#FAFBFB]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-[14px] font-semibold text-ink">{intro.startupName}</h4>
                            {intro.sector && (
                              <span className="text-[11px] font-medium text-muted-ink bg-canvas px-2 py-0.5 rounded border border-line">
                                {intro.sector}
                              </span>
                            )}
                            <span className="text-[12px] text-muted-ink capitalize">
                              ({intro.type.replace(/_/g, " ")})
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-ink mt-1 line-clamp-1">
                            {intro.founderName ? `Founder: ${intro.founderName} • ` : ""}
                            {intro.message || `Submitted on ${new Date(intro.createdAt).toLocaleDateString()}`}
                          </p>
                          {intro.status === "scheduled" && intro.scheduledMeeting && (
                            <p className="text-[11px] font-medium text-blue-700 mt-1 flex items-center gap-1">
                              <Calendar className="size-3" /> Meeting: {intro.scheduledMeeting.date} ({intro.scheduledMeeting.time})
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {intro.status === "scheduled" && intro.scheduledMeeting?.meetingLink && (
                            <a
                              href={intro.scheduledMeeting.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Video className="size-3" /> Join Call
                            </a>
                          )}

                          <StatusBadge
                            label={
                              intro.status === "scheduled"
                                ? "Call Scheduled"
                                : intro.status === "forwarded_to_founder"
                                ? "Forwarded to Founder"
                                : intro.status === "pending_admin_review"
                                ? "Centre Review"
                                : intro.status === "declined"
                                ? "Declined"
                                : intro.status
                            }
                            tone={
                              intro.status === "scheduled" || intro.status === "forwarded_to_founder"
                                ? "success"
                                : intro.status === "pending_admin_review"
                                ? "attention"
                                : "neutral"
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diligence Links & Workflows */}
              <div className="space-y-3">
                <h3 className="text-[15px] font-semibold text-ink">Partner Workflows</h3>
                <div className="rounded-lg border border-line bg-white p-4 space-y-3 shadow-xs">
                  <Link
                    href="/workspace/investor/opportunities"
                    className="block p-3 rounded-md border border-line bg-[#FAFBFB] hover:border-brand/40 hover:bg-white transition-colors"
                  >
                    <p className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-brand" /> Venture Directory
                    </p>
                    <p className="text-[12px] text-muted-ink mt-0.5">
                      Filter active student spin-outs by domain, TRL stage, and pitch deck access.
                    </p>
                  </Link>

                  <Link
                    href="/workspace/investor/pitch-queue"
                    className="block p-3 rounded-md border border-line bg-[#FAFBFB] hover:border-brand/40 hover:bg-white transition-colors"
                  >
                    <p className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                      <Bookmark className="size-3.5 text-amber-800" /> Diligence Pitch Queue
                    </p>
                    <p className="text-[12px] text-muted-ink mt-0.5">
                      Access saved pitch decks, video teasers, and private investor diligence notes.
                    </p>
                  </Link>

                  <Link
                    href="/workspace/investor/matchmaking"
                    className="block p-3 rounded-md border border-line bg-[#FAFBFB] hover:border-brand/40 hover:bg-white transition-colors"
                  >
                    <p className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-indigo-600" /> AI Matchmaking Desk
                    </p>
                    <p className="text-[12px] text-muted-ink mt-0.5">
                      Calibrate your investment thesis and trigger deterministic AI venture recommendations.
                    </p>
                  </Link>

                  <Link
                    href="/workspace/investor/portfolio"
                    className="block p-3 rounded-md border border-line bg-[#FAFBFB] hover:border-brand/40 hover:bg-white transition-colors"
                  >
                    <p className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                      <Briefcase className="size-3.5 text-emerald-700" /> Portfolio & Traction Desk
                    </p>
                    <p className="text-[12px] text-muted-ink mt-0.5">
                      Track cap table equity, capital deployments, and live monthly operational telemetry.
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
