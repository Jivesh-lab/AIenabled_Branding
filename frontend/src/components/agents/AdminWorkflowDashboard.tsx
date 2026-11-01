"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Bell,
  Users,
} from "lucide-react";
import {
  fetchAdminWorkflowOverview,
  broadcastAdminWorkflowReminder,
  retryAdminFailedWorkflows,
  AdminWorkflowOverview,
} from "@/services/adminAgentService";

export default function AdminWorkflowDashboard() {
  const [data, setData] = useState<AdminWorkflowOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const overview = await fetchAdminWorkflowOverview();
      setData(overview);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load admin workflow overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleBroadcast = async () => {
    try {
      setBroadcasting(true);
      setError(null);
      const res = await broadcastAdminWorkflowReminder();
      setSuccessMsg(res.message);
      await loadData();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Broadcast failed");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setRetrying(true);
      setError(null);
      const res = await retryAdminFailedWorkflows();
      setSuccessMsg(res.message);
      await loadData();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Retry failed");
    } finally {
      setRetrying(false);
    }
  };

  const filteredExecutions = (data?.recentExecutions || []).filter((x) => {
    const matchesSearch =
      x.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      x.targetName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      x.actionType?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || x.status === statusFilter;
    return matchesSearch && matchesStatus;
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
            <span className="text-xs text-muted-ink">Center-Wide Workflow Operations</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            AI Workflow Automation Oversight
          </h1>
          <p className="mt-1 text-sm text-muted-ink">
            Center-wide task coordination, meeting delivery health, and operational bottleneck tracking across all cohorts.
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
            onClick={handleBroadcast}
            disabled={broadcasting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Bell className={`h-4 w-4 ${broadcasting ? "animate-spin" : ""}`} />
            {broadcasting ? "Broadcasting..." : "Broadcast Milestone Reminders"}
          </button>
          <button
            onClick={handleRetryFailed}
            disabled={retrying}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow transition hover:bg-brand-hover disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying..." : "Retry Failed Actions"}
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
          <p className="text-xs font-medium text-muted-ink">Total Workflows</p>
          <p className="mt-1 text-2xl font-bold text-ink">{data?.totalWorkflows ?? "..."}</p>
          <p className="mt-1 text-[11px] text-muted-ink">Center executions</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Active Workflows</p>
          <p className="mt-1 text-2xl font-bold text-brand">{data?.activeWorkflows ?? "..."}</p>
          <p className="mt-1 text-[11px] text-brand">In-flight actions</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Overdue Tasks</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{data?.overdueCount ?? "..."}</p>
          <p className="mt-1 text-[11px] text-rose-700">Past due date</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Delivery Failures</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{data?.failedNotifications ?? "..."}</p>
          <p className="mt-1 text-[11px] text-amber-700">Failed dispatches</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Pending Meetings</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{data?.pendingMeetings ?? "..."}</p>
          <p className="mt-1 text-[11px] text-indigo-700">Awaiting founder/mentor</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Completion Rate</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {data ? `${data.performance.completionRate}%` : "..."}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700">Turnaround target: 90%</p>
        </div>
      </div>

      {/* TWO COLUMN: OPERATIONAL BOTTLENECKS & FACULTY ACTIVITY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BOTTLENECK TRACKER */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Operational Bottlenecks</h2>
              <p className="text-xs text-muted-ink">Startups with highest overdue tasks or stalled deliverables</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>

          <div className="mt-4 divide-y divide-line">
            {(data?.bottlenecks || []).length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-ink">No operational bottlenecks detected. All workflows healthy.</p>
            ) : (
              (data?.bottlenecks || []).map((b, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{b.projectTitle}</p>
                    <p className="text-xs text-muted-ink">Active cohort deliverable</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    {b.overdueCount} overdue items
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FACULTY WORKFLOW ACTIVITY */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Faculty Workflow Activity</h2>
              <p className="text-xs text-muted-ink">Automated tasks and meetings scheduled per faculty coordinator</p>
            </div>
            <Users className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-4 divide-y divide-line">
            {(data?.facultyActivity || []).length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-ink">No faculty activity recorded yet.</p>
            ) : (
              (data?.facultyActivity || []).map((f, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{f.coordinatorName}</p>
                    <p className="text-xs text-muted-ink">Incubation Faculty Coordinator</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-canvas px-2 py-0.5 font-medium text-ink">
                      {f.tasksCreated} tasks
                    </span>
                    <span className="rounded bg-canvas px-2 py-0.5 font-medium text-ink">
                      {f.meetingsScheduled} meetings
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CENTER-WIDE WORKFLOW LOG */}
      <div className="rounded-xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Center-Wide Workflow Execution History</h2>
            <p className="text-xs text-muted-ink">Real-time trace of automated agent dispatches, meetings, and notifications</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-line bg-canvas px-2 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-ink" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-line bg-canvas pl-8 pr-3 text-xs text-ink placeholder:text-muted-ink focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-xs">
            <thead className="bg-canvas font-semibold text-muted-ink">
              <tr>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Startup Project</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Target Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Retries</th>
                <th className="px-4 py-3">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filteredExecutions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-ink">
                    No workflow executions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredExecutions.map((x) => (
                  <tr key={x.id || x._id} className="hover:bg-canvas/50 transition">
                    <td className="px-4 py-3 font-semibold text-brand">
                      <span className="capitalize">{x.actionType?.replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{x.projectTitle}</td>
                    <td className="px-4 py-3 text-ink">{x.targetName}</td>
                    <td className="px-4 py-3 text-muted-ink capitalize">{x.targetRole}</td>
                    <td className="px-4 py-3">
                      {x.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : x.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <Clock className="h-3 w-3" /> In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      {x.retryCount || 0} / {x.maxRetries || 3}
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      {x.createdAt ? new Date(x.createdAt).toLocaleString() : "-"}
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

