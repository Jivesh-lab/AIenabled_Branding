"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { controlClass, describedBy, FormField } from "@/components/shared/form/FormField";
import { MATURITY_LABEL, SUBMITTABLE_MATURITY_LEVELS } from "@/types/status";
import { DEPARTMENTS, DOMAINS, PROJECT_TYPES } from "@/mock/submit-idea";
import type { IdeaFormValues } from "../_lib/idea-schema";
import CharCount from "./CharCount";

const MATURITY_HINT: Record<(typeof SUBMITTABLE_MATURITY_LEVELS)[number], string> = {
  IDEA: "A problem and a possible direction",
  CONCEPT: "A defined solution on paper",
  PROTOTYPE: "A working model exists",
  MVP: "Usable by real users",
};

export default function StepIdeaBasics() {
  const {
    register,
    formState: { errors },
  } = useFormContext<IdeaFormValues>();

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <FormField
        id="name"
        label="Idea / Project name"
        required
        error={errors.name?.message}
        className="md:col-span-2"
      >
        <input
          id="name"
          type="text"
          autoComplete="off"
          placeholder="e.g. Smart Agriculture AI Drone"
          aria-invalid={!!errors.name}
          aria-describedby={describedBy("name", { error: !!errors.name })}
          className={cn(controlClass, "h-10")}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="shortDescription"
        label="Short description"
        required
        hint="One or two sentences a reviewer can understand at a glance."
        error={errors.shortDescription?.message}
        aside={<CharCount name="shortDescription" max={300} />}
        className="md:col-span-2"
      >
        <textarea
          id="shortDescription"
          rows={3}
          placeholder="An AI-powered drone that detects crop disease early and recommends targeted treatment."
          aria-invalid={!!errors.shortDescription}
          aria-describedby={describedBy("shortDescription", { hint: true, error: !!errors.shortDescription })}
          className={cn(controlClass, "resize-y py-2.5 leading-relaxed")}
          {...register("shortDescription")}
        />
      </FormField>

      <FormField id="department" label="Department" required error={errors.department?.message}>
        <select
          id="department"
          aria-invalid={!!errors.department}
          aria-describedby={describedBy("department", { error: !!errors.department })}
          className={cn(controlClass, "h-10 pr-8")}
          {...register("department")}
        >
          <option value="">Select department</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="domain" label="Domain / Sector" required error={errors.domain?.message}>
        <select
          id="domain"
          aria-invalid={!!errors.domain}
          aria-describedby={describedBy("domain", { error: !!errors.domain })}
          className={cn(controlClass, "h-10 pr-8")}
          {...register("domain")}
        >
          <option value="">Select domain</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="projectType" label="Project type" className="md:col-span-2">
        <select id="projectType" className={cn(controlClass, "h-10 pr-8 md:max-w-[calc(50%-10px)]")} {...register("projectType")}>
          <option value="">Select project type</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FormField>

      {/* Maturity — a radio group, because the options need a one-line explanation each */}
      <fieldset className="md:col-span-2">
        <legend className="mb-1.5 text-[13px] font-medium text-ink">
          Current maturity
          <span className="ml-1.5 text-[12px] font-normal text-muted-ink">(how developed is it today?)</span>
        </legend>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SUBMITTABLE_MATURITY_LEVELS.map((level) => (
            <label
              key={level}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-white p-3",
                "transition-colors duration-150 hover:border-brand-cyan/40 hover:bg-nav-hover",
                "has-[:checked]:border-brand has-[:checked]:bg-brand-cyan-soft/50",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand/15"
              )}
            >
              <input
                type="radio"
                value={level}
                className="mt-0.5 size-4 shrink-0 accent-brand"
                {...register("maturity")}
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink">{MATURITY_LABEL[level]}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-muted-ink">{MATURITY_HINT[level]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
