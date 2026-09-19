"use client";

import { useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { IdeaFormValues } from "../_lib/idea-schema";

type TextField = {
  [K in keyof IdeaFormValues]: IdeaFormValues[K] extends string ? K : never;
}[keyof IdeaFormValues];

/**
 * Live character counter. Subscribes to a single field, so typing re-renders
 * only this counter — not the whole step.
 */
export default function CharCount({ name, max }: { name: TextField; max: number }) {
  const value = useWatch<IdeaFormValues, TextField>({ name });
  const length = typeof value === "string" ? value.length : 0;

  return (
    <span
      aria-live="polite"
      className={cn("text-[12px] tabular-nums", length > max ? "font-medium text-danger" : "text-muted-ink")}
    >
      {length.toLocaleString("en-IN")}/{max.toLocaleString("en-IN")}
    </span>
  );
}
