"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowPathIcon, CheckCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/dates";
import { controlClass, describedBy, FormField } from "@/components/shared/form/FormField";
import type { StudentProject } from "@/types/student-application";

interface RequestDraft {
  projectId: string;
  date: string;
  time: string;
  agenda: string;
}

/**
 * Request a meeting, in a right-hand drawer. This POSTs to the backend, which stores an UNCONFIRMED request
 * ("Requested") against the project; the host schedules it. "Sent" is shown only after the backend confirmed it
 * saved the request, and a failure is shown as a failure.
 *
 * The drawer is always mounted by the page and shown with `open`; the form lives in a child that only exists while
 * open, so reopening starts from a clean form.
 */
export default function RequestMeetingPanel({
  open,
  projects,
  today,
  onClose,
}: {
  open: boolean;
  projects: StudentProject[];
  today: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape closes; the page behind does not scroll; focus returns to the button that opened the drawer.
  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the drawer once it has mounted.
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(frame);
      returnFocusTo.current?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 z-[60] bg-ink/40"
          />
          <motion.aside
            key="drawer"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-meeting-title"
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[440px] flex-col rounded-l-2xl border-l border-line bg-white shadow-2xl outline-none"
          >
            <RequestForm projects={projects} today={today} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function RequestForm({ projects, today, onClose }: { projects: StudentProject[]; today: string; onClose: () => void }) {
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
      router.refresh(); // the new request appears in the list
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The request could not be sent.");
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 id="request-meeting-title" className="text-[16px] font-semibold text-ink">Request a meeting</h2>
        <p className="mt-0.5 text-[13px] text-muted-ink">
          Your request is saved as <strong className="font-semibold text-ink">awaiting confirmation</strong>. It becomes a scheduled meeting only when the host confirms a time.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close meeting request"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-ink transition-colors hover:bg-nav-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <XMarkIcon className="size-5" aria-hidden="true" />
      </button>
    </div>
  );

  if (sent) {
    return (
      <>
        {header}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div role="status" className="flex items-start gap-3 rounded-lg border border-success/25 bg-success/5 p-4">
            <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
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
        </div>
      </>
    );
  }

  if (eligible.length === 0) {
    return (
      <>
        {header}
        <p className="px-5 py-5 text-[13px] text-muted-ink">Meetings can be requested once one of your projects has been approved.</p>
      </>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      {header}

      {/* Fields scroll if the viewport is short; the actions stay pinned below. */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {failure && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
            {failure}
          </p>
        )}

        <div className="flex flex-col gap-5">
          <FormField id={`${uid}-project`} label="Project" required error={errors.projectId}>
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
          </div>

          <FormField id={`${uid}-agenda`} label="What would you like to discuss?">
            <textarea
              id={`${uid}-agenda`}
              rows={5}
              maxLength={500}
              value={draft.agenda}
              onChange={(e) => set("agenda", e.target.value)}
              placeholder="e.g. Feedback on the prototype test results"
              className={cn(controlClass, "resize-y py-2.5 leading-relaxed")}
            />
          </FormField>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
        <p className="flex items-start gap-1.5 text-[12px] text-muted-ink">
          <InformationCircleIcon className="mt-px size-3.5 shrink-0 text-brand-cyan" aria-hidden="true" />
          Faculty, department and incubation reviews are scheduled by coordinators.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-ink transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 disabled:opacity-60"
          >
            {submitting && <ArrowPathIcon className="size-4 animate-spin" aria-hidden="true" />}
            {submitting ? "Sending…" : "Send Request"}
          </button>
        </div>
      </div>
    </form>
  );
}
