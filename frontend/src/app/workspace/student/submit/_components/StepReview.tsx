import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FileText, Pencil, Sparkles, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/shared/form/FormField";
import { useSession } from "next-auth/react";
import type { IdeaFormValues, StepIndex } from "../_lib/idea-schema";
import { formatBytes } from "@/lib/format";

const DECLARATION =
  "I confirm that the information provided is accurate and that this work is my original work or that I have the necessary rights to submit it. I agree to the applicable DBIT Incubation Centre institutional and intellectual-property policies.";

function ReviewGroup({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: StepIndex;
  onEdit: (step: StepIndex) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-brand transition-colors hover:bg-nav-hover hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Edit
        </button>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Item({ label, value, wide = false }: { label: string; value?: React.ReactNode; wide?: boolean }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-[12px] font-medium text-muted-ink">{label}</dt>
      <dd className={cn("mt-0.5 whitespace-pre-line break-words text-[14px] leading-relaxed", empty ? "text-muted-ink" : "text-ink")}>
        {empty ? "Not provided" : value}
      </dd>
    </div>
  );
}

export default function StepReview({ onEditStep }: { onEditStep: (step: StepIndex) => void }) {
  const { data: session } = useSession();
  const {
    register,
    formState: { errors },
  } = useFormContext<IdeaFormValues>();
  const v = useWatch<IdeaFormValues>();

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const team = v.teamMembers ?? [];
  const technologies = v.technologies ?? [];
  const attachments = v.attachments ?? [];

  async function runAiCompletenessCheck() {
    setValidating(true);
    try {
      const res = await fetch("/api/applications/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      if (res.ok) {
        const data = await res.json();
        setValidationResult(data.validation);
      }
    } catch {
      // Graceful fallback
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* AI Pre-Submission Completeness Check */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-600" />
            <h4 className="text-[13px] font-semibold text-indigo-950">Application Agent Review</h4>
          </div>
          <button
            type="button"
            onClick={runAiCompletenessCheck}
            disabled={validating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-all"
          >
            {validating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {validationResult ? "Re-check Completeness" : "Run AI Completeness Check"}
          </button>
        </div>

        {validationResult && (
          <div className="mt-3 pt-3 border-t border-indigo-100 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                {validationResult.is_complete ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-600" />
                )}
                Completeness Score: {validationResult.completeness_score}/100
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${validationResult.is_complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {validationResult.is_complete ? "Ready to Submit" : "Missing Details"}
              </span>
            </div>

            {validationResult.missing_fields?.length > 0 && (
              <div className="bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60 text-amber-900 text-[11px]">
                <strong>Attention Required:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {validationResult.missing_fields.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <ReviewGroup title="Idea details" step={0} onEdit={onEditStep}>
          <Item label="Idea / Project name" value={v.name} wide />
          <Item label="Short description" value={v.shortDescription} wide />
          <Item label="Department" value={v.department} />
          <Item label="Domain / Sector" value={v.domain} />
          <Item label="Project type" value={v.projectType} />
          <Item label="Maturity" value={v.maturity ? MATURITY_LABEL[v.maturity] : undefined} />
        </ReviewGroup>

        <ReviewGroup title="Problem & solution" step={1} onEdit={onEditStep}>
          <Item label="Problem" value={v.problem} wide />
          <Item label="Who experiences it" value={v.affectedUsers} wide />
          <Item label="Current solutions" value={v.currentSolutions} wide />
          <Item label="Proposed solution" value={v.solution} wide />
          <Item label="What makes it different" value={v.differentiation} wide />
        </ReviewGroup>

        <ReviewGroup title="Team" step={2} onEdit={onEditStep}>
          <Item label="Faculty guide" value="Assigned by Faculty Coordinator" />
          <Item
            label={`Members (${team.length + 1})`}
            wide
            value={
              <ul className="mt-1 flex flex-col gap-1">
                <li>
                  {session?.user?.name || "Team Lead"} <span className="text-muted-ink">· Team lead</span>
                </li>
                {team.map((m) => (
                  <li key={m.id}>
                    {m.name} <span className="text-brand-gold-ink">· Invite pending</span>
                  </li>
                ))}
              </ul>
            }
          />
        </ReviewGroup>

        <ReviewGroup title="Technology & documents" step={2} onEdit={onEditStep}>
          <Item
            label="Technology / Tools"
            wide
            value={
              technologies.length ? (
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {technologies.map((t) => (
                    <span key={t} className="rounded-md bg-brand-cyan-soft px-2 py-0.5 text-[12px] font-medium text-brand">
                      {t}
                    </span>
                  ))}
                </span>
              ) : undefined
            }
          />
          <Item label="Prototype available" value={v.prototypeAvailable === "YES" ? "Yes" : "No"} />
          <Item label="GitHub repository" value={v.githubUrl} />
          <Item label="Demo link" value={v.demoUrl} wide />
          <Item
            label="Documents"
            wide
            value={
              attachments.length ? (
                <ul className="mt-1 flex flex-col gap-1">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <FileText className="size-3.5 shrink-0 text-brand-cyan" aria-hidden="true" />
                      <span className="truncate">{a.name}</span>
                      {typeof a.sizeBytes === "number" && (
                        <span className="shrink-0 text-[12px] text-muted-ink">{formatBytes(a.sizeBytes)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : undefined
            }
          />
        </ReviewGroup>
      </div>

      {/* Declaration */}
      <div className="rounded-lg border border-line bg-canvas p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-brand"
            aria-invalid={!!errors.declarationAccepted}
            aria-describedby={errors.declarationAccepted ? "declarationAccepted-error" : undefined}
            {...register("declarationAccepted")}
          />
          <span className="text-[13px] leading-relaxed text-ink">{DECLARATION}</span>
        </label>
        <div className="pl-7">
          <FieldError id="declarationAccepted" message={errors.declarationAccepted?.message} />
        </div>
      </div>
    </div>
  );
}
