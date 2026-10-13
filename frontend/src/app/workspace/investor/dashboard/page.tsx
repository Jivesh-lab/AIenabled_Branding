"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { StatusBadge } from "@/components/shared/Surface";
import {
  Bookmark,
  Building2,
  Send,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
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

interface IntroductionItem {
  id: string;
  startupName: string;
  type: string;
  status: string;
  createdAt: string;
}

export default function InvestorDashboardPage() {
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [startupsCount, setStartupsCount] = useState<number>(0);
  const [watchlistCount, setWatchlistCount] = useState<number>(0);
  const [introductions, setIntroductions] = useState<IntroductionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDashboardData() {
    setError(null);
    try {
      const [profileRes, startupsRes, watchlistRes, introsRes] = await Promise.all([
        fetch("/api/investor/profile"),
        fetch("/api/investor/startups"),
        fetch("/api/investor/watchlist"),
        fetch("/api/investor/introductions"),
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
  const pendingIntros = introductions.filter((i) => i.status === "pending_admin_review").length;
  const forwardedIntros = introductions.filter((i) => i.status === "forwarded_to_founder").length;

  return (
    <PageContainer
      title="Deal Flow & Venture Capital Desk"
      description="Track verified startup cohorts, diligence queues, and founder introduction requests across DBIT Innovation Centre."
    >
      <div className="space-y-6">
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
                    ? "Full access granted to technical pitch decks, founder dossiers, and direct introduction requests."
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
          </div>
        )}

        {!loading && (
          <>
            {/* Deal Flow Metrics Strip */}
            <div className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
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
                <span className="text-[13px] font-medium text-muted-ink">Intros in Review</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-amber-800 tabular-nums">{pendingIntros}</p>
                <p className="text-[12px] text-amber-700 mt-0.5">Awaiting centre vetting</p>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[13px] font-medium text-muted-ink">Forwarded to Founders</span>
                <p className="mt-2 text-[26px] font-semibold tracking-tight text-emerald-800 tabular-nums">{forwardedIntros}</p>
                <p className="text-[12px] text-emerald-700 mt-0.5">Active introductions</p>
              </div>
            </div>

            {/* Asymmetric Split: Intros vs Directory Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Introduction tracking ledger */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-ink">Introduction Requests</h3>
                  <Link
                    href="/workspace/investor/opportunities"
                    className="text-[13px] font-medium text-brand hover:underline"
                  >
                    Browse venture directory
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
                  <div className="divide-y divide-line rounded-lg border border-line bg-white">
                    {introductions.slice(0, 5).map((intro) => (
                      <div key={intro.id} className="p-4 flex items-center justify-between transition-colors hover:bg-[#FAFBFB]">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-[14px] font-semibold text-ink">{intro.startupName}</h4>
                            <span className="text-[12px] text-muted-ink capitalize">
                              ({intro.type.replace("_", " ")})
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-ink mt-0.5">
                            Submitted on {new Date(intro.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge
                          label={
                            intro.status === "pending_admin_review"
                              ? "Awaiting review"
                              : intro.status === "forwarded_to_founder"
                              ? "Forwarded to founder"
                              : intro.status
                          }
                          tone={
                            intro.status === "forwarded_to_founder"
                              ? "success"
                              : intro.status === "pending_admin_review"
                              ? "attention"
                              : "neutral"
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diligence Links */}
              <div className="space-y-3">
                <h3 className="text-[15px] font-semibold text-ink">Partner Workflows</h3>
                <div className="rounded-lg border border-line bg-white p-4 space-y-3">
                  <Link
                    href="/workspace/investor/opportunities"
                    className="block p-3 rounded-md border border-line bg-[#FAFBFB] hover:border-brand/40 hover:bg-white transition-colors"
                  >
                    <p className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-brand" /> Venture Directory
                    </p>
                    <p className="text-[12px] text-muted-ink mt-0.5">
                      Filter active student spin-outs by domain, TRL stage, and funding round.
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
                      Access saved pitch decks, video teasers, and private investor notes.
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
