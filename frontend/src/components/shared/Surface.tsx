/**
 * Core surface primitives for the DBIT Incubation Centre.
 * Premium SaaS aesthetic: calm institutional surfaces, crisp borders, intentional typography.
 */
import React from "react";
import Link from "next/link";
import { ArrowRight, Clock, HelpCircle } from "lucide-react";
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
  variant?: "default" | "bordered" | "subtle" | "elevated" | "brand" | "ghost" | "dark";
  interactive?: boolean;
  onClick?: () => void;
}) {
  const variantStyles: Record<string, string> = {
    default: "bg-white border-line text-ink shadow-[0_1px_2px_rgba(16,27,53,0.04)]",
    bordered: "border border-line bg-white",
    subtle: "bg-canvas/60 border border-line/70 text-ink",
    elevated:
      "bg-white border-line text-ink shadow-[0_8px_24px_rgba(16,27,53,0.06)] shadow-[0_1px_2px_rgba(16,27,53,0.04)]",
    brand: "bg-brand-deep border-brand-deep/30 text-white shadow-xs",
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

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<any>;
  accent?: "brand" | "brand-cyan" | "brand-gold";
}) {
  const theme: Record<string, string> = {
    brand: "bg-brand-soft text-brand border-brand/20 hover:border-brand/40",
    "brand-cyan": "bg-brand-cyan-soft text-brand-cyan-ink border-brand-cyan/20 hover:border-brand-cyan/40",
    "brand-gold": "bg-brand-gold-soft text-brand-gold-ink border-brand-gold/20 hover:border-brand-gold/40",
  };

  return (
    <Card
      interactive
      className={cn("relative overflow-hidden rounded-2xl p-5 bg-white border-line text-ink shadow-xs", theme[accent])}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-[color:var(--tw-border-color)] opacity-100" />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <span className="block truncate text-xs font-semibold uppercase tracking-wider text-muted-ink">
            {label}
          </span>
          <span className="mt-2 block text-[26px] lg:text-[32px] font-black tracking-tight tabular-nums text-ink">
            {value}
          </span>
          {sub && <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-muted-ink">{sub}</span>}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105">
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

export function SectionHeading({
  title,
  subtitle,
  kicker,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-baseline justify-between gap-3", className)}>
      {kicker && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-cyan-ink">
          <span className="size-1 rounded-full bg-brand-cyan-ink" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted-ink">{subtitle}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-brand-hover hover:underline"
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
        <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${currentVal}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<any>;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-canvas/50 border border-line mb-4">
        <Icon className="size-6 text-muted-ink" aria-hidden="true" />
      </div>
      <h3 className="text-[16px] font-bold text-ink">{title}</h3>
      {description && <p className="mt-2 text-[13px] text-muted-ink max-w-xs mx-auto">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
        >
          <ArrowRight className="size-3.5" aria-hidden="true" />
          {action.label}
        </Link>
      )}
    </div>
  );
}

/**
 * Premium data table wrapper. Consumers render thead/tbody inside.
 */
export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">{children}</table>
      </div>
    </Card>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line bg-canvas/60">{children}</tr>
    </thead>
  );
}

export function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-ink",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-b border-line/60 transition-colors duration-150",
        hover && "hover:bg-canvas/40",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const alignMap = { left: "text-left", center: "text-center", right: "text-right" };
  return (
    <td className={cn("px-5 py-4 text-[13px] text-ink", alignMap[align], className)}>
      {children}
    </td>
  );
}

/**
 * Subtle section divider with optional label.
 */
export function SectionDivider({ label }: { label?: string } = {}) {
  return (
    <div className="relative flex items-center my-8">
      <div className="flex-1 border-b border-line" />
      {label && (
        <span className="mx-3 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-ink bg-white">
          {label}
        </span>
      )}
      <div className="flex-1 border-b border-line" />
    </div>
  );
}

/**
 * Info callout with an icon.
 */
export function InfoCallout({
  title,
  description,
  icon: Icon = HelpCircle,
  tone = "info",
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<any>;
  tone?: "info" | "success" | "warning";
}) {
  const theme: Record<string, string> = {
    info: "bg-brand-soft border-brand/30 text-brand-deep",
    success: "bg-emerald-50 border-emerald/30 text-emerald-800",
    warning: "bg-amber-50 border-amber/30 text-amber-800",
  };
  return (
    <div className={cn("rounded-xl border p-4 flex gap-3", theme[tone])}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/60">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-bold">{title}</h4>
        <p className="mt-0.5 text-[12px]">{description}</p>
      </div>
    </div>
  );
}
