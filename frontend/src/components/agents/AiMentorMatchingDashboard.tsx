"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
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
  Check,
  SlidersHorizontal,
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
  const [startupSearch, setStartupSearch] = useState<string>("");
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

  const filteredStartups = useMemo(() => {
    if (!startupSearch.trim()) return startups;
    const q = startupSearch.toLowerCase();
    return startups.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.domain?.toLowerCase().includes(q) ||
        p.leadStudent?.toLowerCase().includes(q)
    );
  }, [startups, startupSearch]);

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
      setSuccessMsg(`Evaluation completed for ${newRun.projectTitle}. ${newRun.recommendations.length} candidate profiles ranked.`);
      const updatedStartups = await fetchStartupsForMatching();
      setStartups(updatedStartups);
    } catch (err: any) {
      setError(err.message || "Execution error during candidate evaluation");
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
          ? `Mentor ${approvalModal.rec.name} confirmed for ${selectedProject?.title}. Kickoff tasks scheduled.`
          : `Candidate recommendation marked as declined.`
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
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-ink">
            <span>Incubation Management</span>
            <span>/</span>
            <span className="text-brand">Mentorship Program</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Mentor Allocation Hub</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-ink">
            Systematic candidate evaluation assessing domain expertise, technical track record, and advisory availability.
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
          {selectedProject && (
            <button
              onClick={() => handleRunMatching(selectedProject.id)}
              disabled={runningMatch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover disabled:opacity-50"
            >
              <SlidersHorizontal className={`size-3.5 ${runningMatch ? "animate-spin" : ""}`} />
              {runningMatch ? "Evaluating..." : "Run Match Engine"}
            </button>
          )}
        </div>
      </div>

      {/* Unified Enterprise Metrics Strip */}
      <div className="grid grid-cols-2 divide-y divide-line rounded-xl border border-line bg-white shadow-2xs sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Cohort Startups</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-ink tabular-nums">{startups.length}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Active portfolio ventures</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Pending Decisions</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">{pendingDecisionCount}</span>
            {pendingDecisionCount > 0 && (
              <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                Action required
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Awaiting coordinator review</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Confirmed Allocations</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-ink tabular-nums">{confirmedAllocationsCount}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Startups paired with advisors</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Evaluations Logged</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-ink tabular-nums">{runs.length}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Auditable algorithm runs</div>
        </div>
      </div>

      {/* Status Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          <AlertTriangle className="size-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Understated Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-line">
        <button
          onClick={() => setActiveTab("matching")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === "matching"
              ? "border-brand text-brand"
              : "border-transparent text-muted-ink hover:text-ink"
          }`}
        >
          Candidate Allocation Workbench
        </button>
        <button
          onClick={() => setActiveTab("allocations")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === "allocations"
              ? "border-brand text-brand"
              : "border-transparent text-muted-ink hover:text-ink"
          }`}
        >
          Confirmed Allocations
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            {confirmedAllocationsCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === "history"
              ? "border-brand text-brand"
              : "border-transparent text-muted-ink hover:text-ink"
          }`}
        >
          Evaluation Audit Trail
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            {runs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ALLOCATION WORKBENCH */}
      {activeTab === "matching" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Startup Directory */}
          <div className="space-y-3 lg:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
              <input
                type="text"
                placeholder="Search startups by name or domain..."
                value={startupSearch}
                onChange={(e) => setStartupSearch(e.target.value)}
                className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink placeholder:text-muted-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>

            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {filteredStartups.map((p) => {
                const isSelected = p.id === selectedProjectId;
                const isAllocated = Boolean(p.allocatedMentorName);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`group cursor-pointer rounded-xl border p-3.5 transition ${
                      isSelected
                        ? "border-brand bg-brand/[0.03] shadow-xs"
                        : "border-line bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-xs font-bold text-ink group-hover:text-brand">
                        {p.title}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          isAllocated
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : p.mentorStatus === "Pending Decision"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            isAllocated ? "bg-emerald-600" : p.mentorStatus === "Pending Decision" ? "bg-amber-500" : "bg-slate-400"
                          }`}
                        />
                        {p.allocatedMentorName ? "Mentor Assigned" : p.mentorStatus || "Unassigned"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-ink">
                      <span>{p.domain}</span>
                      <span>•</span>
                      <span>TRL {p.trl}</span>
                      <span>•</span>
                      <span>Stage: {p.stage}</span>
                    </div>

                    {p.allocatedMentorName && (
                      <div className="mt-2 flex items-center gap-1.5 rounded bg-emerald-50/60 px-2 py-1 text-[11px] text-emerald-800">
                        <UserCheck className="size-3 text-emerald-600" />
                        <span>Advisor: <strong>{p.allocatedMentorName}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredStartups.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-ink">No startups match the search filter.</div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Startup Context & Evaluated Candidates */}
          <div className="space-y-5 lg:col-span-8">
            {selectedProject ? (
              <>
                {/* Startup Context Panel */}
                <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
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
                      <p className="mt-1 text-xs text-muted-ink leading-relaxed">
                        {selectedProject.description || "No specific technical challenge notes recorded."}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRunMatching(selectedProject.id)}
                      disabled={runningMatch}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-brand-hover disabled:opacity-50"
                    >
                      <SlidersHorizontal className={`size-3.5 ${runningMatch ? "animate-spin" : ""}`} />
                      {runningMatch ? "Evaluating..." : "Run Evaluation"}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-muted-ink">Founder / Lead:</span>{" "}
                      <strong className="text-ink">{selectedProject.leadStudent}</strong>
                    </div>
                    <div>
                      <span className="text-muted-ink">Coordinator:</span>{" "}
                      <strong className="text-ink">{selectedProject.assignedCoordinatorName}</strong>
                    </div>
                    {selectedProject.allocatedMentorName && (
                      <div className="col-span-2 sm:col-span-1 text-emerald-800">
                        <span>Advisor: <strong>{selectedProject.allocatedMentorName}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidate Recommendations List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-ink">Evaluated Mentor Profiles</h3>
                      {latestRun && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {latestRun.recommendations.length} Candidates
                        </span>
                      )}
                    </div>
                    {latestRun && (
                      <span className="text-[11px] text-muted-ink">
                        Last Run: {new Date(latestRun.completedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {!latestRun ? (
                    <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center">
                      <Users className="mx-auto size-8 text-slate-300" />
                      <h4 className="mt-2 text-xs font-semibold text-ink">No Evaluation Conducted Yet</h4>
                      <p className="mt-1 text-[11px] text-muted-ink max-w-sm mx-auto">
                        Trigger the matching engine to score faculty and industry mentors against domain alignment and bandwidth.
                      </p>
                      <button
                        onClick={() => handleRunMatching(selectedProject.id)}
                        disabled={runningMatch}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
                      >
                        <SlidersHorizontal className="size-3" />
                        Run Matching Engine
                      </button>
                    </div>
                  ) : latestRun.recommendations.length === 0 ? (
                    <div className="rounded-xl border border-line bg-white p-8 text-center text-xs text-muted-ink">
                      No matching mentor profiles qualified for this startup.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {latestRun.recommendations.map((rec, index) => {
                        const isAllocated = selectedProject.allocatedMentorName === rec.name;
                        const isDecisionPending = latestRun.coordinatorDecision?.status === "pending";
                        const initials = rec.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();

                        return (
                          <div
                            key={rec.mentor_id || index}
                            className={`rounded-xl border p-4.5 transition ${
                              isAllocated
                                ? "border-emerald-300 bg-emerald-50/20"
                                : index === 0
                                ? "border-brand/30 bg-brand/[0.01] shadow-2xs"
                                : "border-line bg-white"
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                                  {initials}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-ink">{rec.name}</h4>
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                      {rec.role}
                                    </span>
                                    {index === 0 && (
                                      <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                        Top Fit
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-ink">
                                    <Building className="size-3" />
                                    <span>{rec.company}</span>
                                    <span>•</span>
                                    <span>{rec.email}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-lg font-bold text-brand tabular-nums">{rec.match_score}%</div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-ink">Compatibility</span>
                              </div>
                            </div>

                            {/* Fit Breakdown */}
                            <div className="mt-3.5 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-slate-50/50 py-2 text-center text-xs">
                              <div>
                                <span className="text-muted-ink">Domain Fit:</span>{" "}
                                <strong className="text-ink">{rec.score_breakdown?.domain_match ?? 40}/45</strong>
                              </div>
                              <div>
                                <span className="text-muted-ink">Tech Fit:</span>{" "}
                                <strong className="text-ink">{rec.score_breakdown?.skills_match ?? 30}/35</strong>
                              </div>
                              <div>
                                <span className="text-muted-ink">Bandwidth:</span>{" "}
                                <strong className="text-ink">
                                  {rec.current_load}/{rec.max_load} Load
                                </strong>
                              </div>
                            </div>

                            {/* Observation note */}
                            <div className="mt-3 border-l-2 border-brand/50 pl-3 py-0.5 text-xs text-slate-600 bg-slate-50/40 rounded-r">
                              <span className="font-semibold text-ink">Assessment:</span> {rec.explanation}
                            </div>

                            {/* Matched skills */}
                            {rec.matched_skills && rec.matched_skills.length > 0 && (
                              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-muted-ink">Domain Skills:</span>
                                {rec.matched_skills.map((skill, i) => (
                                  <span
                                    key={i}
                                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Conflict Warnings */}
                            {rec.duplicate_allocation_warning && (
                              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
                                <span>Duplicate assignment warning: Mentor already holds advisory role on this startup.</span>
                              </div>
                            )}

                            {/* Card Footer Actions */}
                            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                              <div className="text-muted-ink">
                                {isAllocated ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                                    <Check className="size-3.5 text-emerald-600" />
                                    Active Assigned Mentor
                                  </span>
                                ) : latestRun.coordinatorDecision?.status === "approved" ? (
                                  <span>Allocation finalized for this cycle.</span>
                                ) : (
                                  <span>Awaiting coordinator action.</span>
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
                                        comments: `Approved allocation based on ${rec.match_score}% fit in ${rec.domain}.`,
                                        submitting: false,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover shadow-2xs"
                                  >
                                    <Check className="size-3.5" />
                                    Confirm Advisor
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
              <div className="rounded-xl border border-line bg-white p-12 text-center text-xs text-muted-ink">
                Select a startup from the directory to review mentor evaluations.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIRMED ALLOCATIONS */}
      {activeTab === "allocations" && (
        <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Active Mentor Assignments</h2>
              <p className="text-xs text-muted-ink">Confirmed mentorship relationships across cohort startups.</p>
            </div>
            <span className="text-xs font-semibold text-brand tabular-nums">{confirmedAllocationsCount} Active</span>
          </div>

          <div className="mt-3 divide-y divide-line">
            {startups
              .filter((p) => Boolean(p.allocatedMentorName))
              .map((p) => (
                <div key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-ink">{p.title}</h4>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-ink">
                      <span>{p.domain}</span>
                      <span>•</span>
                      <span>Founder: {p.leadStudent}</span>
                      <span>•</span>
                      <span>TRL {p.trl}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-ink">{p.allocatedMentorName}</div>
                      <div className="text-[10px] text-emerald-800">Confirmed Advisor</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setActiveTab("matching");
                      }}
                      className="rounded border border-line px-2 py-1 text-[11px] text-muted-ink hover:text-ink hover:bg-slate-50"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            {confirmedAllocationsCount === 0 && (
              <div className="py-8 text-center text-xs text-muted-ink">
                No active mentor allocations. Use the workbench to confirm mentor pairings.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === "history" && (
        <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="text-sm font-bold text-ink">Evaluation History & Decisions</h2>
            <p className="text-xs text-muted-ink">Auditable record of all algorithmic runs and coordinator sign-offs.</p>
          </div>

          <div className="mt-3 divide-y divide-line">
            {runs.map((r) => (
              <div key={r.id} className="py-3 text-xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-600">{r.id.slice(-8)}</span>
                      <strong className="text-ink">{r.projectTitle}</strong>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                          r.coordinatorDecision?.status === "approved"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : r.coordinatorDecision?.status === "rejected"
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {r.coordinatorDecision?.status || "pending review"}
                      </span>
                    </div>

                    <div className="mt-1 text-muted-ink">
                      Scored <strong>{r.evaluatedMentorsCount} mentors</strong> • Top candidate:{" "}
                      <strong className="text-ink">{r.recommendations?.[0]?.name || "N/A"}</strong> (
                      {r.recommendations?.[0]?.match_score}%)
                    </div>

                    {r.coordinatorDecision?.selectedMentorName && (
                      <div className="mt-0.5 text-emerald-800 text-[11px]">
                        Confirmed: <strong>{r.coordinatorDecision.selectedMentorName}</strong> by{" "}
                        {r.coordinatorDecision.decidedBy}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-muted-ink tabular-nums">
                    {new Date(r.completedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            {runs.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-ink">No historical runs recorded.</div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {approvalModal.open && approvalModal.rec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink">Confirm Mentor Allocation</h3>
              <button
                onClick={() => setApprovalModal({ open: false, run: null, rec: null, comments: "", submitting: false })}
                className="text-muted-ink hover:text-ink"
              >
                <XCircle className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <div>Startup: <strong className="text-ink">{approvalModal.run?.projectTitle}</strong></div>
                <div>Advisor: <strong className="text-brand">{approvalModal.rec.name}</strong> ({approvalModal.rec.company})</div>
                <div>Compatibility: <strong className="text-emerald-800">{approvalModal.rec.match_score}%</strong></div>
              </div>

              <div>
                <label className="font-semibold text-ink">Coordinator Decision Notes</label>
                <textarea
                  value={approvalModal.comments}
                  onChange={(e) => setApprovalModal((prev) => ({ ...prev, comments: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none"
                  placeholder="Rationale for approval..."
                />
              </div>

              <div className="text-[11px] text-muted-ink leading-relaxed">
                Confirming will notify the advisor and founder, initiating kickoff workflows.
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                onClick={() => handleConfirmDecision("rejected")}
                disabled={approvalModal.submitting}
                className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Decline
              </button>
              <button
                onClick={() => handleConfirmDecision("approved")}
                disabled={approvalModal.submitting}
                className="rounded bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {approvalModal.submitting ? "Confirming..." : "Confirm Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
