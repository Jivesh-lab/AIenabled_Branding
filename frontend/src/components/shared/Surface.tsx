/**
 * Dashboard surface primitives — the default card, the section heading and the
 * status badge. Every dashboard section is built from these so cards cannot
 * drift in radius, border, shadow or heading scale.
 *
 * Card: #FFFFFF · 1px #D8EAF0 · radius 12px · shadow-sm. Nothing else.
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/mock/student-dashboard";

export function Card({
  children,
  className,
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Adds the restrained hover treatment used by linked cards. */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-white shadow-sm",
        interactive && "transition-colors duration-150 hover:border-brand/40 hover:bg-nav-hover",
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
    <div className={cn("mb-4 flex items-baseline justify-between gap-4", className)}>
      <h2 className="text-[18px] font-semibold tracking-tight text-ink">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand transition-colors duration-150 hover:text-brand-cyan"
        >
          {action.label}
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

const TONE_CLASS: Record<StatusTone, string> = {
  // Blue — active, on-track work
  progress: "border-brand/20 bg-brand-cyan-soft text-brand",
  // Cyan — informational stage
  info: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan-ink",
  // Gold — genuinely needs the student's attention
  attention: "border-brand-gold/40 bg-brand-gold/10 text-brand-gold-ink",
  neutral: "border-line bg-canvas text-muted-ink",
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5",
        "text-[11px] font-semibold uppercase tracking-[0.04em]",
        TONE_CLASS[tone]
      )}
    >
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
          <span className="text-[12px] font-semibold text-ink">{value}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-1.5 w-full overflow-hidden rounded-full bg-brand-cyan-soft"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
