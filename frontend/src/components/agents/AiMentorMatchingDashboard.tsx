"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import {
  fetchStartupsForMatching,
  runMentorMatching,
  fetchMentorMatchingRuns,
  decideMentorRecommendation,
  MentorMatchingRun,
  MentorRecommendation,
} from "@/services/facultyDataService";

export default function AiMentorMatchingDashboard() {
  const [startups, setStartups] = useState<any[]>([]);
  const [runs, setRuns] = useState<MentorMatchingRun[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"matching" | "allocations" | "history">("matching");
  const [loading, setLoading] = useState<boolean>(true);
  const [runningMatch, setRunningMatch] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal state
  const [approvalModal, setApprovalModal] = useState<{
    open: boolean;
    run: MentorMatchingRun | null;
    rec: MentorRecommendation | null;
    comments: string;
    submitting: boolean;
  }>({
    open: false,
    run: null,
    rec: null,
    comments: "",
    submitting: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [startupsData, runsData] = await Promise.all([
        fetchStartupsForMatching(),
        fetchMentorMatchingRuns(),
      ]);
      setStartups(startupsData);
      setRuns(runsData);
      if (startupsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(startupsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load mentor matching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProject = startups.find((p) => p.id === selectedProjectId) || startups[0];
  const projectRuns = runs.filter((r) => r.projectId === selectedProject?.id);
  const latestRun = projectRuns[0] || null;

  const handleRunMatching = async (projectId: string) => {
    try {
      setRunningMatch(true);
      setError(null);
      setSuccessMsg(null);
      const newRun = await runMentorMatching(projectId);
      setRuns((prev) => [newRun, ...prev.filter((r) => r.id !== newRun.id)]);
      setSuccessMsg(`Mentor Matching Agent successfully evaluated candidates for ${newRun.projectTitle}!`);
      // Refresh startups to get updated badges
      const updatedStartups = await fetchStartupsForMatching();
      setStartups(updatedStartups);
    } catch (err: any) {
      setError(err.message || "Execution error during mentor matching");
    } finally {
      setRunningMatch(false);
    }
  };

  const handleConfirmDecision = async (decision: "approved" | "rejected") => {
    if (!approvalModal.run || !approvalModal.rec) return;
    try {
      setApprovalModal((prev) => ({ ...prev, submitting: true }));
      setError(null);
      const updatedRun = await decideMentorRecommendation(
        approvalModal.run.id,
        decision,
        approvalModal.rec.mentor_id,
        approvalModal.rec.name,
        approvalModal.comments
      );

      setRuns((prev) => prev.map((r) => (r.id === updatedRun.id ? updatedRun : r)));
      setSuccessMsg(
        decision === "approved"
          ? `Mentor ${approvalModal.rec.name} confirmed! Onboarding meeting and kickoff task coordinated with Workflow Agent.`
          : `Recommendation recorded as rejected.`
      );
      setApprovalModal({ open: false, run: null, rec: null, comments: "", submitting: false });
      const updatedStartups = await fetchStartupsForMatching();
      setStartups(updatedStartups);
    } catch (err: any) {
      setError(err.message || "Failed to finalize mentor decision");
      setApprovalModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const pendingDecisionCount = runs.filter((r) => r.coordinatorDecision?.status === "pending").length;
  const confirmedAllocationsCount = startups.filter((p) => Boolean(p.allocatedMentorName)).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                <Sparkles className="size-3.5" />
                AI Agent 3 Active
              </span>
              <span className="text-xs text-muted-ink">LangGraph Orchestrated</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">AI Mentor Matching Hub</h1>
            <p className="text-sm text-muted-ink">
              Multi-criteria candidate evaluation matching startup domain, stage, challenges, and mentor capacity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-medium text-ink shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {selectedProject && (
              <button
                onClick={() => handleRunMatching(selectedProject.id)}
                disabled={runningMatch}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover disabled:opacity-50"
              >
                <Sparkles className={`size-3.5 ${runningMatch ? "animate-spin" : ""}`} />
                {runningMatch ? "Evaluating Mentors..." : "Run Matching for Selected"}
              </button>
            )}
          </div>
        </div>

        {/* Top KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50/70 p-3.5">
            <span className="text-xs font-medium text-muted-ink">Cohort Startups</span>
            <div className="mt-1 text-2xl font-bold text-ink">{startups.length}</div>
            <span className="text-[11px] text-muted-ink">Monitored for allocation</span>
          </div>
          <div className="rounded-lg bg-amber-50/50 p-3.5">
            <span className="text-xs font-medium text-amber-700">Pending Decisions</span>
            <div className="mt-1 text-2xl font-bold text-amber-900">{pendingDecisionCount}</div>
            <span className="text-[11px] text-amber-700">Awaiting coordinator review</span>
          </div>
          <div className="rounded-lg bg-emerald-50/50 p-3.5">
            <span className="text-xs font-medium text-emerald-700">Confirmed Allocations</span>
            <div className="mt-1 text-2xl font-bold text-emerald-900">{confirmedAllocationsCount}</div>
            <span className="text-[11px] text-emerald-700">Active mentor engagements</span>
          </div>
          <div className="rounded-lg bg-indigo-50/50 p-3.5">
            <span className="text-xs font-medium text-indigo-700">Matching Runs Logged</span>
            <div className="mt-1 text-2xl font-bold text-indigo-900">{runs.length}</div>
            <span className="text-[11px] text-indigo-700">Transparent audit trails</span>
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-line">
        <button
          onClick={() => setActiveTab("matching")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
            activeTab === "matching"
              ? "border-brand text-brand"
              : "border-transparent text-muted-ink hover:text-ink"
          }`}
        >
          <Sparkles className="size-3.5" />
          Cohort Matching Workdesk
        </button>
        <button
          onClick={() => setActiveTab("allocations")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
            activeTab === "allocations"
              ? "border-brand text-brand"
              : "border-transparent text-muted-ink hover:text-ink"
          }`}
        >
          <UserCheck className="size-3.5" />
          Confirmed Allocations ({confirmedAllocationsCount})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
            activeTab === "history"
              ? "border-brand text-brand"
              : "border-transparent text-muted-ink hover:text-ink"
          }`}
        >
          <Clock className="size-3.5" />
          Matching Execution History ({runs.length})
        </button>
      </div>

      {/* TAB 1: MATCHING WORKDESK */}
      {activeTab === "matching" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Startup Selector */}
          <div className="space-y-3 lg:col-span-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">Startups Portfolio</h2>
              <span className="text-xs text-muted-ink">{startups.length} Registered</span>
            </div>

            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {startups.map((p) => {
                const isSelected = p.id === selectedProjectId;
                const isAllocated = Boolean(p.allocatedMentorName);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-brand bg-brand/5 shadow-xs"
                        : "border-line bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-semibold text-ink">{p.title}</h3>
                      <span
                        className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${
                          isAllocated
                            ? "bg-emerald-100 text-emerald-800"
                            : p.mentorStatus === "Pending Decision"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-brand/10 text-brand"
                        }`}
                      >
                        {p.allocatedMentorName ? "Mentor Assigned" : p.mentorStatus}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-ink">
                      <span>{p.domain}</span>
                      <span>•</span>
                      <span>TRL {p.trl}</span>
                      <span>•</span>
                      <span>Lead: {p.leadStudent}</span>
                    </div>

                    {p.allocatedMentorName && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                        <UserCheck className="size-3" />
                        Mentor: {p.allocatedMentorName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Selected Startup Detail & Recommendations */}
          <div className="space-y-6 lg:col-span-8">
            {selectedProject ? (
              <>
                {/* Project Overview Card */}
                <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {selectedProject.domain}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          Stage: {selectedProject.stage}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          Progress: {selectedProject.progress}%
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-bold text-ink">{selectedProject.title}</h2>
                      <p className="mt-1 text-xs text-muted-ink">
                        {selectedProject.description || "No specific technical challenge notes recorded."}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRunMatching(selectedProject.id)}
                      disabled={runningMatch}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover disabled:opacity-50"
                    >
                      <Sparkles className={`size-3.5 ${runningMatch ? "animate-spin" : ""}`} />
                      {runningMatch ? "Evaluating..." : "Run AI Matching"}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-xs text-muted-ink">
                    <div>
                      Lead Student: <strong className="text-ink">{selectedProject.leadStudent}</strong> (
                      {selectedProject.rollNumber})
                    </div>
                    <div>
                      Coordinator: <strong className="text-ink">{selectedProject.assignedCoordinatorName}</strong>
                    </div>
                    {selectedProject.allocatedMentorName && (
                      <div className="text-emerald-700">
                        Allocated Mentor: <strong>{selectedProject.allocatedMentorName}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-ink">Evaluated Mentor Recommendations</h3>
                      {latestRun && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                          {latestRun.recommendations.length} Candidates Scored
                        </span>
                      )}
                    </div>
                    {latestRun && (
                      <span className="text-xs text-muted-ink">
                        Run: {new Date(latestRun.completedAt).toLocaleTimeString()} • Status:{" "}
                        <strong className="uppercase text-emerald-600">{latestRun.executionStatus}</strong>
                      </span>
                    )}
                  </div>

                  {!latestRun ? (
                    <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center">
                      <Sparkles className="mx-auto size-8 text-brand/40" />
                      <h4 className="mt-3 text-sm font-semibold text-ink">No Matching Executed Yet</h4>
                      <p className="mt-1 text-xs text-muted-ink">
                        Trigger the Mentor-Matching Agent to calculate compatibility scores across faculty and industry
                        mentors.
                      </p>
                      <button
                        onClick={() => handleRunMatching(selectedProject.id)}
                        disabled={runningMatch}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover"
                      >
                        <Sparkles className="size-3.5" />
                        Run Matching Now
                      </button>
                    </div>
                  ) : latestRun.recommendations.length === 0 ? (
                    <div className="rounded-xl border border-line bg-white p-8 text-center text-xs text-muted-ink">
                      No mentor recommendations returned for this startup.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {latestRun.recommendations.map((rec, index) => {
                        const isAllocated = selectedProject.allocatedMentorName === rec.name;
                        const isDecisionPending = latestRun.coordinatorDecision?.status === "pending";

                        return (
                          <div
                            key={rec.mentor_id || index}
                            className={`rounded-xl border p-5 transition ${
                              isAllocated
                                ? "border-emerald-300 bg-emerald-50/20"
                                : index === 0
                                ? "border-brand/40 bg-brand/5 shadow-xs"
                                : "border-line bg-white"
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                                    #{index + 1}
                                  </span>
                                  <h4 className="text-base font-bold text-ink">{rec.name}</h4>
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                    {rec.role}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-ink">
                                  <Building className="size-3.5" />
                                  <span>{rec.company}</span>
                                  <span>•</span>
                                  <span>{rec.email}</span>
                                </div>
                              </div>

                              {/* Match Score Badge */}
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-xl font-extrabold text-brand">{rec.match_score}%</div>
                                  <span className="text-[10px] font-medium text-muted-ink">Match Score</span>
                                </div>
                              </div>
                            </div>

                            {/* Score Breakdown Bar */}
                            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center text-[11px]">
                              <div>
                                <span className="text-muted-ink">Domain Synergy:</span>{" "}
                                <strong className="text-ink">{rec.score_breakdown?.domain_match ?? 40}/45</strong>
                              </div>
                              <div>
                                <span className="text-muted-ink">Technical Skills:</span>{" "}
                                <strong className="text-ink">{rec.score_breakdown?.skills_match ?? 30}/35</strong>
                              </div>
                              <div>
                                <span className="text-muted-ink">Capacity / Slots:</span>{" "}
                                <strong className="text-ink">
                                  {rec.current_load}/{rec.max_load} Active
                                </strong>
                              </div>
                            </div>

                            {/* Explanation */}
                            <p className="mt-3 text-xs leading-relaxed text-slate-700">
                              <strong className="text-ink">AI Matching Reason:</strong> {rec.explanation}
                            </p>

                            {/* Skills Matched */}
                            {rec.matched_skills && rec.matched_skills.length > 0 && (
                              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-medium text-muted-ink">Skills:</span>
                                {rec.matched_skills.map((skill, i) => (
                                  <span
                                    key={i}
                                    className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Warnings */}
                            {rec.duplicate_allocation_warning && (
                              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200">
                                <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
                                <span>Duplicate assignment warning: Mentor already holds advisory role on this startup.</span>
                              </div>
                            )}

                            {rec.capacity_conflict_warning && (
                              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800 border border-rose-200">
                                <AlertTriangle className="size-3.5 shrink-0 text-rose-600" />
                                <span>Capacity warning: Mentor has reached maximum advised projects threshold.</span>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                              <div className="text-xs text-muted-ink">
                                {isAllocated ? (
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                    <CheckCircle2 className="size-4" />
                                    Confirmed as Allocated Mentor
                                  </span>
                                ) : latestRun.coordinatorDecision?.status === "approved" ? (
                                  <span>Decision finalized for this run.</span>
                                ) : (
                                  <span>Awaiting coordinator confirmation.</span>
                                )}
                              </div>

                              {!isAllocated && isDecisionPending && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setApprovalModal({
                                        open: true,
                                        run: latestRun,
                                        rec,
                                        comments: `Approved allocation based on ${rec.match_score}% match score in ${rec.domain}.`,
                                        submitting: false,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover"
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                    Confirm Allocation
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-line bg-white p-12 text-center text-muted-ink">
                Select a startup to inspect mentor recommendations.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIRMED ALLOCATIONS */}
      {activeTab === "allocations" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-ink">Confirmed Mentor Allocations</h2>
            <p className="mt-0.5 text-xs text-muted-ink">
              Official mentorship assignments confirmed by the Faculty Incubation Coordinator.
            </p>

            <div className="mt-4 divide-y divide-line">
              {startups
                .filter((p) => Boolean(p.allocatedMentorName))
                .map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">{p.title}</h4>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-ink">
                        <span>{p.domain}</span>
                        <span>•</span>
                        <span>Lead: {p.leadStudent}</span>
                        <span>•</span>
                        <span>TRL {p.trl}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-right border border-emerald-200">
                        <div className="text-xs font-bold text-emerald-900">{p.allocatedMentorName}</div>
                        <div className="text-[10px] text-emerald-700">Official Mentor</div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setActiveTab("matching");
                        }}
                        className="inline-flex items-center gap-1 rounded border border-line px-2.5 py-1 text-xs text-muted-ink hover:text-ink"
                      >
                        Inspect Runs
                        <ChevronRight className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              {confirmedAllocationsCount === 0 && (
                <div className="py-8 text-center text-xs text-muted-ink">
                  No confirmed mentor allocations yet. Run mentor matching to approve candidates.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MATCHING HISTORY */}
      {activeTab === "history" && (
        <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-ink">Matching Execution Audit Trail</h2>
          <p className="mt-0.5 text-xs text-muted-ink">
            Historical log of all AI mentor matching executions, candidate rankings, and human decisions.
          </p>

          <div className="mt-4 divide-y divide-line">
            {runs.map((r) => (
              <div key={r.id} className="py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">{r.id}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        {r.projectTitle}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          r.coordinatorDecision?.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.coordinatorDecision?.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        Decision: {r.coordinatorDecision?.status || "pending"}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-700">
                      Evaluated: <strong>{r.evaluatedMentorsCount} mentors</strong> • Top Recommended:{" "}
                      <strong>{r.recommendations?.[0]?.name || "N/A"}</strong> ({r.recommendations?.[0]?.match_score}%)
                    </div>

                    {r.coordinatorDecision?.selectedMentorName && (
                      <div className="mt-1 text-xs text-emerald-700">
                        Coordinator Approved: <strong>{r.coordinatorDecision.selectedMentorName}</strong> by{" "}
                        {r.coordinatorDecision.decidedBy}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs text-muted-ink">
                    <div>{new Date(r.completedAt).toLocaleDateString()}</div>
                    <div>{new Date(r.completedAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            ))}
            {runs.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-ink">No matching runs recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* APPROVAL MODAL */}
      {approvalModal.open && approvalModal.rec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Confirm Mentor Allocation</h3>
              <button
                onClick={() => setApprovalModal({ open: false, run: null, rec: null, comments: "", submitting: false })}
                className="text-muted-ink hover:text-ink"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <div>
                  Startup: <strong className="text-ink">{approvalModal.run?.projectTitle}</strong>
                </div>
                <div>
                  Selected Mentor: <strong className="text-brand">{approvalModal.rec.name}</strong> (
                  {approvalModal.rec.role}, {approvalModal.rec.company})
                </div>
                <div>
                  Match Score: <strong className="text-emerald-700">{approvalModal.rec.match_score}%</strong>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Coordinator Decision Notes</label>
                <textarea
                  value={approvalModal.comments}
                  onChange={(e) => setApprovalModal((prev) => ({ ...prev, comments: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                  placeholder="State rationale for confirmation..."
                />
              </div>

              <div className="rounded-lg bg-indigo-50 p-3 text-[11px] text-indigo-900 border border-indigo-200">
                <ShieldCheck className="mb-1 size-4 text-indigo-700" />
                <strong>Automated Workflow Agent Actions:</strong>
                <p className="mt-0.5">
                  Confirming this allocation will automatically trigger the Workflow Agent to schedule an initial
                  onboarding meeting and assign kickoff tasks for the startup and mentor.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                onClick={() => handleConfirmDecision("rejected")}
                disabled={approvalModal.submitting}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Reject Recommendation
              </button>
              <button
                onClick={() => handleConfirmDecision("approved")}
                disabled={approvalModal.submitting}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {approvalModal.submitting ? "Confirming..." : "Confirm & Trigger Workflow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

