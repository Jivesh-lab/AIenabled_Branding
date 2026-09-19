"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { controlClass, describedBy, FormField, FormSection } from "@/components/shared/form/FormField";
import type { IdeaFormValues } from "../_lib/idea-schema";
import CharCount from "./CharCount";

type LongTextField = "problem" | "affectedUsers" | "currentSolutions" | "solution" | "differentiation";

interface LongTextConfig {
  name: LongTextField;
  label: string;
  hint: string;
  placeholder: string;
  max: number;
  rows: number;
  required: boolean;
}

const PROBLEM_FIELDS: LongTextConfig[] = [
  {
    name: "problem",
    label: "What problem are you solving?",
    hint: "Describe the problem itself, not your solution.",
    placeholder: "Small farmers detect crop disease only after visible damage, by which point yield losses are already significant…",
    max: 2000,
    rows: 5,
    required: true,
  },
  {
    name: "affectedUsers",
    label: "Who experiences this problem?",
    hint: "The specific people or organisations affected.",
    placeholder: "Smallholder farmers in Maharashtra with 1–5 acre plots…",
    max: 1000,
    rows: 3,
    required: true,
  },
  {
    name: "currentSolutions",
    label: "How is the problem currently solved?",
    hint: "Existing workarounds, products or services, and where they fall short.",
    placeholder: "Manual field inspection by agricultural officers, typically once a season…",
    max: 1500,
    rows: 3,
    required: false,
  },
];

const SOLUTION_FIELDS: LongTextConfig[] = [
  {
    name: "solution",
    label: "Describe your proposed solution",
    hint: "What you will build and how it addresses the problem.",
    placeholder: "A low-cost drone that captures multispectral images and flags early signs of disease…",
    max: 2000,
    rows: 5,
    required: true,
  },
  {
    name: "differentiation",
    label: "What makes your solution different?",
    hint: "Why this approach is better than the current alternatives.",
    placeholder: "Runs detection on-device, so it works without mobile connectivity in the field…",
    max: 1500,
    rows: 4,
    required: true,
  },
];

function LongTextFields({ fields }: { fields: LongTextConfig[] }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<IdeaFormValues>();

  return (
    <div className="flex flex-col gap-5">
      {fields.map((f) => {
        const error = errors[f.name]?.message;
        return (
          <FormField
            key={f.name}
            id={f.name}
            label={f.label}
            required={f.required}
            hint={f.hint}
            error={error}
            aside={<CharCount name={f.name} max={f.max} />}
          >
            <textarea
              id={f.name}
              rows={f.rows}
              placeholder={f.placeholder}
              aria-invalid={!!error}
              aria-describedby={describedBy(f.name, { hint: true, error: !!error })}
              className={cn(controlClass, "resize-y py-2.5 leading-relaxed")}
              {...register(f.name)}
            />
          </FormField>
        );
      })}
    </div>
  );
}

export default function StepProblemSolution() {
  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Problem" description="Start with the problem. Reviewers assess this first.">
        <LongTextFields fields={PROBLEM_FIELDS} />
      </FormSection>

      <FormSection title="Solution">
        <LongTextFields fields={SOLUTION_FIELDS} />
      </FormSection>
    </div>
  );
}
