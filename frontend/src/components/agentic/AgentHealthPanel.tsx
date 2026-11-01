"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { ErrorState, Spinner } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import { friendlyThrown } from "@/lib/friendlyError";
import { AGENTIC, agenticRequest, formatWhen, timeAgo, useAgentic, type FeedItem } from "@/lib/agentic";

interface JobRow { id: string; type: string; agent: string; state: string; step: string; attempts: number; lastError: string | null; nextRunAt: string | null; updatedAt: string; history?: { at: string; from: string; to: string; note: string }[] }
interface Health {
  scheduler: { status: "healthy" | "stalled" | "never_ran"; workerId: string | null; startedAt: string | null; lastTickAt: string | null; lastTickMs: number | null; lastSweepAt: string | null; tickCount: number; lastError: string | null; lastRecovery: { at: string; jobs: number } | null; tickEveryMs: number; sweepEveryMs: number };
  jobs: { byState: Record<string, number>; dueNow: number };
  failedJobs: JobRow[];
  retryingJobs: JobRow[];
  escalatedJobs: JobRow[];
  eventQueue: { depth: number; byStatus: Record<string, number> };
  agents: { agent: string; total: number; failed: number; escalations: number; errorRate: number }[];
  integrations: { demoMode: boolean; email: { mode: string; missing?: string[] }; calendar: { mode: string; missing?: string[] }; llm: { configured: boolean; missing?: string[] } };
}
interface EventRow { eventId: string; type: string; status: string; attempts: number; error: string | null; at: string }
interface OutboxRow { id: string; channel: string; mode: string; status: string; to: string[]; subject: string; error: string | null; at: string }

const SCHEDULER_TONE = { healthy: "success", stalled: "danger", never_ran: "attention" } as const;
const SCHEDULER_LABEL = { healthy: "Running", stalled: "Stalled", never_ran: "Has not run yet" } as const;
const TABS = ["Overview", "Jobs", "Events", "Action log", "Outbox"] as const;

function Row({ children }: { children: React.ReactNode }) {
  return <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12.5px]">{children}</li>;
}

function Tab({ name }: { name: (typeof TABS)[number] }) {
  if (name === "Events") return <EventsTab />;
  if (name === "Action log") return <LogTab />;
  if (name === "Outbox") return <OutboxTab />;
  return null;
}

function EventsTab() {
  const { data, error, reload } = useAgentic<EventRow[]>(`${AGENTIC}/super/events?limit=60`, { refreshMs: 15000 });
  if (error && !data) return <ErrorState title="Could not load events" message={error} onRetry={reload} />;
  return (
    <ul className="divide-y divide-line">
      {(data || []).map((e) => (
        <Row key={e.eventId}>
          <span className="font-mono text-[12px] text-ink">{e.type}</span>
          <span className="text-muted-ink">{e.status}{e.attempts > 1 ? ` · ${e.attempts} attempts` : ""}{e.error ? ` · ${e.error}` : ""} · {timeAgo(e.at)}</span>
        </Row>
      ))}
      {data && data.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-muted-ink">No events recorded yet.</li>}
    </ul>
  );
}

function LogTab() {
  const { data, error, reload } = useAgentic<FeedItem[]>(`${AGENTIC}/admin/log?limit=80`, { refreshMs: 15000 });
  if (error && !data) return <ErrorState title="Could not load the action log" message={error} onRetry={reload} />;
  return (
    <ul className="divide-y divide-line">
      {(data || []).map((i) => (
        <Row key={i.id}>
          <span className="min-w-0 flex-1 text-ink">{i.summary}</span>
          <span className="text-muted-ink">{i.agent} · tier {i.tier} · {i.statusLabel} · {timeAgo(i.at)}</span>
        </Row>
      ))}
      {data && data.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-muted-ink">Nothing has been recorded yet.</li>}
    </ul>
  );
}

function OutboxTab() {
  const { data, error, reload } = useAgentic<OutboxRow[]>(`${AGENTIC}/super/outbox`, { refreshMs: 30000 });
  if (error && !data) return <ErrorState title="Could not load the outbox" message={error} onRetry={reload} />;
  return (
    <ul className="divide-y divide-line">
      {(data || []).map((m) => (
        <Row key={m.id}>
          <span className="min-w-0 flex-1 text-ink">{m.subject || m.channel} <span className="text-muted-ink">to {m.to.join(", ") || "nobody"}</span></span>
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", m.status === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : m.status === "failed" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
            {m.status === "simulated" ? "Sandbox - not delivered" : m.status === "sent" ? "Sent" : "Failed"}
          </span>
          <span className="text-muted-ink">{timeAgo(m.at)}</span>
        </Row>
      ))}
      {data && data.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-muted-ink">No messages yet.</li>}
    </ul>
  );
}

/** Super Admin: is the machinery running, what is stuck, what has failed - and the manual override controls. */
export default function AgentHealthPanel() {
  const { data, error, loading, reload } = useAgentic<Health>(`${AGENTIC}/health`, { refreshMs: 10000 });
  const jobs = useAgentic<JobRow[]>(`${AGENTIC}/super/jobs`, { refreshMs: 15000 });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [running, setRunning] = useState<string | null>(null);

  async function runNow(agent: string, label: string) {
    setRunning(agent);
    try {
      await agenticRequest(`${AGENTIC}/override/run`, { method: "POST", json: { agent } });
      toast.success(`${label} ran. The result is in the action log.`);
      reload();
      jobs.reload();
    } catch (e) {
      toast.error(friendlyThrown(e));
    } finally {
      setRunning(null);
    }
  }

  async function retryJob(id: string) {
    try {
      await agenticRequest(`${AGENTIC}/override/jobs/${id}/retry`, { method: "POST", json: {} });
      toast.success("Queued to run again.");
      reload();
      jobs.reload();
    } catch (e) {
      toast.error(friendlyThrown(e));
    }
  }

  if (error && !data) return <Card><ErrorState title="Could not load agent health" message={error} onRetry={reload} /></Card>;
  const s = data?.scheduler;

  return (
    <section aria-label="Agent health" className="space-y-4">
      <SectionHeading title="Agent health" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[12px] font-medium text-muted-ink">Scheduler</p>
          <div className="mt-1.5">{s ? <StatusBadge label={SCHEDULER_LABEL[s.status]} tone={SCHEDULER_TONE[s.status]} /> : <Spinner className="size-4" />}</div>
          {s?.lastTickAt && <p className="mt-2 text-[11.5px] text-muted-ink">Last tick {timeAgo(s.lastTickAt)} ({s.lastTickMs} ms) · {s.tickCount.toLocaleString()} ticks</p>}
          {s?.lastSweepAt && <p className="text-[11.5px] text-muted-ink">Last sweep {timeAgo(s.lastSweepAt)}</p>}
          {s?.status === "never_ran" && <p className="mt-2 text-[11.5px] text-muted-ink">Start the backend with EVENT_ORCHESTRATOR_ENABLED not set to false.</p>}
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-medium text-muted-ink">Worker</p>
          <p className="mt-1.5 break-all text-[13px] font-medium text-ink">{s?.workerId || "No worker has reported"}</p>
          {s?.startedAt && <p className="mt-2 text-[11.5px] text-muted-ink">Up since {formatWhen(s.startedAt)}</p>}
          {s?.lastRecovery && <p className="text-[11.5px] text-muted-ink">Recovered {s.lastRecovery.jobs} interrupted job(s) {timeAgo(s.lastRecovery.at)}</p>}
          {s?.lastError && <p className="mt-1 text-[11.5px] text-danger">Last error: {s.lastError}</p>}
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-medium text-muted-ink">Event queue</p>
          <p className="mt-1.5 text-[26px] font-semibold leading-none text-ink">{data?.eventQueue.depth ?? "-"}</p>
          <p className="mt-2 text-[11.5px] text-muted-ink">waiting or retrying · {data?.eventQueue.byStatus.dead_letter ?? 0} dead-lettered</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-medium text-muted-ink">Jobs</p>
          <p className="mt-1.5 text-[26px] font-semibold leading-none text-ink">{data ? Object.entries(data.jobs.byState).filter(([k]) => !["done", "failed"].includes(k)).reduce((n, [, v]) => n + v, 0) : "-"}</p>
          <p className="mt-2 text-[11.5px] text-muted-ink">open · {data?.jobs.dueNow ?? 0} due now · {data?.jobs.byState.failed ?? 0} failed · {data?.jobs.byState.retrying ?? 0} retrying</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div role="tablist" aria-label="Agent details" className="flex gap-1 overflow-x-auto border-b border-line px-2 pt-2">
          {TABS.map((name) => (
            <button key={name} role="tab" aria-selected={tab === name} type="button" onClick={() => setTab(name)} className={cn("whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium", tab === name ? "border-b-2 border-brand text-brand" : "text-muted-ink hover:text-ink")}>{name}</button>
          ))}
        </div>
        {tab === "Overview" && (
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-ink">Error rate per agent</p>
              <table className="w-full text-left text-[12.5px]">
                <thead><tr className="text-muted-ink"><th className="py-1 font-medium">Agent</th><th className="font-medium">Actions</th><th className="font-medium">Failed</th><th className="font-medium">Error rate</th><th className="font-medium">Escalations</th></tr></thead>
                <tbody>
                  {(data?.agents || []).map((a) => <tr key={a.agent} className="border-t border-line"><td className="py-1.5 text-ink">{a.agent}</td><td>{a.total}</td><td>{a.failed}</td><td className={a.errorRate > 10 ? "text-danger" : ""}>{a.errorRate}%</td><td>{a.escalations}</td></tr>)}
                  {data && data.agents.length === 0 && <tr><td colSpan={5} className="py-3 text-muted-ink">No agent has acted yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-ink">Integrations</p>
              <ul className="space-y-1.5 text-[12.5px] text-ink">
                <li>Email: <b>{data?.integrations.email.mode}</b>{data?.integrations.email.missing?.length ? <span className="text-muted-ink"> - add {data.integrations.email.missing.join(", ")}</span> : null}</li>
                <li>Calendar: <b>{data?.integrations.calendar.mode}</b>{data?.integrations.calendar.missing?.length ? <span className="text-muted-ink"> - add {data.integrations.calendar.missing.join(", ")}</span> : null}</li>
                <li>AI model: <b>{data?.integrations.llm.configured ? "live" : "rules only"}</b>{data?.integrations.llm.missing?.length ? <span className="text-muted-ink"> - add {data.integrations.llm.missing.join(", ")}</span> : null}</li>
                {data?.integrations.demoMode && <li className="text-brand-gold-ink">Demo mode is forced on: nothing leaves the server.</li>}
              </ul>
            </div>
          </div>
        )}
        {tab === "Jobs" && (
          <ul className="divide-y divide-line">
            {(jobs.data || []).map((j) => (
              <Row key={j.id}>
                <span className="min-w-0 flex-1"><span className="font-medium text-ink">{j.agent}</span> <span className="text-muted-ink">{j.type} · {j.step}</span>{j.lastError && <span className="block text-danger">{j.lastError}</span>}</span>
                <span className="text-muted-ink">{j.state.replace(/_/g, " ")}{j.attempts ? ` · ${j.attempts} failed attempt(s)` : ""} · {timeAgo(j.updatedAt)}</span>
                {["failed", "retrying", "escalated"].includes(j.state) && <button type="button" onClick={() => retryJob(j.id)} className="h-7 rounded-md border border-line px-2 text-[12px] font-medium text-ink hover:border-brand/40">Run again</button>}
              </Row>
            ))}
            {jobs.data && jobs.data.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-muted-ink">No jobs yet. They are created automatically as applications, mentors and meetings move.</li>}
          </ul>
        )}
        <Tab name={tab} />
      </Card>

      <Card className="border-brand-gold/40 bg-brand-gold/5 p-4">
        <p className="text-[13.5px] font-semibold text-ink">Run now (override)</p>
        <p className="mt-0.5 text-[12.5px] text-muted-ink">The agents run on their own. These controls force an immediate run for testing or recovery; every use is written to the action log under your name.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[["monitoring", "Monitoring sweep"], ["investor", "Investor readiness sweep"], ["scheduler", "Scheduler tick"]].map(([agent, label]) => (
            <button key={agent} type="button" disabled={running !== null} onClick={() => runNow(agent, label)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-brand/40 disabled:opacity-60">
              {running === agent && <Spinner className="size-4" />} Run now: {label}
            </button>
          ))}
        </div>
      </Card>
    </section>
  );
}
