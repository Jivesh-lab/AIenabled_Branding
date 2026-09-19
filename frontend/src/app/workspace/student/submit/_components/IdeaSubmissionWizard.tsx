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

import { useRef, useState, useSyncExternalStore } from "react";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, FileClock, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/shared/Surface";
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
  formatSavedAt,
  getDraftServerSnapshot,
  parseDraft,
  readRawDraft,
  saveDraft,
  subscribeToDraft,
} from "../_lib/draft-storage";
import WizardStepper from "./WizardStepper";
import StepIdeaBasics from "./StepIdeaBasics";
import StepProblemSolution from "./StepProblemSolution";
import StepTeamTechnology from "./StepTeamTechnology";
import StepReview from "./StepReview";
import SubmissionSuccess from "./SubmissionSuccess";

const btn = {
  primary:
    "h-10 gap-1.5 px-4 text-[14px] font-semibold bg-brand text-white hover:bg-brand-hover active:bg-brand-active focus-visible:ring-brand/40",
  secondary:
    "h-10 gap-1.5 px-4 text-[14px] font-medium border-line bg-white text-ink hover:bg-nav-hover hover:text-ink focus-visible:ring-brand/30",
  quiet:
    "h-10 gap-1.5 px-3 text-[14px] font-medium text-brand hover:bg-nav-hover hover:text-brand focus-visible:ring-brand/30",
};

type SaveState = { kind: "idle" } | { kind: "saved"; at: string } | { kind: "unavailable" };

export default function IdeaSubmissionWizard() {
  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaSchema),
    defaultValues: IDEA_DEFAULT_VALUES,
    mode: SKIP_VALIDATION ? "onSubmit" : "onTouched",
  });
  const { getValues, handleSubmit, reset, trigger } = form;

  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<StepIndex>(0);
  const [furthest, setFurthest] = useState<StepIndex>(0);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [draftDecided, setDraftDecided] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ name: string; referenceId: string } | null>(null);

  const rawDraft = useSyncExternalStore(subscribeToDraft, readRawDraft, getDraftServerSnapshot);
  const pendingDraft = draftDecided ? null : parseDraft(rawDraft);

  // -------------------------------------------------------------------------
  // Draft handling
  // -------------------------------------------------------------------------
  function persist(nextStep: StepIndex, nextFurthest: StepIndex) {
    const at = saveDraft(getValues(), nextStep, nextFurthest);
    setSaveState(at ? { kind: "saved", at } : { kind: "unavailable" });
    // Saving over the stored draft settles the resume-or-discard question.
    setDraftDecided(true);
  }

  function resumeDraft() {
    if (!pendingDraft) return;
    reset({ ...IDEA_DEFAULT_VALUES, ...pendingDraft.values, declarationAccepted: false });
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
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    clearDraft();
    setSubmitted({
      name: values.name.trim() || "Untitled idea",
      referenceId: `IDEA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setIsSubmitting(false);
    scrollToTop();
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
    scrollToTop();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (submitted) {
    return (
      <div ref={topRef} className="scroll-mt-24">
        <SubmissionSuccess
          ideaName={submitted.name}
          referenceId={submitted.referenceId}
          onSubmitAnother={startOver}
        />
      </div>
    );
  }

  const current = WIZARD_STEPS[step];

  return (
    <FormProvider {...form}>
      <div ref={topRef} className="flex scroll-mt-24 flex-col gap-4">
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
