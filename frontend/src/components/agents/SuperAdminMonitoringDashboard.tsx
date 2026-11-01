"use client";

/**
 * SuperAdminMonitoringDashboard.tsx
 * Super Admin – Startup Monitoring Agent Technical Governance
 * Shows scheduler status, evaluation telemetry, DB connectivity, and execution traces.
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchSuperAdminMonitoringGovernance,
  pingAgentServiceDiagnostic,
  type SuperAdminMonitoringGovernance,
} from "@/services/superAdminAgentService";
import {
  RefreshCw,
  XCircle,
  Wifi,
  Terminal,
  Search,
} from "lucide-react";

function TraceModal({
  trace,
  onClose,
}: {
  trace: SuperAdminMonitoringGovernance["executionTraces"][0];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-ink">
            <Terminal className="size-3.5 text-brand" />
            Trace: {trace.traceId}
          </h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-muted-ink hover:text-ink"
          >
            ✕ Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto bg-slate-900 p-5">
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-200">
            {JSON.stringify(trace, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminMonitoringDashboard() {
  const [data, setData] = useState<SuperAdminMonitoringGovernance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<
    SuperAdminMonitoringGovernance["executionTraces"][0] | null
  >(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [traceSearch, setTraceSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await fetchSuperAdminMonitoringGovernance();
      setData(g);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to load monitoring governance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePing() {
    try {
      const r = await pingAgentServiceDiagnostic();
      setPingLatency(r.latencyMs);
    } catch {
      setPingLatency(-1);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-ink">
          <RefreshCw className="size-6 animate-spin text-brand" />
          <p className="text-xs">Loading monitoring telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <XCircle className="mx-auto mb-2 size-6 text-rose-500" />
        <p className="text-xs font-semibold text-rose-800">{error ?? "No data available"}</p>
        <button
          onClick={load}
          className="mt-3 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const isHealthy = (data.agentHealth ?? "").toUpperCase() === "HEALTHY";
  const sched = data.schedulerStatus;
  const metrics = data.metrics;
  const db = data.databaseConnectivity;
  const traces = data.executionTraces ?? [];

  const filteredTraces = traces.filter(
    (t) =>
      !traceSearch ||
      t.traceId.toLowerCase().includes(traceSearch.toLowerCase()) ||
      (t.projectTitle ?? "").toLowerCase().includes(traceSearch.toLowerCase()) ||
      (t.healthStatus ?? "").toLowerCase().includes(traceSearch.toLowerCase())
  );

  const successRate =
    metrics.totalEvaluations > 0
      ? (
          ((metrics.totalEvaluations - metrics.failedEvaluations) / metrics.totalEvaluations) *
          100
        ).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      {/* Precision Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-ink">
            <span>Governance</span>
            <span>/</span>
            <span className="text-brand">Portfolio Health Engine</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Startup Monitoring Governance
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-ink">
            Telemetry cron jobs, heuristic evaluations, DB connection states, and raw monitoring execution traces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pingLatency !== null && (
            <span className={`text-xs font-mono tabular-nums ${pingLatency < 0 ? "text-rose-600" : "text-emerald-700"}`}>
              {pingLatency < 0 ? "Ping error" : `${pingLatency}ms latency`}
            </span>
          )}
          <button
            onClick={handlePing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink shadow-2xs hover:bg-slate-50"
          >
            <Wifi className="size-3.5 text-muted-ink" /> Ping Agent Service
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-hover"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Scheduler Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5">
          <span className={`size-2.5 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-rose-500"}`} />
          <span className="font-bold text-ink">Engine Status: {data.agentHealth}</span>
          <span className="text-muted-ink">•</span>
          <span className="text-muted-ink">
            Telemetry Scheduler: <strong className="text-ink">{sched.active ? "Active" : "Paused"}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-ink font-mono">
          <span>Cron Cadence: {sched.cronSchedule}</span>
          <span>•</span>
          <span>Last Sweep: {sched.lastSweep ? new Date(sched.lastSweep).toLocaleTimeString() : "Pending"}</span>
          <span>•</span>
          <span>Next Sweep: {sched.nextScheduledSweep ? new Date(sched.nextScheduledSweep).toLocaleTimeString() : "Pending"}</span>
        </div>
      </div>

      {/* Unified Telemetry Strip */}
      <div className="grid grid-cols-2 divide-y divide-line rounded-xl border border-line bg-white shadow-2xs sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Total Evaluations</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{metrics.totalEvaluations}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Milestone scans</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Success Rate</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{successRate}%</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Reliability rate</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Avg Duration</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{metrics.avgDurationMs} ms</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Heuristic latency</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Scheduler Errors</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{metrics.schedulerErrors?.length ?? 0}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Dispatch errors</div>
        </div>
      </div>

      {/* Database & Subsystem Connectivity */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
        <div className="border-b border-line pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
            Persistence & Store Health
          </h2>
          <p className="mt-0.5 text-xs text-ink font-semibold">Database drivers & memory checkpointer connectivity</p>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line text-xs">
          <div className="py-2 sm:px-4 first:pl-0">
            <span className="text-muted-ink">Document Store & Checkpointer</span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-semibold text-ink">MongoDB</span>
              <span className="font-mono text-[11px] text-emerald-800 font-medium">{db.mongo || "Connected"}</span>
            </div>
          </div>
          <div className="py-2 sm:px-4 last:pr-0">
            <span className="text-muted-ink">Persistence Latency</span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-semibold text-ink">Roundtrip Query</span>
              <span className="font-mono text-[11px] text-emerald-800 font-medium">{db.latencyMs ?? 1} ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Trace Log */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Monitoring Execution Traces
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Inspect granular evaluation passes and observation payloads</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
            <input
              type="text"
              placeholder="Search traces..."
              value={traceSearch}
              onChange={(e) => setTraceSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-muted-ink focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 divide-y divide-line text-xs">
          {filteredTraces.slice(0, 10).map((t) => (
            <div key={t.traceId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-500">{t.traceId}</span>
                  <span className="font-semibold text-ink">{t.projectTitle}</span>
                  <span className="font-mono text-[11px] text-muted-ink">{t.latencyMs}ms</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                      t.healthStatus?.toLowerCase() === "on_track" || t.healthStatus?.toLowerCase() === "healthy"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : t.healthStatus?.toLowerCase() === "needs_attention"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {t.healthStatus}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-ink">
                  Health Score: <strong className="text-ink">{t.healthScore}/100</strong> • Risk Flags:{" "}
                  <strong>{t.riskFlagsCount}</strong> • Interventions: <strong>{t.interventionsCount}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-ink font-mono tabular-nums">
                  {new Date(t.evaluatedAt).toLocaleTimeString()}
                </span>
                <button
                  onClick={() => setSelectedTrace(t)}
                  className="rounded border border-line bg-white px-2 py-1 text-[11px] text-muted-ink hover:text-ink hover:bg-slate-50"
                >
                  Inspect Payload
                </button>
              </div>
            </div>
          ))}
          {filteredTraces.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-ink">No monitoring traces match the query.</div>
          )}
        </div>
      </div>

      {selectedTrace && <TraceModal trace={selectedTrace} onClose={() => setSelectedTrace(null)} />}
    </div>
  );
}
