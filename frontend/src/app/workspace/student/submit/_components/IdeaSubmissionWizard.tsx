"use client";

/**
 * IdeaSubmissionWizard — owns the single form and the step flow.
 *
 * One react-hook-form instance holds the whole submission; each step validates
 * only its own fields on the way out. Step components read the form through
 * context, and fields subscribe individually (useWatch), so typing does not
 * re-render the wizard.
 *
 * Autosave: on every step change, plus an explicit Save Draft. No timers, no
 * per-keystroke writes. An existing draft is read with useSyncExternalStore
 * (no effect, no hydration mismatch) and offered to the student — never
 * silently restored.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, FileClock, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/shared/Surface";
import type { AgentEvaluationData, SubmitApplicationResponse } from "@/types/student-application";
import { cn } from "@/lib/utils";
import {
  firstStepWithError,
  IDEA_DEFAULT_VALUES,
  ideaSchema,
  LAST_STEP,
  SKIP_VALIDATION,
  STEP_FIELDS,
  WIZARD_STEPS,
  type IdeaFormValues,
  type StepIndex,
} from "../_lib/idea-schema";
import {
  clearDraft,
  draftsDiffer,
  formatSavedAt,
  getDraftServerSnapshot,
  parseDraft,
  readRawDraft,
  saveDraft,
  subscribeToDraft,
  type StoredDraft,
} from "../_lib/draft-storage";
import WizardStepper from "./WizardStepper";
import StepIdeaBasics from "./StepIdeaBasics";
import StepProblemSolution from "./StepProblemSolution";
import StepTeamTechnology from "./StepTeamTechnology";
import StepReview from "./StepReview";
import SubmissionSuccess from "./SubmissionSuccess";
import AgentExecutionPipeline from "./AgentExecutionPipeline";

const btn = {
  primary:
    "h-10 gap-1.5 px-4 text-[14px] font-semibold bg-brand text-white hover:bg-brand-hover active:bg-brand-active focus-visible:ring-brand/40",
  secondary:
    "h-10 gap-1.5 px-4 text-[14px] font-medium border-line bg-white text-ink hover:bg-nav-hover hover:text-ink focus-visible:ring-brand/30",
  quiet:
    "h-10 gap-1.5 px-3 text-[14px] font-medium text-brand hover:bg-nav-hover hover:text-brand focus-visible:ring-brand/30",
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saved"; at: string }
  | { kind: "unavailable" }
  | { kind: "server-failed"; message: string };

type LoadState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };

/** The browser and server hold different copies of one draft; the student chooses. */
interface DraftConflict {
  serverValues: IdeaFormValues;
  serverStep: StepIndex;
  serverFurthest: StepIndex;
  serverUpdatedAt: string | null;
  local: StoredDraft;
}

const isStep = (n: unknown): n is StepIndex => n === 0 || n === 1 || n === 2 || n === 3;

/** Best human-readable message from an API error body (BFF `message` or FastAPI `detail`). */
function apiMessage(data: unknown, fallback: string): string {
  const body = (data ?? {}) as { message?: unknown; detail?: unknown };
  if (typeof body.message === "string" && body.message) return body.message;
  if (typeof body.detail === "string" && body.detail) return body.detail;
  const nested = (body.detail as { message?: unknown } | undefined)?.message;
  if (typeof nested === "string" && nested) return nested;
  return fallback;
}

type FieldError = { field: string; message: string };
type SubmitFailure = Error & { status?: number; fieldErrors?: FieldError[] };

/** FastAPI/pydantic 422 bodies: [{ loc: ["body", "<field>", ...], msg }]. */
function serverFieldErrors(data: unknown): FieldError[] {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) return [];
  return detail.flatMap((item) => {
    const loc = (item as { loc?: unknown[] })?.loc;
    const msg = (item as { msg?: unknown })?.msg;
    const field = Array.isArray(loc) ? loc.find((part, i) => i > 0 && typeof part === "string") : undefined;
    return typeof field === "string" && typeof msg === "string" ? [{ field, message: msg }] : [];
  });
}

export default function IdeaSubmissionWizard() {
  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaSchema),
    defaultValues: IDEA_DEFAULT_VALUES,
    mode: SKIP_VALIDATION ? "onSubmit" : "onTouched",
  });
  const { getValues, handleSubmit, reset, setError, trigger } = form;
  const { data: session } = useSession();

  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<StepIndex>(0);
  const [furthest, setFurthest] = useState<StepIndex>(0);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [draftDecided, setDraftDecided] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitConflict, setSubmitConflict] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [revisionFeedback, setRevisionFeedback] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DraftConflict | null>(null);
  // Refs, not state: saves and the double-click guard must see the latest value synchronously.
  const applicationIdRef = useRef<string | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const submitLock = useRef(false);
  const [evaluatingValues, setEvaluatingValues] = useState<IdeaFormValues | null>(null);
  const [isPipelineComplete, setIsPipelineComplete] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<AgentEvaluationData | null>(null);
  const [submitted, setSubmitted] = useState<{
    name: string;
    referenceId: string;
    agentEvaluation?: AgentEvaluationData | null;
    documentsCount?: number;
    submittedValues?: Record<string, unknown>;
  } | null>(null);

  const rawDraft = useSyncExternalStore(subscribeToDraft, readRawDraft, getDraftServerSnapshot);
  const pendingDraft = draftDecided ? null : parseDraft(rawDraft);

  const revisionApplicationId = useSearchParams().get("applicationId");
  const [loadState, setLoadState] = useState<LoadState>(
    revisionApplicationId ? { kind: "loading" } : { kind: "idle" },
  );

  useEffect(() => {
    if (!revisionApplicationId) return;
    let active = true;
    async function loadApplication() {
      setLoadState({ kind: "loading" });
      try {
        const response = await fetch(`/api/applications/${encodeURIComponent(revisionApplicationId!)}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(data, "Unable to load this application."));
        if (data.status !== "DRAFT" && data.status !== "REVISION_REQUESTED") {
          throw new Error(
            data.status === "SUBMITTED" || data.status === "UNDER_REVIEW"
              ? "This application has been submitted and is awaiting review, so it can't be edited."
              : "This application has been decided and can't be edited.",
          );
        }

        // Server drafts carry their wizard position in formData._draft; resume there.
        const { _draft: draftMeta, ...savedValues } = (data.formData || {}) as Record<string, unknown> & {
          _draft?: { step?: number; furthestStep?: number };
        };
        const isDraftStatus = data.status === "DRAFT";
        const serverStep: StepIndex = isDraftStatus && isStep(draftMeta?.step) ? draftMeta.step : 3;
        const serverFurthest: StepIndex =
          isDraftStatus && isStep(draftMeta?.furthestStep) ? draftMeta.furthestStep : 3;
        // The team lead is added from the session at submit time; the form only holds the other members.
        const savedMembers = Array.isArray(savedValues.teamMembers)
          ? (savedValues.teamMembers as { inviteStatus?: string }[]).filter((m) => m.inviteStatus !== "LEAD")
          : [];
        const serverValues = {
          ...IDEA_DEFAULT_VALUES,
          ...savedValues,
          teamMembers: savedMembers,
          declarationAccepted: false,
        } as IdeaFormValues;
        if (!active) return;

        applicationIdRef.current = revisionApplicationId;
        setRevisionFeedback(
          data.status === "REVISION_REQUESTED"
            ? (typeof data.reviewerComments === "string" && data.reviewerComments.trim()) || ""
            : null,
        );

        // Never silently pick one copy: if this browser holds a newer, different copy, ask.
        const local = parseDraft(readRawDraft());
        const localNewer =
          local && local.applicationId === revisionApplicationId && Date.parse(local.savedAt) > Date.parse(data.updatedAt ?? "");
        if (local && localNewer && draftsDiffer(local.values, serverValues)) {
          setConflict({ serverValues, serverStep, serverFurthest, serverUpdatedAt: data.updatedAt ?? null, local });
        } else {
          reset(serverValues);
          setStep(serverStep);
          setFurthest(Math.max(serverStep, serverFurthest) as StepIndex);
        }
        setDraftDecided(true);
        setLoadState({ kind: "idle" });
      } catch (error) {
        if (active) {
          setLoadState({ kind: "error", message: error instanceof Error ? error.message : "Unable to load this application." });
        }
      }
    }
    void loadApplication();
    return () => { active = false; };
  }, [revisionApplicationId, reset, loadAttempt]);

  function resolveConflict(use: "browser" | "server") {
    if (!conflict) return;
    if (use === "browser") {
      reset({ ...IDEA_DEFAULT_VALUES, ...conflict.local.values, declarationAccepted: false });
      setStep(conflict.local.step);
      setFurthest(conflict.local.furthestStep);
    } else {
      reset(conflict.serverValues);
      setStep(conflict.serverStep);
      setFurthest(Math.max(conflict.serverStep, conflict.serverFurthest) as StepIndex);
    }
    setConflict(null);
  }

  // -------------------------------------------------------------------------
  // Draft handling
  // -------------------------------------------------------------------------
  function persist(nextStep: StepIndex, nextFurthest: StepIndex) {
    const values = getValues();
    const at = saveDraft(values, nextStep, nextFurthest, applicationIdRef.current);
    setSaveState(at ? { kind: "saved", at } : { kind: "unavailable" });
    // Saving over the stored draft settles the resume-or-discard question.
    setDraftDecided(true);

    // Server saves run one at a time, so two quick saves can never create two server drafts.
    saveChain.current = saveChain.current.then(async () => {
      try {
        const response = await fetch("/api/applications/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: applicationIdRef.current,
            values,
            step: nextStep,
            furthestStep: nextFurthest,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(data, "Unable to save draft"));
        if (data.application_id) {
          applicationIdRef.current = String(data.application_id);
          // Re-stamp the browser copy with the server id so a later resume continues the same record.
          saveDraft(values, nextStep, nextFurthest, applicationIdRef.current);
        }
        setSaveState({ kind: "saved", at: data.updatedAt || new Date().toISOString() });
      } catch (error) {
        setSaveState({
          kind: "server-failed",
          message: error instanceof Error ? error.message : "Unable to save draft",
        });
      }
    });
  }

  function resumeDraft() {
    if (!pendingDraft) return;
    reset({ ...IDEA_DEFAULT_VALUES, ...pendingDraft.values, declarationAccepted: false });
    applicationIdRef.current = pendingDraft.applicationId;
    setStep(pendingDraft.step);
    setFurthest(pendingDraft.furthestStep);
    setSaveState({ kind: "saved", at: pendingDraft.savedAt });
    setDraftDecided(true);
  }

  function discardDraft() {
    clearDraft();
    setDraftDecided(true);
  }

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function moveTo(target: StepIndex) {
    const nextFurthest = (Math.max(furthest, target) as StepIndex);
    setStep(target);
    setFurthest(nextFurthest);
    persist(target, nextFurthest);
    scrollToTop();
  }

  /** Validates one step's fields — always passes in workflow test mode. */
  async function stepIsValid(target: StepIndex) {
    if (SKIP_VALIDATION) return true;
    return trigger(STEP_FIELDS[target], { shouldFocus: true });
  }

  async function goNext() {
    const valid = await stepIsValid(step);
    if (!valid || step === LAST_STEP) return;
    moveTo((step + 1) as StepIndex);
  }

  function goBack() {
    if (step === 0) return;
    moveTo((step - 1) as StepIndex);
  }

  async function selectStep(target: StepIndex) {
    if (target === step || target > furthest) return;
    // Jumping forward re-checks the step being left, in case it was edited.
    if (target > step) {
      const valid = await stepIsValid(step);
      if (!valid) return;
    }
    moveTo(target);
  }

  // -------------------------------------------------------------------------
  // Submission — mock only, no API
  // -------------------------------------------------------------------------
  async function onValid(values: IdeaFormValues) {
    // A ref, not state: a double-click fires twice before React re-renders `isSubmitting`.
    if (submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setEvaluatingValues(values);
    setIsPipelineComplete(false);
    setPipelineResult(null);
    setSubmitError(null);
    setSubmitConflict(false);
    scrollToTop();

    try {
      const lead = session?.user;
      if (!lead?.id) throw new Error("Your session has expired. Please sign in again to submit.");

      // Let any in-flight draft save finish so the submit targets the same server record.
      await saveChain.current;
      const response = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          // The team lead is the signed-in student, recorded first; the form only holds the other members.
          teamMembers: [
            { id: lead.id, name: lead.name ?? "Team lead", rollNumber: "", email: lead.email ?? "", inviteStatus: "LEAD" },
            ...values.teamMembers,
          ],
          ...(applicationIdRef.current ? { applicationId: applicationIdRef.current } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fieldErrors = serverFieldErrors(data);
        const missing: string[] | undefined = data.detail?.validation?.missing_fields;
        const failure: SubmitFailure = new Error(
          fieldErrors.length > 0
            ? "Some fields were rejected by the server. Please correct the highlighted fields."
            : [apiMessage(data, "Failed to submit application"), missing?.length ? `Missing: ${missing.join(", ")}` : ""]
                .filter(Boolean)
                .join(" "),
        );
        failure.status = response.status;
        failure.fieldErrors = fieldErrors;
        throw failure;
      }

      const result = data as SubmitApplicationResponse;
      clearDraft();
      setPipelineResult(result.agent_evaluation ?? null);
      setIsPipelineComplete(true);
      setSubmitted({
        name: values.name.trim() || "Untitled idea",
        referenceId: result.application_id,
        agentEvaluation: result.agent_evaluation || null,
        documentsCount: values.attachments?.length || 0,
        submittedValues: values,
      });
      // Intentionally keeps the lock: this application is submitted, so a second request must not go out.
    } catch (error) {
      console.error("Submission error:", error);
      submitLock.current = false;
      setIsSubmitting(false);
      setEvaluatingValues(null);
      const failure = error as SubmitFailure;
      if (failure.fieldErrors?.length) {
        for (const { field, message } of failure.fieldErrors) {
          setError(field as keyof IdeaFormValues, { type: "server", message });
        }
        setStep(firstStepWithError(failure.fieldErrors.map((e) => e.field)));
      }
      setSubmitConflict(failure.status === 409);
      setSubmitError(failure.message || "An error occurred during submission");
      scrollToTop();
    }
  }

  function onInvalid(errors: FieldErrors<IdeaFormValues>) {
    const target = firstStepWithError(Object.keys(errors));
    if (target !== step) {
      setStep(target);
      scrollToTop();
    }
  }

  function startOver() {
    reset(IDEA_DEFAULT_VALUES);
    setStep(0);
    setFurthest(0);
    setSaveState({ kind: "idle" });
    setSubmitted(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setEvaluatingValues(null);
    setIsPipelineComplete(false);
    setPipelineResult(null);
    applicationIdRef.current = null;
    submitLock.current = false;
    setSubmitConflict(false);
    setRevisionFeedback(null);
    setConflict(null);
    scrollToTop();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (loadState.kind === "loading") {
    return (
      <Card>
        <div role="status" className="flex items-center gap-3 px-6 py-10 text-[14px] text-muted-ink">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading your application…
        </div>
      </Card>
    );
  }

  if (loadState.kind === "error") {
    return (
      <Card>
        <div role="alert" className="flex flex-col gap-4 px-6 py-8">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">We couldn&apos;t open this application</h2>
            <p className="mt-1 text-[13px] text-muted-ink">{loadState.message}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => setLoadAttempt((n) => n + 1)} className={btn.primary}>
              Try again
            </Button>
            <Link
              href="/workspace/student/projects"
              className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-[14px] font-medium text-ink hover:bg-nav-hover"
            >
              Back to My Projects
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Two different copies of this draft exist (this browser vs the server): the student decides.
  if (conflict) {
    return (
      <Card>
        <div role="alert" className="flex flex-col gap-4 px-6 py-8">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Two versions of this draft exist</h2>
            <p className="mt-1 text-[13px] text-muted-ink">
              This browser has a copy saved {formatSavedAt(conflict.local.savedAt)}
              {conflict.serverUpdatedAt ? `, newer than the one on the server (${formatSavedAt(conflict.serverUpdatedAt)})` : ""}.
              The server copy probably didn&apos;t save. Nothing is overwritten until you choose.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => resolveConflict("browser")} className={btn.primary}>
              Use the browser copy
            </Button>
            <Button type="button" variant="outline" onClick={() => resolveConflict("server")} className={btn.secondary}>
              Use the server copy
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Active Agent Execution Pipeline while submitting or viewing intermediate outputs
  if (isSubmitting && evaluatingValues) {
    return (
      <div ref={topRef} className="scroll-mt-24">
        <AgentExecutionPipeline
          ideaValues={evaluatingValues}
          isComplete={isPipelineComplete}
          agentResult={pipelineResult}
          onContinue={() => {
            setIsSubmitting(false);
            scrollToTop();
          }}
        />
      </div>
    );
  }

  if (submitted) {
    return (
      <div ref={topRef} className="scroll-mt-24">
        <SubmissionSuccess
          ideaName={submitted.name}
          referenceId={submitted.referenceId}
          agentEvaluation={submitted.agentEvaluation}
          documentsCount={submitted.documentsCount}
          submittedValues={submitted.submittedValues}
          onSubmitAnother={startOver}
        />
      </div>
    );
  }

  const current = WIZARD_STEPS[step];

  return (
    <FormProvider {...form}>
      <div ref={topRef} className="flex scroll-mt-24 flex-col gap-4">
        {/* Submission error alert banner */}
        {submitError && (
          <div
            role="alert"
            className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-800 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-red-200 text-[10px] font-bold text-red-700">!</span>
              <div>
                <strong className="font-semibold">Submission Error:</strong> {submitError}
                {submitConflict && (
                  <>
                    {" "}
                    <Link href="/workspace/student/projects" className="font-semibold underline">
                      Check My Projects
                    </Link>{" "}
                    to see whether it was already submitted.
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-xs font-semibold text-red-600 hover:text-red-900 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {revisionFeedback !== null && (
          <section aria-label="Reviewer feedback" className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
            <h2 className="text-[13px] font-bold text-amber-950">Revision requested — reviewer feedback</h2>
            <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-amber-900">
              {revisionFeedback || "The reviewer did not leave written comments. Contact your faculty reviewer for details."}
            </p>
            <p className="mt-1.5 text-[12px] text-amber-800">
              Update your application below and submit again — this resubmits the same application.
            </p>
          </section>
        )}

        {/* Resume an existing draft — offered, never silently applied */}
        {pendingDraft && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-lg border border-brand-cyan/30 bg-brand-cyan-soft/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2.5">
              <FileClock className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
              <p className="text-[13px] text-ink">
                You have a saved draft
                {pendingDraft.values.name ? (
                  <>
                    {" "}
                    for <span className="font-semibold">{pendingDraft.values.name}</span>
                  </>
                ) : null}
                <span className="text-muted-ink"> · saved {formatSavedAt(pendingDraft.savedAt)}</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2 pl-6 sm:pl-0">
              <Button type="button" variant="ghost" onClick={discardDraft} className={cn(btn.quiet, "h-8 text-[13px] text-muted-ink hover:text-ink")}>
                Start fresh
              </Button>
              <Button type="button" onClick={resumeDraft} className={cn(btn.primary, "h-8 px-3 text-[13px]")}>
                Continue draft
              </Button>
            </div>
          </div>
        )}

        {SKIP_VALIDATION && (
          <p className="rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-[12px] font-medium text-brand-gold-ink">
            Workflow test mode: validation is off. Empty fields are allowed on every step.
          </p>
        )}

        <WizardStepper current={step} furthest={furthest} onSelect={selectStep} />

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            // Enter inside a field must not jump steps; only the final step submits.
            if (step !== LAST_STEP) return;
            if (SKIP_VALIDATION) void onValid(getValues());
            else void handleSubmit(onValid, onInvalid)(e);
          }}
        >
          <Card>
            <div className="border-b border-line px-5 py-4 sm:px-6">
              <p className="text-[12px] font-medium text-muted-ink">
                Step {step + 1} of {WIZARD_STEPS.length}
              </p>
              <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight text-ink">{current.title}</h2>
              <p className="mt-0.5 text-[13px] text-muted-ink">{current.description}</p>
            </div>

            <div className="px-5 py-6 sm:px-6">
              {step === 0 && <StepIdeaBasics />}
              {step === 1 && <StepProblemSolution />}
              {step === 2 && <StepTeamTechnology />}
              {step === 3 && <StepReview onEditStep={selectStep} />}
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => persist(step, furthest)}
                  disabled={isSubmitting}
                  className={btn.quiet}
                >
                  <Save className="size-4" aria-hidden="true" />
                  Save Draft
                </Button>
                <span aria-live="polite" className="text-[12px] text-muted-ink">
                  {saveState.kind === "saved" && `Saved ${formatSavedAt(saveState.at)}`}
                  {saveState.kind === "unavailable" && (
                    <span className="text-danger">Drafts can&apos;t be saved in this browser</span>
                  )}
                  {saveState.kind === "server-failed" && (
                    <span className="text-danger">Saved in this browser only — server save failed: {saveState.message}</span>
                  )}
                </span>
              </div>

              <div className="flex gap-2">
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={goBack} disabled={isSubmitting} className={cn(btn.secondary, "flex-1 sm:flex-none")}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back
                  </Button>
                )}

                {step < LAST_STEP ? (
                  <Button type="button" onClick={goNext} className={cn(btn.primary, "flex-1 sm:flex-none")}>
                    Continue
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting} className={cn(btn.primary, "flex-1 sm:flex-none")}>
                    {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {isSubmitting ? "Submitting…" : "Submit Idea"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </form>
      </div>
    </FormProvider>
  );
}
