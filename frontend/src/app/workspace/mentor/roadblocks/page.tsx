"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { AlertCircle, CheckCircle2, Loader2, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";

interface RoadblockItem {
  id: string;
  projectTitle: string;
  leadStudent: string;
  stage: string;
  health: string;
  issue: string;
  overdueCount: number;
}

export default function StartupRoadblocksPage() {
  const [roadblocks, setRoadblocks] = useState<RoadblockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoadblocks() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/projects");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const flagged: RoadblockItem[] = json.data
              .filter(
                (p: any) =>
                  p.health === "At Risk" ||
                  p.health === "Needs Attention" ||
                  (p.overdueMilestonesCount && p.overdueMilestonesCount > 0)
              )
              .map((p: any) => ({
                id: p.id || p._id,
                projectTitle: p.title || "Project",
                leadStudent: p.leadStudent || "Student Founder",
                stage: p.stage || `TRL ${p.trl || 1}`,
                health: p.health || "Needs Attention",
                issue:
                  p.overdueMilestonesCount > 0
                    ? `${p.overdueMilestonesCount} overdue milestone(s) require mentor intervention.`
                    : "Technical or validation roadmap bottleneck flagged during periodic review.",
                overdueCount: p.overdueMilestonesCount || 0,
              }));
            setRoadblocks(flagged);
          }
        }
      } catch {
        // Silently catch
      } finally {
        setLoading(false);
      }
    }
    fetchRoadblocks();
  }, []);

  return (
    <PageContainer
      title="Startup Roadblocks & Escalations"
      description="Monitor critical blockers, overdue milestones, and operational bottlenecks across advised projects."
    >
      <div className="space-y-6">
        {/* KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-amber-200/70 bg-amber-50/20">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  Active Roadblocks
                </p>
                <p className="text-2xl font-bold text-ink">{loading ? "—" : roadblocks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-red-200/70 bg-red-50/20">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <ShieldAlert className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  At-Risk Projects
                </p>
                <p className="text-2xl font-bold text-ink">
                  {loading ? "—" : roadblocks.filter((r) => r.health === "At Risk").length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-emerald-200/70 bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  Cohort Health Status
                </p>
                <p className="text-sm font-bold text-ink">
                  {loading
                    ? "Evaluating..."
                    : roadblocks.length === 0
                    ? "100% On Track"
                    : "Action Required"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Roadblocks List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-ink">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-xs">Analyzing cohort milestones and blockers...</span>
            </div>
          ) : roadblocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-line rounded-xl bg-card">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-ink">No active roadblocks reported</h3>
              <p className="text-xs text-muted-ink mt-1 max-w-md">
                Great news! All student innovator teams are progressing on schedule with no overdue milestones or escalation flags.
              </p>
              <Link
                href="/workspace/mentor/mentees"
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
              >
                View Supervised Mentees
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            roadblocks.map((rb) => (
              <Card key={rb.id} className="p-5 border-amber-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        {rb.health}
                      </span>
                      <span className="text-xs text-muted-ink font-medium">Stage: {rb.stage}</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink">{rb.projectTitle}</h3>
                    <p className="text-xs text-muted-ink">Lead Innovator: {rb.leadStudent}</p>
                    <p className="text-xs text-amber-900 font-medium mt-1">{rb.issue}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href="/workspace/mentor/schedule"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                    >
                      Schedule Support Session
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
