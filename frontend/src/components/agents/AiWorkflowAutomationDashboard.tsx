"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  XCircle,
  Plus,
  Calendar,
  Bell,
  FileText,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  fetchWorkflowExecutions,
  coordinateWorkflowAction,
  retryWorkflowExecution,
  cancelWorkflowExecution,
  fetchStartupsForMatching,
  WorkflowExecution,
} from "@/services/facultyDataService";

export default function AiWorkflowAutomationDashboard() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [filterStartup, setFilterStartup] = useState<string>("all");
  const [filterActionType, setFilterActionType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Inspect Drawer/Modal
  const [inspectedExecution, setInspectedExecution] = useState<WorkflowExecution | null>(null);

  // Action Coordination Modal
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    actionType: "assign_task" | "schedule_meeting" | "send_reminder" | "request_progress_report";
    projectId: string;
    projectTitle: string;
    targetName: string;
    targetRole: string;
    targetEmail: string;
    title: string;
    description: string;
    dueDateOrDate: string;
    priority: "High" | "Medium" | "Low";
    submitting: boolean;
  }>({
    open: false,
    actionType: "assign_task",
    projectId: "",
    projectTitle: "",
    targetName: "",
    targetRole: "student",
    targetEmail: "",
    title: "",
    description: "",
    dueDateOrDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    priority: "Medium",
    submitting: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [execData, startupsData] = await Promise.all([
        fetchWorkflowExecutions({
          projectId: filterStartup !== "all" ? filterStartup : undefined,
          actionType: filterActionType !== "all" ? filterActionType : undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
        }),
        fetchStartupsForMatching(),
      ]);
      setExecutions(execData);
      setStartups(startupsData);
    } catch (err: any) {
      setError(err.message || "Failed to load workflow activities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStartup, filterActionType, filterStatus]);

  const handleRetry = async (id: string) => {
    try {
      setError(null);
      const updated = await retryWorkflowExecution(id);
      setExecutions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSuccessMsg(`Workflow action ${id} retried successfully.`);
    } catch (err: any) {
      setError(err.message || "Failed to retry workflow action");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      setError(null);
      const updated = await cancelWorkflowExecution(id);
      setExecutions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSuccessMsg(`Workflow action ${id} cancelled.`);
    } catch (err: any) {
      setError(err.message || "Failed to cancel workflow action");
    }
  };

  const handleCreateAction = async () => {
    try {
      setActionModal((prev) => ({ ...prev, submitting: true }));
      setError(null);

      const targetStartup = startups.find((s) => s.id === actionModal.projectId);
      const projectTitle = targetStartup?.title || actionModal.projectTitle || "Incubation Project";

      const payloadData: Record<string, any> = {
        title: actionModal.title,
        description: actionModal.description,
        priority: actionModal.priority,
      };

      if (actionModal.actionType === "schedule_meeting") {
        payloadData.date = actionModal.dueDateOrDate;
        payloadData.startTime = "15:00";
        payloadData.durationMinutes = 45;
        payloadData.meetingType = "Milestone Review";
      } else {
        payloadData.dueDate = actionModal.dueDateOrDate;
      }

      const newExec = await coordinateWorkflowAction({
        action_type: actionModal.actionType,
        project_id: actionModal.projectId,
        project_title: projectTitle,
        target_id: actionModal.projectId || "general",
        target_name: actionModal.targetName || targetStartup?.leadStudent || "Incubation Team",
        target_role: actionModal.targetRole,
        target_email: actionModal.targetEmail,
        payload: payloadData,
      });

      setExecutions((prev) => [newExec, ...prev]);
      setSuccessMsg(`Workflow Agent coordinated ${actionModal.actionType.replace("_", " ")} successfully!`);
      setActionModal((prev) => ({ ...prev, open: false, submitting: false, title: "", description: "" }));
    } catch (err: any) {
      setError(err.message || "Failed to coordinate workflow action");
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const filteredExecutions = executions.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.projectTitle?.toLowerCase().includes(q) ||
      e.targetName?.toLowerCase().includes(q) ||
      e.payload?.title?.toLowerCase().includes(q) ||
      e.id?.toLowerCase().includes(q)
    );
  });

  const taskCount = executions.filter((e) => e.actionType === "assign_task").length;
  const meetingCount = executions.filter((e) => e.actionType === "schedule_meeting").length;
  const reminderCount = executions.filter((e) => e.actionType === "send_reminder").length;
  const reportCount = executions.filter((e) => e.actionType === "request_progress_report").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                <Zap className="size-3.5" />
                AI Agent 2 Active
              </span>
              <span className="text-xs text-muted-ink">Idempotent Execution Engine</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">AI Workflow Automation</h1>
            <p className="text-sm text-muted-ink">
              Automated task assignment, milestone meeting scheduling, reminders, and progress-report coordination.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-medium text-ink shadow-xs transition hover:bg-slate-50"
            >
              <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={() =>
                setActionModal({
                  open: true,
                  actionType: "assign_task",
                  projectId: startups[0]?.id || "",
                  projectTitle: startups[0]?.title || "",
                  targetName: startups[0]?.leadStudent || "",
                  targetRole: "student",
                  targetEmail: "",
                  title: "",
                  description: "",
                  dueDateOrDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
                  priority: "Medium",
                  submitting: false,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover"
            >
              <Plus className="size-3.5" />
              Coordinate Workflow Action
            </button>
          </div>
        </div>

        {/* Action Type Counters */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4">
          <div className="rounded-lg bg-blue-50/60 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-blue-700">
              <span>Tasks Assigned</span>
              <FileText className="size-4" />
            </div>
            <div className="mt-1 text-2xl font-bold text-blue-900">{taskCount}</div>
            <span className="text-[11px] text-blue-700">Accountability items</span>
          </div>

          <div className="rounded-lg bg-emerald-50/60 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
              <span>Meetings Scheduled</span>
              <Calendar className="size-4" />
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-900">{meetingCount}</div>
            <span className="text-[11px] text-emerald-700">Mentorship alignments</span>
          </div>

          <div className="rounded-lg bg-amber-50/60 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-amber-700">
              <span>Reminders Dispatched</span>
              <Bell className="size-4" />
            </div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{reminderCount}</div>
            <span className="text-[11px] text-amber-700">Deadline alerts</span>
          </div>

          <div className="rounded-lg bg-purple-50/60 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-purple-700">
              <span>Report Requests</span>
              <ShieldCheck className="size-4" />
            </div>
            <div className="mt-1 text-2xl font-bold text-purple-900">{reportCount}</div>
            <span className="text-[11px] text-purple-700">Compliance checkpoints</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertTriangle className="size-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Startup Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-ink">Startup:</label>
            <select
              value={filterStartup}
              onChange={(e) => setFilterStartup(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All Startups ({startups.length})</option>
              {startups.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-ink">Action Type:</label>
            <select
              value={filterActionType}
              onChange={(e) => setFilterActionType(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All Action Types</option>
              <option value="assign_task">Assign Task</option>
              <option value="schedule_meeting">Schedule Meeting</option>
              <option value="send_reminder">Send Reminder</option>
              <option value="request_progress_report">Request Progress Report</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-ink">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="w-full rounded-lg border border-line bg-canvas py-1.5 pl-8 pr-3 text-xs text-ink focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Activity Timeline Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
        <div className="border-b border-line px-5 py-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Authorized Workflow Execution Log</h2>
            <span className="text-xs text-muted-ink">
              Showing {filteredExecutions.length} of {executions.length} actions
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-muted-ink">
              <tr>
                <th className="px-5 py-3">Action & Target</th>
                <th className="px-5 py-3">Startup</th>
                <th className="px-5 py-3">Action Details</th>
                <th className="px-5 py-3">Execution Status</th>
                <th className="px-5 py-3">Delivery Confirmation</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredExecutions.map((exec) => {
                const isFailed = exec.status === "failed";
                const isPending = exec.status === "pending" || exec.status === "queued";
                return (
                  <tr key={exec.id} className="transition hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {exec.actionType === "assign_task" && <FileText className="size-4 text-blue-600" />}
                        {exec.actionType === "schedule_meeting" && <Calendar className="size-4 text-emerald-600" />}
                        {exec.actionType === "send_reminder" && <Bell className="size-4 text-amber-600" />}
                        {exec.actionType === "request_progress_report" && (
                          <ShieldCheck className="size-4 text-purple-600" />
                        )}
                        <div>
                          <div className="font-semibold capitalize text-ink">
                            {exec.actionType.replace("_", " ")}
                          </div>
                          <div className="text-[11px] text-muted-ink">
                            Target: <span className="font-medium text-slate-700">{exec.targetName}</span> (
                            {exec.targetRole})
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="line-clamp-1 max-w-[180px] font-medium text-ink">{exec.projectTitle}</div>
                      <div className="font-mono text-[10px] text-muted-ink">{exec.projectId}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="line-clamp-1 max-w-[240px] font-medium text-ink">
                        {exec.payload?.title || exec.payload?.agenda || "Standard coordination payload"}
                      </div>
                      <div className="line-clamp-1 max-w-[240px] text-[11px] text-muted-ink">
                        {exec.payload?.description || exec.payload?.notes || "No extra description"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          exec.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : exec.status === "failed"
                            ? "bg-rose-50 text-rose-700"
                            : exec.status === "cancelled"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {exec.status === "completed" && <CheckCircle2 className="size-3" />}
                        {exec.status === "failed" && <AlertTriangle className="size-3" />}
                        {exec.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span className="line-clamp-1 max-w-[200px] text-[11px] font-medium">
                          {exec.deliveryReceipt}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-ink">
                        {new Date(exec.deliveryTimestamp).toLocaleTimeString()} • {new Date(exec.deliveryTimestamp).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setInspectedExecution(exec)}
                          className="rounded border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-slate-100"
                        >
                          Inspect
                        </button>

                        {isFailed && (
                          <button
                            onClick={() => handleRetry(exec.id)}
                            className="rounded bg-brand px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-hover"
                          >
                            Retry
                          </button>
                        )}

                        {isPending && (
                          <button
                            onClick={() => handleCancel(exec.id)}
                            className="rounded border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredExecutions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-ink">
                    No workflow executions match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT EXECUTION MODAL */}
      {inspectedExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Execution Inspection: {inspectedExecution.id}</h3>
                <span className="text-xs text-muted-ink">Idempotency Key: {inspectedExecution.idempotencyKey}</span>
              </div>
              <button onClick={() => setInspectedExecution(null)} className="text-muted-ink hover:text-ink">
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
                <div>
                  <span className="text-muted-ink">Action Type:</span>{" "}
                  <strong className="capitalize text-ink">{inspectedExecution.actionType.replace("_", " ")}</strong>
                </div>
                <div>
                  <span className="text-muted-ink">Execution Status:</span>{" "}
                  <strong className="text-emerald-700">{inspectedExecution.status}</strong>
                </div>
                <div>
                  <span className="text-muted-ink">Initiated By:</span>{" "}
                  <strong className="text-ink">{inspectedExecution.actorName}</strong> (
                  {inspectedExecution.actorRole})
                </div>
                <div>
                  <span className="text-muted-ink">Target Recipient:</span>{" "}
                  <strong className="text-ink">{inspectedExecution.targetName}</strong> (
                  {inspectedExecution.targetRole})
                </div>
              </div>

              {/* Delivery Receipt Box */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Confirmed Delivery Receipt
                </div>
                <p className="mt-1 font-mono text-[11px] text-emerald-800">{inspectedExecution.deliveryReceipt}</p>
                <div className="mt-1 text-[10px] text-emerald-700">
                  Delivered at: {new Date(inspectedExecution.deliveryTimestamp).toLocaleString()}
                </div>
              </div>

              {/* Payload Breakdown */}
              <div>
                <h4 className="text-xs font-semibold text-ink">Action Payload Content</h4>
                <div className="mt-1 rounded-lg border border-line bg-canvas p-3 font-mono text-xs">
                  {JSON.stringify(inspectedExecution.payload, null, 2)}
                </div>
              </div>

              {/* Execution Logs */}
              <div>
                <h4 className="text-xs font-semibold text-ink">Agent Execution Audit Logs</h4>
                <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-slate-900 p-3 font-mono text-[11px] text-slate-200">
                  {inspectedExecution.executionLogs?.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-slate-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={log.level === "warn" ? "text-amber-400" : "text-emerald-400"}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end border-t border-line pt-3">
              <button
                onClick={() => setInspectedExecution(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-ink hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORKFLOW ACTION MODAL */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Coordinate Workflow Action</h3>
              <button
                onClick={() => setActionModal((prev) => ({ ...prev, open: false }))}
                className="text-muted-ink hover:text-ink"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Action Type</label>
                <select
                  value={actionModal.actionType}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      actionType: e.target.value as any,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                >
                  <option value="assign_task">Assign Task</option>
                  <option value="schedule_meeting">Schedule Meeting</option>
                  <option value="send_reminder">Send Milestone Reminder</option>
                  <option value="request_progress_report">Request Fortnightly Progress Report</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Target Startup</label>
                <select
                  value={actionModal.projectId}
                  onChange={(e) => {
                    const st = startups.find((s) => s.id === e.target.value);
                    setActionModal((prev) => ({
                      ...prev,
                      projectId: e.target.value,
                      projectTitle: st?.title || "",
                      targetName: st?.leadStudent || "",
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                >
                  {startups.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.leadStudent})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Action Title</label>
                <input
                  type="text"
                  value={actionModal.title}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Field Pilot Prototype Deployment Review"
                  className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink">
                    {actionModal.actionType === "schedule_meeting" ? "Meeting Date" : "Due Date"}
                  </label>
                  <input
                    type="date"
                    value={actionModal.dueDateOrDate}
                    onChange={(e) => setActionModal((prev) => ({ ...prev, dueDateOrDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Priority</label>
                  <select
                    value={actionModal.priority}
                    onChange={(e) => setActionModal((prev) => ({ ...prev, priority: e.target.value as any }))}
                    className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Description / Scope</label>
                <textarea
                  value={actionModal.description}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Details, expectations, and deliverables..."
                  className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                onClick={() => setActionModal((prev) => ({ ...prev, open: false }))}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-muted-ink hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAction}
                disabled={actionModal.submitting || !actionModal.title}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {actionModal.submitting ? "Coordinating..." : "Execute Workflow Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

