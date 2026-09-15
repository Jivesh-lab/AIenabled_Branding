import { useId, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/dates";
import { Card } from "@/components/shared/Surface";
import { controlClass, describedBy, FormField } from "@/components/shared/form/FormField";
import { MEETING_TYPE_LABEL, MOCK_NOW, STUDENT_MEETING_PERMISSIONS, type MeetingType } from "@/mock/student-meetings";
import type { StudentProject } from "@/mock/student-projects";

interface RequestDraft {
  type: MeetingType;
  projectId: string;
  date: string;
  time: string;
  agenda: string;
}

/**
 * Request a meeting. Students can only request the types allowed by
 * STUDENT_MEETING_PERMISSIONS; official faculty, department and incubation
 * reviews are scheduled by coordinators. Mock only — nothing is sent.
 */
export default function RequestMeetingPanel({
  projects,
  onClose,
}: {
  projects: StudentProject[];
  onClose: () => void;
}) {
  const uid = useId();
  const types = STUDENT_MEETING_PERMISSIONS.requestableTypes;
  const eligible = projects.filter((p) => p.reviewStatus !== "DRAFT" && p.reviewStatus !== "REJECTED");

  const [draft, setDraft] = useState<RequestDraft>({
    type: types[0],
    projectId: eligible[0]?.id ?? "",
    date: "",
    time: "",
    agenda: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RequestDraft, string>>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  const project = eligible.find((p) => p.id === draft.projectId);
  const recipient = draft.type === "TEAM_SYNC" ? "your team" : (project?.facultyGuide ?? "the Faculty Coordinator");

  function set<K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!draft.projectId) next.projectId = "Choose a project";
    if (!draft.date) next.date = "Choose a preferred date";
    else if (draft.date < MOCK_NOW.date) next.date = "Choose today or a later date";
    setErrors(next);
    if (Object.keys(next).length === 0) setSentTo(recipient);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Request a meeting</h2>
          <p className="mt-0.5 text-[13px] text-muted-ink">
            The host confirms the time. You&apos;ll see the meeting here once it&apos;s scheduled.
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

      {sentTo ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-lg border border-success/25 bg-success/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="text-[14px] font-semibold text-ink">Request sent to {sentTo}</p>
            <p className="mt-0.5 text-[13px] text-muted-ink">
              {MEETING_TYPE_LABEL[draft.type]} for {project?.name}, preferred {formatLongDate(draft.date)}
              {draft.time && ` at ${draft.time}`}. You&apos;ll be notified when it&apos;s confirmed.
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
          Meetings can be requested once a project has been submitted for review.
        </p>
      ) : (
        <form noValidate onSubmit={submit} className="mt-5 flex flex-col gap-5">
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-ink">Meeting type</legend>
            <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
              {types.map((t) => (
                <label
                  key={t}
                  className={cn(
                    "cursor-pointer rounded-md px-3.5 py-1.5 text-[13px] font-medium text-muted-ink transition-colors hover:text-ink",
                    "has-[:checked]:bg-brand-cyan-soft has-[:checked]:text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
                  )}
                >
                  <input
                    type="radio"
                    name={`${uid}-type`}
                    value={t}
                    checked={draft.type === t}
                    onChange={() => set("type", t)}
                    className="sr-only"
                  />
                  {MEETING_TYPE_LABEL[t]}
                </label>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-muted-ink">
              <Info className="mt-px size-3.5 shrink-0 text-brand-cyan" aria-hidden="true" />
              Faculty, department and incubation reviews are scheduled by coordinators.
            </p>
          </fieldset>

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
                min={MOCK_NOW.date}
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
                value={draft.agenda}
                onChange={(e) => set("agenda", e.target.value)}
                placeholder="e.g. Feedback on the prototype test results"
                className={cn(controlClass, "resize-y py-2.5 leading-relaxed")}
              />
            </FormField>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-muted-ink">
              Request goes to <span className="font-medium text-ink">{recipient}</span>
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
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 sm:flex-none"
              >
                Send Request
              </button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}
