"use client";

/**
 * SuperAdminWorkflowDashboard.tsx
 * Super Admin – Workflow Technical Operations & Event Bus Governance
 * Shows event queue metrics, worker health, DLQ, service connectivity, and execution logs.
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchSuperAdminWorkflowGovernance,
  reprocessSuperAdminDeadLetterEvent,
  pingAgentServiceDiagnostic,
  type SuperAdminWorkflowGovernance,
} from "@/services/superAdminAgentService";
import {
  Activity,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Cpu,
  Wifi,
  RotateCcw,
  Search,
} from "lucide-react";

function fmtBytes(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

function fmtUptime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function SuperAdminWorkflowDashboard() {
  const [data, setData] = useState<SuperAdminWorkflowGovernance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [logFilter, setLogFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await fetchSuperAdminWorkflowGovernance();
      setData(g);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to load workflow governance data");
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

  async function handleReprocess(eventId: string) {
    setReprocessing(eventId);
    try {
      await reprocessSuperAdminDeadLetterEvent(eventId);
      await load();
    } catch (e: unknown) {
      alert(`Reprocess failed: ${(e as Error)?.message}`);
    } finally {
      setReprocessing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-ink">
          <RefreshCw className="size-6 animate-spin text-brand" />
          <p className="text-xs">Loading workflow telemetry...</p>
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
  const q = data.queue;
  const w = data.worker;
  const sched = data.scheduler;
  const conn = data.serviceConnectivity;
  const dlq = data.deadLetterQueue ?? [];
  const logs = data.executionLogs ?? [];

  const filteredLogs = logs.filter((l) => {
    const matchStatus = logFilter === "all" || l.status.toLowerCase() === logFilter;
    const matchSearch =
      !logSearch ||
      l.actionType.toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.projectTitle ?? "").toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.targetName ?? "").toLowerCase().includes(logSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Precision Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-ink">
            <span>Governance</span>
            <span>/</span>
            <span className="text-brand">Workflow & Queue Telemetry</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Workflow Engine Governance
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-ink">
            Event bus queue telemetry, background worker process health, and dead-letter queue recovery.
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

      {/* Scheduler & Health Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5">
          <span className={`size-2.5 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-rose-500"}`} />
          <span className="font-bold text-ink">Engine Status: {data.agentHealth}</span>
          <span className="text-muted-ink">•</span>
          <span className="text-muted-ink">
            Scheduler: <strong className="text-ink">{sched.status}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-ink font-mono">
          <span>Poll Interval: {(sched.pollingIntervalMs / 1000).toFixed(0)}s</span>
          <span>•</span>
          <span>Batch Size: {sched.batchSize}</span>
          <span>•</span>
          <span>Lock Duration: {sched.lockDurationSeconds}s</span>
        </div>
      </div>

      {/* Unified Queue Telemetry Strip */}
      <div className="grid grid-cols-2 divide-y divide-line rounded-xl border border-line bg-white shadow-2xs sm:grid-cols-3 lg:grid-cols-6 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Total Events</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{q.totalEvents}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Persisted lifecycle events</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Pending</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{q.pendingEvents}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">In queue awaiting pickup</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">In Flight</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{q.processingEvents}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Currently executing</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Completed</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{q.completedEvents}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Delivered idempotently</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Failed</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{q.failedEvents}</div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Under retry policy</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">Dead Letter (DLQ)</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-ink tabular-nums">{q.deadLetterCount}</span>
            {q.deadLetterCount > 0 && (
              <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[10px] font-semibold text-rose-800">
                Action required
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-ink">Exhausted retry threshold</div>
        </div>
      </div>

      {/* Two Column Grid: Worker Process Health & Service Connectivity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Worker Process Health */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Worker Runtime Process
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Node.js background event consumer telemetry</p>
          </div>

          <div className="mt-3 divide-y divide-line text-xs">
            {[
              { label: "Process ID (PID)", value: w.pid },
              { label: "Worker Uptime", value: fmtUptime(w.uptimeSeconds) },
              { label: "Node.js Runtime", value: w.nodeVersion },
              { label: "V8 Heap Used", value: fmtBytes(w.memoryUsageMb.heapUsed) },
              { label: "V8 Heap Total", value: fmtBytes(w.memoryUsageMb.heapTotal) },
              { label: "Resident Set Size (RSS)", value: fmtBytes(w.memoryUsageMb.rss) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <span className="text-muted-ink">{row.label}</span>
                <span className="font-mono font-semibold text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* External Service Connectivity */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Service Mesh & Subsystems
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Live connection status across persistence and agent microservices</p>
          </div>

          <div className="mt-3 divide-y divide-line text-xs">
            {[
              { label: "Express Backend API", status: conn?.expressApi?.status, port: conn?.expressApi?.port },
              { label: "FastAPI Agent Service", status: conn?.agentService?.status, port: conn?.agentService?.port, latency: conn?.agentService?.latencyMs },
              { label: "MongoDB Document Store", status: conn?.mongodb?.status },
              { label: "SQLite Local Fallback", status: conn?.sqliteFallback?.status },
            ].map((svc) => {
              const connected = (svc.status ?? "").toLowerCase() === "connected" || (svc.status ?? "").toLowerCase() === "healthy";
              return (
                <div key={svc.label} className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-ink">{svc.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <span className={`font-mono text-[11px] font-medium ${connected ? "text-emerald-800" : "text-rose-700"}`}>
                      {svc.status || "Unknown"} {svc.port ? `(:${svc.port})` : ""} {svc.latency ? `[${svc.latency}ms]` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dead Letter Queue Inspection */}
      {dlq.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Dead-Letter Queue (DLQ)
              </h2>
              <p className="text-xs text-amber-800">Events that failed max retry attempts. Inspect and trigger reprocessing.</p>
            </div>
            <span className="font-mono text-xs font-bold text-amber-900">{dlq.length} in DLQ</span>
          </div>

          <div className="mt-3 divide-y divide-amber-200/40 text-xs">
            {dlq.map((ev) => (
              <div key={ev.eventId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-700">{ev.eventId.slice(-8)}</span>
                    <strong className="text-ink">{ev.eventType}</strong>
                    <span className="text-muted-ink">• Attempts: {ev.attempts}/{ev.maxAttempts}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-rose-700 font-mono">
                    {ev.lastError || "Execution timeout or unhandled exception"}
                  </div>
                </div>

                <button
                  onClick={() => handleReprocess(ev.eventId)}
                  disabled={reprocessing === ev.eventId}
                  className="inline-flex items-center gap-1 rounded border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-slate-50 shadow-2xs"
                >
                  <RotateCcw className={`size-3 ${reprocessing === ev.eventId ? "animate-spin" : ""}`} />
                  {reprocessing === ev.eventId ? "Reprocessing..." : "Reprocess Event"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Audit Trail */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Execution Event Log
            </h2>
            <p className="mt-0.5 text-xs text-ink font-semibold">Granular dispatch trail of tasks, meetings, reminders, and alerts</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full rounded-lg border border-line bg-white pl-8 pr-2.5 py-1.5 text-xs text-ink placeholder:text-muted-ink focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 divide-y divide-line text-xs">
          {filteredLogs.slice(0, 10).map((l) => (
            <div key={l.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-500">{l.id.slice(-8)}</span>
                  <span className="font-semibold text-ink">{l.actionType}</span>
                  <span className="text-muted-ink">•</span>
                  <span className="text-slate-600">{l.projectTitle || "Center Operation"}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                      l.status === "completed"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : l.status === "failed"
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
                {l.targetName && (
                  <div className="mt-0.5 text-[11px] text-muted-ink">Target: {l.targetName}</div>
                )}
              </div>

              <div className="text-right text-[11px] text-muted-ink font-mono tabular-nums">
                {new Date(l.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-ink">No execution logs match the filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
