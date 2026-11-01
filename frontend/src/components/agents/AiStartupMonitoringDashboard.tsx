"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Search,
  ExternalLink,
  ChevronRight,
  Zap,
  Check,
  TrendingUp,
  FileText,
  Calendar,
  XCircle,
} from "lucide-react";
import {
  fetchMonitoringOverview,
  fetchMonitoringReports,
  evaluateStartupMonitoring,
  evaluatePortfolioMonitoring,
  acknowledgeMonitoringAlert,
  assignMonitoringIntervention,
  fetchStartupsForMatching,
  MonitoringReport,
  MonitoringOverview,
} from "@/services/facultyDataService";

export default function AiStartupMonitoringDashboard() {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [reports, setReports] = useState<MonitoringReport[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluatingPortfolio, setEvaluatingPortfolio] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Assign Intervention Modal
  const [interventionModal, setInterventionModal] = useState<{
    open: boolean;
    report: MonitoringReport | null;
    intervention: any | null;
    assignedTo: string;
    customTitle: string;
    submitting: boolean;
  }>({
    open: false,
    report: null,
    intervention: null,
    assignedTo: "",
    customTitle: "",
    submitting: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ovData, reportsData, startupsData] = await Promise.all([
        fetchMonitoringOverview(),
        fetchMonitoringReports({
          healthStatus: healthFilter !== "all" ? healthFilter : undefined,
        }),
        fetchStartupsForMatching(),
      ]);
      setOverview(ovData);
      setReports(reportsData);
      setStartups(startupsData);
      if (reportsData.length > 0 && !selectedReportId) {
        setSelectedReportId(reportsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load monitoring data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [healthFilter]);

  const handleEvaluateStartup = async (projectId: string) => {
    try {
      setEvaluating(true);
      setError(null);
      setSuccessMsg(null);
      const newReport = await evaluateStartupMonitoring(projectId);
      setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)]);
      setSelectedReportId(newReport.id);
      setSuccessMsg(`Monitoring Agent evaluated health for ${newReport.projectTitle}: Status [${newReport.aiObservation.healthStatus}].`);
      const updatedOverview = await fetchMonitoringOverview();
      setOverview(updatedOverview);
    } catch (err: any) {
      setError(err.message || "Failed to evaluate startup monitoring");
    } finally {
      setEvaluating(false);
    }
  };

  const handleEvaluatePortfolio = async () => {
    try {
      setEvaluatingPortfolio(true);
      setError(null);
      setSuccessMsg(null);
      const result = await evaluatePortfolioMonitoring();
      setOverview(result.overview);
      setReports(result.reports);
      if (result.reports.length > 0) {
        setSelectedReportId(result.reports[0].id);
      }
      setSuccessMsg(`Portfolio-wide evaluation completed across ${result.reports.length} cohort startups!`);
    } catch (err: any) {
      setError(err.message || "Failed to execute portfolio monitoring");
    } finally {
      setEvaluatingPortfolio(false);
    }
  };

  const handleAcknowledgeAlert = async (reportId: string) => {
    try {
      setError(null);
      const updated = await acknowledgeMonitoringAlert(reportId, "Alert acknowledged by coordinator.");
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSuccessMsg("Alert acknowledged.");
      const updatedOverview = await fetchMonitoringOverview();
      setOverview(updatedOverview);
    } catch (err: any) {
      setError(err.message || "Failed to acknowledge alert");
    }
  };

  const handleAssignIntervention = async () => {
    if (!interventionModal.report || !interventionModal.intervention) return;
    try {
      setInterventionModal((prev) => ({ ...prev, submitting: true }));
      setError(null);
      const result = await assignMonitoringIntervention(
        interventionModal.report.id,
        interventionModal.intervention.id,
        interventionModal.assignedTo,
        interventionModal.customTitle
      );

      setReports((prev) => prev.map((r) => (r.id === result.report.id ? result.report : r)));
      setSuccessMsg(
        `Intervention coordinated! Workflow task [${result.execution.id}] assigned to ${
          interventionModal.assignedTo || "Founder"
        }.`
      );
      setInterventionModal({
        open: false,
        report: null,
        intervention: null,
        assignedTo: "",
        customTitle: "",
        submitting: false,
      });
    } catch (err: any) {
      setError(err.message || "Failed to assign intervention");
      setInterventionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0] || null;

  const filteredReports = reports.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.projectTitle?.toLowerCase().includes(q) ||
      r.leadStudent?.toLowerCase().includes(q) ||
      r.domain?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <Activity className="size-3.5" />
                AI Agent 4 Active
              </span>
              <span className="text-xs text-muted-ink">Heuristic & Milestone Telemetry</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">AI Startup Monitoring</h1>
            <p className="text-sm text-muted-ink">
              Transparent tracking separating objective measured facts from AI observations with automated follow-up
              recommendations.
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
              onClick={handleEvaluatePortfolio}
              disabled={evaluatingPortfolio}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover disabled:opacity-50"
            >
              <Sparkles className={`size-3.5 ${evaluatingPortfolio ? "animate-spin" : ""}`} />
              {evaluatingPortfolio ? "Scanning Cohort..." : "Run Portfolio Monitoring"}
            </button>
          </div>
        </div>

        {/* Portfolio Health Overview Cards */}
        {overview && (
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4">
            <div className="rounded-lg bg-emerald-50/70 p-3.5 border border-emerald-100">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-800">
                <span>On Track</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-950">{overview.onTrack}</div>
              <span className="text-[11px] text-emerald-700">Meeting all milestones</span>
            </div>

            <div className="rounded-lg bg-amber-50/70 p-3.5 border border-amber-100">
              <div className="flex items-center justify-between text-xs font-medium text-amber-800">
                <span>Needs Attention</span>
                <AlertCircle className="size-4 text-amber-600" />
              </div>
              <div className="mt-1 text-2xl font-bold text-amber-950">{overview.needsAttention}</div>
              <span className="text-[11px] text-amber-700">Pace or mentor gap</span>
            </div>

            <div className="rounded-lg bg-rose-50/70 p-3.5 border border-rose-100">
              <div className="flex items-center justify-between text-xs font-medium text-rose-800">
                <span>At Risk</span>
                <AlertTriangle className="size-4 text-rose-600" />
              </div>
              <div className="mt-1 text-2xl font-bold text-rose-950">{overview.atRisk}</div>
              <span className="text-[11px] text-rose-700">Overdue work flagged</span>
            </div>

            <div className="rounded-lg bg-slate-50/70 p-3.5 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Monitored Startups</span>
                <TrendingUp className="size-4 text-slate-500" />
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{overview.total}</div>
              <span className="text-[11px] text-slate-500">
                {overview.overdueMilestones} Overdue Milestones Total
              </span>
            </div>
          </div>
        )}
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

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Side: Startups & Reports List */}
        <div className="space-y-4 lg:col-span-5">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-3 shadow-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setHealthFilter("all")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  healthFilter === "all" ? "bg-slate-900 text-white" : "text-muted-ink hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setHealthFilter("On Track")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  healthFilter === "On Track" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                On Track
              </button>
              <button
                onClick={() => setHealthFilter("Needs Attention")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  healthFilter === "Needs Attention" ? "bg-amber-600 text-white" : "text-amber-700 hover:bg-amber-50"
                }`}
              >
                Attention
              </button>
              <button
                onClick={() => setHealthFilter("At Risk")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  healthFilter === "At Risk" ? "bg-rose-600 text-white" : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                At Risk
              </button>
            </div>
          </div>

          {/* Reports Card List */}
          <div className="max-h-[700px] space-y-2.5 overflow-y-auto pr-1">
            {filteredReports.map((r) => {
              const isSelected = r.id === selectedReportId;
              const isAtRisk = r.aiObservation.healthStatus === "At Risk";
              const isAttention = r.aiObservation.healthStatus === "Needs Attention";

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    isSelected
                      ? "border-brand bg-brand/5 shadow-xs"
                      : "border-line bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-semibold text-ink">{r.projectTitle}</h3>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isAtRisk
                          ? "bg-rose-100 text-rose-800"
                          : isAttention
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {r.aiObservation.healthStatus}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-ink">
                    <span>{r.domain}</span>
                    <span>•</span>
                    <span>Lead: {r.leadStudent}</span>
                    <span>•</span>
                    <span>Milestones: {r.measuredFacts?.milestonesCompleted}/{r.measuredFacts?.milestonesTotal}</span>
                  </div>

                  {/* Alert banner if active */}
                  {r.alert?.active && !r.alert?.acknowledged && (
                    <div className="mt-2.5 flex items-center justify-between rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800 border border-rose-200">
                      <span className="flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="size-3.5 text-rose-600" />
                        Active Health Alert
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcknowledgeAlert(r.id);
                        }}
                        className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-xs border border-rose-200 hover:bg-rose-100"
                      >
                        Acknowledge
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-xs text-muted-ink">
                No monitoring reports match current criteria. Run portfolio monitoring above to evaluate cohort health.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Report Detail */}
        <div className="space-y-6 lg:col-span-7">
          {selectedReport ? (
            <>
              {/* Report Header Card */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          selectedReport.aiObservation.healthStatus === "At Risk"
                            ? "bg-rose-100 text-rose-800"
                            : selectedReport.aiObservation.healthStatus === "Needs Attention"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        Health: {selectedReport.aiObservation.healthStatus}
                      </span>
                      <span className="text-xs text-muted-ink">
                        Report ID: <span className="font-mono">{selectedReport.id}</span>
                      </span>
                    </div>

                    <h2 className="mt-2 text-xl font-bold text-ink">{selectedReport.projectTitle}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-ink">
                      <span>{selectedReport.domain}</span>
                      <span>•</span>
                      <span>Stage: {selectedReport.stage}</span>
                      <span>•</span>
                      <span>Lead: {selectedReport.leadStudent}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEvaluateStartup(selectedReport.projectId)}
                    disabled={evaluating}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RotateCw className={`size-3.5 ${evaluating ? "animate-spin" : ""}`} />
                    Re-evaluate Now
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-xs text-muted-ink">
                  <div>
                    Executed at: <strong className="text-ink">{new Date(selectedReport.executedAt).toLocaleString()}</strong>
                  </div>
                  <div>
                    Evaluated by: <strong className="text-ink">{selectedReport.executedBy}</strong>
                  </div>
                </div>
              </div>

              {/* 1. Measured Facts (Objective records) */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-brand" />
                    <h3 className="text-sm font-bold text-ink">Measured Facts (Database Verified)</h3>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    Zero AI Hallucination
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-[11px] text-muted-ink">Milestones Completed</span>
                    <div className="mt-1 text-lg font-bold text-ink">
                      {selectedReport.measuredFacts?.milestonesCompleted} / {selectedReport.measuredFacts?.milestonesTotal}
                    </div>
                    <span className="text-[10px] text-muted-ink">
                      {selectedReport.measuredFacts?.milestoneCompletionRate}% velocity
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-[11px] text-muted-ink">Overdue Milestones</span>
                    <div
                      className={`mt-1 text-lg font-bold ${
                        (selectedReport.measuredFacts?.milestonesOverdue ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {selectedReport.measuredFacts?.milestonesOverdue}
                    </div>
                    <span className="text-[10px] text-muted-ink">Flagged in cohort tracker</span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-[11px] text-muted-ink">Active Tasks Total</span>
                    <div className="mt-1 text-lg font-bold text-ink">
                      {selectedReport.measuredFacts?.tasksCompleted} / {selectedReport.measuredFacts?.tasksTotal}
                    </div>
                    <span className="text-[10px] text-muted-ink">
                      {selectedReport.measuredFacts?.tasksPending} pending
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-[11px] text-muted-ink">Days Since Report</span>
                    <div
                      className={`mt-1 text-lg font-bold ${
                        (selectedReport.measuredFacts?.daysSinceLastReport ?? 0) > 14
                          ? "text-rose-600"
                          : "text-slate-900"
                      }`}
                    >
                      {selectedReport.measuredFacts?.daysSinceLastReport} Days
                    </div>
                    <span className="text-[10px] text-muted-ink">Reporting cadence</span>
                  </div>
                </div>
              </div>

              {/* 2. AI Observations & Risk Interpretation */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-ink">AI Agent Observation & Risk Synthesis</h3>
                  </div>
                  <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                    Confidence: {selectedReport.aiObservation?.confidenceScore}%
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-xs leading-relaxed text-slate-700">
                    <strong className="text-ink">Executive Summary:</strong> {selectedReport.aiObservation?.summary}
                  </p>

                  <p className="text-xs leading-relaxed text-slate-700">
                    <strong className="text-ink">Evaluation Rationale:</strong> {selectedReport.aiObservation?.explanation}
                  </p>

                  {/* Risk Factors */}
                  {selectedReport.aiObservation?.riskFactors && selectedReport.aiObservation.riskFactors.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-xs font-semibold text-rose-800">Detected Risk Factors:</span>
                      <ul className="space-y-1">
                        {selectedReport.aiObservation.riskFactors.map((rf, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-rose-700">
                            <AlertTriangle className="size-3.5 shrink-0 text-rose-500 mt-0.5" />
                            <span>{rf}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strengths */}
                  {selectedReport.aiObservation?.strengths && selectedReport.aiObservation.strengths.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-xs font-semibold text-emerald-800">Demonstrated Strengths:</span>
                      <ul className="space-y-1">
                        {selectedReport.aiObservation.strengths.map((st, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
                            <span>{st}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Recommended Interventions (Linked to Workflow Agent) */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-brand" />
                    <h3 className="text-sm font-bold text-ink">Actionable Recommended Interventions</h3>
                  </div>
                  <span className="text-xs text-muted-ink">Integrated with Workflow Agent</span>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedReport.recommendedInterventions && selectedReport.recommendedInterventions.length > 0 ? (
                    selectedReport.recommendedInterventions.map((intervention) => (
                      <div
                        key={intervention.id}
                        className={`rounded-xl border p-4 transition ${
                          intervention.assigned
                            ? "border-emerald-200 bg-emerald-50/20"
                            : "border-line bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                  intervention.priority === "High"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {intervention.priority} Priority
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-700">
                                {intervention.type.replace("_", " ")}
                              </span>
                            </div>
                            <h4 className="mt-1.5 text-sm font-bold text-ink">{intervention.title}</h4>
                            <p className="mt-1 text-xs text-slate-600">{intervention.description}</p>
                          </div>

                          <div className="shrink-0 pt-1">
                            {intervention.assigned ? (
                              <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-right border border-emerald-200">
                                <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                                  <Check className="size-3.5" /> Assigned
                                </div>
                                <span className="font-mono text-[10px] text-emerald-700">
                                  {intervention.workflowExecutionId}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  setInterventionModal({
                                    open: true,
                                    report: selectedReport,
                                    intervention,
                                    assignedTo: selectedReport.leadStudent,
                                    customTitle: intervention.title,
                                    submitting: false,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover shadow-xs"
                              >
                                <Zap className="size-3.5" />
                                Assign Intervention
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-ink">
                      No active interventions required. Startup is performing within normal bounds.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-line bg-white p-12 text-center text-muted-ink">
              Select or evaluate a startup monitoring report.
            </div>
          )}
        </div>
      </div>

      {/* ASSIGN INTERVENTION MODAL */}
      {interventionModal.open && interventionModal.intervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Assign AI Intervention to Workflow Agent</h3>
              <button
                onClick={() => setInterventionModal((prev) => ({ ...prev, open: false }))}
                className="text-muted-ink hover:text-ink"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <div>
                  Startup: <strong className="text-ink">{interventionModal.report?.projectTitle}</strong>
                </div>
                <div>
                  Intervention: <strong className="text-brand">{interventionModal.intervention.title}</strong>
                </div>
                <div>
                  Action Type: <strong className="capitalize">{interventionModal.intervention.type.replace("_", " ")}</strong>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Action Title</label>
                <input
                  type="text"
                  value={interventionModal.customTitle}
                  onChange={(e) => setInterventionModal((prev) => ({ ...prev, customTitle: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Assign Recipient / Responsible Party</label>
                <input
                  type="text"
                  value={interventionModal.assignedTo}
                  onChange={(e) => setInterventionModal((prev) => ({ ...prev, assignedTo: e.target.value }))}
                  placeholder="e.g. Lead Student Name or Faculty Volunteer"
                  className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div className="rounded-lg bg-indigo-50 p-3 text-[11px] text-indigo-900 border border-indigo-200">
                <ShieldCheck className="mb-1 size-4 text-indigo-700" />
                <strong>Autonomous Workflow Coordination:</strong>
                <p className="mt-0.5">
                  Confirming this intervention will immediately invoke the Workflow Agent to create a real Task or
                  Meeting record in the database, with guaranteed delivery receipts and audit trails.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                onClick={() => setInterventionModal((prev) => ({ ...prev, open: false }))}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-muted-ink hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignIntervention}
                disabled={interventionModal.submitting}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {interventionModal.submitting ? "Coordinating..." : "Trigger Workflow Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
