"use client";

/**
 * SuperAdminWorkflowDashboard.tsx
 * Super Admin – Workflow Agent Technical Governance
 * Shows raw queue metrics, worker health, DLQ, service connectivity, and execution logs.
 * Read-only for super_admin. Data from /api/super-admin/agents/workflow/governance.
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
  Zap,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Cpu,
  Wifi,
  WifiOff,
  RotateCcw,
  FileText,
} from "lucide-react";

/* ─── helpers ───────────────────────────────────────────────────────────── */

function badge(label: string, variant: "green" | "amber" | "red" | "sky" | "slate") {
  const cls = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    sky: "bg-sky-100 text-sky-800",
    slate: "bg-slate-100 text-slate-600",
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function statusBadge(status: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "completed" || s === "delivered" || s === "healthy") return badge(status, "green");
  if (s === "pending" || s === "processing") return badge(status, "sky");
  if (s === "failed" || s === "dead_letter" || s === "unhealthy") return badge(status, "red");
  if (s === "retrying") return badge(status, "amber");
  return badge(status, "slate");
}

function fmtBytes(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

function fmtUptime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/* ─── KPI card ─────────────────────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
  accent = "slate",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  accent?: "slate" | "sky" | "green" | "amber" | "red";
}) {
  const iconCls = {
    slate: "bg-slate-100 text-slate-600",
    sky: "bg-sky-100 text-sky-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-600",
  }[accent];
  return (
    <div className="rounded-xl border border-line bg-canvas p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-ink">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-ink">{sub}</p>}
        </div>
        <span className={`rounded-lg p-2 ${iconCls}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────────────── */
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div className="flex flex-col items-center gap-3 text-muted-ink">
          <RefreshCw className="size-8 animate-spin" />
          <p className="text-sm">Loading workflow governance data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <XCircle className="mx-auto mb-2 size-8 text-red-400" />
        <p className="text-sm font-medium text-red-700">{error ?? "No data available"}</p>
        <button
          onClick={load}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Workflow Agent — Technical Governance</h1>
          <p className="mt-1 text-sm text-muted-ink">
            Queue health · worker metrics · service connectivity · dead-letter queue
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pingLatency !== null && (
            <span className={`text-xs font-mono ${pingLatency < 0 ? "text-red-600" : "text-green-600"}`}>
              {pingLatency < 0 ? "ping failed" : `ping ${pingLatency}ms`}
            </span>
          )}
          <button
            onClick={handlePing}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink hover:bg-slate-50"
          >
            <Wifi className="size-3.5" /> Ping Service
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Health banner */}
      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${
          isHealthy ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
        }`}
      >
        {isHealthy ? (
          <CheckCircle2 className="size-6 text-green-500" />
        ) : (
          <AlertTriangle className="size-6 text-red-500" />
        )}
        <div>
          <p className={`font-semibold ${isHealthy ? "text-green-800" : "text-red-800"}`}>
            Agent Health: {data.agentHealth}
          </p>
          <p className={`text-xs ${isHealthy ? "text-green-700" : "text-red-700"}`}>
            Scheduler: {sched.status} · Poll: {(sched.pollingIntervalMs / 1000).toFixed(0)}s · Batch:{" "}
            {sched.batchSize} · Lock: {sched.lockDurationSeconds}s
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Events" value={q.totalEvents} icon={Activity} accent="slate" />
        <KpiCard label="Pending" value={q.pendingEvents} icon={Clock} accent="sky" />
        <KpiCard label="Processing" value={q.processingEvents} icon={Zap} accent="amber" />
        <KpiCard label="Completed" value={q.completedEvents} icon={CheckCircle2} accent="green" />
        <KpiCard label="Failed" value={q.failedEvents} icon={XCircle} accent="red" />
        <KpiCard
          label="Dead Letter"
          value={q.deadLetterCount}
          icon={AlertTriangle}
          accent={q.deadLetterCount > 0 ? "red" : "slate"}
        />
      </div>

      {/* Worker + Service connectivity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Worker health */}
        <div className="rounded-xl border border-line bg-canvas shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Cpu className="size-4 text-brand" /> Worker Process Health
            </h2>
          </div>
          <div className="divide-y divide-line">
            {[
              { label: "PID", value: w.pid },
              { label: "Uptime", value: fmtUptime(w.uptimeSeconds) },
              { label: "Node Version", value: w.nodeVersion },
              { label: "Heap Used", value: fmtBytes(w.memoryUsageMb.heapUsed) },
              { label: "Heap Total", value: fmtBytes(w.memoryUsageMb.heapTotal) },
              { label: "RSS", value: fmtBytes(w.memoryUsageMb.rss) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-muted-ink">{row.label}</span>
                <span className="font-mono text-xs font-semibold text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service connectivity */}
        <div className="rounded-xl border border-line bg-canvas shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Server className="size-4 text-brand" /> Service Connectivity
            </h2>
          </div>
          <div className="divide-y divide-line">
            {[
              {
                label: "Express API",
                ok: conn.expressApi.status === "connected",
                detail: `port ${conn.expressApi.port}`,
              },
              {
                label: "Agent Service (FastAPI)",
                ok: conn.agentService.status === "connected",
                detail: `port ${conn.agentService.port} · ${conn.agentService.latencyMs}ms`,
              },
              {
                label: "MongoDB",
                ok: conn.mongodb.status === "connected",
                detail: conn.mongodb.status,
              },
              {
                label: "SQLite Fallback",
                ok: conn.sqliteFallback.status === "connected",
                detail: conn.sqliteFallback.status,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  {row.ok ? (
                    <Wifi className="size-3.5 text-green-500" />
                  ) : (
                    <WifiOff className="size-3.5 text-red-500" />
                  )}
                  <span className="text-xs text-ink">{row.label}</span>
                </div>
                <span className="font-mono text-xs text-muted-ink">{row.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dead-Letter Queue */}
      <div className="rounded-xl border border-line bg-canvas shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertTriangle className="size-4 text-red-500" /> Dead-Letter Queue
            {dlq.length > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {dlq.length}
              </span>
            )}
          </h2>
        </div>
        {dlq.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-ink">
            <CheckCircle2 className="mb-2 size-8 text-green-400" />
            <p className="text-sm">No dead-letter events. Queue is clear.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-left">
                  {["Event Type", "Aggregate", "Attempts", "Last Error", "Created", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-muted-ink">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dlq.map((ev) => (
                  <tr key={ev.eventId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-ink">{ev.eventType}</td>
                    <td className="px-4 py-3 text-muted-ink">{ev.aggregateType}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">
                      {ev.attempts}/{ev.maxAttempts}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-red-700">{ev.lastError || "—"}</td>
                    <td className="px-4 py-3 text-muted-ink">
                      {new Date(ev.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={reprocessing === ev.eventId}
                        onClick={() => handleReprocess(ev.eventId)}
                        className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        <RotateCcw className="size-3" />
                        {reprocessing === ev.eventId ? "Reprocessing…" : "Reprocess"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Execution Log */}
      <div className="rounded-xl border border-line bg-canvas shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FileText className="size-4 text-brand" /> Execution Log
            <span className="text-xs font-normal text-muted-ink">({logs.length} records)</span>
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search action / project / target…"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-48 rounded-lg border border-line px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="rounded-lg border border-line px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="retrying">Retrying</option>
              <option value="dead_letter">Dead Letter</option>
            </select>
          </div>
        </div>
        {filteredLogs.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-ink">No matching records</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-left">
                  {["Action Type", "Project", "Target", "Status", "Retries", "Created", "Delivered"].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 font-semibold text-muted-ink">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredLogs.slice(0, 100).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-ink">{log.actionType}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-muted-ink">
                      {log.projectTitle || log.projectId}
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      <span className="capitalize">{log.targetRole}</span>
                      {log.targetName ? ` · ${log.targetName}` : ""}
                    </td>
                    <td className="px-4 py-3">{statusBadge(log.status)}</td>
                    <td className="px-4 py-3 font-mono">
                      {log.retryCount}/{log.maxRetries}
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      {log.deliveredAt ? new Date(log.deliveredAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length > 100 && (
              <p className="border-t border-line px-5 py-3 text-center text-xs text-muted-ink">
                Showing first 100 of {filteredLogs.length} records
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
