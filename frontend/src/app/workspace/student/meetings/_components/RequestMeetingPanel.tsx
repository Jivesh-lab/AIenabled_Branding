"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/dates";
import { Card } from "@/components/shared/Surface";
import { controlClass, describedBy, FormField } from "@/components/shared/form/FormField";
import type { StudentProject } from "@/types/student-application";

interface RequestDraft {
  projectId: string;
  date: string;
  time: string;
  agenda: string;
}

/**
 * Request a meeting. This POSTs to the backend, which stores an UNCONFIRMED request ("Requested") against the
 * project; the host schedules it. "Sent" is shown only after the backend confirmed it saved the request, and a
 * failure is shown as a failure.
 */
export default function RequestMeetingPanel({
  projects,
  today,
  onClose,
}: {
  projects: StudentProject[];
  today: string;
  onClose: () => void;
}) {
  const uid = useId();
  const router = useRouter();
  // Only approved projects have a mentoring record the backend can attach a request to.
  const eligible = projects.filter((p) => p.reviewStatus === "APPROVED");

  const [draft, setDraft] = useState<RequestDraft>({ projectId: eligible[0]?.id ?? "", date: "", time: "", agenda: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof RequestDraft, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const project = eligible.find((p) => p.id === draft.projectId);

  function set<K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const next: typeof errors = {};
    if (!draft.projectId) next.projectId = "Choose a project";
    if (!draft.date) next.date = "Choose a preferred date";
    else if (draft.date < today) next.date = "Choose today or a later date";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setFailure(null);
    try {
      const res = await fetch("/api/student/meeting-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: draft.projectId, date: draft.date, startTime: draft.time, agenda: draft.agenda }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.message === "string" ? body.message : "The request could not be sent.");
      setSent(true);
      router.refresh(); // the new request appears in the list below
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The request could not be sent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Request a meeting</h2>
          <p className="mt-0.5 text-[13px] text-muted-ink">
            Your request is saved as <strong>awaiting confirmation</strong>. It becomes a scheduled meeting only when the host confirms a time.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close meeting request"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-ink transition-colors hover:bg-nav-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {sent ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-lg border border-success/25 bg-success/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="text-[14px] font-semibold text-ink">Request saved</p>
            <p className="mt-0.5 text-[13px] text-muted-ink">
              For {project?.name}, preferred {formatLongDate(draft.date)}
              {draft.time && ` at ${draft.time}`}. It is not confirmed yet; it will show as scheduled here once the host sets a time.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 text-[13px] font-semibold text-brand hover:text-brand-hover focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Done
            </button>
          </div>
        </div>
      ) : eligible.length === 0 ? (
        <p className="mt-5 text-[13px] text-muted-ink">
          Meetings can be requested once one of your projects has been approved.
        </p>
      ) : (
        <form noValidate onSubmit={submit} className="mt-5 flex flex-col gap-5">
          {failure && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {failure}
            </p>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField id={`${uid}-project`} label="Project" required error={errors.projectId} className="md:col-span-2">
              <select
                id={`${uid}-project`}
                value={draft.projectId}
                onChange={(e) => set("projectId", e.target.value)}
                aria-invalid={!!errors.projectId}
                aria-describedby={describedBy(`${uid}-project`, { error: !!errors.projectId })}
                className={cn(controlClass, "h-10 cursor-pointer pr-8")}
              >
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id={`${uid}-date`} label="Preferred date" required error={errors.date}>
              <input
                id={`${uid}-date`}
                type="date"
                min={today}
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
                aria-invalid={!!errors.date}
                aria-describedby={describedBy(`${uid}-date`, { error: !!errors.date })}
                className={cn(controlClass, "h-10")}
              />
            </FormField>

            <FormField id={`${uid}-time`} label="Preferred time">
              <input
                id={`${uid}-time`}
                type="time"
                value={draft.time}
                onChange={(e) => set("time", e.target.value)}
                className={cn(controlClass, "h-10")}
              />
            </FormField>

            <FormField id={`${uid}-agenda`} label="What would you like to discuss?" className="md:col-span-2">
              <textarea
                id={`${uid}-agenda`}
                rows={3}
                maxLength={500}
                value={draft.agenda}
                onChange={(e) => set("agenda", e.target.value)}
                placeholder="e.g. Feedback on the prototype test results"
                className={cn(controlClass, "resize-y py-2.5 leading-relaxed")}
              />
            </FormField>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-1.5 text-[12px] text-muted-ink">
              <Info className="mt-px size-3.5 shrink-0 text-brand-cyan" aria-hidden="true" />
              Faculty, department and incubation reviews are scheduled by coordinators.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-ink transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 disabled:opacity-60 sm:flex-none"
              >
                {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {submitting ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}
