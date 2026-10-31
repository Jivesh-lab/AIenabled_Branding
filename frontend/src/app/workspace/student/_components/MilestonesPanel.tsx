"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/dates";
import type { StatusTone } from "@/types/status";
import type { Milestone, MilestoneState, MilestonesResponse } from "@/types/student-application";
import MilestoneProgress from "./MilestoneProgress";

const STATE_LABEL: Record<MilestoneState, string> = {
  completed: "Completed",
  overdue: "Overdue",
  in_progress: "In progress",
  upcoming: "Upcoming",
  no_date: "No target date",
};
const STATE_TONE: Record<MilestoneState, StatusTone> = {
  completed: "success",
  overdue: "danger",
  in_progress: "progress",
  upcoming: "info",
  no_date: "neutral",
};

async function send(url: string, method: "POST" | "PATCH", body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    const field = Array.isArray(detail) ? detail[0]?.msg : undefined;
    throw new Error(field || (typeof data.message === "string" ? data.message : "That change could not be saved."));
  }
  return data;
}

const secondary =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink hover:bg-nav-hover disabled:opacity-60";
const primary =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60";

/** Milestones for an approved project. Every change is saved to the backend and re-read, never held locally. */
export default function MilestonesPanel({ applicationId, data }: { applicationId: string; data: MilestonesResponse }) {
  const router = useRouter();
  const base = `/api/applications/${encodeURIComponent(applicationId)}/milestones`;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [form, setForm] = useState({ title: "", dueDate: "", description: "" });
  const [formError, setFormError] = useState<string | null>(null);

  async function update(milestone: Milestone, status: "pending" | "in_progress" | "completed") {
    if (busy) return;
    setBusy(milestone.id);
    setError(null);
    try {
      await send(`${base}/${encodeURIComponent(milestone.id)}`, "PATCH", { status });
      router.refresh();
    } catch (err) {
      setError({ id: milestone.id, message: err instanceof Error ? err.message : "That change could not be saved." });
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (form.title.trim().length < 3) return setFormError("Give the milestone a title of at least 3 characters.");
    setBusy("new");
    setFormError(null);
    try {
      await send(base, "POST", {
        title: form.title.trim(),
        description: form.description.trim(),
        ...(form.dueDate ? { dueDate: form.dueDate } : {}),
      });
      setForm({ title: "", dueDate: "", description: "" });
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "The milestone could not be added.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-6">
      <section id="milestones" aria-label="Milestones" className="scroll-mt-24">
        <h2 className="text-[15px] font-bold text-ink">Milestones</h2>
        <div className="mt-3">
          <MilestoneProgress summary={data.summary} status="APPROVED" />
        </div>

        {data.milestones.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-ink">No milestones have been recorded for this project yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {data.milestones.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("text-[14px] font-medium", m.state === "completed" ? "text-muted-ink line-through" : "text-ink")}>
                    {m.title}
                  </p>
                  <StatusBadge label={STATE_LABEL[m.state]} tone={STATE_TONE[m.state]} />
                </div>
                <p className="text-[12px] text-muted-ink">
                  {m.dueDate ? `Target ${formatLongDate(m.dueDate)}` : "No target date"}
                  {m.completedAt && ` · Completed ${formatLongDate(m.completedAt.slice(0, 10))}`}
                  {m.state !== "completed" && ` · ${m.completionPct}% done`}
                </p>
                {m.description && <p className="text-[13px] text-muted-ink">{m.description}</p>}
                {data.canEdit && (
                  <div className="flex flex-wrap gap-2">
                    {m.status === "pending" && (
                      <button type="button" disabled={busy !== null} onClick={() => update(m, "in_progress")} className={secondary}>
                        {busy === m.id && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />} Start
                      </button>
                    )}
                    {m.status !== "completed" ? (
                      <button type="button" disabled={busy !== null} onClick={() => update(m, "completed")} className={primary}>
                        {busy === m.id && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />} Mark done
                      </button>
                    ) : (
                      <button type="button" disabled={busy !== null} onClick={() => update(m, "in_progress")} className={secondary}>
                        Reopen
                      </button>
                    )}
                  </div>
                )}
                {error?.id === m.id && (
                  <p role="alert" className="text-[12px] text-danger">
                    {error.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {data.canEdit && (
          <form onSubmit={add} noValidate className="mt-5 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_11rem]">
            <label className="flex flex-col gap-1 text-[12px] font-medium text-ink">
              New milestone
              <input
                value={form.title}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Complete field pilot"
                className="h-10 rounded-lg border border-line bg-white px-3 text-[14px] font-normal text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-medium text-ink">
              Target date
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="h-10 rounded-lg border border-line bg-white px-3 text-[14px] font-normal text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-medium text-ink sm:col-span-2">
              Description (optional)
              <textarea
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="rounded-lg border border-line bg-white px-3 py-2 text-[14px] font-normal text-ink"
              />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={busy !== null}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {busy === "new" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Add milestone
              </button>
              {formError && (
                <p role="alert" className="text-[12px] text-danger">
                  {formError}
                </p>
              )}
            </div>
          </form>
        )}
      </section>
    </Card>
  );
}
