"use client";

/**
 * SuperAdminMonitoringDashboard.tsx
 * Super Admin – Startup Monitoring Agent Technical Governance
 * Shows scheduler status, evaluation telemetry, DB connectivity, and execution traces.
 * Data from /api/super-admin/agents/monitoring/governance.
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchSuperAdminMonitoringGovernance,
  pingAgentServiceDiagnostic,
  type SuperAdminMonitoringGovernance,
} from "@/services/superAdminAgentService";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  Wifi,
  BarChart2,
  Terminal,
  Layers,
} from "lucide-react";

/* ─── helpers ───────────────────────────────────────────────────────────── */
function badge(label: string, variant: "green" | "amber" | "red" | "sky" | "slate") {
  const cls: Record<string, string> = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    sky: "bg-sky-100 text-sky-800",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls[variant]}`}>
      {label}
    </span>
  );
}

function healthBadge(status: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "on_track" || s === "healthy") return badge(status, "green");
  if (s === "needs_attention") return badge(status, "amber");
  if (s === "at_risk" || s === "critical") return badge(status, "red");
  return badge(status, "slate");
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
  const iconCls: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    sky: "bg-sky-100 text-sky-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-600",
  };
  return (
    <div className="rounded-xl border border-line bg-canvas p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-ink">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-ink">{sub}</p>}
        </div>
        <span className={`rounded-lg p-2 ${iconCls[accent]}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

/* ─── Trace Detail Modal ────────────────────────────────────────────────── */
function TraceModal({
  trace,
  onClose,
}: {
  trace: SuperAdminMonitoringGovernance["executionTraces"][0];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <h3 className="flex items-center gap-2 font-mono text-sm font-semibold text-slate-100">
            <Terminal className="size-4 text-green-400" />
            Trace: {trace.traceId}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ✕ Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <pre className="whitespace-pre-wrap font-mono text-xs text-green-300">
            {JSON.stringify(trace, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────────────── */
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

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-ink">
          <RefreshCw className="size-8 animate-spin" />
          <p className="text-sm">Loading monitoring governance data…</p>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Monitoring Agent — Technical Governance</h1>
          <p className="mt-1 text-sm text-muted-ink">
            Scheduler status · evaluation telemetry · database connectivity · execution traces
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
            Cron: <span className="font-mono">{sched.cronSchedule}</span> · Scheduler:{" "}
            {sched.active ? "Active" : "Stopped"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Evaluations"
          value={metrics.totalEvaluations}
          icon={BarChart2}
          accent="slate"
        />
        <KpiCard
          label="Failed Evaluations"
          value={metrics.failedEvaluations}
          icon={XCircle}
          accent={metrics.failedEvaluations > 0 ? "red" : "slate"}
        />
        <KpiCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={CheckCircle2}
          accent="green"
          sub={`${metrics.totalEvaluations - metrics.failedEvaluations} successful`}
        />
        <KpiCard
          label="Avg Duration"
          value={`${metrics.avgDurationMs}ms`}
          icon={Clock}
          accent="sky"
        />
      </div>

      {/* Scheduler + DB status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scheduler details */}
        <div className="rounded-xl border border-line bg-canvas shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Clock className="size-4 text-brand" /> Scheduler Status
            </h2>
          </div>
          <div className="divide-y divide-line">
            {[
              { label: "Cron Expression", value: sched.cronSchedule },
              { label: "Status", value: sched.active ? "Active ✓" : "Stopped ✗" },
              {
                label: "Last Sweep",
                value: sched.lastSweep
                  ? new Date(sched.lastSweep).toLocaleString()
                  : "Not yet run",
              },
              {
                label: "Next Scheduled",
                value: sched.nextScheduledSweep
                  ? new Date(sched.nextScheduledSweep).toLocaleString()
                  : "—",
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-muted-ink">{row.label}</span>
                <span className="font-mono text-xs font-semibold text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* DB connectivity */}
        <div className="rounded-xl border border-line bg-canvas shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Database className="size-4 text-brand" /> Database Connectivity
            </h2>
          </div>
          <div className="divide-y divide-line">
            {[
              {
                label: "MongoDB Status",
                value: db.mongo,
                ok: db.mongo === "connected",
              },
              { label: "Latency", value: `${db.latencyMs}ms`, ok: db.latencyMs < 200 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-muted-ink">{row.label}</span>
                <div className="flex items-center gap-2">
                  {row.ok ? (
                    <CheckCircle2 className="size-3.5 text-green-500" />
                  ) : (
                    <XCircle className="size-3.5 text-red-500" />
                  )}
                  <span className="font-mono text-xs font-semibold text-ink">{row.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Scheduler errors */}
          {metrics.schedulerErrors && metrics.schedulerErrors.length > 0 && (
            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold text-red-700">Scheduler Errors</p>
              <div className="max-h-32 overflow-y-auto rounded-lg bg-red-50 p-3">
                {metrics.schedulerErrors.map((err, i) => (
                  <p key={i} className="font-mono text-xs text-red-700">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Execution Traces */}
      <div className="rounded-xl border border-line bg-canvas shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Layers className="size-4 text-brand" /> Execution Traces
            <span className="text-xs font-normal text-muted-ink">({traces.length} records)</span>
          </h2>
          <input
            type="text"
            placeholder="Search trace / project / status…"
            value={traceSearch}
            onChange={(e) => setTraceSearch(e.target.value)}
            className="w-56 rounded-lg border border-line px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {filteredTraces.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-ink">No matching traces</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-left">
                  {[
                    "Trace ID",
                    "Project",
                    "Health Status",
                    "Score",
                    "Risk Flags",
                    "Interventions",
                    "Latency",
                    "Tokens",
                    "Fallback",
                    "Evaluated At",
                    "",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-muted-ink">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredTraces.slice(0, 50).map((t) => (
                  <tr key={t.traceId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sky-700">
                      {t.traceId.substring(0, 12)}…
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-ink">
                      {t.projectTitle || t.projectId}
                    </td>
                    <td className="px-4 py-3">{healthBadge(t.healthStatus)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{t.healthScore}</td>
                    <td className="px-4 py-3 font-mono text-ink">{t.riskFlagsCount}</td>
                    <td className="px-4 py-3 font-mono text-ink">{t.interventionsCount}</td>
                    <td className="px-4 py-3 font-mono text-muted-ink">{t.latencyMs}ms</td>
                    <td className="px-4 py-3 font-mono text-muted-ink">{t.tokensUsed}</td>
                    <td className="px-4 py-3">
                      {t.fallbackUsed ? (
                        <span className="text-amber-600">⚠ Yes</span>
                      ) : (
                        <span className="text-green-600">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-ink">
                      {new Date(t.evaluatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedTrace(t)}
                        className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        <Terminal className="size-3" /> JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTraces.length > 50 && (
              <p className="border-t border-line px-5 py-3 text-center text-xs text-muted-ink">
                Showing first 50 of {filteredTraces.length} traces
              </p>
            )}
          </div>
        )}
      </div>

      {/* Trace modal */}
      {selectedTrace && (
        <TraceModal trace={selectedTrace} onClose={() => setSelectedTrace(null)} />
      )}
    </div>
  );
}
