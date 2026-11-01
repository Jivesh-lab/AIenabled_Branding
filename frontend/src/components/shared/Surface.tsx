/**
 * Core surface primitives for the DBIT Incubation Centre.
 * Crafted with intentional typography, crisp borders, and calm enterprise aesthetics.
 */
import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/types/status";

export function Card({
  children,
  className,
  variant = "bordered",
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "bordered" | "subtle" | "ghost" | "dark";
  interactive?: boolean;
  onClick?: () => void;
}) {
  const variantStyles: Record<string, string> = {
    default: "bg-white border-line text-ink shadow-[0_1px_2px_rgba(16,27,53,0.04)]",
    bordered: "border border-line bg-white",
    subtle: "bg-canvas/60 border border-line/70 text-ink",
    ghost: "border-none bg-transparent",
    dark: "bg-dark-panel border-dark-border text-dark-text shadow-lg",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border transition-all duration-150",
        variantStyles[variant] || variantStyles.bordered,
        interactive && "cursor-pointer hover:border-brand/40 hover:bg-[#F8FAFC] hover:shadow-xs",
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
          className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-hover hover:underline"
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
  progress: "border-brand/20 bg-brand-soft text-brand font-medium",
  // Cyan/Teal — informational stage
  info: "border-brand-cyan/25 bg-brand-cyan-soft text-brand-cyan-ink font-medium",
  // Amber / Gold — genuinely needs attention
  attention: "border-amber-200 bg-amber-50 text-amber-900 font-medium",
  // Green / Red — verified or flagged outcomes
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 font-medium",
  danger: "border-red-200 bg-red-50 text-red-800 font-medium",
  neutral: "border-line bg-canvas text-muted-ink font-medium",
};

const DOT_COLOR: Record<StatusTone, string> = {
  progress: "bg-brand",
  info: "bg-brand-cyan",
  attention: "bg-amber-600",
  success: "bg-emerald-600",
  danger: "bg-red-600",
  neutral: "bg-slate-400",
};

export function StatusBadge({
  label,
  tone,
  className,
  withDot = true,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
  withDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5",
        "text-[11px] font-medium leading-none tracking-normal",
        TONE_CLASS[tone],
        className
      )}
    >
      {withDot && (
        <span aria-hidden="true" className={cn("size-1.5 rounded-full shrink-0", DOT_COLOR[tone] || "bg-slate-400")} />
      )}
      {label}
    </span>
  );
}

export function MaturityTag({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-ink">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-cyan" />
      <span className="sr-only">Maturity: </span>
      {label}
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
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[12px] font-medium text-muted-ink">{label}</span>
          <span className="tabular-nums text-[12px] font-semibold text-ink">{currentVal}%</span>
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
