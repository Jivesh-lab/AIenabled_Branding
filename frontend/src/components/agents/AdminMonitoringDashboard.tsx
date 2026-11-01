"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Building,
  Layers,
  Search,
} from "lucide-react";
import {
  fetchAdminMonitoringOverview,
  triggerAdminMonitoringSweep,
  AdminMonitoringOverview,
} from "@/services/adminAgentService";

export default function AdminMonitoringDashboard() {
  const [data, setData] = useState<AdminMonitoringOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sweeping, setSweeping] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const overview = await fetchAdminMonitoringOverview();
      setData(overview);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load admin monitoring overview");
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
      const res = await triggerAdminMonitoringSweep();
      setSuccessMsg(`Center-wide portfolio health sweep completed for ${res.evaluatedCount} startups.`);
      await loadData();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to trigger portfolio sweep");
    } finally {
      setSweeping(false);
    }
  };

  const filteredReports = (data?.recentReports || []).filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.projectTitle?.toLowerCase().includes(q) ||
      r.healthStatus?.toLowerCase().includes(q)
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
            <span className="text-xs text-muted-ink">Portfolio Risk & Health Oversight</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            AI Startup Monitoring Portfolio Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-ink">
            Real-time cohort health analytics, early risk detection, and faculty intervention completion across the entire incubation center.
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
            <Activity className={`h-4 w-4 ${sweeping ? "animate-spin" : ""}`} />
            {sweeping ? "Sweeping Portfolio..." : "Trigger Portfolio Health Sweep"}
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
          <p className="text-xs font-medium text-muted-ink">Total Portfolio</p>
          <p className="mt-1 text-2xl font-bold text-ink">{data?.portfolioCounts?.total ?? "..."}</p>
          <p className="mt-1 text-[11px] text-muted-ink">Incubated startups</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">On Track</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {data?.portfolioCounts?.onTrack ?? "..."}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700">Healthy velocity</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Needs Attention</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {data?.portfolioCounts?.needsAttention ?? "..."}
          </p>
          <p className="mt-1 text-[11px] text-amber-700">Milestone delays</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">At Risk</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">
            {data?.portfolioCounts?.atRisk ?? "..."}
          </p>
          <p className="mt-1 text-[11px] text-rose-700">Critical intervention needed</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Avg Health Score</p>
          <p className="mt-1 text-2xl font-bold text-brand">{data?.avgHealthScore ?? "..."}/100</p>
          <p className="mt-1 text-[11px] text-muted-ink">Portfolio health target: 80+</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Portfolio Trend</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            +{data?.riskTrends?.improving ?? "0"}
          </p>
          <p className="mt-1 text-[11px] text-indigo-700">Startups improving</p>
        </div>
      </div>

      {/* TWO COLUMN BREAKDOWN: DEPARTMENT & STAGE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* DEPARTMENT HEALTH DISTRIBUTION */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Department Health Distribution</h2>
              <p className="text-xs text-muted-ink">Startup health break-up across academic faculties</p>
            </div>
            <Building className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-4 space-y-3">
            {(data?.departmentBreakdown || []).map((dept, idx) => (
              <div key={idx} className="rounded-lg border border-line p-3 bg-canvas/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{dept.department}</span>
                  <span className="text-muted-ink">{dept.total} startups</span>
                </div>
                <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${dept.total > 0 ? (dept.onTrack / dept.total) * 100 : 0}%` }}
                    title={`On Track: ${dept.onTrack}`}
                  />
                  <div
                    className="bg-amber-500"
                    style={{ width: `${dept.total > 0 ? (dept.needsAttention / dept.total) * 100 : 0}%` }}
                    title={`Needs Attention: ${dept.needsAttention}`}
                  />
                  <div
                    className="bg-rose-500"
                    style={{ width: `${dept.total > 0 ? (dept.atRisk / dept.total) * 100 : 0}%` }}
                    title={`At Risk: ${dept.atRisk}`}
                  />
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-ink">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {dept.onTrack} On Track</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {dept.needsAttention} Attention</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> {dept.atRisk} At Risk</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INCUBATION STAGE VELOCITY */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Incubation Stage Distribution</h2>
              <p className="text-xs text-muted-ink">Startup progression across Ideation, Research, Validation & Prototype</p>
            </div>
            <Layers className="h-5 w-5 text-indigo-600" />
          </div>

          <div className="mt-4 space-y-3">
            {(data?.stageBreakdown || []).map((stg, idx) => (
              <div key={idx} className="rounded-lg border border-line p-3 bg-canvas/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{stg.stage}</span>
                  <span className="text-muted-ink">{stg.count} startups · Avg Progress: {stg.avgProgress}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${stg.avgProgress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HIGH-RISK ALERT MATRIX */}
      {data?.highRiskStartups && data.highRiskStartups.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-semibold text-rose-950">
              High-Risk Alert Matrix: Persistent Flags & Overdue Milestones ({data.highRiskStartups.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-rose-800">
            These startups require coordinator follow-up and management oversight due to overdue deliverables or risk assessments.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.highRiskStartups.map((s) => (
              <div key={s.id} className="rounded-lg border border-rose-200 bg-white p-3.5 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{s.title}</p>
                    <p className="text-xs text-muted-ink">Domain: {s.domain} · Coordinator: {s.coordinator}</p>
                  </div>
                  <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                    {s.health}
                  </span>
                </div>
                <div className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-800">
                  <span className="font-semibold">Overdue Milestones:</span> {s.overdueMilestonesCount} ({s.nextMilestone} - Due {s.nextMilestoneDate})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CENTER-WIDE MONITORING EVALUATIONS */}
      <div className="rounded-xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Center-Wide Monitoring Evaluation History</h2>
            <p className="text-xs text-muted-ink">Automated health evaluations executed by the AI Monitoring Agent</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-ink" />
            <input
              type="text"
              placeholder="Search reports..."
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
                <th className="px-4 py-3">Health Status</th>
                <th className="px-4 py-3">Health Score</th>
                <th className="px-4 py-3">Risk Flags</th>
                <th className="px-4 py-3">Active Interventions</th>
                <th className="px-4 py-3">Evaluated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-ink">
                    No monitoring reports match your search query.
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => (
                  <tr key={r.id || r._id} className="hover:bg-canvas/50 transition">
                    <td className="px-4 py-3 font-semibold text-ink">{r.projectTitle}</td>
                    <td className="px-4 py-3">
                      {r.healthStatus === "On Track" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> On Track
                        </span>
                      ) : r.healthStatus === "Needs Attention" ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <AlertTriangle className="h-3 w-3" /> Needs Attention
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <XCircle className="h-3 w-3" /> At Risk
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-ink">{r.healthScore ?? 0}</span>
                      <span className="text-muted-ink">/100</span>
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      {r.riskFlags?.length || 0} flags detected
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      {r.recommendedInterventions?.length || 0} recommendations
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      {r.executedAt || r.createdAt ? new Date(r.executedAt || r.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

