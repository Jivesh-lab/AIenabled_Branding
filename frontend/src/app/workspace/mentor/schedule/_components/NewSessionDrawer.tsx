"use client";

import { useId, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import SideDrawer from "@/components/shared/SideDrawer";
import { controlClass, describedBy, FormField } from "@/components/shared/form/FormField";
import { friendlyActionMessage, friendlyThrown } from "@/lib/friendlyError";
import { cleanName } from "@/lib/displayName";
import { useApiList } from "@/lib/useApiList";

interface ProjectOption {
  id: string;
  title: string;
  lead?: string;
}

interface ProjectRecord {
  id?: string;
  _id?: string;
  title?: string;
  leadStudent?: string;
}

function toProjects(records: unknown[]): ProjectOption[] {
  return (records as ProjectRecord[]).map((p, i) => ({
    id: p.id || p._id || `project-${i}`,
    title: p.title || "Untitled project",
    lead: p.leadStudent ? cleanName(p.leadStudent) : undefined,
  }));
}

interface Draft {
  projectId: string;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: string;
  provider: string;
  location: string;
  agenda: string;
}

const FORMATS = ["Video Call", "In-Person", "Phone Call"] as const;
const LOCATION_LABEL: Record<string, string> = {
  "Video Call": "Meeting link",
  "In-Person": "Location",
  "Phone Call": "Dial-in details",
};
const SAVE_FAILED = "We couldn't save this session. Please try again.";

/**
 * Schedule a session in a right-hand drawer. It saves through the existing faculty meetings API; the success toast
 * only appears after the server confirms, and a failure is shown as a failure.
 */
export default function NewSessionDrawer({
  open,
  today,
  onClose,
  onCreated,
}: {
  open: boolean;
  today: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      id="new-session"
      title="Schedule a session"
      description="Add a mentoring session to the schedule. It is saved straight away."
    >
      <NewSessionForm today={today} onClose={onClose} onCreated={onCreated} />
    </SideDrawer>
  );
}

function NewSessionForm({ today, onClose, onCreated }: { today: string; onClose: () => void; onCreated: () => void }) {
  const uid = useId();
  const { data: session } = useSession();
  const { items: projects, loading, failed, reload } = useApiList("/api/faculty/projects", toProjects);
  const [draft, setDraft] = useState<Draft>({
    projectId: "",
    title: "",
    date: "",
    startTime: "14:00",
    durationMinutes: "45",
    provider: "Video Call",
    location: "",
    agenda: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const project = useMemo(() => projects.find((p) => p.id === draft.projectId), [projects, draft.projectId]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const next: typeof errors = {};
    if (!draft.projectId) next.projectId = "Choose a project";
    if (!draft.title.trim()) next.title = "Enter a title";
    if (!draft.date) next.date = "Choose a date";
    else if (draft.date < today) next.date = "Choose today or a later date";
    if (!draft.startTime) next.startTime = "Choose a time";
    if (!draft.location.trim()) next.location = `Enter the ${LOCATION_LABEL[draft.provider].toLowerCase()}`;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setFailure(null);
    try {
      const mentor = session?.user?.name ? cleanName(session.user.name) : undefined;
      const res = await fetch("/api/faculty/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          projectId: draft.projectId,
          date: draft.date,
          startTime: draft.startTime,
          durationMinutes: Number(draft.durationMinutes),
          meetingType: "Mentoring Session",
          agenda: draft.agenda.trim(),
          meetingProvider: draft.provider,
          meetingLinkOrLocation: draft.location.trim(),
          participants: [mentor, project?.lead].filter(Boolean),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        const message = friendlyActionMessage(res.status, body, SAVE_FAILED);
        setFailure(message);
        toast.error(message);
        return;
      }
      toast.success("Session scheduled", { description: "It now appears in your schedule." });
      onCreated();
      onClose();
    } catch (error) {
      const message = friendlyThrown(error, SAVE_FAILED);
      setFailure(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (failed) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[13px] text-muted-ink">We couldn&apos;t load your projects, so a session can&apos;t be scheduled right now.</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-brand hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!loading && projects.length === 0) {
    return <p className="text-[13px] text-muted-ink">You have no projects to schedule a session for yet.</p>;
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {failure && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
          {failure}
        </p>
      )}

      <FormField id={`${uid}-project`} label="Project" required error={errors.projectId}>
        <select
          id={`${uid}-project`}
          value={draft.projectId}
          disabled={loading}
          onChange={(e) => set("projectId", e.target.value)}
          aria-invalid={!!errors.projectId}
          aria-describedby={describedBy(`${uid}-project`, { error: !!errors.projectId })}
          className={cn(controlClass, "h-10 cursor-pointer pr-8")}
        >
          <option value="">{loading ? "Loading projects…" : "Select a project"}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id={`${uid}-title`} label="Session title" required error={errors.title}>
        <input
          id={`${uid}-title`}
          type="text"
          value={draft.title}
          maxLength={120}
          placeholder="e.g. Prototype review"
          onChange={(e) => set("title", e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={describedBy(`${uid}-title`, { error: !!errors.title })}
          className={cn(controlClass, "h-10")}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id={`${uid}-date`} label="Date" required error={errors.date}>
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
        <FormField id={`${uid}-time`} label="Time" required error={errors.startTime}>
          <input
            id={`${uid}-time`}
            type="time"
            value={draft.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            aria-invalid={!!errors.startTime}
            aria-describedby={describedBy(`${uid}-time`, { error: !!errors.startTime })}
            className={cn(controlClass, "h-10")}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id={`${uid}-duration`} label="Duration">
          <select id={`${uid}-duration`} value={draft.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} className={cn(controlClass, "h-10 cursor-pointer pr-8")}>
            {[30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </FormField>
        <FormField id={`${uid}-format`} label="Format">
          <select id={`${uid}-format`} value={draft.provider} onChange={(e) => set("provider", e.target.value)} className={cn(controlClass, "h-10 cursor-pointer pr-8")}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField id={`${uid}-location`} label={LOCATION_LABEL[draft.provider]} required error={errors.location}>
        <input
          id={`${uid}-location`}
          type="text"
          value={draft.location}
          placeholder={draft.provider === "Video Call" ? "https://…" : draft.provider === "In-Person" ? "e.g. DBIT Incubation Centre, Lab 402" : "Number or conference ID"}
          onChange={(e) => set("location", e.target.value)}
          aria-invalid={!!errors.location}
          aria-describedby={describedBy(`${uid}-location`, { error: !!errors.location })}
          className={cn(controlClass, "h-10")}
        />
      </FormField>

      <FormField id={`${uid}-agenda`} label="Agenda">
        <textarea
          id={`${uid}-agenda`}
          rows={3}
          maxLength={500}
          value={draft.agenda}
          placeholder="What will you cover?"
          onChange={(e) => set("agenda", e.target.value)}
          className={cn(controlClass, "resize-y py-2.5 leading-relaxed")}
        />
      </FormField>

      {/* Pinned to the bottom of the scrolling body, so the actions are always reachable. */}
      <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t border-line bg-white px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-ink transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || loading}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 disabled:opacity-60"
        >
          {submitting && <ArrowPathIcon className="size-4 animate-spin" aria-hidden="true" />}
          {submitting ? "Saving…" : "Schedule session"}
        </button>
      </div>
    </form>
  );
}
