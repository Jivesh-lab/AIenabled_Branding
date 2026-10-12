"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  Bookmark,
  Sparkles,
  Building2,
  Clock,
  Send,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
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
      setError("Failed to load dashboard data.");
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
      title="Investor Dashboard"
      description="Live deal flow metrics, watchlist overview, and introduction requests."
    >
      <div className="space-y-6">
        {/* Verification Status Banner */}
        {profile && (
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border ${
              isVerified
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-3">
              {isVerified ? (
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              ) : (
                <Lock className="size-5 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold">
                  {isVerified ? "Verified Accredited Investor" : "Account Verification Pending"}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {isVerified
                    ? "You have full access to pitch materials and direct intro request capabilities."
                    : "Browsing in sanitized directory mode. Introductions require admin accreditation."}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isVerified ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}
            >
              {isVerified ? "Verified" : "Unverified"}
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-ink">
            <Loader2 className="size-6 animate-spin text-brand mb-2" />
            <p className="text-xs">Loading investor dashboard...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="p-4 rounded-xl border border-line bg-card text-center">
            <AlertCircle className="size-6 text-danger mx-auto mb-2" />
            <p className="text-xs font-semibold text-ink">{error}</p>
          </div>
        )}

        {!loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs font-medium text-muted-ink">Approved Startups</p>
                <p className="text-2xl font-bold text-ink mt-1">{startupsCount}</p>
                <p className="text-[11px] text-muted-ink mt-0.5">Active directory listings</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-medium text-muted-ink">Saved Startups</p>
                <p className="text-2xl font-bold text-ink mt-1">{watchlistCount}</p>
                <p className="text-[11px] text-muted-ink mt-0.5">In your pitch queue</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-medium text-muted-ink">Pending Review Intros</p>
                <p className="text-2xl font-bold text-ink mt-1">{pendingIntros}</p>
                <p className="text-[11px] text-muted-ink mt-0.5">Awaiting admin review</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-medium text-muted-ink">Forwarded to Founders</p>
                <p className="text-2xl font-bold text-ink mt-1">{forwardedIntros}</p>
                <p className="text-[11px] text-muted-ink mt-0.5">Introductions in flight</p>
              </Card>
            </div>

            {/* Quick Actions & Recent Introductions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Introduction tracking */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">Recent Introduction Requests</h3>
                  <Link
                    href="/workspace/investor/opportunities"
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Browse Directory →
                  </Link>
                </div>

                {introductions.length === 0 ? (
                  <Card className="p-6 text-center border-dashed">
                    <Send className="size-8 text-muted-ink/40 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-ink">No introduction requests submitted</p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      When you express interest or request a meeting with an approved startup, status updates appear here.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2.5">
                    {introductions.slice(0, 5).map((intro) => (
                      <Card key={intro.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-ink">{intro.startupName}</h4>
                            <span className="text-[10px] text-muted-ink uppercase">
                              {intro.type.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-ink mt-0.5">
                            Submitted on {new Date(intro.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge
                          label={
                            intro.status === "pending_admin_review"
                              ? "Pending Review"
                              : intro.status === "forwarded_to_founder"
                              ? "Forwarded"
                              : intro.status
                          }
                          tone={
                            intro.status === "forwarded_to_founder"
                              ? "success"
                              : intro.status === "pending_admin_review"
                              ? "progress"
                              : "neutral"
                          }
                        />
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation Links */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink">Investor Workflows</h3>
                <Card className="p-4 space-y-3">
                  <Link
                    href="/workspace/investor/opportunities"
                    className="block p-3 rounded-lg border border-line bg-canvas hover:border-brand/40 transition-colors"
                  >
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-brand" /> Approved Startups
                    </p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      Explore active student ventures and filter by industry sector.
                    </p>
                  </Link>

                  <Link
                    href="/workspace/investor/pitch-queue"
                    className="block p-3 rounded-lg border border-line bg-canvas hover:border-brand/40 transition-colors"
                  >
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Bookmark className="size-3.5 text-brand-gold-ink" /> Saved Startups
                    </p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      Manage bookmarked companies and add private diligence notes.
                    </p>
                  </Link>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
