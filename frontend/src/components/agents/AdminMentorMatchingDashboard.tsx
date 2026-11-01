"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Sparkles,
  AlertTriangle,
  Clock,
  Building,
  RefreshCw,
  Search,
  Bell,
  CheckCircle,
  FileText,
  UserCheck,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
              Admin Management Portal
            </span>
            <span className="text-xs text-muted-ink">Center-Wide Portfolio Oversight</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            AI Mentor-Matching Oversight Hub
          </h1>
          <p className="mt-1 text-sm text-muted-ink">
            Monitor center-wide mentor allocations, coordinator review velocity, and domain capacity distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:bg-canvas disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleSweep}
            disabled={sweeping}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-brand-hover active:bg-brand-active disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${sweeping ? "animate-spin" : ""}`} />
            {sweeping ? "Running Sweep..." : "Trigger Center Sweep"}
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Total Startups</p>
          <p className="mt-1 text-2xl font-bold text-ink">{data?.totalEligible ?? "..."}</p>
          <p className="mt-1 text-[11px] text-muted-ink">Eligible for matching</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Allocated Mentors</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{data?.allocatedCount ?? "..."}</p>
          <p className="mt-1 text-[11px] text-emerald-700">Active allocations</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Without Mentors</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{data?.withoutMentors ?? "..."}</p>
          <p className="mt-1 text-[11px] text-amber-700">Coverage gap</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Pending Decisions</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {data?.pendingCoordinatorDecisionsCount ?? "..."}
          </p>
          <p className="mt-1 text-[11px] text-indigo-700">Needs coordinator review</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Coverage Rate</p>
          <p className="mt-1 text-2xl font-bold text-brand">
            {data ? `${data.allocationCoverageRate}%` : "..."}
          </p>
          <p className="mt-1 text-[11px] text-muted-ink">Center coverage target: 80%</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Conflict Alerts</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">
            {data?.unresolvedConflicts?.length ?? "0"}
          </p>
          <p className="mt-1 text-[11px] text-rose-700">Flagged runs</p>
        </div>
      </div>

      {/* TWO COLUMN OVERVIEW: COORDINATORS & MENTOR CAPACITY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* COORDINATOR VELOCITY & ACCOUNTABILITY */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Coordinator Allocation Review Velocity</h2>
              <p className="text-xs text-muted-ink">Tracking faculty coordinators with assigned startups & pending decisions</p>
            </div>
            <UserCheck className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-4 divide-y divide-line">
            {(data?.coordinatorActivity || []).length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-ink">No coordinator activity records available.</p>
            ) : (
              (data?.coordinatorActivity || []).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{c.coordinatorName}</p>
                    <p className="text-xs text-muted-ink">
                      {c.assignedStartups} assigned startups · {c.allocatedMentors} allocated
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.pendingDecisions > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        {c.pendingDecisions} pending review
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        All reviewed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DOMAIN CAPACITY DISTRIBUTION */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Mentor Capacity Distribution by Domain</h2>
              <p className="text-xs text-muted-ink">Startup allocation coverage across incubation sectors</p>
            </div>
            <Building className="h-5 w-5 text-indigo-600" />
          </div>

          <div className="mt-4 space-y-3">
            {(data?.mentorCapacityDistribution || []).map((d, idx) => {
              const pct = d.totalStartups > 0 ? Math.round((d.withMentors / d.totalStartups) * 100) : 0;
              return (
                <div key={idx} className="rounded-lg border border-line p-3 bg-canvas/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">{d.domain}</span>
                    <span className="text-muted-ink">
                      {d.withMentors} of {d.totalStartups} startups ({pct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full ${pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-brand" : "bg-amber-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* UNRESOLVED CONFLICTS & WARNINGS */}
      {data?.unresolvedConflicts && data.unresolvedConflicts.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-semibold text-rose-950">
              Unresolved Matching Conflicts & Stalled Allocations ({data.unresolvedConflicts.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-rose-800">
            The Mentor-Matching Agent detected capacity constraints or potential conflicts on the following runs.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.unresolvedConflicts.map((c) => (
              <div key={c.runId} className="rounded-lg border border-rose-200 bg-white p-3.5 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{c.projectTitle}</p>
                    <p className="text-xs text-muted-ink">Run ID: {c.runId.slice(0, 10)}... · Status: {c.decisionStatus}</p>
                  </div>
                  <button
                    onClick={() => handleRemindCoordinator(c.runId)}
                    disabled={remindingRunId === c.runId}
                    className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 disabled:opacity-50"
                  >
                    <Bell className="h-3 w-3" />
                    {remindingRunId === c.runId ? "Reminding..." : "Remind"}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {c.conflicts.map((conf, ci) => (
                    <div key={ci} className="text-xs text-rose-700 bg-rose-50 p-1.5 rounded">
                      <span className="font-semibold">{conf.mentorName}:</span> {conf.warning}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CENTER-WIDE MATCHING EXECUTION LOG */}
      <div className="rounded-xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Center-Wide Matching Run History</h2>
            <p className="text-xs text-muted-ink">Complete audit trail of all AI matching agent executions across all cohorts</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-ink" />
            <input
              type="text"
              placeholder="Search runs by title, domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-line bg-canvas pl-8 pr-3 text-xs text-ink placeholder:text-muted-ink focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-xs">
            <thead className="bg-canvas font-semibold text-muted-ink">
              <tr>
                <th className="px-4 py-3">Startup Project</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Top Recommended Mentor</th>
                <th className="px-4 py-3">Match Score</th>
                <th className="px-4 py-3">Coordinator Decision</th>
                <th className="px-4 py-3">Decided By</th>
                <th className="px-4 py-3">Run Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-ink">
                    No matching runs found matching your search.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r) => {
                  const topRec = r.recommendations?.[0];
                  const status = r.coordinatorDecision?.status || "pending";
                  return (
                    <tr key={r.id || r._id} className="hover:bg-canvas/50 transition">
                      <td className="px-4 py-3 font-semibold">{r.projectTitle}</td>
                      <td className="px-4 py-3 text-muted-ink">{r.domain}</td>
                      <td className="px-4 py-3">
                        {topRec ? (
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-ink" />
                            <span>{topRec.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-ink italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {topRec ? (
                          <span className="font-semibold text-brand">{topRec.matchScore}%</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                            <CheckCircle className="h-3 w-3" /> Approved
                          </span>
                        ) : status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                            <Clock className="h-3 w-3" /> Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-ink">
                        {r.coordinatorDecision?.decidedByName || "Coordinator Pending"}
                      </td>
                      <td className="px-4 py-3 text-muted-ink">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedRun(r)}
                          className="inline-flex items-center gap-1 rounded border border-line bg-white px-2 py-1 text-[11px] font-semibold text-ink hover:bg-canvas"
                        >
                          <FileText className="h-3 w-3 text-muted-ink" />
                          Audit Run
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUDIT MODAL (READ-ONLY FOR ADMIN) */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Matching Run Audit: {selectedRun.projectTitle}</h3>
                <p className="text-xs text-muted-ink">Domain: {selectedRun.domain} · Run ID: {selectedRun.id}</p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-muted-ink hover:text-ink text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <div className="rounded-lg bg-canvas p-3 text-xs space-y-1">
              <p><span className="font-semibold text-ink">Coordinator Decision:</span> {selectedRun.coordinatorDecision?.status || 'pending'}</p>
              {selectedRun.coordinatorDecision?.decidedByName && (
                <p><span className="font-semibold text-ink">Reviewed By:</span> {selectedRun.coordinatorDecision.decidedByName} ({new Date(selectedRun.coordinatorDecision.decidedAt).toLocaleString()})</p>
              )}
              {selectedRun.coordinatorDecision?.comments && (
                <p><span className="font-semibold text-ink">Coordinator Notes:</span> {selectedRun.coordinatorDecision.comments}</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-ink mb-2">Evaluated Mentor Recommendations</h4>
              <div className="space-y-2">
                {(selectedRun.recommendations || []).map((m: { name?: string; department?: string; matchScore?: number; reasoning?: string; conflictWarning?: string }, idx: number) => (
                  <div key={idx} className="rounded-lg border border-line p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{m.name} ({m.department})</span>
                      <span className="font-bold text-brand">{m.matchScore}% Compatibility</span>
                    </div>
                    <p className="text-muted-ink">{m.reasoning}</p>
                    {m.conflictWarning && (
                      <p className="text-rose-600 font-medium">⚠️ {m.conflictWarning}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRun(null)}
                className="rounded-lg bg-canvas px-4 py-2 text-xs font-semibold text-ink hover:bg-line"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

