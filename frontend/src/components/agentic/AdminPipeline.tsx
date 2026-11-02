"use client";

import Link from "next/link";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { ErrorState } from "@/components/shared/loading/primitives";
import { AGENTIC, useAgentic } from "@/lib/agentic";

interface Pipeline {
  applicationsAwaitingDecision: number;
  applicationsByStatus?: Record<string, number> | null;
  introductionsAwaitingApproval: number;
  stuckWorkflows: number;
  jobsByState: Record<string, number>;
  last30Days: { actions: number; succeeded: number; failed: number; escalations: number; successRate: number | null; escalationRate: number | null };
}

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "attention" | "danger" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <p className="text-[12px] font-medium text-muted-ink">{label}</p>
      <p className={`mt-1 text-[26px] font-semibold leading-none tracking-tight ${tone === "danger" ? "text-danger" : tone === "attention" ? "text-brand-gold-ink" : "text-ink"}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[11.5px] text-muted-ink">{hint}</p>}
    </div>
  );
}

/** The admin's centre-wide pipeline: what is waiting on them and how well the agents are doing. */
export default function AdminPipeline({ className }: { className?: string }) {
  const { data, error, reload } = useAgentic<Pipeline>(`${AGENTIC}/admin/pipeline`, { refreshMs: 30000 });
  if (error && !data) return <Card className={className}><ErrorState title="Could not load the pipeline" message={error} onRetry={reload} /></Card>;
  const pct = (v: number | null) => (v === null ? "No data yet" : `${v}%`);
  return (
    <section aria-label="Pipeline" className={className}>
      <SectionHeading title="Pipeline" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Applications awaiting a decision" value={data?.applicationsAwaitingDecision ?? "-"} tone={data && data.applicationsAwaitingDecision > 0 ? "attention" : undefined} />
        <Stat label="Introductions awaiting approval" value={data?.introductionsAwaitingApproval ?? "-"} tone={data && data.introductionsAwaitingApproval > 0 ? "attention" : undefined} />
        <Stat label="Stuck workflows" value={data?.stuckWorkflows ?? "-"} tone={data && data.stuckWorkflows > 0 ? "danger" : undefined} hint="Escalated or failed, centre-wide" />
        <Stat label="Agent success rate" value={data ? pct(data.last30Days.successRate) : "-"} hint={data ? `${data.last30Days.actions} actions in 30 days` : undefined} />
        <Stat label="Escalation rate" value={data ? pct(data.last30Days.escalationRate) : "-"} hint={data ? `${data.last30Days.escalations} escalation${data.last30Days.escalations === 1 ? "" : "s"} in 30 days` : undefined} />
      </div>
      {data?.applicationsByStatus && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]" aria-label="Applications by status">
          <span className="font-medium text-muted-ink">Applications:</span>
          {([["submitted", "Awaiting review", "pending"], ["approved", "Approved", "approved"], ["revision_requested", "Revision requested", "revision_requested"], ["rejected", "Rejected", "rejected"]] as const).map(([key, label, filter]) => {
            const count = key === "submitted" ? (data.applicationsByStatus?.submitted ?? 0) + (data.applicationsByStatus?.under_review ?? 0) : data.applicationsByStatus?.[key] ?? 0;
            return (
              <Link key={key} href={`/workspace/admin/applications?status=${filter}`} className="rounded-full border border-line bg-white px-2.5 py-1 font-medium text-ink hover:border-brand/40 hover:text-brand">
                {label} <span className="font-semibold">{count}</span>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[12px] text-muted-ink">
        Users, CSV uploads and approvals of new accounts now live under <Link href="/workspace/admin/users" className="font-medium text-brand hover:underline">User Management</Link>.
      </p>
    </section>
  );
}
