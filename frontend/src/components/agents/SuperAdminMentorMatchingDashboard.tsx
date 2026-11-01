"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  RefreshCw,
  Code,
  Zap,
  Server,
  Terminal,
  Activity,
  Check,
  AlertTriangle,
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

  const isHealthy = (data?.agentHealth ?? "").toUpperCase() === "HEALTHY";

  return (
    <div className="space-y-6">
      {/* Precision Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-ink">
            <span>Governance</span>
            <span>/</span>
            <span className="text-brand">Matching Engine Telemetry</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Mentor-Matching Technical Operations
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-ink">
            Runtime execution telemetry, node graph bindings, algorithm weights, and execution trace inspection.
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
            onClick={handlePing}
            disabled={pinging}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-deep px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Zap className={`size-3.5 ${pinging ? "animate-spin" : ""}`} />
            {pinging ? "Pinging..." : "Diagnostic Ping (:8000)"}
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

      {/* Unified Telemetry Strip */}
      <div className="grid grid-cols-2 divide-y divide-line rounded-xl border border-line bg-white shadow-2xs sm:grid-cols-3 lg:grid-cols-6 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Service Status</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span className="text-xl font-bold tracking-tight text-ink">{data?.agentHealth ?? "..."}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-ink">FastAPI (Port 8000)</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Roundtrip Latency</div>
          <div className="mt-1 font-mono text-xl font-bold text-ink tabular-nums">{data?.pingLatencyMs ?? "..."} ms</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Diagnostic ping roundtrip</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Total Executions</div>
          <div className="mt-1 font-mono text-xl font-bold text-ink tabular-nums">{data?.metrics.totalExecutions ?? "..."}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">All matching cycles</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Success Rate</div>
          <div className="mt-1 font-mono text-xl font-bold text-ink tabular-nums">{data ? `${data.metrics.successRate}%` : "..."}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Execution reliability</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Avg Duration</div>
          <div className="mt-1 font-mono text-xl font-bold text-ink tabular-nums">{data?.metrics.avgDurationMs ?? "..."} ms</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Candidate scoring pass</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Fallback Count</div>
          <div className="mt-1 font-mono text-xl font-bold text-ink tabular-nums">{data?.metrics.toolFailuresCount ?? 0}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Offline fallback events</div>
        </div>
      </div>

      {/* Technical Architecture & Weights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Node Binding & Architecture */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Engine Topology & Configuration
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Graph orchestrator nodes & inference provider binding</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-line bg-slate-50/50 p-3">
              <span className="text-[11px] text-muted-ink font-medium">Orchestrator Node</span>
              <p className="mt-0.5 font-mono font-semibold text-ink">{data?.configuration.node || "mentor_matching"}</p>
            </div>
            <div className="rounded-lg border border-line bg-slate-50/50 p-3">
              <span className="text-[11px] text-muted-ink font-medium">Framework</span>
              <p className="mt-0.5 font-semibold text-ink">{data?.configuration.framework || "LangGraph StateGraph"}</p>
            </div>
            <div className="col-span-2 rounded-lg border border-line bg-slate-50/50 p-3">
              <span className="text-[11px] text-muted-ink font-medium">Primary Inference Model</span>
              <p className="mt-0.5 font-mono font-semibold text-ink">{data?.configuration.provider || "OpenRouter / Llama 3.3 70B"}</p>
            </div>
            <div className="rounded-lg border border-line bg-slate-50/50 p-3">
              <span className="text-[11px] text-muted-ink font-medium">Embedding Model</span>
              <p className="mt-0.5 font-mono font-semibold text-ink">{data?.configuration.embeddingModel || "text-embedding-3-small"}</p>
            </div>
            <div className="rounded-lg border border-line bg-slate-50/50 p-3">
              <span className="text-[11px] text-muted-ink font-medium">State Store</span>
              <p className="mt-0.5 font-mono font-semibold text-ink">
                {data?.configuration.idempotencyEnabled ? "StateStore (Idempotent)" : "In-Memory"}
              </p>
            </div>
          </div>
        </div>

        {/* Algorithm Scoring Matrix */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Multi-Criteria Scoring Weights
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Normalized distribution across matching heuristic factors</p>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            {Object.entries(data?.configuration.scoringWeights || { domainMatch: 45, skillsMatch: 35, capacityBalance: 20 }).map(
              ([key, val]) => (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize text-ink">
                      {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </span>
                    <span className="font-mono font-bold text-ink">{Number(val)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Number(val)}%` }} />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Raw Trace Log */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
        <div className="border-b border-line pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
            Execution Traces & Latency Breakdown
          </h2>
          <p className="mt-0.5 text-xs text-ink font-semibold">Inspection of granular execution steps and candidate payloads</p>
        </div>

        <div className="mt-3 divide-y divide-line">
          {(data?.executionTraces || []).slice(0, 10).map((t) => (
            <div key={t.traceId} className="flex flex-col gap-2 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-500">{t.traceId}</span>
                  <span className="font-semibold text-ink">{t.projectTitle}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-700 font-mono">
                    {t.latencyMs}ms
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                      t.status === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-ink">
                  Candidate pool: <strong>{t.recommendationsCount} mentors</strong> • Top match:{" "}
                  <strong className="text-ink">{t.recommendationScores?.[0]?.overallScore ?? "—"}%</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-ink font-mono tabular-nums">
                  {new Date(t.createdAt).toLocaleTimeString()}
                </span>
                <button
                  onClick={() => setSelectedTrace(t)}
                  className="rounded border border-line bg-white px-2 py-1 text-[11px] text-muted-ink hover:text-ink hover:bg-slate-50"
                >
                  Inspect Trace
                </button>
              </div>
            </div>
          ))}
          {(data?.executionTraces || []).length === 0 && (
            <div className="py-8 text-center text-xs text-muted-ink">No execution traces recorded yet.</div>
          )}
        </div>
      </div>

      {/* Trace Inspection Modal */}
      {selectedTrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-line bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink">Trace: {selectedTrace.traceId}</h3>
              <button onClick={() => setSelectedTrace(null)} className="text-xs font-semibold text-muted-ink hover:text-ink">
                Close
              </button>
            </div>
            <div className="mt-4 max-h-96 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-slate-200">
              <pre>{JSON.stringify(selectedTrace, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
