"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  AlertTriangle,
  Clock,
  Building,
  RefreshCw,
  Search,
  Bell,
  CheckCircle,
  FileText,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import {
  fetchAdminMentorMatchingOverview,
  triggerAdminMentorMatchingSweep,
  sendCoordinatorReminder,
  AdminMentorMatchingOverview,
} from "@/services/adminAgentService";

export default function AdminMentorMatchingDashboard() {
  const [data, setData] = useState<AdminMentorMatchingOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sweeping, setSweeping] = useState<boolean>(false);
  const [remindingRunId, setRemindingRunId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRun, setSelectedRun] = useState<AdminMentorMatchingOverview["recentRuns"][number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const overview = await fetchAdminMentorMatchingOverview();
      setData(overview);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load admin mentor matching overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSweep = async () => {
    try {
      setSweeping(true);
      setError(null);
      const res = await triggerAdminMentorMatchingSweep();
      setSuccessMsg(`Center-wide matching sweep triggered successfully for ${res.triggeredCount} startups.`);
      await loadData();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Sweep failed");
    } finally {
      setSweeping(false);
    }
  };

  const handleRemindCoordinator = async (runId: string, coordinatorName?: string) => {
    try {
      setRemindingRunId(runId);
      const res = await sendCoordinatorReminder(runId, coordinatorName);
      setSuccessMsg(res.message);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to send reminder");
    } finally {
      setRemindingRunId(null);
    }
  };

  const filteredRuns = (data?.recentRuns || []).filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.projectTitle?.toLowerCase().includes(q) ||
      r.domain?.toLowerCase().includes(q) ||
      r.coordinatorDecision?.decidedByName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-ink">
            <span>Administration</span>
            <span>/</span>
            <span className="text-brand">Center-Wide Advisory</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Mentor Matching Oversight
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-ink">
            Program-wide tracking of mentor coverage, coordinator review velocity, and advisory capacity distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 text-muted-ink ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleSweep}
            disabled={sweeping}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover disabled:opacity-50"
          >
            <SlidersHorizontal className={`size-3.5 ${sweeping ? "animate-spin" : ""}`} />
            {sweeping ? "Running Sweep..." : "Run Portfolio Sweep"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Unified Enterprise Metrics Strip */}
      <div className="grid grid-cols-2 divide-y divide-line rounded-xl border border-line bg-white shadow-2xs sm:grid-cols-3 lg:grid-cols-6 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Total Startups</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-ink tabular-nums">{data?.totalEligible ?? "..."}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Eligible for advisory</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Allocated</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-ink tabular-nums">{data?.allocatedCount ?? "..."}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Active pairings</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Without Mentors</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">{data?.withoutMentors ?? "..."}</span>
            {(data?.withoutMentors ?? 0) > 0 && (
              <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                Gap
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Coverage deficit</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Pending Decisions</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {data?.pendingCoordinatorDecisionsCount ?? "..."}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Awaiting coordinator review</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Coverage Rate</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-brand tabular-nums">
            {data ? `${data.allocationCoverageRate}%` : "..."}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Target benchmark: 80%</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Conflict Alerts</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {data?.unresolvedConflicts?.length ?? "0"}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Flagged candidate runs</div>
        </div>
      </div>

      {/* Two Column Grid: Coordinator Velocity & Mentor Bandwidth */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coordinator Review Velocity */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Coordinator Review Velocity
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Faculty assignment turnaround & pending decisions</p>
          </div>

          <div className="mt-3 divide-y divide-line">
            {(data?.coordinatorActivity || []).length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-ink">No coordinator activity recorded.</p>
            ) : (
              (data?.coordinatorActivity || []).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <h3 className="font-semibold text-ink">{c.coordinatorName}</h3>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-ink">
                      <span>{c.assignedStartups} Assigned</span>
                      <span>•</span>
                      <span>{c.allocatedMentors} Mentors Allocated</span>
                    </div>
                  </div>
                  <div>
                    {c.pendingDecisions > 0 ? (
                      <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {c.pendingDecisions} Pending Review
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        All Caught Up
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mentor Capacity Distribution */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Mentor Domain Distribution
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Startups with mentors vs pending coverage by domain</p>
          </div>

          <div className="mt-3 divide-y divide-line">
            {(data?.mentorCapacityDistribution || []).length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-ink">No domain distribution data available.</p>
            ) : (
              (data?.mentorCapacityDistribution || []).slice(0, 5).map((m, idx) => {
                const coveragePercent = m.totalStartups > 0 ? Math.round((m.withMentors / m.totalStartups) * 100) : 0;
                return (
                  <div key={idx} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{m.domain}</span>
                      <span className="text-[11px] text-muted-ink">
                        {m.withMentors} / {m.totalStartups} startups matched ({coveragePercent}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-300"
                        style={{ width: `${Math.min(coveragePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Center Execution History */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Center-Wide Matching Executions
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Audit trail of algorithmic evaluations and coordinator approvals</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
            <input
              type="text"
              placeholder="Search runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-muted-ink focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 divide-y divide-line">
          {filteredRuns.slice(0, 8).map((r) => (
            <div key={r.id} className="flex flex-col gap-2 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-500">{r.id.slice(-8)}</span>
                  <span className="font-semibold text-ink">{r.projectTitle}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{r.domain}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                      r.coordinatorDecision?.status === "approved"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : r.coordinatorDecision?.status === "rejected"
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {r.coordinatorDecision?.status || "pending"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-ink">
                  Top Recommended: <strong className="text-ink">{r.topRecommendationName || "N/A"}</strong> ({r.topMatchScore}%)
                  {r.coordinatorDecision?.decidedByName && (
                    <span> • Decided by: {r.coordinatorDecision.decidedByName}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-ink tabular-nums">
                  {new Date(r.completedAt).toLocaleDateString()}
                </span>
                {r.coordinatorDecision?.status === "pending" && (
                  <button
                    onClick={() => handleRemindCoordinator(r.id, r.coordinatorDecision?.decidedByName)}
                    disabled={remindingRunId === r.id}
                    className="inline-flex items-center gap-1 rounded border border-line bg-white px-2 py-1 text-[11px] text-muted-ink hover:text-ink hover:bg-slate-50"
                  >
                    <Bell className="size-3" />
                    {remindingRunId === r.id ? "Sending..." : "Remind"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredRuns.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-ink">No matching runs match the query.</div>
          )}
        </div>
      </div>
    </div>
  );
}
