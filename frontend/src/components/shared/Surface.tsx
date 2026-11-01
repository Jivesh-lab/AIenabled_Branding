/**
 * Core surface primitives for the DBIT Incubation Centre.
 * Crafted with intentional typography, crisp borders, and calm enterprise aesthetics.
 * Avoids generic AI-generated flourishes (no rainbow gradients, no excessive pulsing).
 */
import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/types/status";

export function Card({
  children,
  className,
  interactive = false,
  variant = "default",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  variant?: "default" | "subtle" | "dark";
  onClick?: () => void;
}) {
  const variantStyles = {
    default: "bg-white border-line text-ink shadow-[0_1px_2px_rgba(16,27,53,0.04)]",
    subtle: "bg-canvas/60 border-line text-ink",
    dark: "bg-dark-panel border-dark-border text-dark-text shadow-lg",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border transition-all duration-150",
        variantStyles[variant],
        interactive && "cursor-pointer hover:border-slate-300 hover:shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-baseline justify-between gap-3", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-ink">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-hover"
        >
          {action.label}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

const TONE_CLASS: Record<StatusTone, string> = {
  // Brand blue — active work
  progress: "border-brand/25 bg-brand-soft text-brand font-medium",
  // Teal — matching / advisory
  info: "border-teal/25 bg-teal-soft text-teal font-medium",
  // Warm amber — attention needed
  attention: "border-amber-200 bg-amber-50 text-amber-800 font-medium",
  // Emerald / Rose — terminal state
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 font-medium",
  danger: "border-rose-200 bg-rose-50 text-rose-800 font-medium",
  neutral: "border-slate-200 bg-slate-100 text-slate-700 font-medium",
};

export function StatusBadge({
  label,
  tone,
  withDot = true,
}: {
  label: string;
  tone: StatusTone;
  withDot?: boolean;
}) {
  const dotColor: Record<StatusTone, string> = {
    progress: "bg-brand",
    info: "bg-teal",
    attention: "bg-amber-600",
    success: "bg-emerald-600",
    danger: "bg-rose-600",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5",
        "text-[11px] font-medium leading-none tracking-normal",
        TONE_CLASS[tone]
      )}
    >
      {withDot && (
        <span aria-hidden="true" className={cn("size-1.5 rounded-full shrink-0", dotColor[tone])} />
      )}
      {label}
    </span>
  );
}

/**
 * Maturity tag — understated, outlined.
 */
export function MaturityTag({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
      <span aria-hidden="true" className="size-1 rounded-full bg-slate-400" />
      <span>{label}</span>
    </span>
  );
}

export function ProgressBar({
  value,
  progress,
  label,
}: {
  value?: number;
  progress?: number;
  label?: string;
}) {
  const currentVal = Math.min(100, Math.max(0, value ?? progress ?? 0));

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-ink">{label}</span>
          <span className="font-semibold text-ink tabular-nums">{currentVal}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={currentVal}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60"
      >
        <div
          className="h-full rounded-full bg-brand transition-all duration-300"
          style={{ width: `${currentVal}%` }}
        />
      </div>
    </div>
  );
}
