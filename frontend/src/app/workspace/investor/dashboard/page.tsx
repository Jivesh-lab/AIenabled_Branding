"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import Introductions from "@/components/agentic/Introductions";
import AgentActivityFeed from "@/components/agentic/AgentActivityFeed";
import { Card, KpiCard, SectionHeading, SectionDivider, StatusBadge } from "@/components/shared/Surface";
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
  TrendingUp,
  Handshake,
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
        {profile && (
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 rounded-2xl border ${isVerified ? "border-brand-cyan/30 bg-brand-cyan-soft text-brand-cyan-ink shadow-sm" : "border-brand-gold/30 bg-brand-gold-soft text-brand-gold-ink shadow-sm"}`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isVerified ? "bg-brand-cyan text-white" : "bg-brand-gold text-white"}`}>
                {isVerified ? <CheckCircle2 className="size-5" /> : <Lock className="size-5" />}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.04em] text-ink">
                  {isVerified ? "Verified Accredited Investor" : "Account Verification Pending"}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-ink">
                  {isVerified
                    ? "You have full access to pitch materials and direct intro request capabilities."
                    : "Browsing in sanitized directory mode. Introductions require admin accreditation."}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isVerified ? "bg-brand-cyan text-white" : "bg-brand-gold text-white"}`}>
              {isVerified ? "Verified" : "Unverified"}
            </span>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-ink">
            <Loader2 className="size-6 animate-spin text-brand mb-2" />
            <p className="text-xs">Loading investor dashboard...</p>
          </div>
        )}

        {error && (
          <Card variant="elevated" className="p-8 text-center">
            <AlertCircle className="size-6 text-brand mx-auto mb-3" />
            <p className="text-xs font-semibold text-ink">{error}</p>
          </Card>
        )}

        {!loading && !error && (
          <>
            <SectionDivider label="At a Glance" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
              <KpiCard label="Approved Startups" value={startupsCount} sub="Active directory listings" icon={Building2} accent="brand" />
              <KpiCard label="In Pitch Queue" value={watchlistCount} sub="Bookmarked for diligence" icon={Bookmark} accent="brand-gold" />
              <KpiCard label="Active Intros" value={forwardedIntros} sub={`${forwardedIntros} forwarded to founder`} icon={Send} accent="brand-cyan" />
              <KpiCard label="Pending Review" value={pendingIntros} sub={`${pendingIntros} awaiting admin`} icon={Clock} accent="brand" />
            </div>

            <SectionDivider label="Introductions & Activity" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <SectionHeading title="Recent Introduction Requests" kicker="Introductions" action={{ label: "Browse Directory", href: "/workspace/investor/opportunities" }} />

                {introductions.length === 0 ? (
                  <Card variant="subtle" className="p-8 text-center">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 mx-auto mb-4">
                      <Send className="size-6 text-brand" />
                    </div>
                    <h3 className="text-[16px] font-bold text-ink">No introduction requests submitted</h3>
                    <p className="mt-2 text-[12px] text-muted-ink max-w-xs mx-auto">
                      When you express interest or request a meeting with an approved startup, status updates appear here.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {introductions.slice(0, 5).map((intro) => (
                      <Card key={intro.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
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

              <div className="space-y-3">
                <SectionHeading title="Investor Workflows" kicker="Workflows" />
                <Card variant="elevated" className="p-4 space-y-3">
                  <Link
                    href="/workspace/investor/opportunities"
                    className="block p-3 rounded-xl border border-line bg-white hover:border-brand/40 transition-all duration-200 group"
                  >
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5 group-hover:text-brand transition-colors">
                      <Building2 className="size-3.5 text-brand group-hover:text-brand-deep" /> Approved Startups
                    </p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      Explore active researcher ventures and filter by industry sector.
                    </p>
                  </Link>

                  <Link
                    href="/workspace/investor/pitch-queue"
                    className="block p-3 rounded-xl border border-line bg-white hover:border-brand/40 transition-all duration-200 group"
                  >
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5 group-hover:text-brand transition-colors">
                      <Bookmark className="size-3.5 text-brand-gold-ink group-hover:text-brand-deep transition-colors" /> Saved Startups
                    </p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      Manage bookmarked companies and add private diligence notes.
                    </p>
                  </Link>

                  <Link
                    href="/workspace/investor/matchmaking"
                    className="block p-3 rounded-xl border border-line bg-white hover:border-brand/40 transition-all duration-200 group"
                  >
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5 group-hover:text-brand transition-colors">
                      <Sparkles className="size-3.5 text-purple-600 group-hover:text-brand-deep transition-colors" /> AI Matchmaking Desk
                    </p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      Calibrate your investment thesis and trigger deterministic AI venture recommendations.
                    </p>
                  </Link>

                  <Link
                    href="/workspace/investor/portfolio"
                    className="block p-3 rounded-xl border border-line bg-white hover:border-brand/40 transition-all duration-200 group"
                  >
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5 group-hover:text-brand transition-colors">
                      <TrendingUp className="size-3.5 text-emerald-600 group-hover:text-brand-deep transition-colors" /> Portfolio Ventures
                    </p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      Track performance, equity holdings, and progress updates for committed startups.
                    </p>
                  </Link>
                </Card>
              </div>
            </div>

            <SectionDivider label="Agent Activity" />
            <AgentActivityFeed title="Introduction activity" limit={8} emptyMessage="When the Investor Agent introduces a startup to you, and when meetings are arranged, it shows here." />

            <SectionDivider label="Matches & Introductions" />
            <Introductions role="investor" title="Matches and introductions" />
          </>
        )}
      </div>
    </PageContainer>
  );
}
