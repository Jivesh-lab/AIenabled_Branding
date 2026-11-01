"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  CheckCircle2,
  RefreshCw,
  Code,
  Zap,
} from "lucide-react";
import {
  fetchSuperAdminMentorMatchingGovernance,
  pingAgentServiceDiagnostic,
  SuperAdminMentorMatchingGovernance,
} from "@/services/superAdminAgentService";

export default function SuperAdminMentorMatchingDashboard() {
  const [data, setData] = useState<SuperAdminMentorMatchingGovernance | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pinging, setPinging] = useState<boolean>(false);
  const [selectedTrace, setSelectedTrace] = useState<SuperAdminMentorMatchingGovernance["executionTraces"][0] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const gov = await fetchSuperAdminMentorMatchingGovernance();
      setData(gov);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load mentor matching technical governance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handlePing = async () => {
    try {
      setPinging(true);
      setError(null);
      const ping = await pingAgentServiceDiagnostic();
      setSuccessMsg(`Diagnostic ping successful: ${ping.latencyMs}ms roundtrip latency (Status: ${ping.status}).`);
      await loadData();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Ping failed");
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
              Super Admin System Governance
            </span>
            <span className="text-xs text-muted-ink">Agent Technical Operations & Tracing</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            AI Mentor-Matching Agent Governance
          </h1>
          <p className="mt-1 text-sm text-muted-ink">
            Inspect LangGraph multi-agent execution telemetry, algorithm scoring weights, LLM latency, and raw traces.
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
            onClick={handlePing}
            disabled={pinging}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Zap className={`h-4 w-4 ${pinging ? "animate-spin" : ""}`} />
            {pinging ? "Pinging Service..." : "Diagnostic Ping (8000)"}
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

      {/* TECHNICAL HEALTH & RUNTIME METRICS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Agent Service</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xl font-bold text-ink">{data?.agentHealth ?? "..."}</p>
          </div>
          <p className="mt-1 text-[11px] text-muted-ink">FastAPI (Port 8000)</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Roundtrip Latency</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{data?.pingLatencyMs ?? "..."} ms</p>
          <p className="mt-1 text-[11px] text-emerald-700">Service ping time</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Total Runs</p>
          <p className="mt-1 text-xl font-bold text-ink">{data?.metrics.totalExecutions ?? "..."}</p>
          <p className="mt-1 text-[11px] text-muted-ink">All matching requests</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Success Rate</p>
          <p className="mt-1 text-xl font-bold text-indigo-600">{data ? `${data.metrics.successRate}%` : "..."}</p>
          <p className="mt-1 text-[11px] text-indigo-700">Successful matches</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Avg Execution</p>
          <p className="mt-1 text-xl font-bold text-brand">{data?.metrics.avgDurationMs ?? "..."} ms</p>
          <p className="mt-1 text-[11px] text-muted-ink">Model & heuristic run</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-ink">Tool / Fallback</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{data?.metrics.toolFailuresCount ?? "0"}</p>
          <p className="mt-1 text-[11px] text-amber-700">Offline fallbacks used</p>
        </div>
      </div>

      {/* TECHNICAL CONFIGURATION & ARCHITECTURE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Agent Engine Architecture & Node Configuration</h2>
              <p className="text-xs text-muted-ink">Runtime model provider, node graph binding, and vector retrieval setup</p>
            </div>
            <Cpu className="h-5 w-5 text-slate-700" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-canvas p-3">
              <span className="text-muted-ink font-medium">Orchestrator Node</span>
              <p className="mt-0.5 font-semibold text-ink">{data?.configuration.node || "mentor_matching"}</p>
            </div>
            <div className="rounded-lg bg-canvas p-3">
              <span className="text-muted-ink font-medium">Framework</span>
              <p className="mt-0.5 font-semibold text-ink">{data?.configuration.framework || "LangGraph Orchestrator"}</p>
            </div>
            <div className="rounded-lg bg-canvas p-3 col-span-2">
              <span className="text-muted-ink font-medium">Inference Model</span>
              <p className="mt-0.5 font-semibold text-ink">{data?.configuration.provider || "OpenRouter / Meta Llama 3.3 70B"}</p>
            </div>
            <div className="rounded-lg bg-canvas p-3">
              <span className="text-muted-ink font-medium">Embedding Model</span>
              <p className="mt-0.5 font-semibold text-ink">{data?.configuration.embeddingModel || "text-embedding-3-small"}</p>
            </div>
            <div className="rounded-lg bg-canvas p-3">
              <span className="text-muted-ink font-medium">Idempotency State Store</span>
              <p className="mt-0.5 font-semibold text-emerald-600">Active (SQLite / PG Connection Pool)</p>
            </div>
          </div>
        </div>

        {/* ALGORITHM SCORING WEIGHTS */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Algorithm Scoring Dimensions & Weights</h2>
              <p className="text-xs text-muted-ink">Multi-factor heuristic and semantic vector weighting model</p>
            </div>
            <Code className="h-5 w-5 text-indigo-600" />
          </div>

          <div className="space-y-3">
            {Object.entries(data?.configuration.scoringWeights || { skills: 0.4, stage: 0.25, capacity: 0.2, domain: 0.15 }).map(([key, val]) => (
              <div key={key} className="rounded-lg border border-line p-3 bg-canvas/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink capitalize">{key} Compatibility</span>
                  <span className="font-mono text-muted-ink">Weight: {Number(val) * 100}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-slate-900"
                    style={{ width: `${Number(val) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RAW EXECUTION TRACES TABLE */}
      <div className="rounded-xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Agent Execution Telemetry & Traces</h2>
            <p className="text-xs text-muted-ink">Raw LangGraph execution traces, token consumption, and latency profiling</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-xs font-mono">
            <thead className="bg-canvas font-semibold text-muted-ink">
              <tr>
                <th className="px-4 py-3">Trace ID</th>
                <th className="px-4 py-3">Project ID</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Execution Status</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Evaluated Mentors</th>
                <th className="px-4 py-3 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {(data?.executionTraces || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-ink">
                    No execution traces available in database.
                  </td>
                </tr>
              ) : (
                (data?.executionTraces || []).map((t) => (
                  <tr key={t.traceId} className="hover:bg-canvas/50 transition">
                    <td className="px-4 py-3 text-slate-800 font-bold">{t.traceId.slice(0, 14)}</td>
                    <td className="px-4 py-3 text-muted-ink">{t.projectId}</td>
                    <td className="px-4 py-3 text-muted-ink">{t.domain}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{t.latencyMs} ms</td>
                    <td className="px-4 py-3 text-muted-ink">{t.tokensUsed || 0}</td>
                    <td className="px-4 py-3 text-ink">{t.recommendationsCount} scored</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedTrace(t)}
                        className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                      >
                        Inspect Trace
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TRACE INSPECTION MODAL */}
      {selectedTrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-slate-950 p-6 text-white shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-400">Execution Trace: {selectedTrace.traceId}</h3>
                <p className="text-[11px] text-slate-400">Project: {selectedTrace.projectTitle} ({selectedTrace.projectId})</p>
              </div>
              <button
                onClick={() => setSelectedTrace(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="bg-slate-900 p-2.5 rounded">
                <span className="text-slate-400">Runtime:</span> {selectedTrace.latencyMs} ms
              </div>
              <div className="bg-slate-900 p-2.5 rounded">
                <span className="text-slate-400">Tokens:</span> {selectedTrace.tokensUsed || 0}
              </div>
              <div className="bg-slate-900 p-2.5 rounded">
                <span className="text-slate-400">Fallback Used:</span> {selectedTrace.fallbackUsed ? "YES" : "NO"}
              </div>
            </div>

            <div>
              <p className="text-[11px] text-slate-400 mb-1">Evaluated Recommendations Raw Telemetry:</p>
              <pre className="max-h-60 overflow-y-auto rounded bg-slate-900 p-3 text-[11px] text-slate-300">
                {JSON.stringify(selectedTrace.recommendationScores, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTrace(null)}
                className="rounded bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

