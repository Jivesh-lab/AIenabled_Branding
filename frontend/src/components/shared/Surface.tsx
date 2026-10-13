/**
 * Dashboard surface primitives — Studio craft for DBIT Innovation Centre.
 *
 * Designed to eliminate generic SaaS card sprawl:
 * - Crisp 1px hairline borders rather than blurry drop shadows
 * - Strict sentence-case status tags without tracked-out all-caps
 * - Purposeful text links without trailing arrows (→)
 */
import Link from "next/link";
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
  variant?: "bordered" | "subtle" | "ghost";
  interactive?: boolean;
  onClick?: () => void;
}) {
  const variantStyles = {
    bordered: "border border-line bg-white",
    subtle: "border border-line/70 bg-[#FAFBFB]",
    ghost: "border-none bg-transparent",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg",
        variantStyles[variant],
        interactive &&
          "transition-colors duration-150 hover:border-brand/40 hover:bg-[#F8FAFC] cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  action,
  className,
}: {
  title: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-4", className)}>
      <h2 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 text-[13px] font-medium text-brand transition-colors duration-150 hover:text-brand-hover hover:underline"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

const TONE_CLASS: Record<StatusTone, string> = {
  // Blue — active, on-track work
  progress: "border-brand/20 bg-brand-cyan-soft/60 text-brand",
  // Cyan/Teal — informational stage
  info: "border-brand-cyan/25 bg-brand-cyan-soft text-brand-cyan-ink",
  // Amber / Gold — genuinely needs attention
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  // Green / Red — verified or flagged outcomes
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-line bg-canvas text-muted-ink",
};

export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-2 py-0.5",
        "text-[12px] font-medium leading-normal",
        TONE_CLASS[tone],
        className
      )}
    >
      {label}
    </span>
  );
}

export function MaturityTag({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded border border-line bg-white px-2 py-0.5 text-[12px] font-medium text-ink">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-cyan" />
      <span className="sr-only">Maturity: </span>
      {label}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-ink">{label}</span>
          <span className="tabular-nums text-[12px] font-semibold text-ink">{value}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-brand transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
