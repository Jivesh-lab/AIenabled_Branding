"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { actionForSignal, describeHealth, MONITORING_UNAVAILABLE } from "@/lib/monitoringView";
import type { MonitoringResponse } from "@/types/student-application";

export type MonitoringResult = { ok: true; data: MonitoringResponse } | { ok: false; message: string; canRetry: boolean };

const TONE = { success: "success", attention: "attention", danger: "danger", neutral: "neutral" } as const;

/**
 * Project monitoring. Shows only what the monitoring check actually returned. A failed or empty check is shown as
 * such - never as "on track" - and findings are suggestions, not decisions: nothing here changes any status.
 */
export default function MonitoringCard({ projectId, result }: { projectId: string; result: MonitoringResult }) {
  const router = useRouter();

  if (!result.ok) {
    return (
      <Card className="p-6">
        <div role="alert">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <Activity className="size-4 text-brand-cyan" aria-hidden="true" /> Project monitoring
            </h2>
            <StatusBadge label={MONITORING_UNAVAILABLE.label} tone="neutral" />
          </div>
          <p className="mt-2 text-[13px] text-muted-ink">{MONITORING_UNAVAILABLE.description}</p>
          <p className="mt-1 text-[12px] text-muted-ink">{result.message}</p>
          {result.canRetry && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-3 inline-flex h-8 items-center rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover"
            >
              Try again
            </button>
          )}
        </div>
      </Card>
    );
  }

  const { evaluation, note } = result.data;
  const health = describeHealth(evaluation.health_status);
  const ai = evaluation.ai_interpretation;
  const facts = evaluation.measured_facts as Record<string, number | null>;
  const measured = [
    facts.total_milestones != null && `${facts.completed_milestones} of ${facts.total_milestones} milestones done`,
    facts.overdue_milestones != null && `${facts.overdue_milestones} overdue`,
    facts.total_tasks != null && `${facts.tasks_completed} of ${facts.total_tasks} tasks done`,
  ].filter(Boolean) as string[];

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <Activity className="size-4 text-brand-cyan" aria-hidden="true" /> Project monitoring
        </h2>
        <StatusBadge label={health.label} tone={TONE[health.tone]} />
      </div>
      <p className="mt-2 text-[13px] text-muted-ink">{health.description}</p>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-[12px] font-medium text-muted-ink">Measured from your records</dt>
          <dd className="mt-0.5 text-ink">{measured.length > 0 ? measured.join(" · ") : "Nothing recorded yet"}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-medium text-muted-ink">Not tracked</dt>
          <dd className="mt-0.5 text-ink">{ai.not_tracked && ai.not_tracked.length > 0 ? ai.not_tracked.join(", ") : "Nothing"}</dd>
        </div>
      </dl>

      {ai.risk_factors.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-ink">Findings</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-ink">
            {ai.risk_factors.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {ai.signals.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-ink">
            Suggested next steps (recommendations, not decisions)
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ai.signals.map((signal) => {
              const action = actionForSignal(signal, projectId);
              return (
                <li key={signal.code}>
                  <Link
                    href={action.href}
                    className="inline-flex h-8 items-center rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-brand hover:border-brand/40 hover:bg-nav-hover"
                  >
                    {action.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[12px] text-muted-ink">
        {note} Checked {new Date(ai.evaluated_at).toLocaleString("en-IN")}.
      </p>
    </Card>
  );
}
